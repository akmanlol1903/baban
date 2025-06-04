import React, { useState, useEffect, useRef, useCallback } from 'react'; // useCallback eklendi
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  User,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Navigasyon öğelerinin tipleri (isteğe bağlı ama yardımcı)
interface NavItem {
  id: string;
  path: string;
  label: string;
  isDropdown?: boolean;
}

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuthStore();

  // Referanslar
  const navRef = useRef<HTMLElement>(null); // Navigasyon kapsayıcısı
  const navLinkRefs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]); // Linkler ve Butonlar

  // Çubuk stili için durum
  const [underlineStyle, setUnderlineStyle] = useState({
    width: 0,
    left: 0,
    opacity: 0, // Başlangıçta görünmez
  });

  const navItems: NavItem[] = [ // ID'ler eklendi ve yapı biraz değiştirildi
    { id: 'home', path: '/', label: 'Home' },
    { id: 'chat', path: '/chat', label: 'Chat' },
    { id: 'leaderboard', path: '/leaderboard', label: 'Leaderboard' },
    { id: 'more', path: '#', label: 'More', isDropdown: true }, // "More" butonu için path şimdilik #
  ];

  // Aktif öğeyi ve fareyle üzerine gelinen öğeyi hesaplama ve çubuğu güncelleme
  const updateUnderline = useCallback((targetElement: HTMLElement | null, isHover: boolean = false) => {
    if (targetElement && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();

      setUnderlineStyle({
        width: targetRect.width,
        left: targetRect.left - navRect.left,
        opacity: 1,
      });
    } else if (!isHover) { // Eğer hedef yoksa ve hover değilse (örn. sayfa ilk yüklendiğinde aktif link yoksa)
      setUnderlineStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, []); // Bağımlılık dizisi boş, çünkü updateUnderline içindeki ref'ler değişmeyecek


  useEffect(() => {
    const activeItem = navItems.find(item => location.pathname === item.path && !item.isDropdown);
    let activeElement: HTMLElement | null = null;

    if (activeItem) {
      const activeLinkIndex = navItems.findIndex(navItem => navItem.id === activeItem.id);
      activeElement = navLinkRefs.current[activeLinkIndex] as HTMLElement | null;
    }
    updateUnderline(activeElement);
  }, [location.pathname, navItems, updateUnderline]); // updateUnderline'ı bağımlılıklara ekle


  const handleMouseEnter = (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    updateUnderline(event.currentTarget as HTMLElement, true);
  };

  const handleMouseLeave = () => {
    // Fare ayrıldığında, alt çizgiyi aktif olan linke geri döndür
    const activeItem = navItems.find(item => location.pathname === item.path && !item.isDropdown);
    let activeElement: HTMLElement | null = null;
    if (activeItem) {
      const activeLinkIndex = navItems.findIndex(navItem => navItem.id === activeItem.id);
      activeElement = navLinkRefs.current[activeLinkIndex] as HTMLElement | null;
    }
    // Eğer "More" butonu açıksa ve fare ayrıldıysa, "More" altında kalsın
    const moreButtonIndex = navItems.findIndex(item => item.id === 'more');
    const moreButtonElement = navLinkRefs.current[moreButtonIndex];
    if (moreButtonElement && moreButtonElement.getAttribute('data-state') === 'open') {
        updateUnderline(moreButtonElement as HTMLElement, true); // Onu aktif gibi göster
        return;
    }

    updateUnderline(activeElement);
  };


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

  const baseInteractiveItemClasses = "flex items-center h-7 px-3 text-base font-medium transition-colors duration-200 hover:text-primary focus:outline-none"; // focus:outline-none eklendi
  const activeParentLinkClasses = "text-primary";
  const inactiveParentLinkClasses = "text-white";
  const baseDropdownItemClasses = "flex items-center gap-3 h-7 px-3 text-sm font-medium cursor-pointer";

  return (
    <header className="flex items-center h-[110px]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center h-7">
            <span className="montserrat-black text-xl font-bold text-white select-none leading-7">
              boşalanzi
            </span>
          </div>

          {/* Navigasyon Kapsayıcısı */}
          <nav className="relative flex items-center gap-1" ref={navRef} onMouseLeave={handleMouseLeave}>
            {navItems.map((item, index) => {
              if (item.isDropdown) {
                return (
                  <DropdownMenu key={item.id} modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button
                        ref={el => navLinkRefs.current[index] = el}
                        onMouseEnter={handleMouseEnter}
                        // onMouseLeave={handleMouseLeave} // Kapsayıcı nav elementine taşındı
                        className={cn(
                          baseInteractiveItemClasses,
                          inactiveParentLinkClasses, // More her zaman başlangıçta inactive görünecek
                          'data-[state=open]:text-primary',
                          "relative" // Group kaldırıldı, artık gerek yok
                        )}
                      >
                        <span className="label">{item.label}</span>
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
                );
              }
              return (
                <Link
                  key={item.id}
                  ref={el => navLinkRefs.current[index] = el}
                  to={item.path}
                  onMouseEnter={handleMouseEnter}
                  // onMouseLeave={handleMouseLeave} // Kapsayıcı nav elementine taşındı
                  className={cn(
                    baseInteractiveItemClasses,
                    isActive(item.path) ? activeParentLinkClasses : inactiveParentLinkClasses,
                    "relative" // Group kaldırıldı
                  )}
                >
                  <span className="label">{item.label}</span>
                </Link>
              );
            })}
            {/* Hareketli Alt Çizgi */}
            <span
              className="absolute bottom-[-3px] h-[2px] bg-primary transition-all duration-300 ease-out"
              style={{
                width: `${underlineStyle.width}px`,
                transform: `translateX(${underlineStyle.left}px)`,
                opacity: underlineStyle.opacity,
              }}
            />
          </nav>
        </div>

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
                    <span className="flex items-center gap-3">
                      <User className="h-4 w-4" />
                      Profile
                    </span>
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