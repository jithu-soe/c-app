// import { useEffect, useState } from 'react';
// import io from 'socket.io-client';

// const socket = io('https://silver-goldfish-vjpgwp6v5r6356p-3000.app.github.dev/'); // Connect to the backend

// function App() {
//   const [messages, setMessages] = useState<string[]>([]);
//   const [inputMessage, setInputMessage] = useState('');

//   useEffect(() => {
//     // Listen for incoming messages
//     socket.on('receiveMessage', (message: string) => {
//       setMessages((prevMessages) => [...prevMessages, message]);
//     });

//     // Cleanup on component unmount
//     return () => {
//       socket.off('receiveMessage');
//     };
//   }, []);

//   const sendMessage = () => {
//     const message = {
//       message_id: `msg-${Date.now()}`, // Unique ID for the message
//       sender_id: 'userA', // Replace with actual user ID
//       receiver_id: 'userB', // Replace with actual receiver ID
//       content: inputMessage,
//       timestamp: Date.now(),
//     };

//     socket.emit('sendMessage', message); // Send message to the backend
//     setInputMessage(''); // Clear input field
//   };

//   return (
//     <div className="p-4 bg-gray-100 min-h-screen">
//       <h1 className="text-3xl font-bold text-blue-600">Chat App</h1>
//       <div className="mt-4">
//         {messages.map((msg, index) => (
//           <div key={index} className="p-2 bg-white shadow rounded mb-2">
//             {msg}
//           </div>
//         ))}
//       </div>
//       <div className="mt-4">
//         <input
//           type="text"
//           value={inputMessage}
//           onChange={(e) => setInputMessage(e.target.value)}
//           className="p-2 border rounded"
//           placeholder="Type a message"
//         />
//         <button
//           onClick={sendMessage}
//           className="ml-2 p-2 bg-blue-600 text-white rounded"
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// }

// export default App;

// import { useEffect, useState } from 'react';
// import io from 'socket.io-client';

// const socket = io('https://silver-goldfish-vjpgwp6v5r6356p-3000.app.github.dev/'); // Connect to the backend

// function App() {
//   const [messages, setMessages] = useState<Array<{ sender_id: string; content: string; timestamp: number }>>([]);
//   const [inputMessage, setInputMessage] = useState('');
//   const [userId, setUserId] = useState(''); // Track the current user's ID
//   const [typingUser, setTypingUser] = useState<string | null>(null); // Track who is typing

//   useEffect(() => {
//     // Assign a user ID when connected
//     socket.on('assignUserId', (id: string) => {
//       setUserId(id);
//     });

//     // Listen for incoming messages
//     socket.on('receiveMessage', (message: { sender_id: string; content: string; timestamp: number }) => {
//       setMessages((prevMessages) => [...prevMessages, message]);
//     });

//     // Listen for typing events
//     socket.on('userTyping', (typingUserId: string) => {
//       if (typingUserId !== userId) {
//         setTypingUser(typingUserId); // Show who is typing
//       }
//     });

//     socket.on('userStoppedTyping', (typingUserId: string) => {
//       if (typingUserId !== userId) {
//         setTypingUser(null); // Hide typing indicator
//       }
//     });

//     // Cleanup on component unmount
//     return () => {
//       socket.off('assignUserId');
//       socket.off('receiveMessage');
//       socket.off('userTyping');
//       socket.off('userStoppedTyping');
//     };
//   }, [userId]);

//   const sendMessage = () => {
//     if (inputMessage.trim() === '') return; // Don't send empty messages

//     const message = {
//       message_id: `msg-${Date.now()}`, // Unique ID for the message
//       sender_id: userId, // Use the assigned user ID
//       receiver_id: userId === 'userA' ? 'userB' : 'userA', // Send to the other user
//       content: inputMessage,
//       timestamp: Date.now(),
//     };

//     socket.emit('sendMessage', message); // Send message to the backend
//     setInputMessage(''); // Clear input field
//   };

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setInputMessage(e.target.value);

//     // Notify the other user when typing
//     if (e.target.value) {
//       socket.emit('typing');
//     } else {
//       socket.emit('stopTyping');
//     }
//   };

//   return (
//     <div className="p-4 bg-gray-100 min-h-screen">
//       <h1 className="text-3xl font-bold text-blue-600">Chat App</h1>
//       <div className="mt-4">
//         {messages.map((msg, index) => (
//           <div
//             key={index}
//             className={`p-2 rounded-lg mb-2 ${msg.sender_id === userId ? 'bg-blue-100 ml-auto' : 'bg-green-100 mr-auto'}`}
//             style={{ maxWidth: '70%' }}
//           >
//             <strong>{msg.sender_id}:</strong> {msg.content}
//             <span className="text-sm text-gray-500 ml-2">
//               {new Date(msg.timestamp).toLocaleTimeString()}
//             </span>
//           </div>
//         ))}
//       </div>
//       {typingUser && (
//         <div className="text-sm text-gray-500">
//           {typingUser} is typing...
//         </div>
//       )}
//       <div className="mt-4 flex">
//         <input
//           type="text"
//           value={inputMessage}
//           onChange={handleInputChange}
//           className="flex-1 p-2 border rounded"
//           placeholder="Type a message"
//         />
//         <button
//           onClick={sendMessage}
//           className="ml-2 p-2 bg-blue-600 text-white rounded"
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// }

// export default App;

// client/src/App.tsx


import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Chat from './components/Chat';
import { SocketProvider } from './contexts/SocketContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MessageProvider } from './contexts/MessageContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <MessageProvider>
            <div className="min-h-screen bg-gray-100">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route 
                  path="/chat" 
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </div>
          </MessageProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;