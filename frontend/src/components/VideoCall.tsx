// import React, { useEffect, useRef } from 'react';
// import { useWebRTC } from '../contexts/WebRTCContext';

// const VideoCall: React.FC = () => {
//   const { localStream, remoteStream, isVideoEnabled, isAudioEnabled, toggleVideo, toggleAudio } = useWebRTC();
//   const localVideoRef = useRef<HTMLVideoElement>(null);
//   const remoteVideoRef = useRef<HTMLVideoElement>(null);

//   useEffect(() => {
//     if (localVideoRef.current && localStream) {
//       localVideoRef.current.srcObject = localStream;
//     }
//   }, [localStream]);

//   useEffect(() => {
//     if (remoteVideoRef.current && remoteStream) {
//       remoteVideoRef.current.srcObject = remoteStream;
//     }
//   }, [remoteStream]);

//   return (
//     <div className="flex-1 flex flex-col bg-black p-4">
//       {/* Remote Video Stream */}
//       <div className="flex-1 relative">
//         {remoteStream && (
//           <video
//             ref={remoteVideoRef}
//             className="w-full h-full object-cover"
//             autoPlay
//             playsInline
//           />
//         )}
//       </div>

//       {/* Local Video Stream */}
//       {localStream && (
//         <div className="absolute bottom-4 right-4 w-1/4 h-1/4">
//           <video
//             ref={localVideoRef}
//             className="w-full h-full object-cover rounded-lg shadow-lg"
//             autoPlay
//             playsInline
//             muted
//           />
//         </div>
//       )}

//       {/* Call Controls */}
//       <div className="flex justify-center space-x-4 mt-4">
//         <button
//           onClick={toggleVideo}
//           className={`p-2 rounded-full ${
//             isVideoEnabled ? 'bg-blue-500 text-white' : 'bg-gray-500 text-gray-200'
//           }`}
//         >
//           {isVideoEnabled ? 'Video On' : 'Video Off'}
//         </button>
//         <button
//           onClick={toggleAudio}
//           className={`p-2 rounded-full ${
//             isAudioEnabled ? 'bg-blue-500 text-white' : 'bg-gray-500 text-gray-200'
//           }`}
//         >
//           {isAudioEnabled ? 'Audio On' : 'Audio Off'}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default VideoCall;



// client/src/components/VideoCall.tsx
import React, { useEffect, useRef } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';

const VideoCall: React.FC = () => {
  const { localStream, remoteStream, toggleVideo, toggleAudio, isVideoEnabled, isAudioEnabled } =
    useWebRTC();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="relative h-1/2 bg-black">
      {/* Remote video - full size */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Local video - small overlay */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-4 right-4 w-32 h-24 object-cover border-2 border-white rounded-md"
      />

      {/* Control buttons */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
        <button
          onClick={toggleVideo}
          className={`p-2 rounded-full ${
            isVideoEnabled ? 'bg-gray-700' : 'bg-red-500'
          } text-white`}
          title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                isVideoEnabled
                  ? 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                  : 'M13 7l5 5m0 0l-5 5m5-5H6M4 6h2M4 18h2'
              }
            />
          </svg>
        </button>
        <button
          onClick={toggleAudio}
          className={`p-2 rounded-full ${
            isAudioEnabled ? 'bg-gray-700' : 'bg-red-500'
          } text-white`}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                isAudioEnabled
                  ? 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z'
                  : 'M5.586 5L19 18.414M12 4a3 3 0 013 3v6m-4 4v4m-4-4h8'
              }
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
