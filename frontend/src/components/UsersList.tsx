// import React from 'react';

// interface User {
//   userId: string;
//   username: string;
//   status: 'online' | 'offline';
// }

// interface UsersListProps {
//   users: User[];
//   currentUser: { id: string; username: string } | null;
//   selectedUser: User | null;
//   onSelectUser: (user: User) => void;
// }

// const UsersList: React.FC<UsersListProps> = ({ users, currentUser, selectedUser, onSelectUser }) => {
//   return (
//     <div className="p-4">
//       <h3 className="text-lg font-semibold mb-4">Online Users</h3>
//       <ul>
//         {users.map((user) => (
//           <li
//             key={user.userId}
//             onClick={() => onSelectUser(user)}
//             className={`p-2 cursor-pointer rounded-md ${
//               selectedUser?.userId === user.userId ? 'bg-blue-100' : 'hover:bg-gray-100'
//             }`}
//           >
//             <div className="flex items-center">
//               <span className="mr-2">{user.username}</span>
//               {user.userId === currentUser?.id && <span className="text-sm text-gray-500">(You)</span>}
//               <span
//                 className={`w-2 h-2 rounded-full ml-auto ${
//                   user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
//                 }`}
//               ></span>
//             </div>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };

// export default UsersList;




// client/src/components/UsersList.tsx
import React from 'react';

interface User {
  userId: string;
  username: string;
  status: 'online' | 'offline';
}

interface UsersListProps {
  users: User[];
  currentUser: { id: string; username: string } | null;
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
}

const UsersList: React.FC<UsersListProps> = ({
  users,
  currentUser,
  selectedUser,
  onSelectUser,
}) => {
  return (
    <div className="overflow-y-auto h-[calc(100vh-80px)]">
      {users
        .filter((user) => user.userId !== currentUser?.id)
        .map((user) => (
          <div
            key={user.userId}
            onClick={() => onSelectUser(user)}
            className={`p-3 cursor-pointer hover:bg-gray-100 flex items-center space-x-2 ${
              selectedUser?.userId === user.userId ? 'bg-gray-100' : ''
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-gray-800">{user.username}</span>
          </div>
        ))}
    </div>
  );
};

export default UsersList;
