import { useEffect, useState } from 'react';
import { useVideoStore } from '../stores/videoStore';
import { PlusCircle, UserCheck, Video, ThumbsUp } from 'lucide-react';
import UploadVideoForm from '../components/video/UploadVideoForm';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { Database } from '../lib/database.types';
import AdminVideoCard from '../components/video/AdminVideoCard';

type Video = Database['public']['Tables']['videos']['Row'];

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean;
}

interface VoteCount {
  video_id: string;
  count: number;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const { videos, fetchVideos, loading, deleteVideo } = useVideoStore();
  const [activeTab, setActiveTab] = useState<'videos' | 'users' | 'votes'>('videos');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [voteCounts, setVoteCounts] = useState<VoteCount[]>([]);
  const [loadingVotes, setLoadingVotes] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    fetchVideos();
  }, [isAdmin, navigate, fetchVideos]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'votes') {
      fetchVoteCounts();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    
    setLoadingUsers(false);
  };

  const fetchVoteCounts = async () => {
    setLoadingVotes(true);
    
    const { data, error } = await supabase
      .from('votes')
      .select('video_id, count(*)')
      .group('video_id');
      
    if (error) {
      console.error('Error fetching vote counts:', error);
    } else {
      setVoteCounts(data.map(item => ({
        video_id: item.video_id,
        count: parseInt(item.count as unknown as string)
      })));
    }
    
    setLoadingVotes(false);
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    await supabase
      .from('users')
      .update({ is_admin: !currentStatus })
      .eq('id', userId);
      
    fetchUsers();
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      await deleteVideo(videoId);
      await fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  const handleEditVideo = (video: Video) => {
    setSelectedVideo(video);
    setShowEditForm(true);
  };

  const getVideoTitle = (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    return video ? video.title : 'Unknown Video';
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button
          className="flex items-center  bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          onClick={() => setShowUploadForm(true)}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Upload Video
        </button>
      </div>

      <div className="mb-6">
        <div className="flex space-x-1  bg-gray-800 p-1">
          <button
            className={`flex items-center  px-4 py-2 text-sm font-medium ${
              activeTab === 'videos' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => setActiveTab('videos')}
          >
            <Video className="mr-2 h-4 w-4" />
            Videos
          </button>
          <button
            className={`flex items-center  px-4 py-2 text-sm font-medium ${
              activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => setActiveTab('users')}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Users
          </button>
          <button
            className={`flex items-center  px-4 py-2 text-sm font-medium ${
              activeTab === 'votes' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => setActiveTab('votes')}
          >
            <ThumbsUp className="mr-2 h-4 w-4" />
            Votes
          </button>
        </div>
      </div>

      {/* Videos Tab Content */}
      {activeTab === 'videos' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin  border-4 border-t-blue-500"></div>
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center  bg-gray-800 py-20 text-center">
              <h2 className="mb-2 text-xl">No videos yet</h2>
              <p className="text-gray-400">
                Start by uploading your first video using the 'Upload Video' button.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <AdminVideoCard
                  key={video.id}
                  video={video}
                  onEdit={() => handleEditVideo(video)}
                  onDelete={() => handleDeleteVideo(video.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin  border-4 border-t-blue-500"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center  bg-gray-800 py-20 text-center">
              <h2 className="mb-2 text-xl">No users yet</h2>
            </div>
          ) : (
            <div className="overflow-x-auto ">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      User
                    </th>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-900">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <img
                            src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                            alt={user.username}
                            className="mr-3 h-10 w-10 "
                          />
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-gray-400">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex  px-2 py-1 text-xs font-semibold leading-5 ${
                            user.is_admin
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <button
                          className="text-blue-500 hover:text-blue-400"
                          onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                        >
                          {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Votes Tab Content */}
      {activeTab === 'votes' && (
        <>
          {loadingVotes ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin  border-4 border-t-blue-500"></div>
            </div>
          ) : voteCounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center  bg-gray-800 py-20 text-center">
              <h2 className="mb-2 text-xl">No votes yet</h2>
              <p className="text-gray-400">
                Users haven't voted on any videos yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto ">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Video
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Votes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-900">
                  {[...voteCounts]
                    .sort((a, b) => b.count - a.count)
                    .map((vote) => (
                      <tr key={vote.video_id} className="hover:bg-gray-800">
                        <td className="px-6 py-4">
                          <div className="font-medium">{getVideoTitle(vote.video_id)}</div>
                          <div className="text-sm text-gray-400">{vote.video_id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-2xl font-bold">{vote.count}</div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showUploadForm && <UploadVideoForm onClose={() => setShowUploadForm(false)} />}
      {showEditForm && selectedVideo && (
        <UploadVideoForm 
          onClose={() => {
            setShowEditForm(false);
            setSelectedVideo(null);
          }}
          editVideo={selectedVideo}
        />
      )}
    </div>
  );
};

export default AdminPage;