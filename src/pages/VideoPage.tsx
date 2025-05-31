import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useVideoStore } from '../stores/videoStore';
import VideoPlayer from '../components/video/VideoPlayer';
import { ArrowLeft, MessageCircle, ThumbsUp, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { PrivateChat } from '../components/chat/PrivateChat';
import { supabase } from '../lib/supabase';
import CommentSection from '../components/comments/CommentSection';

interface UserInfo {
  id: string;
  username: string;
  avatar_url: string | null;
  verified: boolean;
  is_admin: boolean;
}

const VideoPage = () => {
  const { id } = useParams<{ id: string }>();
  const { currentVideo, fetchVideoById, loading, voteForVideo, fetchComments, comments, addComment, deleteComment } = useVideoStore();
  const { user, isAdmin } = useAuthStore();
  const [uploader, setUploader] = useState<UserInfo | null>(null);
  const [showChat, setShowChat] = useState(false);
  
  useEffect(() => {
    if (id) {
      fetchVideoById(id);
      fetchComments(id);
    }
  }, [id, fetchVideoById, fetchComments]);

  useEffect(() => {
    const fetchUploader = async () => {
      if (currentVideo?.uploaded_by) {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, avatar_url, verified, is_admin')
          .eq('id', currentVideo.uploaded_by)
          .single();
          
        if (!error && data) {
          setUploader(data);
        }
      }
    };
    
    fetchUploader();
  }, [currentVideo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin  border-4 border-t-blue-500"></div>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="mt-10 text-center">
        <h2 className="text-xl">Video not found</h2>
        <Link to="/" className="mt-4 inline-block text-blue-400 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl">
      <Link to="/" className="mb-4 inline-flex items-center text-blue-400 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to videos
      </Link>
      
      <VideoPlayer
        videoId={currentVideo.id}
        url={currentVideo.url}
        uploaderId={currentVideo.uploaded_by}
        isAdmin={isAdmin}
      />
      
      <div className="mt-4">
        <h1 className="text-2xl font-bold">{currentVideo.title}</h1>
        
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center">
            {uploader && (
              <>
                <Link 
                  to={`/profile/${uploader.username}`}
                  className="flex items-center hover:opacity-80"
                >
                  <img
                    src={uploader.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${uploader.id}`}
                    alt={uploader.username}
                    className="mr-2 h-9 w-9 "
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-medium">@{uploader.username}</p>
                      {uploader.verified && (
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                      )}
                      {uploader.is_admin && (
                        <span className="ml-1  bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {uploader.is_admin ? 'Admin' : 'User'}
                    </p>
                  </div>
                </Link>
              </>
            )}
          </div>
          
          <div className="flex space-x-2">
            {uploader && uploader.id !== user?.id && (
              <button
                className="flex items-center gap-2  bg-gray-700 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-600"
                onClick={() => setShowChat(true)}
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </button>
            )}
            
            <button
              className="flex items-center gap-2  bg-gray-700 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-600"
              onClick={() => voteForVideo(currentVideo.id)}
            >
              <ThumbsUp className="h-4 w-4" />
              Vote
            </button>
          </div>
        </div>
        
        {currentVideo.description && (
          <div className="mt-6  bg-gray-800/50 p-4 backdrop-blur-sm">
            <h2 className="mb-2 font-semibold">Description</h2>
            <p className="text-gray-300">{currentVideo.description}</p>
          </div>
        )}

        <CommentSection
          videoId={currentVideo.id}
          comments={comments}
          onAddComment={(content) => addComment(currentVideo.id, content)}
          onDeleteComment={deleteComment}
        />
      </div>
      
      {showChat && uploader && (
        <PrivateChat
          userId={uploader.id}
          username={uploader.username}
          avatarUrl={uploader.avatar_url}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
};

export default VideoPage;