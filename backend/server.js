// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const dotenv = require('dotenv');

// dotenv.config(); // Load environment variables

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*', // Allow all origins (update this in production)
//   },
// });

// // In-memory storage for messages and ACKs
// const messageQueue = new Map(); // Key: user_id, Value: Array of messages
// const pendingAcks = new Map(); // Key: message_id, Value: retry count

// // Simulate 50% message drop
// function shouldDropMessage() {
//   return Math.random() < 0.5;
// }

// // Handle incoming messages
// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   // Assign a user ID to the socket
//   const userId = `user-${socket.id}`;
//   socket.userId = userId;

//   // Emit user ID to the frontend
//   socket.emit('assignUserId', userId);

//   // Listen for messages from the client
//   socket.on('sendMessage', (message) => {
//     console.log('Received message:', message);

//     // Simulate message drop
//     if (shouldDropMessage()) {
//       console.log('Message dropped:', message.message_id);
//       return;
//     }

//     // Store message in queue for retries
//     if (!messageQueue.has(message.receiver_id)) {
//       messageQueue.set(message.receiver_id, []);
//     }
//     messageQueue.get(message.receiver_id).push(message);

//     // Send message to receiver
//     io.to(message.receiver_id).emit('receiveMessage', message);
//   });

//   // Listen for ACKs from the client
//   socket.on('ackMessage', (ack) => {
//     console.log('Received ACK:', ack);
//     pendingAcks.delete(ack.message_id); // Remove message from pending ACKs
//   });

//   // Retry mechanism for unacknowledged messages
//   setInterval(() => {
//     pendingAcks.forEach((retryCount, message_id) => {
//       if (retryCount < 3) { // Max 3 retries
//         const message = messageQueue.get(message.receiver_id).find(m => m.message_id === message_id);
//         io.to(message.receiver_id).emit('receiveMessage', message);
//         pendingAcks.set(message_id, retryCount + 1);
//       } else {
//         pendingAcks.delete(message_id); // Stop retrying after max retries
//       }
//     });
//   }, 5000); // Retry every 5 seconds
// });

// // Start the server
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });


const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins (update this in production)
  },
});

// In-memory storage for messages and ACKs
const messageQueue = new Map(); // Key: user_id, Value: Array of messages
const pendingAcks = new Map(); // Key: message_id, Value: retry count

// Simulate 50% message drop
function shouldDropMessage() {
  return Math.random() < 0.5;
}

// Handle incoming messages
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Assign a user ID (userA or userB)
  const userId = Object.keys(io.sockets.sockets).length === 1 ? 'userA' : 'userB';
  socket.userId = userId;

  // Emit the assigned user ID to the frontend
  socket.emit('assignUserId', userId);

  // Listen for messages from the client
  socket.on('sendMessage', (message) => {
    console.log('Received message:', message);

    // Simulate message drop
    if (shouldDropMessage()) {
      console.log('Message dropped:', message.message_id);
      pendingAcks.set(message.message_id, 1); // Add message to pending ACKs
      return;
    }

    // Store message in queue for retries
    if (!messageQueue.has(message.receiver_id)) {
      messageQueue.set(message.receiver_id, []);
    }
    messageQueue.get(message.receiver_id).push(message);

    // Send message to receiver
    io.to(message.receiver_id).emit('receiveMessage', message);
  });

  // Listen for ACKs from the client
  socket.on('ackMessage', (ack) => {
    console.log('Received ACK:', ack);
    pendingAcks.delete(ack.message_id); // Remove message from pending ACKs
  });

  // Retry mechanism for unacknowledged messages
  setInterval(() => {
    pendingAcks.forEach((retryCount, message_id) => {
      if (retryCount < 3) { // Max 3 retries
        const message = messageQueue.get(message.receiver_id).find(m => m.message_id === message_id);
        io.to(message.receiver_id).emit('receiveMessage', message);
        pendingAcks.set(message_id, retryCount + 1);
      } else {
        pendingAcks.delete(message_id); // Stop retrying after max retries
      }
    });
  }, 5000); // Retry every 5 seconds

  // Listen for typing events
  socket.on('typing', () => {
    socket.broadcast.emit('userTyping');
  });

  socket.on('stopTyping', () => {
    socket.broadcast.emit('userStoppedTyping');
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});