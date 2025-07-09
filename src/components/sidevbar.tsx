import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  FiMenu, FiGrid, FiList, FiUserCheck, FiArchive, FiUser,
  FiChevronDown, FiChevronRight, FiLogOut, FiHome,
  FiUserPlus, FiUsers
} from 'react-icons/fi';
import apiService from '../services/DataService'; // <-- Agrega esto

const Sidevbar: React.FC<{ collapsed: boolean; setCollapsed: (expanded: boolean) => void }> = ({
  collapsed, setCollapsed
}) => {
  const [dashboardExpanded, setDashboardExpanded] = useState(false);
  const navigate = useNavigate();

  const handleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  // LOGOUT CON REGISTRO DE LOG
const handleLogout = async () => {
  const user_id = localStorage.getItem("id");
  const user_email = localStorage.getItem("email");
  if (user_id && user_email) {
    try {
      await apiService.postSupervisorLog({
        user_id,
        user_email,
        action: "Cerró sesión"
      });
      // console.log("Log de cierre de sesión registrado");
    } catch (logError) {
      console.warn("No se pudo registrar log de cierre de sesión:", logError);
    }
  }
  // Solo borra lo necesario:
  localStorage.removeItem("id");
  localStorage.removeItem("email");
  navigate('/login');
};


  const handleGoToAuditoria = () => {
    navigate('/auditoria'); // Cambia esta ruta si tu auditoría tiene otra URL
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

        {/* Auditoría - SIN desplegable, va directo */}
        <button
          onClick={handleGoToAuditoria}
          className="flex items-center gap-2 p-3 hover:bg-gray-200 transition-colors text-left w-full"
        >
          <FiArchive size={20} className="min-w-[20px]" />
          <span className={`transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
            Auditoría
          </span>
        </button>

        {/* Perfil */}
        <NavLink
          to="/profile"
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
