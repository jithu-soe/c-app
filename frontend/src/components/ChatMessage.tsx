// import React from 'react';

// interface Message {
//   messageId: string;
//   senderId: string;
//   recipientId: string;
//   content: string;
//   timestamp: number;
//   status: 'sent' | 'delivered' | 'read' | 'failed' | 'queued';
//   attempts?: number;
// }

// interface ChatMessageProps {
//   message: Message;
//   isOwnMessage: boolean;
//   onRetry: (messageId: string) => void;
// }

// const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwnMessage, onRetry }) => {
//   const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
//     hour: '2-digit',
//     minute: '2-digit',
//   });

//   return (
//     <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
//       <div className={`max-w-xs p-3 rounded-lg ${isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
//         <p className="text-sm">{message.content}</p>
//         <div className="flex items-center justify-between mt-1">
//           <span className="text-xs text-gray-400">{formattedTime}</span>
//           {message.status === 'failed' && (
//             <button
//               onClick={() => onRetry(message.messageId)}
//               className="text-xs text-red-500 hover:text-red-700"
//             >
//               Retry
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ChatMessage;




// client/src/components/ChatMessage.tsx
import React from 'react';

interface Message {
  messageId: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'queued';
  attempts?: number;
}

interface ChatMessageProps {
  message: Message;
  isOwnMessage: boolean;
  onRetry: (messageId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwnMessage, onRetry }) => {
  // Format timestamp
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Determine message status display
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return <span className="text-blue-500">✓✓</span>;
      case 'failed':
        return (
          <button
            onClick={() => onRetry(message.messageId)}
            className="text-red-500 hover:text-red-700"
            title="Retry sending"
          >
            !
          </button>
        );
      case 'queued':
        return '⌛';
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-xs md:max-w-md p-3 rounded-lg ${
          isOwnMessage
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-800'
        }`}
      >
        <p className="break-words">{message.content}</p>
        <div className="flex justify-between items-center mt-1 text-xs opacity-75">
          <span>{formattedTime}</span>
          {isOwnMessage && <span className="ml-2">{getStatusIcon()}</span>}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;