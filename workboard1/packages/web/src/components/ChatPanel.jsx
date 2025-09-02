import React, { useState, useEffect, useRef } from 'react';
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
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Team Chat</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">💬</span>
            <p className="text-gray-500 text-sm">No messages yet</p>
            <p className="text-gray-400 text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message._id || index}
              className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  isOwnMessage(message)
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {!isOwnMessage(message) && (
                  <p className="text-xs font-medium mb-1 text-gray-600">
                    {message.sender?.name}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.body}
                </p>
                <p className={`text-xs mt-1 ${
                  isOwnMessage(message) ? 'text-brand-100' : 'text-gray-500'
                }`}>
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={!isConnected}
            className="form-input flex-1 text-sm"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!isConnected || !newMessage.trim()}
            className="btn btn-primary btn-sm"
          >
            Send
          </button>
        </form>
        {newMessage.length > 450 && (
          <p className="text-xs text-gray-500 mt-1">
            {500 - newMessage.length} characters remaining
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;