import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { Send, X, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { Link } from 'react-router-dom';

interface PrivateChatProps {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  isVerified?: boolean;
  onClose: () => void;
}

export const PrivateChat = ({ userId, username, avatarUrl, isAdmin, isVerified, onClose }: PrivateChatProps) => {
  const { privateChats, sendPrivateMessage, fetchPrivateMessages, subscribeToMessages } = useChatStore();
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = privateChats[userId] || [];

  useEffect(() => {
    fetchPrivateMessages(userId);
    const unsubscribe = subscribeToMessages();
    return () => {
      unsubscribe();
    };
  }, [userId, fetchPrivateMessages, subscribeToMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !user) return;
    
    const success = await sendPrivateMessage(userId, message);
    if (success) {
      setMessage('');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-10 flex h-96 w-80 flex-col overflow-hidden  bg-gray-900 shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-800 p-3">
        <div className="flex items-center">
          <Link to={`/profile/${username}`} className="flex items-center">
            <img
              src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`}
              alt={username}
              className="mr-2 h-8 w-8 "
            />
            <div>
              <div className="flex items-center">
                <span className="font-medium">{username}</span>
                {isVerified && <CheckCircle className="ml-1 h-4 w-4 text-blue-500" />}
                {isAdmin && (
                  <span className="ml-1  bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </Link>
        </div>
        <button
          className=" p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender_id === user?.id ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender_id !== user?.id && (
                  <Link to={`/profile/${msg.sender?.username}`}>
                    <img
                      src={msg.sender?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender_id}`}
                      alt="Avatar"
                      className="mr-2 h-8 w-8 "
                    />
                  </Link>
                )}
                <div
                  className={`max-w-xs  p-3 ${
                    msg.sender_id === user?.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-200'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <span className="mt-1 block text-right text-xs text-gray-300">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-800 p-3">
        <div className="flex items-center  border border-gray-700 bg-gray-800 p-1">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 bg-transparent px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="ml-1  bg-blue-600 p-1.5 text-white hover:bg-blue-500 disabled:opacity-50"
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default PrivateChat