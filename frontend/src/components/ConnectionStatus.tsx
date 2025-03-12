// import React from 'react';

// interface ConnectionStatusProps {
//   connected: boolean;
//   reconnecting: boolean;
// }

// const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connected, reconnecting }) => {
//   return (
//     <div className="p-2 text-center text-sm">
//       {connected ? (
//         <span className="text-green-600">Connected</span>
//       ) : reconnecting ? (
//         <span className="text-yellow-600">Reconnecting...</span>
//       ) : (
//         <span className="text-red-600">Disconnected</span>
//       )}
//     </div>
//   );
// };

// export default ConnectionStatus;


// client/src/components/ConnectionStatus.tsx
import React from 'react';

interface ConnectionStatusProps {
  connected: boolean;
  reconnecting: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connected, reconnecting }) => {
  return (
    <div
      className={`p-2 text-center text-sm ${
        connected
          ? 'bg-green-100 text-green-800'
          : reconnecting
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800'
      }`}
    >
      {connected
        ? 'Connected'
        : reconnecting
        ? 'Reconnecting...'
        : 'Disconnected'}
    </div>
  );
};

export default ConnectionStatus;
