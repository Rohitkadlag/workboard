// import React, { useState, useEffect, useRef } from 'react';
// import { getSocket, joinProject, sendMessage } from '../utils/socket.js';
// import { useAuth } from '../context/AuthContext.jsx';

// const ChatPanel = ({ projectId }) => {
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState('');
//   const [isConnected, setIsConnected] = useState(false);
//   const [error, setError] = useState('');
//   const messagesEndRef = useRef(null);
//   const { user } = useAuth();

//   useEffect(() => {
//     if (!projectId) return;

//     const socket = getSocket();
//     if (!socket) {
//       setError('Socket connection not available');
//       return;
//     }

//     // Set up socket event listeners
//     const handleConnect = () => {
//       setIsConnected(true);
//       setError('');
//       joinProject(projectId);
//     };

//     const handleDisconnect = () => {
//       setIsConnected(false);
//     };

//     const handleJoinedProject = () => {
//       console.log('Joined project room:', projectId);
//     };

//     const handleMessagesHistory = (data) => {
//       if (data.projectId === projectId) {
//         setMessages(data.messages || []);
//       }
//     };

//     const handleNewMessage = (data) => {
//       if (data.projectId === projectId) {
//         setMessages(prev => [...prev, data.message]);
//       }
//     };

//     const handleError = (error) => {
//       console.error('Socket error:', error);
//       setError(error.message || 'Connection error');
//     };

//     // Attach listeners
//     socket.on('connect', handleConnect);
//     socket.on('disconnect', handleDisconnect);
//     socket.on('joined:project', handleJoinedProject);
//     socket.on('messages:history', handleMessagesHistory);
//     socket.on('message:new', handleNewMessage);
//     socket.on('error', handleError);

//     // Initial connection check
//     if (socket.connected) {
//       handleConnect();
//     }

//     return () => {
//       // Clean up listeners
//       socket.off('connect', handleConnect);
//       socket.off('disconnect', handleDisconnect);
//       socket.off('joined:project', handleJoinedProject);
//       socket.off('messages:history', handleMessagesHistory);
//       socket.off('message:new', handleNewMessage);
//       socket.off('error', handleError);
//     };
//   }, [projectId]);

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
    
//     if (!newMessage.trim()) return;
//     if (!isConnected) {
//       setError('Not connected to chat');
//       return;
//     }

//     sendMessage(projectId, newMessage.trim());
//     setNewMessage('');
//     setError('');
//   };

//   const formatTime = (timestamp) => {
//     return new Date(timestamp).toLocaleTimeString('en-US', {
//       hour: '2-digit',
//       minute: '2-digit',
//     });
//   };

//   const isOwnMessage = (message) => {
//     return message.sender?._id === user?.id;
//   };

//   return (
//     <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
//       {/* Header */}
//       <div className="flex items-center justify-between p-4 border-b border-gray-200">
//         <h3 className="text-lg font-semibold text-gray-900">Team Chat</h3>
//         <div className="flex items-center space-x-2">
//           <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
//           <span className="text-xs text-gray-500">
//             {isConnected ? 'Connected' : 'Disconnected'}
//           </span>
//         </div>
//       </div>

//       {/* Error display */}
//       {error && (
//         <div className="mx-4 mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
//           <p className="text-xs text-red-700">{error}</p>
//         </div>
//       )}

//       {/* Messages */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-4">
//         {messages.length === 0 ? (
//           <div className="text-center py-8">
//             <span className="text-4xl mb-4 block">💬</span>
//             <p className="text-gray-500 text-sm">No messages yet</p>
//             <p className="text-gray-400 text-xs mt-1">Start the conversation!</p>
//           </div>
//         ) : (
//           messages.map((message, index) => (
//             <div
//               key={message._id || index}
//               className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
//             >
//               <div
//                 className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
//                   isOwnMessage(message)
//                     ? 'bg-brand-600 text-white'
//                     : 'bg-gray-100 text-gray-900'
//                 }`}
//               >
//                 {!isOwnMessage(message) && (
//                   <p className="text-xs font-medium mb-1 text-gray-600">
//                     {message.sender?.name}
//                   </p>
//                 )}
//                 <p className="text-sm whitespace-pre-wrap break-words">
//                   {message.body}
//                 </p>
//                 <p className={`text-xs mt-1 ${
//                   isOwnMessage(message) ? 'text-brand-100' : 'text-gray-500'
//                 }`}>
//                   {formatTime(message.createdAt)}
//                 </p>
//               </div>
//             </div>
//           ))
//         )}
//         <div ref={messagesEndRef} />
//       </div>

