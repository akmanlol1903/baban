import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
// Assuming you have a global CSS file imported in your entry point (e.g., index.tsx or main.tsx)
// import './your-global-styles.css'; // Or import styles directly here if using CSS modules or similar

const Layout = () => {
  return (
    <> {/* Use a Fragment if you need multiple top-level elements */}
      {/* These background divs should be rendered by a component */}
      {/* Place them inside the main layout div or as siblings */}
      <div className="fixed inset-0 bg-background"></div> {/* Ensure bg-background class exists in your CSS/Tailwind config */}
      <div className="graddygrad fixed inset-0"></div> {/* The graddygrad class will get its styles from the separate CSS file */}

      <div className="relative flex h-screen from-gray-800 via-gray-900 to-black text-white z-10"> {/* Add z-index to ensure content is above fixed background */}
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default Layout;