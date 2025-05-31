import { useEffect } from 'react';
import { useVideoStore } from '../stores/videoStore';
import { Trophy, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

const LeaderboardPage = () => {
  const { leaderboard, fetchLeaderboard } = useVideoStore();

  useEffect(() => {
    document.title = 'Leaderboard - VideoChat';
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <div className="container mx-auto max-w-4xl">
      <div className=" bg-gray-800/50 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center">
          <Trophy className="mr-2 h-6 w-6 text-yellow-500" />
          <h2 className="text-xl font-semibold">Least Watched Videos</h2>
        </div>

        <div className="space-y-4">
          {leaderboard.map((video, index) => (
            <Link
              key={video.video_id}
              to={`/video/${video.video_id}`}
              className="flex items-center  bg-gray-800 p-4 transition hover:bg-gray-700"
            >
              <span className="flex h-8 w-8 items-center justify-center  bg-gray-700 text-sm font-semibold">
                {index + 1}
              </span>
              <div className="ml-4 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{video.title}</h3>
                </div>
                <Link
                  to={`/profile/${video.uploader_username}`}
                  className="mt-1 flex items-center text-sm text-gray-400 hover:text-gray-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={video.uploader_avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${video.uploader_id}`}
                    alt={video.uploader_username}
                    className="mr-1 h-4 w-4 "
                  />
                  @{video.uploader_username}
                </Link>
                <p className="mt-1 text-sm text-gray-400">
                  {video.total_watch_time}s total watch time
                </p>
              </div>
              <Video className="h-5 w-5 text-gray-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage