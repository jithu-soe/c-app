// const { Server } = require('socket.io');
// const { v4: uuidv4 } = require('uuid');

// // In-memory store for connected users
// const connectedUsers = new Map();
// const messageStore = new Map();
// const pendingAcks = new Map();

// function setupSocketHandlers(io) {
//   io.on('connection', (socket) => {
//     console.log(`User connected: ${socket.id}`);

//     socket.on('register', ({ userId, username }) => {
//       connectedUsers.set(userId, {
//         socketId: socket.id,
//         username,
//         userId,
//         lastSeen: Date.now()
//       });

//       if (!messageStore.has(userId)) {
//         messageStore.set(userId, []);
//       }

//       socket.broadcast.emit('user_status', { userId, username, status: 'online' });

//       const onlineUsers = Array.from(connectedUsers.values()).map(user => ({
//         userId: user.userId,
//         username: user.username,
//         status: 'online'
//       }));
//       socket.emit('online_users', onlineUsers);

//       const pendingMessages = messageStore.get(userId) || [];
//       if (pendingMessages.length > 0) {
//         socket.emit('pending_messages', pendingMessages);
//       }
//     });

//     socket.on('send_message', (messageData, callback) => {
//       const { senderId, recipientId, content, messageId = uuidv4(), timestamp = Date.now(), attempts = 1 } = messageData;

//       const message = { messageId, senderId, recipientId, content, timestamp, status: 'sent', attempts };

//       const senderMessages = messageStore.get(senderId) || [];
//       senderMessages.push(message);
//       messageStore.set(senderId, senderMessages);

//       const recipient = connectedUsers.get(recipientId);
//       if (recipient) {
//         const ackTimeout = setTimeout(() => {
//           if (pendingAcks.has(messageId)) {
//             pendingAcks.delete(messageId);
//             callback({ status: 'timeout', messageId });
//           }
//         }, 5000);

//         pendingAcks.set(messageId, { ackTimeout, message });

//         io.to(recipient.socketId).emit('receive_message', message, (ackData) => {
//           if (pendingAcks.has(messageId)) {
//             clearTimeout(pendingAcks.get(messageId).ackTimeout);
//             pendingAcks.delete(messageId);
//             message.status = 'delivered';
//             callback({ status: 'delivered', messageId });
//           }
//         });
//       } else {
//         const recipientMessages = messageStore.get(recipientId) || [];
//         recipientMessages.push(message);
//         messageStore.set(recipientId, recipientMessages);

//         callback({ status: 'queued', messageId });
//       }
//     });

//     socket.on('message_ack', ({ messageId, recipientId, status }) => {
//       const message = Array.from(messageStore.values())
//         .flat()
//         .find(msg => msg.messageId === messageId);

//       if (message) {
//         message.status = status;

//         const sender = connectedUsers.get(message.senderId);
//         if (sender) {
//           io.to(sender.socketId).emit('message_status', { messageId, status });
//         }
//       }
//     });

//     socket.on('video_offer', ({ offer, recipientId }) => {
//       const recipient = connectedUsers.get(recipientId);
//       if (recipient) {
//         io.to(recipient.socketId).emit('video_offer', {
//           offer,
//           senderId: Array.from(connectedUsers.entries())
//             .find(([_, userData]) => userData.socketId === socket.id)?.[0]
//         });
//       }
//     });

//     socket.on('video_answer', ({ answer, recipientId }) => {
//       const recipient = connectedUsers.get(recipientId);
//       if (recipient) {
//         io.to(recipient.socketId).emit('video_answer', {
//           answer,
//           senderId: Array.from(connectedUsers.entries())
//             .find(([_, userData]) => userData.socketId === socket.id)?.[0]
//         });
//       }
//     });

//     socket.on('ice_candidate', ({ candidate, recipientId }) => {
//       const recipient = connectedUsers.get(recipientId);
//       if (recipient) {
//         io.to(recipient.socketId).emit('ice_candidate', {
//           candidate,
//           senderId: Array.from(connectedUsers.entries())
//             .find(([_, userData]) => userData.socketId === socket.id)?.[0]
//         });
//       }
//     });

//     socket.on('heartbeat', ({ userId }) => {
//       const user = connectedUsers.get(userId);
//       if (user) {
//         user.lastSeen = Date.now();
//       }
//     });

//     socket.on('disconnect', () => {
//       console.log(`User disconnected: ${socket.id}`);

//       const userEntry = Array.from(connectedUsers.entries())
//         .find(([_, userData]) => userData.socketId === socket.id);

//       if (userEntry) {
//         const [userId, userData] = userEntry;

//         setTimeout(() => {
//           const currentUserData = connectedUsers.get(userId);
//           if (currentUserData && currentUserData.socketId === socket.id) {
//             connectedUsers.delete(userId);

//             socket.broadcast.emit('user_status', {
//               userId,
//               username: userData.username,
//               status: 'offline'
//             });
//           }
//         }, 30000);
//       }
//     });
//   });

