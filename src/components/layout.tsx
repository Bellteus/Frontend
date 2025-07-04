import { Outlet } from 'react-router-dom';
import Sidevbar from './sidevbar';
import { useState } from 'react';

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white flex min-h-screen">
      {/* Sidebar fijo */}
      <Sidevbar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Contenido principal */}
      <main
        className={`
          flex-1 ml-14 transition-all duration-300 overflow-y-auto 
          ${!collapsed ? 'ml-42' : 'ml-14'}
        `}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
