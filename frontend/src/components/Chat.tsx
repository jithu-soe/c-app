// client/src/components/Chat.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useMessages } from '../contexts/MessageContext';
import { useWebRTC } from '../contexts/WebRTCContext';
import ChatMessage from './ChatMessage';
import UsersList from './UsersList';
import VideoCall from './VideoCall';
import ConnectionStatus from './ConnectionStatus';

interface User {
  userId: string;
  username: string;
  status: 'online' | 'offline';
}

const Chat: React.FC = () => {
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  const { user, logout } = useAuth();
  const { socket, connected, reconnecting } = useSocket();
  const { getMessagesForRecipient, sendMessage, retryMessage } = useMessages();
  const { 
    callStatus, 
    incomingCall, 
    startCall, 
    answerCall, 
    declineCall, 
    endCall 
  } = useWebRTC();
  
  const navigate = useNavigate();
  
  // Get messages for the selected user
  const messages = selectedUser ? getMessagesForRecipient(selectedUser.userId) : [];
  
  // Handle user status updates
  useEffect(() => {
    if (!socket) return;
    
    const handleUserStatus = (userData: User) => {
      setUsers(prev => {
        const index = prev.findIndex(u => u.userId === userData.userId);
        if (index !== -1) {
          return [
            ...prev.slice(0, index),
            userData,
            ...prev.slice(index + 1)
          ];
        } else {
          return [...prev, userData];
        }
      });
    };
    
    const handleOnlineUsers = (onlineUsers: User[]) => {
      setUsers(onlineUsers);
    };
    
    socket.on('user_status', handleUserStatus);
    socket.on('online_users', handleOnlineUsers);
    
    return () => {
      socket.off('user_status');
      socket.off('online_users');
    };
  }, [socket]);
  
  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle sending messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !selectedUser) return;
    
    setIsSending(true);
    try {
      await sendMessage(selectedUser.userId, message);
      setMessage('');
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle retry for failed messages
  const handleRetry = async (messageId: string) => {
    const failedMessage = messages.find(m => m.messageId === messageId);
    if (failedMessage) {
      await retryMessage(failedMessage);
    }
  };
  
  // Handle user selection
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Handle starting a call
  const handleStartCall = async () => {
    if (selectedUser) {
      console.log("Starting call with:", selectedUser.userId);
      await startCall(selectedUser.userId);
    }
  };
  
  // Handle incoming call
  const renderIncomingCallModal = () => {
    if (!incomingCall) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h3 className="text-xl font-semibold mb-4">Incoming Call</h3>
          <p className="mb-4">{incomingCall.username} is calling you</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={declineCall}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Decline
            </button>
            <button
              onClick={answerCall}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Answer
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left sidebar - Users */}
      <div className="w-1/4 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Chat App</h2>
          {user && <h1>Welcome, {user.username}!</h1>}
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Logout
          </button>
        </div>
        <ConnectionStatus connected={connected} reconnecting={reconnecting} />
        <UsersList
          users={users}
          currentUser={user}
          selectedUser={selectedUser}
          onSelectUser={handleUserSelect}
        />
      </div>
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        {selectedUser && (
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
            <div>
              <h3 className="text-lg font-semibold">{selectedUser.username}</h3>
              <p className="text-sm text-gray-500">
                {selectedUser.status === 'online' ? 'Online' : 'Offline'}
              </p>
            </div>
            {selectedUser.status === 'online' && callStatus === 'idle' && (
              <button
                onClick={handleStartCall}
                className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Video Call
              </button>
            )}
            
            {(callStatus === 'calling' || callStatus === 'connected' || callStatus === 'reconnecting') && (
              <button
                onClick={endCall}
                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                End Call
              </button>
            )}
          </div>
        )}
        
        {/* Call status when calling */}
        {callStatus === 'calling' && (
          <div className="p-2 bg-blue-100 text-blue-800 text-center">
            Calling {selectedUser?.username}...
          </div>
        )}
        
        {/* Call status when reconnecting */}
        {callStatus === 'reconnecting' && (
          <div className="p-2 bg-yellow-100 text-yellow-800 text-center">
            Connection interrupted. Attempting to reconnect...
          </div>
        )}
        
        {/* Video call component */}
        {callStatus === 'connected' && <VideoCall />}
        
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {selectedUser ? (
            messages.length > 0 ? (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.messageId}
                  message={msg}
                  isOwnMessage={msg.senderId === user?.id}
                  onRetry={handleRetry}
                />
              ))
            ) : (
              <div className="text-center text-gray-500 mt-10">
                No messages yet. Start a conversation!
              </div>
            )
          ) : (
            <div className="text-center text-gray-500 mt-10">
              Select a user to start chatting
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input */}
        {selectedUser && (
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-2">
              <input
                ref={messageInputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!connected || isSending}
              />
              <button
                type="submit"
                disabled={!connected || isSending || !message.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSending ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
      
      {/* Incoming call modal */}
      {renderIncomingCallModal()}
    </div>
  );
};

export default Chat;