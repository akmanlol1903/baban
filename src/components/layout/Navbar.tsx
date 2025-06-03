import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  User,
  Settings,
  // MoreHorizontal, // More ikonu kaldırıldı
  // MessageSquare, // MessageSquare ikonu kaldırıldı
} from 'lucide-react';
// authStore importu takma ad (alias) kullanılarak güncellendi
import { useAuthStore } from '@/stores/authStore';
// import HomeIcon from '@/components/icons/HomeIcon'; // HomeIcon kaldırıldı
// import TrophyIcon from '@/components/icons/TrophyIcon'; // TrophyIcon kaldırıldı
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'; // Bu takma adın çalıştığı varsayılıyor
import { cn } from '@/lib/utils'; // Bu takma adın çalıştığı varsayılıyor

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuthStore();

  const isActive = (path: string) => location.pathname === path;

  const handleAdminClick = () => {
    if (isAdmin) {
      navigate('/admin');
    }
  };

  const handleSignOutClick = () => {
    signOut();
    navigate('/');
  };

  // Navigasyon linkleri/butonları için temel sınıflar
  const baseInteractiveItemClasses = "flex items-center h-7 px-3 text-base font-medium transition-all duration-200 hover:text-primary";
  // Aktif link için text rengi
  const activeParentLinkClasses = "text-primary";
  const inactiveParentLinkClasses = "text-white";

  // Aktif durumdaki <span className="label"> için alt çizgi stili
  const activeLabelUnderlineClasses = "relative after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-[-3px] after:h-[2px] after:bg-primary";


  // Dropdown menü öğeleri için temel sınıflar
  const baseDropdownItemClasses = "flex items-center gap-3 h-7 px-3 text-sm font-medium cursor-pointer";

  return (
    // Header yüksekliği 110px, arka plan ve border yok.
    <header className="flex items-center h-[110px]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4">
        {/* Sol: Marka ve Navigasyon Linkleri */}
        <div className="flex items-center gap-4">
          <div className="flex items-center h-7">
            <span className="montserrat-black text-xl font-bold text-white select-none leading-7">
              boşalanzi
            </span>
          </div>

          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={cn(
                baseInteractiveItemClasses,
                isActive('/') ? activeParentLinkClasses : inactiveParentLinkClasses
              )}
            >
              <span className={cn("label", isActive('/') ? activeLabelUnderlineClasses : "")}>
                Home
              </span>
            </Link>

            <Link
              to="/chat"
              className={cn(
                baseInteractiveItemClasses,
                isActive('/chat') ? activeParentLinkClasses : inactiveParentLinkClasses
              )}
            >
              <span className={cn("label", isActive('/chat') ? activeLabelUnderlineClasses : "")}>
                Chat
              </span>
            </Link>

            <Link
              to="/leaderboard"
              className={cn(
                baseInteractiveItemClasses,
                isActive('/leaderboard') ? activeParentLinkClasses : inactiveParentLinkClasses
              )}
            >
              <span className={cn("label", isActive('/leaderboard') ? activeLabelUnderlineClasses : "")}>
                Leaderboard
              </span>
            </Link>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    baseInteractiveItemClasses,
                    inactiveParentLinkClasses, // "More" butonu için varsayılan renk
                    'data-[state=open]:text-primary' // Dropdown açıldığında primary renk
                  )}
                >
                  {/* "More" butonu için aktif alt çizgi uygulanmadı, istenirse eklenebilir */}
                  <span className="label">More</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="center"
                sideOffset={8}
                className="bg-popover border-gray-800 text-popover-foreground w-auto p-1"
              >
                <DropdownMenuItem
                  onClick={handleAdminClick}
                  disabled={!isAdmin}
                  className={cn(
                    baseDropdownItemClasses,
                    'text-white hover:!bg-sidebar-accent focus:!bg-sidebar-accent',
                    !isAdmin && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <Settings className="h-4 w-4" />
                  Admin Panel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        {/* Sağ: Kullanıcı Profili */}
        <div className="flex items-center h-7">
          {user ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button className="group flex items-center h-7 px-2 gap-2 transition-all duration-200 hover:bg-black/10">
                  <img
                    src={
                      user.user_metadata?.avatar_url ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`
                    }
                    alt="Avatar"
                    className="h-6 w-6 ring-1 ring-blue-500/50"
                  />
                  <div className="text-left">
                    <p className="text-xs font-medium text-white leading-tight">
                      {user.user_metadata?.username || 'User'}
                    </p>
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {isAdmin ? 'Admin' : 'User'}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="end"
                sideOffset={12}
                className="bg-popover border-gray-800 text-popover-foreground w-56 p-1"
              >
                <DropdownMenuItem
                  asChild
                  className={cn(
                    baseDropdownItemClasses,
                    "text-white hover:!bg-sidebar-accent focus:!bg-sidebar-accent"
                  )}
                >
                  <Link to={`/profile/${user.user_metadata?.username}`}>
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSignOutClick}
                  className={cn(
                    baseDropdownItemClasses,
                    "text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10"
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="h-7">
            </div>
          )}
        </div>
      </div>
    </header>
  );
};