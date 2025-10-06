// src/pages/Sidevbar.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  FiMenu,
  FiGrid,
  FiUsers,
  FiFileText,
  FiShield,
  FiUser,
  FiChevronDown,
  FiChevronRight,
  FiLogOut,
  FiHome,
  FiGlobe,
  FiTrendingUp,
} from "react-icons/fi";
import { AuthService, LogsService } from "../services/Service";
import { useMe } from "../hook/useMe";

type Props = {
  collapsed: boolean;
  setCollapsed: (expanded: boolean) => void;
};

const SIDE_W_EXP = 0;
const SIDE_W_COLLAPSED = 0;

const Sidevbar: React.FC<Props> = ({ collapsed, setCollapsed }) => {
  const [dashboardExpanded, setDashboardExpanded] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, me } = useMe();

  // Admin por scope (country_scope === "*")
  const canSeeAudit = useMemo(() => {
    const scope = (me as any)?.country_scope;
    if (Array.isArray(scope)) return scope.includes("*");
    if (typeof scope === "string") {
      // por si viene como string o csv
      if (scope.trim() === "*") return true;
      return scope.split(",").map(s => s.trim()).includes("*");
    }
    return false;
  }, [me]);

  useEffect(() => {
    setCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const isDesktop = () => window.matchMedia("(min-width: 1024px)").matches;
    const applyPadding = () => {
      const pad = isDesktop() ? (collapsed ? SIDE_W_COLLAPSED : SIDE_W_EXP) : 0;
      document.documentElement.style.setProperty("--sidenav-w", `${pad}px`);
      document.body.style.paddingLeft = pad ? `${pad}px` : "0px";
    };
    applyPadding();
    const onResize = () => applyPadding();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [collapsed]);

  const handleCollapsed = () => setCollapsed(!collapsed);

  const handleLogout = async () => {
    try {
      const email = (localStorage.getItem("email") || "").trim();
      await LogsService.audit(
        email ? `${email} "cerro sesion"` : `Usuario "cerro sesion"`
      );
    } catch {
      // noop
    } finally {
      try { await AuthService.logout(); } catch {}
      localStorage.removeItem("id");
      localStorage.removeItem("email");
      navigate("/login", { replace: true });
    }
  };

  const handleGoToAuditoria = () => navigate("/auditoria");

  return (
    <>
      {!collapsed && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-30 lg:hidden"
          onClick={handleCollapsed}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Barra lateral de navegación"
        className={[
          "fixed inset-y-0 left-0 z-40 bg-slate-50 border-r border-slate-200",
          "transform transition-[width,transform] duration-300 ease-in-out",
          collapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0",
          collapsed ? "lg:w-14" : "lg:w-56",
          "w-60 lg:w-auto",
          "h-screen flex flex-col overflow-hidden text-sm",
        ].join(" ")}
      >
        <nav className="flex flex-col flex-grow">
          {/* Toggle */}
          <button
            onClick={handleCollapsed}
            className="flex items-center gap-2 p-3 hover:bg-slate-100 transition-colors"
            aria-label="Alternar menú"
          >
            <FiMenu size={20} className="min-w-[20px]" />
            <span
              className={`transition-all duration-300 whitespace-nowrap overflow-hidden
              ${collapsed ? "opacity-0 w-0 lg:w-0" : "opacity-100 w-auto"}`}
            >
              Menú
            </span>
          </button>

          {/* DASHBOARD */}
          <div>
            <div
              onClick={() => setDashboardExpanded((v) => !v)}
              className="flex items-center p-3 cursor-pointer hover:bg-slate-100 transition-colors gap-2"
            >
              <FiGrid size={20} className="min-w-[20px]" />
              <span
                className={`transition-all duration-300
                ${collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"}`}
              >
                Dashboard
              </span>
              {!collapsed && (
                <div className="ml-auto">
                  {dashboardExpanded ? (
                    <FiChevronDown size={16} />
                  ) : (
                    <FiChevronRight size={16} />
                  )}
                </div>
              )}
            </div>

            {/* Submenú Dashboard */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out
                ${!collapsed && dashboardExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
            >
              {!collapsed && dashboardExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  <NavLink
                    to="/dashboard"
                    end
                    className={({ isActive }) =>
                      `flex items-center gap-2 p-2 rounded hover:bg-slate-100 text-xs ${
                        isActive ? "bg-slate-100 font-medium" : ""
                      }`
                    }
                  >
                    <FiHome size={18} className="min-w-[18px]" />
                    <span>Inicio</span>
                  </NavLink>

                  <NavLink
                    to="/dashboard/agente"
                    className={({ isActive }) =>
                      `flex items-center gap-2 p-2 rounded hover:bg-slate-100 text-xs ${
                        isActive ? "bg-slate-100 font-medium" : ""
                      }`
                    }
                  >
                    <FiUsers size={18} className="min-w-[18px]" />
                    <span>Agentes</span>
                  </NavLink>

                  {isAdmin && (
                    <NavLink
                      to="/dashboard/pais"
                      className={({ isActive }) =>
                        `flex items-center gap-2 p-2 rounded hover:bg-slate-100 text-xs ${
                          isActive ? "bg-slate-100 font-medium" : ""
                        }`
                      }
                    >
                      <FiGlobe size={18} className="min-w-[18px]" />
                      <span>País</span>
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Análisis */}
          <NavLink
            to="/analisis"
            className={({ isActive }) =>
              `flex items-center gap-2 p-3 hover:bg-slate-100 transition-colors ${
                isActive ? "bg-slate-100 font-medium" : ""
              }`
            }
          >
            <FiTrendingUp size={20} className="min-w-[20px]" />
            <span
              className={`transition-all duration-300 ${
                collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
              }`}
            >
              Análisis
            </span>
          </NavLink>

          {/* Reportería */}
          <NavLink
            to="/reporteria"
            className={({ isActive }) =>
              `flex items-center gap-2 p-3 hover:bg-slate-100 transition-colors ${
                isActive ? "bg-slate-100 font-medium" : ""
              }`
            }
          >
            <FiFileText size={20} className="min-w-[20px]" />
            <span
              className={`transition-all duration-300 ${
                collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
              }`}
            >
              Reportería
            </span>
          </NavLink>

          {/* Auditoría (solo si country_scope === "*") */}
          {canSeeAudit && (
            <button
              onClick={handleGoToAuditoria}
              className="flex items-center gap-2 p-3 hover:bg-slate-100 transition-colors text-left w-full"
            >
              <FiShield size={20} className="min-w-[20px]" />
              <span
                className={`transition-all duration-300 ${
                  collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                }`}
              >
                Auditoría
              </span>
            </button>
          )}

          {/* Perfil */}
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-2 p-3 hover:bg-slate-100 transition-colors ${
                isActive ? "bg-slate-100 font-medium" : ""
              }`
            }
          >
            <FiUser size={20} className="min-w-[20px]" />
            <span
              className={`transition-all duration-300 ${
                collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
              }`}
            >
              Perfil
            </span>
          </NavLink>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 hover:text-red-700 transition-colors w-full"
          >
            <FiLogOut size={20} className="min-w-[20px]" />
            <span
              className={`transition-all duration-300 ${
                collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
              }`}
            >
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidevbar;