//   setInterval(() => {
//     const now = Date.now();
//     for (const [userId, userData] of connectedUsers.entries()) {
//       if (now - userData.lastSeen > 120000) {
//         connectedUsers.delete(userId);
//         io.emit('user_status', { userId, username: userData.username, status: 'offline' });
//       }
//     }
//   }, 60000);
// }

// module.exports = { setupSocketHandlers };

const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// In-memory store for connected users and messages
const connectedUsers = new Map();
const messageStore = new Map();
const pendingAcks = new Map();

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('register', ({ userId, username }) => {
      connectedUsers.set(userId, {
        socketId: socket.id,
        username,
        userId,
        lastSeen: Date.now()
      });

      if (!messageStore.has(userId)) {
        messageStore.set(userId, []);
      }

      socket.broadcast.emit('user_status', { userId, username, status: 'online' });

      const onlineUsers = Array.from(connectedUsers.values()).map(user => ({
        userId: user.userId,
        username: user.username,
        status: 'online'
      }));
      socket.emit('online_users', onlineUsers);

      const pendingMessages = messageStore.get(userId) || [];
      if (pendingMessages.length > 0) {
        socket.emit('pending_messages', pendingMessages);
      }
    });

    socket.on('send_message', (messageData, callback) => {
      const { senderId, recipientId, content, messageId = uuidv4(), timestamp = Date.now(), attempts = 1 } = messageData;

      const message = { messageId, senderId, recipientId, content, timestamp, status: 'sent', attempts };

      const senderMessages = messageStore.get(senderId) || [];
      senderMessages.push(message);
      messageStore.set(senderId, senderMessages);

      const recipient = connectedUsers.get(recipientId);
      if (recipient) {
        const ackTimeout = setTimeout(() => {
          if (pendingAcks.has(messageId)) {
            pendingAcks.delete(messageId);
            callback({ status: 'timeout', messageId });
          }
        }, 5000);

        pendingAcks.set(messageId, { ackTimeout, message });

        io.to(recipient.socketId).emit('receive_message', message, (ackData) => {
          if (pendingAcks.has(messageId)) {
            clearTimeout(pendingAcks.get(messageId).ackTimeout);
            pendingAcks.delete(messageId);
            message.status = 'delivered';
            callback({ status: 'delivered', messageId });
          }
        });
      } else {
        const recipientMessages = messageStore.get(recipientId) || [];
        recipientMessages.push(message);
        messageStore.set(recipientId, recipientMessages);

        callback({ status: 'queued', messageId });
      }
    });

    socket.on('message_ack', ({ messageId, recipientId, status }) => {
      const message = Array.from(messageStore.values())
        .flat()
        .find(msg => msg.messageId === messageId);

      if (message) {
        message.status = status;

        const sender = connectedUsers.get(message.senderId);
        if (sender) {
          io.to(sender.socketId).emit('message_status', { messageId, status });
        }
      }
    });

    socket.on('video_offer', ({ offer, recipientId }) => {
      const recipient = connectedUsers.get(recipientId);
      if (recipient) {
        io.to(recipient.socketId).emit('video_offer', {
          offer,
          senderId: Array.from(connectedUsers.entries())
            .find(([_, userData]) => userData.socketId === socket.id)?.[0]
        });
      }
    });

    socket.on('video_answer', ({ answer, recipientId }) => {
      const recipient = connectedUsers.get(recipientId);
      if (recipient) {
        io.to(recipient.socketId).emit('video_answer', {
          answer,
          senderId: Array.from(connectedUsers.entries())
            .find(([_, userData]) => userData.socketId === socket.id)?.[0]
        });
      }
    });

    socket.on('ice_candidate', ({ candidate, recipientId }) => {
      const recipient = connectedUsers.get(recipientId);
      if (recipient) {
        io.to(recipient.socketId).emit('ice_candidate', {
          candidate,
          senderId: Array.from(connectedUsers.entries())
            .find(([_, userData]) => userData.socketId === socket.id)?.[0]
        });
      }
    });

    socket.on('heartbeat', ({ userId }) => {
      const user = connectedUsers.get(userId);
      if (user) {
        user.lastSeen = Date.now();
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);

      const userEntry = Array.from(connectedUsers.entries())
        .find(([_, userData]) => userData.socketId === socket.id);

      if (userEntry) {
        const [userId, userData] = userEntry;

        setTimeout(() => {
          const currentUserData = connectedUsers.get(userId);
          if (currentUserData && currentUserData.socketId === socket.id) {
            connectedUsers.delete(userId);

            socket.broadcast.emit('user_status', {
              userId,
              username: userData.username,
              status: 'offline'
            });
          }
        }, 30000);
      }
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [userId, userData] of connectedUsers.entries()) {
      if (now - userData.lastSeen > 120000) {
        connectedUsers.delete(userId);
        io.emit('user_status', { userId, username: userData.username, status: 'offline' });
      }
    }
  }, 60000);
}

module.exports = { setupSocketHandlers };

