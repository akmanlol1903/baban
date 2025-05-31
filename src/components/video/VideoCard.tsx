// src/components/video/VideoCard.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, Edit2, Trash2, Users, Star } from 'lucide-react';
import { useVideoStore } from '../../stores/videoStore';
import { Database } from '../../lib/database.types';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Video = Database['public']['Tables']['videos']['Row'];
interface UserCumStats {
  userId: string;
  username: string;
  avatarUrl: string | null;
  count: number;
}

interface VideoCardProps {
  video: Video;
  watchTime?: number;
  onEdit?: () => void;
  isLatest?: boolean;
}

const VideoCard = ({ video, watchTime = 0, onEdit, isLatest }: VideoCardProps) => {
  const navigate = useNavigate();
  const { deleteVideo, favoriteVideos } = useVideoStore();
  // isAdmin from useAuthStore is for the CURRENT viewing user, not necessarily the one who favorited.
  // We don't need it for the "is an admin favorite" display logic anymore for all users.
  const { user } = useAuthStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cumStats, setCumStats] = useState<{ count: number; users: UserCumStats[] } | null>(null);

  // This will now be true if ANY admin has favorited the video,
  // because favoriteVideos from the store (after RLS change) will contain all admin-favorited video IDs.
  const isFavoritedByAnAdmin = Array.isArray(favoriteVideos) && video?.id ? favoriteVideos.includes(video.id) : false;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  useEffect(() => {
    const fetchCumStats = async () => {
      if (!video?.id) return;
      const { data: markers, error: markersError } = await supabase
        .from('cum_markers')
        .select('user_id')
        .eq('video_id', video.id);

      if (markersError) {
        console.error("Error fetching cum markers:", markersError);
        setCumStats({ count: 0, users: [] });
        return;
      }

      if (markers && markers.length > 0) {
        const userCounts = markers.reduce<Record<string, number>>((acc, marker) => {
          acc[marker.user_id] = (acc[marker.user_id] || 0) + 1;
          return acc;
        }, {});

        const userIds = Object.keys(userCounts);
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (usersError) {
          console.error("Error fetching user data for cum stats:", usersError);
          const fallbackUsers: UserCumStats[] = userIds.map(userId => ({
            userId,
            username: 'Unknown User',
            avatarUrl: null,
            count: userCounts[userId]
          })).sort((a,b) => b.count - a.count);
          setCumStats({
            count: markers.length,
            users: fallbackUsers,
          });
          return;
        }

        const usersWithStats: UserCumStats[] = usersData.map(u => ({
          userId: u.id,
          username: u.username || 'Unknown User',
          avatarUrl: u.avatar_url,
          count: userCounts[u.id]
        })).sort((a,b) => b.count - a.count);


        setCumStats({
          count: markers.length,
          users: usersWithStats,
        });
      } else {
        setCumStats({ count: 0, users: [] });
      }
    };

    if (video && video.id) {
      fetchCumStats();
    }
  }, [video]);

  const videoCardClasses = cn(
    "group relative h-full overflow-hidden",
    " border bg-card",
    "shadow-custom-inset drop-shadow-md",
    "transition-shadow hover:shadow-sm",
    {
      "border-primary": isFavoritedByAnAdmin, // Use the new variable here
      "border-border": !isFavoritedByAnAdmin
    }
  );

  if (!video) {
    return <div className="group relative h-full overflow-hidden  border bg-card p-4">Loading video data...</div>;
  }

  const tooltipContentClasses = cn(
    "bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden  border px-3 py-1.5 text-sm shadow-md max-h-60 overflow-y-auto"
  );

  return (
    <TooltipProvider>
      <div
        className={videoCardClasses}
        onClick={() => navigate(`/video/${video.id}`)}
      >
        <div className="relative h-full w-full overflow-hidden">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-700/30">
              <span className="text-2xl font-semibold text-gray-400">No Thumbnail</span>
            </div>
          )}

          {/* Display star and border effect if the video is favorited by an admin */}
          {isFavoritedByAnAdmin && (
            <>
              <div className="absolute inset-0 overflow-hidden  z-[1]">
                <div className="bg-primary/2 h-full w-full"></div>
                <div className="absolute -right-20 -top-20 h-40 w-40  bg-primary/20 blur-3xl"></div>
              </div>
              <div className="absolute right-2.5 top-2.5 z-[30]">
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Favorited by Admin" // General label for all users
                      className="p-1  focus:outline-none hover:bg-black/20 transition-colors"
                    >
                      <Star className="h-5 w-5 fill-primary text-primary" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={4} className={tooltipContentClasses}>
                    {/* General tooltip text for all users */}
                    <p>Favorited by Admin</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </>
          )}

          <div className="absolute left-4 top-4  bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm md:left-6 md:top-6 md:px-4 md:py-2 md:text-sm z-20">
            {isLatest ? (
              <span className="text-green-400">Today's Video</span>
            ) : (
              <span>{video.created_at ? formatDistanceToNow(new Date(video.created_at), { addSuffix: true }) : 'Date unknown'}</span>
            )}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10" />

          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-20">
            <h3 className="text-lg font-bold text-white opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 md:text-2xl md:translate-y-4">
              {video.title}
            </h3>

            {video.description && (
              <p className="mt-1 text-sm text-gray-300 opacity-0 line-clamp-2 transition-all delay-100 duration-300 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 md:mt-2 md:text-base md:translate-y-4">
                {video.description}
              </p>
            )}

            <div className="mt-2 flex items-center justify-between opacity-0 transition-all delay-200 duration-300 group-hover:opacity-100 md:mt-4">
              {!onEdit ? (
                <div className="space-y-1 md:space-y-2">
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-1 text-xs text-gray-300 md:gap-1.5 md:text-sm">
                      <Clock className="h-3.5 w-3.5 text-blue-400 md:h-4 md:w-4" />
                      <span>{watchTime}s watched</span>
                    </div>
                  </div>

                  {cumStats && (
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-xs text-gray-300 md:gap-1.5 md:text-sm cursor-default">
                          <Users className="h-3.5 w-3.5 text-pink-400 md:h-4 md:w-4" />
                          <span>{cumStats.count} cums by {cumStats.users.length} users</span>
                        </div>
                      </TooltipTrigger>
                      {cumStats.users && cumStats.users.length > 0 && (
                        <TooltipContent sideOffset={4} className={tooltipContentClasses}>
                          <div className="space-y-2">
                            {cumStats.users.map((statUser) => (
                              <Link
                                key={statUser.userId}
                                to={`/profile/${statUser.username}`}
                                className="flex items-center gap-2 hover:bg-accent p-1 "
                                onClick={(e) => e.stopPropagation()}
                              >
                                <img
                                  src={statUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${statUser.userId}`}
                                  alt={statUser.username}
                                  className="h-6 w-6 "
                                />
                                <span className="font-medium">{statUser.username}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{statUser.count}</span>
                              </Link>
                            ))}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-1.5  bg-gray-700/50 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-gray-600 md:px-4 md:text-sm"
                  >
                    <Edit2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5  bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500 hover:text-white md:px-4 md:text-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showDeleteConfirm && onEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm  bg-gray-800 p-6 text-center shadow-xl">
              <h3 className="mb-4 text-lg font-medium text-white">Delete Video</h3>
              <p className="mb-6 text-gray-300">
                Are you sure you want to delete "{video.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteVideo(video.id);
                    setShowDeleteConfirm(false);
                  }}
                  className=" bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                  className=" bg-gray-700 px-4 py-2 font-medium text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default VideoCard;