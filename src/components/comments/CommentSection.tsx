import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2, CheckCircle } from 'lucide-react';
import { Database } from '../../lib/database.types';
import { Link } from 'react-router-dom';

type Comment = Database['public']['Views']['comment_details']['Row'];

interface CommentSectionProps {
  videoId: string;
  comments: Comment[];
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

const CommentSection = ({ videoId, comments, onAddComment, onDeleteComment }: CommentSectionProps) => {
  const [content, setContent] = useState('');
  const { user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await onAddComment(content);
    setContent('');
  };

  return (
    <div className="mt-8  bg-gray-800/50 p-6 backdrop-blur-sm">
      <h2 className="text-xl font-semibold">Comments</h2>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex gap-4">
          <img
            src={user?.user_metadata.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
            alt="Avatar"
            className="h-10 w-10 "
          />
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment..."
              className="w-full  bg-gray-700 p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={!content.trim()}
                className="flex items-center gap-2  bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Comment
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="mt-8 space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4">
            <Link to={`/profile/${comment.username}`}>
              <img
                src={comment.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.user_id}`}
                alt={comment.username}
                className="h-10 w-10 "
              />
            </Link>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link to={`/profile/${comment.username}`} className="font-medium hover:text-blue-400">
                    {comment.username}
                  </Link>
                  {comment.verified && (
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                  )}
                  {comment.is_admin && (
                    <span className=" bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                      Admin
                    </span>
                  )}
                  <span className="text-sm text-gray-400">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                {user?.id === comment.user_id && (
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className=" p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-gray-300">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommentSection;