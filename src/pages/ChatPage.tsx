import { useEffect, useState } from 'react';
import GlobalChat from '../components/chat/GlobalChat';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen: string;
  is_admin: boolean;
  verified: boolean;
}

const ChatPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Chat - VideoChat';
    fetchUsers();
    
    const channel = supabase
      .channel('online-users')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `is_online=eq.true OR is_online=eq.false`
      }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, username, avatar_url, is_online, last_seen, is_admin, verified')
      .order('is_online', { ascending: false })
      .order('last_seen', { ascending: false });

    if (data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const onlineUsers = users.filter(user => user.is_online);
  const offlineUsers = users.filter(user => !user.is_online);

  return (
    <div className="flex h-screen">
      <div className="flex-1">
        <GlobalChat isOpen={true} setIsOpen={() => {}} />
      </div>
      
      <div className="w-80 flex-shrink-0 overflow-y-auto border-l border-gray-800 bg-gray-800/50 p-4">
        <h2 className="mb-4 font-semibold">Online Users ({onlineUsers.length})</h2>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin  border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {onlineUsers.map(user => (
              <Link
                key={user.id}
                to={`/profile/${user.username}`}
                className="flex items-center gap-2  p-2 transition-colors hover:bg-gray-700"
              >
                <div className="relative">
                  <img
                    src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                    alt={user.username}
                    className="h-8 w-8 "
                  />
                  <div className="absolute -bottom-1 -right-1 h-3 w-3  bg-green-500 ring-2 ring-gray-900" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">@{user.username}</span>
                    {user.verified && (
                      <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.5 14l-4-4 1.5-1.5 2.5 2.5 5.5-5.5 1.5 1.5-7 7z" />
                      </svg>
                    )}
                    {user.is_admin && (
                      <span className=" bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {offlineUsers.length > 0 && (
          <>
            <h2 className="mb-4 mt-6 font-semibold">Offline Users ({offlineUsers.length})</h2>
            <div className="space-y-2">
              {offlineUsers.map(user => (
                <Link
                  key={user.id}
                  to={`/profile/${user.username}`}
                  className="flex items-center gap-2  p-2 transition-colors hover:bg-gray-700"
                >
                  <div className="relative">
                    <img
                      src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                      alt={user.username}
                      className="h-8 w-8  opacity-75 grayscale"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-gray-400">@{user.username}</span>
                      {user.verified && (
                        <svg className="h-4 w-4 text-blue-500/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.5 14l-4-4 1.5-1.5 2.5 2.5 5.5-5.5 1.5 1.5-7 7z" />
                        </svg>
                      )}
                      {user.is_admin && (
                        <span className=" bg-red-500/50 px-2 py-0.5 text-xs font-medium text-white">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Last seen {formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPage;