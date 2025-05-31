import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

export const Navbar = () => {
  return (
    <header className="border-b border-white/10 bg-gray-900/50 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <MessageCircle className="h-8 w-8 text-blue-500" />
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-2xl font-bold text-transparent">
            VideoChat
          </span>
        </Link>
      </div>
    </header>
  );
};