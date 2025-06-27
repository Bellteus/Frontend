import { NavLink} from 'react-router-dom';
import { useState } from 'react';

import {
  FiMenu, FiGrid, 
  FiList,
  FiUserCheck, FiArchive, FiUser,
  FiChevronDown, FiChevronRight,
  FiLogOut,
  FiHome,
  FiUserPlus,
  FiUsers
} from 'react-icons/fi';


const Sidevbar: React.FC<{ collapsed: boolean; setCollapsed: (expanded: boolean) => void }> = ({
  collapsed, setCollapsed }) => {

    

  // Estado para manejar la expansión de los submenús
  const [administratorExpanded, setAdministratorExpanded] = useState(false);
  const [DashboardExpanded, setDashboardExpanded] = useState(false);

   const handleCollapsed = () => {
    setCollapsed(!collapsed);
  }
  
const handleLogout = async ()=>{
 }

  return (
    <aside
      className={`bg-slate-300 transition-all duration-300 ${collapsed ? "w-12" : "w-48"} h-screen flex flex-col`}>
      <nav className="flex flex-col flex-grow ">
        {/* Botón para colapsar */}
        <button
          onClick={handleCollapsed }
          className="flex items-center p-3 hover:bg-gray-200 w-full text-left transition-colors"
        >
          <FiMenu size={20} />
          {!collapsed && <span className="font-semibold px-2">Menú</span>}
        </button>

        {/*Seccion Dashboard */}
{/* Seccion Dashboard */}
<div>
  <div className={`flex items-center p-3 cursor-pointer transition-all duration-300 hover:bg-gray-200 `}
    onClick={() => setDashboardExpanded(!DashboardExpanded)}>
    <FiGrid size={20} />
    {!collapsed && <span className='px-2'>Dashboard</span>}
    <div className="ml-auto transition-transform duration-300 transform">
      {DashboardExpanded ? (
        <FiChevronDown size={16} />
      ) : (
        <FiChevronRight size={16} />
      )}
    </div>
  </div>
  {/* Submenu del Dashboard con opciones */}
  <div
    className={`overflow-hidden transition-all duration-300 ease-in-out ${
      !collapsed && DashboardExpanded ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
    }`}
  >
    {!collapsed && DashboardExpanded && (
      <div className="ml-8 mt-1 space-y-1">
        <NavLink
          to="/dashboard/inicio"
          className={({ isActive }) =>
            `flex items-center p-2 pl-3 hover:bg-gray-200 text-xs transition-all duration-300 ${
              isActive ? 'bg-gray-200 font-medium' : ''
            }`
          }
        >
          <FiHome size={20} className="min-w-[20px]" />
          <span className='ml-2'>Inicio</span>
        </NavLink>
        <NavLink
          to="/dashboard/performance"
          className={({ isActive }) =>
            `flex items-center p-2 pl-3 hover:bg-gray-200 text-xs transition-all duration-300 ${
              isActive ? 'bg-gray-200 font-medium' : ''
            }`
          }
        >
          <FiUserCheck size={20} className="min-w-[20px]" />
          <span className='ml-2'>Performance</span>
        </NavLink>
      </div>
    )}
        </div>
        </div>
        
        {/* Seccion de Reportería */}
        <NavLink
          to="/reporteria"
          className={({ isActive }) =>
            `flex items-center p-3  transition-colors ${
              isActive ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'
            }`}
        >
          <FiList size={20} />
          {!collapsed && <span className='px-2' >Reportería</span>}
        </NavLink>

        {/*Seccion auditoria */}
        <NavLink
          to="/auditoria"
          className={({ isActive }) =>
            `flex items-center p-3  transition-colors ${
              isActive ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'
            }`}>
          
          <FiUserCheck size={20} />
          {!collapsed && <span className="ml-3">Auditoria</span>}
        </NavLink>

        {/*Seccion Administracion de usuarios */}
        <div>
          {/* Botón principal de Administracion */}
          <div className={`flex items-center p-3 cursor-pointer transition-all duration-300 hover:bg-gray-200 `}
            onClick={() => setAdministratorExpanded(!administratorExpanded)}>
                <FiArchive size={20} />
                {!collapsed && (
                  <div className="flex items-center justify-between w-full ml-3">
                    <span>Administracion</span>
                    <div className="transition-transform duration-300 transform">
                      {administratorExpanded ? (
                        <FiChevronDown size={16} />
                      ) : (
                        <FiChevronRight size={16} />
                      )}
                    </div>
                  </div>
                )}
          </div>
              {/* Submenu  del inventario con opciones  */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out 
                ${!collapsed && administratorExpanded ? "max-h-128 opacity-100" : "max-h-0 opacity-0"}`}>
                  {!collapsed && administratorExpanded && (
                  <div className="ml-8 mt-1 space-y-1">
                    <NavLink to="Administracion/usuarios"                            
                    className={({ isActive }) => {
                              return `flex items-center p-2 pl-3 hover:bg-gray-200  text-xs transition-all duration-300 ${
                                isActive ? 'bg-gray-200 font-medium' : ''
                              }`;
                            }}>
                      <FiUsers size={20} className="min-w-[20px]" />
                      <span className='ml-2'>Usuarios</span>
                    </NavLink>
                    
                    <NavLink to="Administracion/perfiles"                            
                    className={({ isActive }) => {
                              return `flex items-center p-2 pl-3 hover:bg-gray-200  text-xs transition-all duration-300 ${
                                isActive ? 'bg-gray-200 font-medium' : ''
                              }`;
                            }}>
                      <FiUserPlus size={20} className="min-w-[20px]" />
                      <span className='ml-2'>Perfiles</span>
                    </NavLink>
                  </div>
                  )}
              </div>
        </div>



        {/*Seccion Perfil */}
        <NavLink
          to="/perfil"
          className={({ isActive }) =>
            `flex items-center p-3  transition-colors ${
              isActive ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'
            }`}
        >
          <FiUser size={20} />
          {!collapsed && <span className="ml-3">Perfil</span>}
        </NavLink>
      </nav>
  {/* Botón de Logout al fondo */}
  <div className="p-3 border-t border-slate-400">
    <button
      onClick={handleLogout}      
      className="flex items-center hover:text-red-800 transition-colors w-full"
    >
      <FiLogOut size={20} />
       {!collapsed && <span className="ml-3 font-semibold">Cerrar sesión</span>}
    </button>
  </div>
    </aside>
  );
};

export default Sidevbar;