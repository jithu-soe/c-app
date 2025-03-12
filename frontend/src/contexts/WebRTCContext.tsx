// client/src/contexts/WebRTCContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

interface WebRTCContextType {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'reconnecting' | 'ended';
  incomingCall: { from: string; username: string } | null;
  startCall: (recipientId: string) => Promise<void>;
  answerCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  reconnectionAttempts: number;
}

const WebRTCContext = createContext<WebRTCContextType>({
  localStream: null,
  remoteStream: null,
  callStatus: 'idle',
  incomingCall: null,
  startCall: async () => {},
  answerCall: async () => {},
  declineCall: () => {},
  endCall: () => {},
  toggleVideo: async () => {},
  toggleAudio: async () => {},
  isVideoEnabled: true,
  isAudioEnabled: true,
  reconnectionAttempts: 0
});

export const useWebRTC = () => useContext(WebRTCContext);

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'reconnecting' | 'ended'>('idle');
  const [incomingCall, setIncomingCall] = useState<{ from: string; username: string } | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const currentCallRecipient = useRef<string | null>(null);
  
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  
  // Initialize WebRTC connection
  const initializePeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    
    // Create new peer connection with ICE servers
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    });
    
    // Set up remote stream
    const remoteMediaStream = new MediaStream();
    setRemoteStream(remoteMediaStream);
    
    // Add event handlers
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && currentCallRecipient.current) {
        socket.emit('ice_candidate', {
          candidate: event.candidate,
          recipientId: currentCallRecipient.current
        });
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        if (callStatus === 'connected') {
          setCallStatus('reconnecting');
          setReconnectionAttempts(prev => prev + 1);
          
          // Attempt reconnection if we still have a connection to signaling server
          if (connected && currentCallRecipient.current && reconnectionAttempts < 5) {
            // Wait a bit before trying to reconnect
            setTimeout(() => {
              startCall(currentCallRecipient.current!);
            }, 1000 * Math.min(reconnectionAttempts + 1, 5)); // Exponential backoff
          } else if (reconnectionAttempts >= 5) {
            // Give up after 5 attempts
            endCall();
          }
        }
      } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallStatus('connected');
        setReconnectionAttempts(0);
      }
    };
    
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        remoteMediaStream.addTrack(track);
      });
    };
    
    peerConnection.current = pc;
    return pc;
  }, [socket, connected, callStatus, reconnectionAttempts]);
  
  // Handle incoming WebRTC signaling events
  useEffect(() => {
    if (!socket || !user) return;
    
    // Handle incoming video offer
    const handleVideoOffer = async ({ offer, senderId }: { offer: RTCSessionDescriptionInit, senderId: string }) => {
      // Store the sender as our call recipient
      currentCallRecipient.current = senderId;
      
      // Get username of caller
      const callerUsername = "User"; // Replace with actual username lookup
      
      // Set incoming call
      setIncomingCall({
        from: senderId,
        username: callerUsername
      });
      
      // Set call status
      setCallStatus('ringing');
      
      // Initialize peer connection
      const pc = initializePeerConnection();
      
      // Set remote description
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    };
    
    // Handle incoming answer to our call offer
    const handleVideoAnswer = async ({ answer, senderId }: { answer: RTCSessionDescriptionInit, senderId: string }) => {
      if (peerConnection.current && callStatus === 'calling') {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
          setCallStatus('connected');
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    };
    
    // Handle incoming ICE candidates
    const handleIceCandidate = async ({ candidate, senderId }: { candidate: RTCIceCandidateInit, senderId: string }) => {
      if (peerConnection.current && (callStatus === 'calling' || callStatus === 'connected' || callStatus === 'ringing')) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    };
    
    socket.on('video_offer', handleVideoOffer);
    socket.on('video_answer', handleVideoAnswer);
    socket.on('ice_candidate', handleIceCandidate);
    
    return () => {
      socket.off('video_offer');
      socket.off('video_answer');
      socket.off('ice_candidate');
    };
  }, [socket, user, callStatus, initializePeerConnection]);
  
  // Start a call to another user
  const startCall = useCallback(async (recipientId: string) => {
    if (!socket || !connected || !user) {
      throw new Error('Cannot start call: not connected');
    }
    
    // Store the recipient
    currentCallRecipient.current = recipientId;
    
    // Set call status
    setCallStatus('calling');
    
    try {
      // Get local media stream if not already acquired
      if (!localStream) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        
        // Initialize peer connection
        const pc = initializePeerConnection();
        
        // Add local tracks to peer connection
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      } else {
        // Initialize peer connection
        const pc = initializePeerConnection();
        
        // Add existing local tracks to peer connection
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }
      
      // Create and set local description
      const offer = await peerConnection.current!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await peerConnection.current!.setLocalDescription(offer);
      
      // Send offer to recipient
      socket.emit('video_offer', {
        offer,
        recipientId
      });
    } catch (error) {
      console.error('Error starting call:', error);
      setCallStatus('idle');
      currentCallRecipient.current = null;
    }
  }, [socket, connected, user, localStream, initializePeerConnection]);
  
  // Answer an incoming call
  const answerCall = useCallback(async () => {
    if (!socket || !incomingCall || !peerConnection.current) {
      return;
    }
    
    try {
      // Get local media stream if not already acquired
      if (!localStream) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        
        // Add local tracks to peer connection
        stream.getTracks().forEach(track => {
          peerConnection.current!.addTrack(track, stream);
        });
      } else {
        // Add existing local tracks to peer connection
        localStream.getTracks().forEach(track => {
          peerConnection.current!.addTrack(track, localStream);
        });
      }
      
      // Create and set local description
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      // Send answer to caller
      socket.emit('video_answer', {
        answer,
        recipientId: incomingCall.from
      });
      
      // Update call status
      setCallStatus('connected');
      setIncomingCall(null);
    } catch (error) {
      console.error('Error answering call:', error);
      declineCall();
    }
  }, [socket, incomingCall, localStream]);
  
  // Decline an incoming call
  const declineCall = useCallback(() => {
    // Reset states
    setCallStatus('idle');
    setIncomingCall(null);
    currentCallRecipient.current = null;
    
    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  }, []);
  
  // End an ongoing call
  const endCall = useCallback(() => {
    // Reset states
    setCallStatus('ended');
    setTimeout(() => setCallStatus('idle'), 2000); // Show ended state briefly
    currentCallRecipient.current = null;
    setReconnectionAttempts(0);
    
    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    // Stop local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  }, [localStream]);
  
  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);
  
  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);
  
  return (
    <WebRTCContext.Provider
      value={{
        localStream,
        remoteStream,
        callStatus,
        incomingCall,
        startCall,
        answerCall,
        declineCall,
        endCall,
        toggleVideo,
        toggleAudio,
        isVideoEnabled,
        isAudioEnabled,
        reconnectionAttempts
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};