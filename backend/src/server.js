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

//   // Assign a user ID (userA or userB)
//   const userId = Object.keys(io.sockets.sockets).length === 1 ? 'userA' : 'userB';
//   socket.userId = userId;

//   // Emit the assigned user ID to the frontend
//   socket.emit('assignUserId', userId);

//   // Listen for messages from the client
//   socket.on('sendMessage', (message) => {
//     console.log('Received message:', message);

//     // Simulate message drop
//     if (shouldDropMessage()) {
//       console.log('Message dropped:', message.message_id);
//       pendingAcks.set(message.message_id, 1); // Add message to pending ACKs
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

//   // Listen for typing events
//   socket.on('typing', () => {
//     socket.broadcast.emit('userTyping');
//   });

//   socket.on('stopTyping', () => {
//     socket.broadcast.emit('userStoppedTyping');
//   });

//   // Handle disconnections
//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//   });
// });

// // Start the server
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

// server/src/server.ts
// import express from 'express';
// import http from 'http';
// import cors from 'cors';
// import { Server as SocketIOServer } from 'socket.io';
// import { setupSocketHandlers } from './socket';

// const app = express();
// const server = http.createServer(app);

// // Configure CORS for both Express and Socket.IO
// const corsOptions = {
//   origin: process.env.CLIENT_URL || 'http://localhost:5173',
//   methods: ['GET', 'POST'],
//   credentials: true
// };

// app.use(cors(corsOptions));
// app.use(express.json());

// // Setup Socket.IO server with CORS
// const io = new SocketIOServer(server, {
//   cors: corsOptions,
//   pingTimeout: 60000, // Increased ping timeout for unreliable networks
//   pingInterval: 25000, // More frequent pings to detect disconnections faster
// });

// // Set up socket handlers
// setupSocketHandlers(io);

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.status(200).send('Server is running');
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });





// const express = require('express');
// const http = require('http');
// const cors = require('cors');
// const { Server } = require('socket.io');
// const { setupSocketHandlers } = require('./socket');

// const app = express();
// const server = http.createServer(app);

// // Configure CORS for both Express and Socket.IO
// const corsOptions = {
//   origin: 'https://silver-goldfish-vjpgwp6v5r6356p-5173.app.github.dev/',
//   methods: ['GET', 'POST'],
//   credentials: true
// };

// app.use(cors(corsOptions));
// app.use(express.json());

// // Setup Socket.IO server with CORS
// const io = new Server(server, {
//   cors: corsOptions,
//   pingTimeout: 60000, // Increased ping timeout for unreliable networks
//   pingInterval: 25000, // More frequent pings to detect disconnections faster
// });

// // Set up socket handlers
// setupSocketHandlers(io);

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.status(200).send('Server is running');
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });









const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { setupSocketHandlers } = require('./socket');

const app = express();
const server = http.createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  'https://silver-goldfish-vjpgwp6v5r6356p-5173.app.github.dev'
];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.use(express.json());

// Setup Socket.IO server with CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000, // Increased timeout for stability
  pingInterval: 25000  // Detect disconnections faster
});

// Set up socket handlers
setupSocketHandlers(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Server is running');
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
