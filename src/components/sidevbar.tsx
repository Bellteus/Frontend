import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  FiMenu, FiGrid, FiList, FiUserCheck, FiArchive, FiUser,
  FiChevronDown, FiChevronRight, FiLogOut, FiHome,
  FiUserPlus, FiUsers
} from 'react-icons/fi';

const Sidevbar: React.FC<{ collapsed: boolean; setCollapsed: (expanded: boolean) => void }> = ({
  collapsed, setCollapsed
}) => {
  const [administratorExpanded, setAdministratorExpanded] = useState(false);
  const [dashboardExpanded, setDashboardExpanded] = useState(false);
  const navigate = useNavigate();

  const handleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <aside
      className={`bg-slate-50 transition-all duration-300 ease-in-out overflow-hidden text-sm
        ${collapsed ? 'w-14' : 'w-42'} h-screen flex flex-col fixed `}
    >
      <nav className="flex flex-col flex-grow ">
        {/* Botón de colapsar */}
        <button
          onClick={handleCollapsed}
          className="flex items-center gap-2 p-3 hover:bg-gray-200 transition-colors"
        >
          <FiMenu size={20} className="min-w-[20px]" />
          <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden
            ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
            Menú
          </span>
        </button>

        {/* DASHBOARD */}
        <div>
          <div
            onClick={() => setDashboardExpanded(!dashboardExpanded)}
            className="flex items-center p-3 cursor-pointer hover:bg-gray-200 transition-colors gap-2"
          >
            <FiGrid size={20} className="min-w-[20px]" />
            <span className={`transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
              Dashboard
            </span>
            {!collapsed && (
              <div className="ml-auto">
                {dashboardExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
              </div>
            )}
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out
              ${!collapsed && dashboardExpanded ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}
          >
            {!collapsed && dashboardExpanded && (
              <div className="ml-8 mt-1 space-y-1">
                <NavLink
                  to="/dashboard"
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-2 p-2 hover:bg-gray-200 text-xs ${
                      isActive ? 'bg-gray-200 font-medium' : ''
                    }`
                  }
                >
                  <FiHome size={20} className="min-w-[20px]" />
                  <span>Inicio</span>
                </NavLink>
                <NavLink
                  to="dashboard/Performance"
                  className={({ isActive }) =>
                    `flex items-center gap-2 p-2 hover:bg-gray-200 text-xs ${
                      isActive ? 'bg-gray-200 font-medium' : ''
                    }`
                  }
                >
                  <FiUserCheck size={20} className="min-w-[20px]" />
                  <span>Performance</span>
                </NavLink>
              </div>
            )}
          </div>
        </div>

        {/* Reportería */}
        <NavLink
          to="/reporteria"
          className={({ isActive }) =>
            `flex items-center gap-2 p-3 hover:bg-gray-100 transition-colors ${
              isActive ? 'bg-gray-200 font-medium' : ''
            }`
          }
        >
          <FiList size={20} className="min-w-[20px]" />
          <span className={`transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
            Reportería
          </span>
        </NavLink>

        {/* ADMINISTRACIÓN */}
        <div>
          <div
            onClick={() => setAdministratorExpanded(!administratorExpanded)}
            className="flex items-center p-3 cursor-pointer hover:bg-gray-200 transition-colors gap-2"
          >
            <FiArchive size={20} className="min-w-[20px]" />
            <span className={`transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
              Administración
            </span>
            {!collapsed && (
              <div className="ml-auto">
                {administratorExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
              </div>
            )}
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out
              ${!collapsed && administratorExpanded ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}
          >
            {!collapsed && administratorExpanded && (
              <div className="ml-8 mt-1 space-y-1">
                <NavLink
                  to="Administracion/usuarios"
                  className={({ isActive }) =>
                    `flex items-center gap-2 p-2 hover:bg-gray-200 text-xs ${
                      isActive ? 'bg-gray-200 font-medium' : ''
                    }`
                  }
                >
                  <FiUsers size={20} className="min-w-[20px]" />
                  <span>Usuarios</span>
                </NavLink>
                <NavLink
                  to="Administracion/perfiles"
                  className={({ isActive }) =>
                    `flex items-center gap-2 p-2 hover:bg-gray-200 text-xs ${
                      isActive ? 'bg-gray-200 font-medium' : ''
                    }`
                  }
                >
                  <FiUserPlus size={20} className="min-w-[20px]" />
                  <span>Perfiles</span>
                </NavLink>
              </div>
            )}
          </div>
        </div>

        {/* Perfil */}
        <NavLink
          to="/perfil"
          className={({ isActive }) =>
            `flex items-center gap-2 p-3 hover:bg-gray-100 transition-colors ${
              isActive ? 'bg-gray-200 font-medium' : ''
            }`
          }
        >
          <FiUser size={20} className="min-w-[20px]" />
          <span className={`transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
            Perfil
          </span>
        </NavLink>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-300">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 hover:text-red-800 transition-colors w-full"
        >
          <FiLogOut size={20} className="min-w-[20px]" />
          <span className={`transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidevbar;
