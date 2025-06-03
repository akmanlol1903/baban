import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar'; // Changed from Sidebar to Navbar

const Layout = () => {
  return (
    <>
      <div className="fixed inset-0 bg-background"></div>
      <div className="graddygrad fixed inset-0"></div>

      {/* Main layout structure with Header and Content Area */}
      <div className="relative flex min-h-screen flex-col from-gray-800 via-gray-900 to-black text-white z-10">
        <Navbar /> {/* Replaced Sidebar with Navbar (acting as Header) */}
        <main className="flex-1 overflow-auto"> {/* Content area takes remaining space */}
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default Layout;