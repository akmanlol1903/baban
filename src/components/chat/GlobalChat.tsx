import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { Send, CheckCircle, Trash2, Edit2, X, Check, Reply } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface GlobalChatProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const GlobalChat = ({ isOpen }: GlobalChatProps) => {
  const { messages, loading, sendGlobalMessage, fetchGlobalMessages, subscribeToMessages, editMessage, deleteMessage } = useChatStore();
  const { user, isAdmin } = useAuthStore();
  const [message, setMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchGlobalMessages();
      const unsubscribe = subscribeToMessages();
      return () => {
        unsubscribe();
      };
    }
  }, [isOpen, fetchGlobalMessages, subscribeToMessages]);

  useEffect(() => {
    if (shouldScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldScroll]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    setShouldScroll(isAtBottom);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !user) return;

    if (isAdmin && message.startsWith('/')) {
      const command = message.toLowerCase();
      if (command === '/clear') {
        const confirmed = window.confirm('Are you sure you want to clear all messages?');
        if (confirmed) {
          await deleteMessage(null);
          setMessage('');
        }
        return;
      }
    }
    
    const success = await sendGlobalMessage(message, replyingTo?.id);
    if (success) {
      setMessage('');
      setReplyingTo(null);
      setShouldScroll(true);
    }
  };

  const handleStartEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) {
      const confirmed = window.confirm('Empty message will be deleted. Continue?');
      if (confirmed) {
        await handleConfirmDelete(messageId);
        return;
      }
      return;
    }
    await editMessage(messageId, editContent);
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleDeleteClick = (messageId: string) => {
    setShowDeleteConfirm(messageId);
  };

  const handleConfirmDelete = async (messageId: string) => {
    await deleteMessage(messageId);
    setShowDeleteConfirm(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  const handleReply = (messageId: string, content: string) => {
    setReplyingTo({ id: messageId, content });
  };

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-5 w-5 animate-spin  border-2 border-t-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className="group flex hover:bg-gray-800/50  p-2 transition-colors"
              >
                <Link to={`/profile/${msg.sender?.username}`} className="mr-2 shrink-0">
                  <div className="relative">
                    <img
                      src={msg.sender?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender_id}`}
                      alt="Avatar"
                      className="h-8 w-8 "
                    />
                    {msg.sender?.is_online && (
                      <div className="absolute -bottom-1 -right-1 h-3 w-3  bg-green-500 ring-2 ring-gray-900" />
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <Link to={`/profile/${msg.sender?.username}`} className="font-medium hover:text-blue-400 truncate">
                      {msg.sender?.username || 'Unknown User'}
                    </Link>
                    {msg.sender?.verified && (
                      <CheckCircle className="h-4 w-4 text-blue-500 shrink-0" />
                    )}
                    {msg.sender?.is_admin && (
                      <span className=" bg-red-500 px-2 py-0.5 text-xs font-medium text-white shrink-0">
                        Admin
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                    {msg.edited && (
                      <span className="text-xs text-gray-500 italic">
                        (edited)
                      </span>
                    )}
                    {(user?.id === msg.sender_id || isAdmin) && (
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <div className="relative flex items-center gap-1  bg-gray-700/50 p-1">
                          {editingMessageId === msg.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(msg.id)}
                                className=" p-1 text-green-400 hover:bg-gray-700 group/button"
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className=" p-1 text-red-400 hover:bg-gray-700 group/button"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleReply(msg.id, msg.content)}
                                className=" p-1 text-gray-400 hover:bg-gray-700 hover:text-white group/button"
                              >
                                <Reply className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleStartEdit(msg.id, msg.content)}
                                className=" p-1 text-gray-400 hover:bg-gray-700 hover:text-white group/button"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(msg.id)}
                                className=" p-1 text-gray-400 hover:bg-gray-700 hover:text-white group/button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.reply_to && (
                    <div className="mt-1  border-l-2 border-gray-700 bg-gray-800/50 px-2 py-1">
                      <div className="text-sm text-gray-300 line-clamp-1">
                        {msg.reply_to_content}
                      </div>
                    </div>
                  )}
                  {editingMessageId === msg.id ? (
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="mt-1 w-full  bg-gray-700 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-300 break-words">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-800 p-4">
        {replyingTo && (
          <div className="mb-2 flex items-center justify-between  bg-gray-800 p-2">
            <div className="text-sm text-gray-400 truncate">
              Replying to: {replyingTo.content}
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className=" p-1 text-gray-400 hover:bg-gray-700 hover:text-white ml-2 shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center  bg-gray-800 p-1">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 bg-transparent px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none"
            placeholder={isAdmin ? "Type a message or use /clear..." : "Type a message..."}
          />
          <button
            type="submit"
            className="ml-1  bg-blue-600 p-1.5 text-white hover:bg-blue-500 disabled:opacity-50 shrink-0"
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm  bg-gray-800 p-4 shadow-lg">
            <p className="mb-4 text-center">Are you sure you want to delete this message?</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => handleConfirmDelete(showDeleteConfirm)}
                className=" bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={handleCancelDelete}
                className=" bg-gray-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalChat;