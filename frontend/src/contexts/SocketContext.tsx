// client/src/contexts/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  reconnecting: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  reconnecting: false
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;

    // Replace with your backend URL
    
   // Connect to the WebSocket server
    const socketInstance = io('https://silver-goldfish-vjpgwp6v5r6356p-3000.app.github.dev/', {
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });
    
    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      setReconnecting(false);
      
      // Register user
      socketInstance.emit('register', {
        userId: user.id,
        username: user.username
      });
    });
    
    socketInstance.on('connect_error', () => {
      console.log('Connection error');
      setConnected(false);
    });
    
    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
      setReconnecting(true);
    });
    
    socketInstance.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnection attempt: ${attempt}`);
      setReconnecting(true);
    });
    
    socketInstance.on('reconnect', () => {
      console.log('Reconnected');
      setConnected(true);
      setReconnecting(false);
      
      // Re-register user
      socketInstance.emit('register', {
        userId: user.id,
        username: user.username
      });
    });
    
    setSocket(socketInstance);
    
    // Set up heartbeat
    const heartbeatInterval = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit('heartbeat', { userId: user.id });
      }
    }, 30000); // 30 seconds
    
    return () => {
      clearInterval(heartbeatInterval);
      socketInstance.disconnect();
    };
  }, [user]);
  
  return (
    <SocketContext.Provider value={{ socket, connected, reconnecting }}>
      {children}
    </SocketContext.Provider>
  );
};