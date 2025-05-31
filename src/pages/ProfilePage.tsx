import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Users, MessageCircle, Settings, Trash2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import PrivateChat from '../components/chat/PrivateChat';
import { formatDistanceToNow } from 'date-fns';

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  verified: boolean;
  is_admin: boolean;
  followers_count: number;
  following_count: number;
  cum_count: number;
  total_cum_duration: number;
  about?: string;
  is_online: boolean;
  last_seen: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
  user_id: string;
}

const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    if (username) {
      fetchProfile();
      fetchComments();
    }
  }, [username]);

  const fetchProfile = async () => {
    if (!username) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.replace('@', ''))
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } else if (data) {
      // Calculate total cum duration from cum_markers
      const { data: cumMarkers } = await supabase
        .from('cum_markers')
        .select('timestamp')
        .eq('user_id', data.id);

      const totalDuration = cumMarkers?.reduce((acc, marker) => acc + marker.timestamp, 0) || 0;
      
      setProfile({
        ...data,
        total_cum_duration: totalDuration
      });

      // Only check follow status if viewing another user's profile
      if (user && user.id !== data.id) {
        checkFollowStatus(data.id);
      }
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    if (!username) return;

    const { data, error } = await supabase
      .from('profile_comment_details')
      .select('*')
      .eq('profile_username', username.replace('@', ''))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    if (data) {
      setComments(data);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('profile_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return;
    }

    await fetchComments();
  };

  const fetchFollowers = async (userId: string) => {
    setLoadingUsers(true);
    const { data: followData, error: followError } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId);

    if (followError) {
      console.error('Error fetching followers:', followError);
      setLoadingUsers(false);
      return;
    }

    if (followData && followData.length > 0) {
      const followerIds = followData.map(f => f.follower_id);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .in('id', followerIds);

      if (userError) {
        console.error('Error fetching follower users:', userError);
      } else if (userData) {
        setFollowers(userData);
      }
    } else {
      setFollowers([]);
    }
    setLoadingUsers(false);
  };

  const fetchFollowing = async (userId: string) => {
    setLoadingUsers(true);
    const { data: followData, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (followError) {
      console.error('Error fetching following:', followError);
      setLoadingUsers(false);
      return;
    }

    if (followData && followData.length > 0) {
      const followingIds = followData.map(f => f.following_id);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .in('id', followingIds);

      if (userError) {
        console.error('Error fetching following users:', userError);
      } else if (userData) {
        setFollowing(userData);
      }
    } else {
      setFollowing([]);
    }
    setLoadingUsers(false);
  };

  const checkFollowStatus = async (profileId: string) => {
    if (!user || user.id === profileId) return;

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profileId)
      .single();

    setIsFollowing(!!data);
  };

  const toggleFollow = async () => {
    if (!user || !profile || user.id === profile.id) return;

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profile.id);
    } else {
      await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: profile.id
        });
    }

    setIsFollowing(!isFollowing);
    fetchProfile();
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !newComment.trim()) return;

    const { error } = await supabase
      .from('profile_comments')
      .insert({
        user_id: user.id,
        profile_username: profile.username,
        content: newComment
      });

    if (error) {
      console.error('Error adding comment:', error);
      return;
    }

    setNewComment('');
    fetchComments();
  };

  const openModal = async (type: 'followers' | 'following') => {
    if (!profile) return;
    
    setModalType(type);
    setSearchTerm('');
    if (type === 'followers') {
      await fetchFollowers(profile.id);
    } else {
      await fetchFollowing(profile.id);
    }
  };

  const filteredUsers = (modalType === 'followers' ? followers : following).filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin  border-4 border-t-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold">User not found</h2>
        <p className="mt-2 text-gray-400">The user @{username} doesn't exist</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className=" bg-card text-card-foreground  border shadow-sm p-8 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <img
              src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id}`}
              alt={profile.username}
              className="h-24 w-24  ring-4 ring-blue-500/50"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">@{profile.username}</h1>
                {profile.verified && (
                  <div className="group relative">
                    <CheckCircle className="h-6 w-6 text-blue-500" />
                    <div className="absolute -left-1/2 -top-8 hidden whitespace-nowrap  bg-gray-900 px-2 py-1 text-sm group-hover:block">
                      Verified User
                    </div>
                  </div>
                )}
                {profile.is_admin && (
                  <span className=" bg-red-500 px-3 py-1 text-sm font-medium text-white">
                    Admin
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-4 text-gray-300">
                <button
                  onClick={() => openModal('followers')}
                  className="flex items-center gap-1 hover:text-white"
                >
                  <Users className="h-4 w-4" />
                  <span className="font-medium text-white">{profile.followers_count}</span> followers
                </button>
                <span>·</span>
                <button
                  onClick={() => openModal('following')}
                  className="hover:text-white"
                >
                  <span className="font-medium text-white">{profile.following_count}</span> following
                </button>
                <span>·</span>
                <span className={`text-sm ${profile.is_online ? 'text-green-400' : 'text-gray-400'}`}>
                  {profile.is_online ? 'Online' : `Last seen ${formatDistanceToNow(new Date(profile.last_seen), { addSuffix: true })}`}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-gray-300">
                  {profile.about || 'No bio yet'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {user?.id === profile.id ? (
              <Link
                to="/settings"
                className=" bg-gray-700 p-2 text-white hover:bg-gray-600"
              >
                <Settings className="h-5 w-5" />
              </Link>
            ) : user && (
              <>
                <button
                  onClick={() => setShowChat(true)}
                  className=" bg-gray-700 p-2 text-white hover:bg-gray-600"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
                <button
                  onClick={toggleFollow}
                  className={` px-6 py-2 font-medium transition ${
                    isFollowing
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <div className=" bg-gray-700/50 p-6 text-center">
            <h3 className="text-lg font-medium text-gray-300">Total Cums</h3>
            <p className="mt-2 text-3xl font-bold">{profile.cum_count}</p>
          </div>
          <div className=" bg-gray-700/50 p-6 text-center">
            <h3 className="text-lg font-medium text-gray-300">Total Duration</h3>
            <p className="mt-2 text-3xl font-bold">{profile.total_cum_duration}s</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="mb-4 text-xl font-semibold">Comments</h3>
          <form onSubmit={handleComment} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full  bg-gray-700 p-3 text-white placeholder-gray-400"
              rows={2}
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="mt-2  bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Post Comment
            </button>
          </form>
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className=" bg-gray-700/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={comment.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.id}`}
                      alt={comment.username}
                      className="h-8 w-8 "
                    />
                    <Link
                      to={`/profile/${comment.username}`}
                      className="font-medium hover:text-blue-400"
                    >
                      @{comment.username}
                    </Link>
                    <span className="text-sm text-gray-400">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {(user?.id === comment.user_id || user?.id === profile?.id) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className=" p-1 text-gray-400 hover:bg-gray-600 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-gray-300">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Followers/Following Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md  bg-gray-800 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {modalType === 'followers' ? 'Followers' : 'Following'}
              </h2>
              <button
                onClick={() => setModalType(null)}
                className=" p-2 hover:bg-gray-700"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4 w-full  bg-gray-700 p-2 text-white placeholder-gray-400"
            />
            <div className="max-h-96 overflow-y-auto">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin  border-4 border-t-blue-500"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  {searchTerm ? 'No users found matching your search' : 'No users found'}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <Link
                    key={user.id}
                    to={`/profile/${user.username}`}
                    className="flex items-center gap-3  p-3 hover:bg-gray-700"
                    onClick={() => setModalType(null)}
                  >
                    <img
                      src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                      alt={user.username}
                      className="h-10 w-10 "
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">@{user.username}</span>
                        {user.verified && <CheckCircle className="h-4 w-4 text-blue-500" />}
                        {user.is_admin && (
                          <span className=" bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {user.is_online ? 'Online' : `Last seen ${formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}`}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showChat && profile && (
        <PrivateChat
          userId={profile.id}
          username={profile.username}
          avatarUrl={profile.avatar_url}
          isAdmin={profile.is_admin}
          isVerified={profile.verified}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
};

export default ProfilePage;