//       {/* Message input */}
//       <div className="p-4 border-t border-gray-200">
//         <form onSubmit={handleSubmit} className="flex space-x-2">
//           <input
//             type="text"
//             value={newMessage}
//             onChange={(e) => setNewMessage(e.target.value)}
//             placeholder={isConnected ? "Type a message..." : "Connecting..."}
//             disabled={!isConnected}
//             className="form-input flex-1 text-sm"
//             maxLength={500}
//           />
//           <button
//             type="submit"
//             disabled={!isConnected || !newMessage.trim()}
//             className="btn btn-primary btn-sm"
//           >
//             Send
//           </button>
//         </form>
//         {newMessage.length > 450 && (
//           <p className="text-xs text-gray-500 mt-1">
//             {500 - newMessage.length} characters remaining
//           </p>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ChatPanel;

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { getSocket, joinProject, sendMessage } from '../utils/socket.js';
import { useAuth } from '../context/AuthContext.jsx';

const ChatPanel = ({ projectId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!projectId) return;

    const socket = getSocket();
    if (!socket) {
      setError('Socket connection not available');
      return;
    }

    // Set up socket event listeners
    const handleConnect = () => {
      setIsConnected(true);
      setError('');
      joinProject(projectId);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleJoinedProject = () => {
      console.log('Joined project room:', projectId);
    };

    const handleMessagesHistory = (data) => {
      if (data.projectId === projectId) {
        setMessages(data.messages || []);
      }
    };

    const handleNewMessage = (data) => {
      if (data.projectId === projectId) {
        setMessages(prev => [...prev, data.message]);
      }
    };

    const handleError = (error) => {
      console.error('Socket error:', error);
      setError(error.message || 'Connection error');
    };

    // Attach listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('joined:project', handleJoinedProject);
    socket.on('messages:history', handleMessagesHistory);
    socket.on('message:new', handleNewMessage);
    socket.on('error', handleError);

    // Initial connection check
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      // Clean up listeners
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('joined:project', handleJoinedProject);
      socket.off('messages:history', handleMessagesHistory);
      socket.off('message:new', handleNewMessage);
      socket.off('error', handleError);
    };
  }, [projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    if (!isConnected) {
      setError('Not connected to chat');
      return;
    }

    sendMessage(projectId, newMessage.trim());
    setNewMessage('');
    setError('');
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOwnMessage = (message) => {
    return message.sender?._id === user?.id;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200/80 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Team Chat</h3>
            <p className="text-sm text-gray-500">Collaborate in real-time</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all duration-200 ${
            isConnected 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {isConnected ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span className="text-xs font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200/60 rounded-lg animate-in fade-in duration-300">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-700 mb-2">No messages yet</h4>
            <p className="text-gray-500 text-sm">Start the conversation with your team!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message._id || index}
              className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom duration-300`}
            >
              <div className={`group max-w-xs lg:max-w-md ${isOwnMessage(message) ? 'ml-12' : 'mr-12'}`}>
                {!isOwnMessage(message) && (
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">
                        {message.sender?.name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-600">
                      {message.sender?.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                )}
                <div
                  className={`relative px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 group-hover:shadow-md ${
                    isOwnMessage(message)
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {message.body}
                  </p>
                  {isOwnMessage(message) && (
                    <p className="text-xs mt-2 text-blue-100 opacity-80">
                      {formatTime(message.createdAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-6 bg-white/80 backdrop-blur-sm border-t border-gray-100">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              disabled={!isConnected}
              rows={1}
              maxLength={500}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 text-sm leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            {newMessage.length > 450 && (
              <p className="text-xs text-amber-600 mt-2 font-medium animate-pulse">
                {500 - newMessage.length} characters remaining
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={!isConnected || !newMessage.trim()}
            className="flex items-center justify-center w-11 h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-blue-600 disabled:hover:shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;