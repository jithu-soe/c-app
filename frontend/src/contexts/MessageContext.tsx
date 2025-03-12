// client/src/contexts/MessageContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

interface Message {
  messageId: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'queued';
  attempts?: number;
}

interface MessageContextType {
  messages: Record<string, Message[]>; // recipientId -> messages
  sendMessage: (recipientId: string, content: string) => Promise<void>;
  getMessagesForRecipient: (recipientId: string) => Message[];
  retryMessage: (message: Message) => Promise<void>;
}

const MessageContext = createContext<MessageContextType>({
  messages: {},
  sendMessage: async () => {},
  getMessagesForRecipient: () => [],
  retryMessage: async () => {}
});

export const useMessages = () => useContext(MessageContext);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  
  // Load messages from localStorage
  useEffect(() => {
    if (!user) return;
    
    const storedMessages = localStorage.getItem(`chat_messages_${user.id}`);
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch (error) {
        console.error('Failed to parse stored messages', error);
      }
    }
    
    const storedPendingMessages = localStorage.getItem(`chat_pending_messages_${user.id}`);
    if (storedPendingMessages) {
      try {
        setPendingMessages(JSON.parse(storedPendingMessages));
      } catch (error) {
        console.error('Failed to parse stored pending messages', error);
      }
    }
  }, [user]);
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`chat_messages_${user.id}`, JSON.stringify(messages));
  }, [messages, user]);
  
  // Save pending messages to localStorage
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`chat_pending_messages_${user.id}`, JSON.stringify(pendingMessages));
  }, [pendingMessages, user]);
  
  // Handle incoming messages
  useEffect(() => {
    if (!socket || !user) return;
    
    const handleReceiveMessage = (message: Message, ack: (data: any) => void) => {
      // Check if we've already processed this message (duplicate)
      const existingMessages = messages[message.senderId] || [];
      const isDuplicate = existingMessages.some(m => m.messageId === message.messageId);
      
      if (!isDuplicate) {
        // Add message to state
        setMessages(prev => {
          const recipientMessages = [...(prev[message.senderId] || []), message];
          return {
            ...prev,
            [message.senderId]: recipientMessages
          };
        });
      }
      
      // Send acknowledgment
      ack({ status: 'delivered', messageId: message.messageId });
      
      // Send message_ack to update message status on sender side
      socket.emit('message_ack', {
        messageId: message.messageId,
        recipientId: message.senderId,
        status: 'delivered'
      });
    };
    
    socket.on('receive_message', handleReceiveMessage);
    
    // Handle pending messages from server
    socket.on('pending_messages', (pendingMsgs: Message[]) => {
      pendingMsgs.forEach(message => {
        // Add message to state if not already added
        setMessages(prev => {
          const recipientMessages = prev[message.senderId] || [];
          const isDuplicate = recipientMessages.some(m => m.messageId === message.messageId);
          
          if (!isDuplicate) {
            return {
              ...prev,
              [message.senderId]: [...recipientMessages, message]
            };
          }
          return prev;
        });
        
        // Send acknowledgment
        socket.emit('message_ack', {
          messageId: message.messageId,
          recipientId: message.senderId,
          status: 'delivered'
        });
      });
    });
    
    // Handle message status updates
    socket.on('message_status', ({ messageId, status }) => {
      setMessages(prev => {
        const updatedMessages = { ...prev };
        
        // Find the message in all conversations
        for (const [recipientId, msgs] of Object.entries(updatedMessages)) {
          const index = msgs.findIndex(m => m.messageId === messageId);
          if (index !== -1) {
            updatedMessages[recipientId] = [
              ...msgs.slice(0, index),
              { ...msgs[index], status },
              ...msgs.slice(index + 1)
            ];
            break;
          }
        }
        
        return updatedMessages;
      });
    });
    
    return () => {
      socket.off('receive_message');
      socket.off('pending_messages');
      socket.off('message_status');
    };
  }, [socket, messages, user]);
  
  // Try to send pending messages when connection is established
  useEffect(() => {
    if (!socket || !connected || !user || pendingMessages.length === 0) return;
    
    // Create a copy to avoid mutation during iteration
    const messagesToRetry = [...pendingMessages];
    
    for (const message of messagesToRetry) {
      // Skip messages from other users
      if (message.senderId !== user.id) continue;
      
      // Try to resend the message
      socket.emit('send_message', message, (response: any) => {
        if (response.status === 'delivered' || response.status === 'queued') {
          // Message sent successfully, remove from pending
          setPendingMessages(prev => prev.filter(m => m.messageId !== message.messageId));
          
          // Update message status
          setMessages(prev => {
            const recipientMessages = prev[message.recipientId] || [];
            const index = recipientMessages.findIndex(m => m.messageId === message.messageId);
            
            if (index !== -1) {
              return {
                ...prev,
                [message.recipientId]: [
                  ...recipientMessages.slice(0, index),
                  { ...recipientMessages[index], status: response.status },
                  ...recipientMessages.slice(index + 1)
                ]
              };
            }
            return prev;
          });
        }
      });
    }
  }, [connected, socket, pendingMessages, user]);
  
  // Send a message
  const sendMessage = useCallback(async (recipientId: string, content: string) => {
    if (!user) throw new Error('User not authenticated');
    
    const message: Message = {
      messageId: uuidv4(),
      senderId: user.id,
      recipientId,
      content,
      timestamp: Date.now(),
      status: 'sent'
    };
    
    // Add message to state immediately with 'sent' status
    setMessages(prev => {
      const recipientMessages = [...(prev[recipientId] || []), message];
      return {
        ...prev,
        [recipientId]: recipientMessages
      };
    });
    
    if (!socket || !connected) {
      // Connection is down, add to pending messages
      message.status = 'queued';
      setPendingMessages(prev => [...prev, message]);
      return;
    }
    
    // Try to send the message
    try {
      return new Promise<void>((resolve, reject) => {
        socket.emit('send_message', message, (response: any) => {
          if (response.status === 'delivered') {
            // Message delivered successfully
            setMessages(prev => {
              const recipientMessages = prev[recipientId] || [];
              const index = recipientMessages.findIndex(m => m.messageId === message.messageId);
              
              if (index !== -1) {
                return {
                  ...prev,
                  [recipientId]: [
                    ...recipientMessages.slice(0, index),
                    { ...recipientMessages[index], status: 'delivered' },
                    ...recipientMessages.slice(index + 1)
                  ]
                };
              }
              return prev;
            });
            resolve();
          } else if (response.status === 'queued') {
            // Message queued on the server
            setMessages(prev => {
              const recipientMessages = prev[recipientId] || [];
              const index = recipientMessages.findIndex(m => m.messageId === message.messageId);
              
              if (index !== -1) {
                return {
                  ...prev,
                  [recipientId]: [
                    ...recipientMessages.slice(0, index),
                    { ...recipientMessages[index], status: 'queued' },
                    ...recipientMessages.slice(index + 1)
                  ]
                };
              }
              return prev;
            });
            resolve();
          } else if (response.status === 'timeout') {
            // Message sending timed out, add to pending messages
            setMessages(prev => {
              const recipientMessages = prev[recipientId] || [];
              const index = recipientMessages.findIndex(m => m.messageId === message.messageId);
              
              if (index !== -1) {
                const updatedMessage = { 
                  ...recipientMessages[index], 
                  status: 'failed', 
                  attempts: (recipientMessages[index].attempts || 1) + 1 
                };
                
                setPendingMessages(prev => [...prev, updatedMessage]);
                
                return {
                  ...prev,
                  [recipientId]: [
                    ...recipientMessages.slice(0, index),
                    updatedMessage,
                    ...recipientMessages.slice(index + 1)
                  ]
                };
              }
              return prev;
            });
            resolve();
          } else {
            // Unknown error
            reject(new Error(`Failed to send message: ${response.status}`));
          }
        });
      });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update message status to failed
      setMessages(prev => {
        const recipientMessages = prev[recipientId] || [];
        const index = recipientMessages.findIndex(m => m.messageId === message.messageId);
        
        if (index !== -1) {
          const updatedMessage = { 
            ...recipientMessages[index], 
            status: 'failed' 
          };
          
          setPendingMessages(prev => [...prev, updatedMessage]);
          
          return {
            ...prev,
            [recipientId]: [
              ...recipientMessages.slice(0, index),
              updatedMessage,
              ...recipientMessages.slice(index + 1)
            ]
          };
        }
        return prev;
      });
    }
  }, [socket, connected, user]);
  
  // Retry sending a failed message
  const retryMessage = useCallback(async (message: Message) => {
    if (!user) throw new Error('User not authenticated');
    
    const updatedMessage = {
      ...message,
      attempts: (message.attempts || 1) + 1,
      timestamp: Date.now()
    };
    
    // Update message in state
    setMessages(prev => {
      const recipientMessages = prev[message.recipientId] || [];
      const index = recipientMessages.findIndex(m => m.messageId === message.messageId);
      
      if (index !== -1) {
        return {
          ...prev,
          [message.recipientId]: [
            ...recipientMessages.slice(0, index),
            { ...recipientMessages[index], status: 'sent' },
            ...recipientMessages.slice(index + 1)
          ]
        };
      }
      return prev;
    });
    
    // Remove from pending messages
    setPendingMessages(prev => prev.filter(m => m.messageId !== message.messageId));
    
    if (!socket || !connected) {
      // Connection is down, add back to pending messages
      updatedMessage.status = 'queued';
      setPendingMessages(prev => [...prev, updatedMessage]);
      return;
    }
    
    // Try to resend the message
    try {
      return new Promise<void>((resolve, reject) => {
        socket.emit('send_message', updatedMessage, (response: any) => {
          if (response.status === 'delivered' || response.status === 'queued') {
            // Message sent or queued successfully
            setMessages(prev => {
              const recipientMessages = prev[message.recipientId] || [];
              const index = recipientMessages.findIndex(m => m.messageId === message.messageId);
              
              if (index !== -1) {
                return {
                  ...prev,
                  [message.recipientId]: [
                    ...recipientMessages.slice(0, index),
                    { ...recipientMessages[index], status: response.status },
                    ...recipientMessages.slice(index + 1)
                  ]
                };
              }
              return prev;
            });
            resolve();
          } else if (response.status === 'timeout') {
            // Message sending timed out, add to pending messages
            setMessages(prev => {
              const recipientMessages = prev[message.recipientId] || [];
              const index = recipientMessages.findIndex(m => m.messageId === message.messageId);
              
              if (index !== -1) {
                const updatedMsg = { 
                  ...recipientMessages[index], 
                  status: 'failed', 
                  attempts: (recipientMessages[index].attempts || 1) + 1 
                };
                
                setPendingMessages(prev => [...prev, updatedMsg]);
                
                return {
                  ...prev,
                  [message.recipientId]: [
                    ...recipientMessages.slice(0, index),
                    updatedMsg,
                    ...recipientMessages.slice(index + 1)
                  ]
                };
              }
              return prev;
            });
            resolve();
          } else {
            // Unknown error
            reject(new Error(`Failed to send message: ${response.status}`));
          }
        });
      });
    } catch (error) {
      console.error('Error retrying message:', error);
      
      // Update message status to failed
      setMessages(prev => {
        const recipientMessages = prev[message.recipientId] || [];
        const index = recipientMessages.findIndex(m => m.messageId === message.messageId);
        
        if (index !== -1) {
          const updatedMsg = { 
            ...recipientMessages[index], 
            status: 'failed' 
          };
          
          setPendingMessages(prev => [...prev, updatedMsg]);
          
          return {
            ...prev,
            [message.recipientId]: [
              ...recipientMessages.slice(0, index),
              updatedMsg,
              ...recipientMessages.slice(index + 1)
            ]
          };
        }
        return prev;
      });
    }
  }, [socket, connected, user]);
  
  const getMessagesForRecipient = useCallback((recipientId: string) => {
    return messages[recipientId] || [];
  }, [messages]);
  
  return (
    <MessageContext.Provider value={{ messages, sendMessage, getMessagesForRecipient, retryMessage }}>
      {children}
    </MessageContext.Provider>
  );
};