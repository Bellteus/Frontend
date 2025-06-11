import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Lógica para ocultar el navbar en /auth/login
  const showNav = !location.pathname.includes('/auth/login');

  const logout = () => {
    navigate('/auth/login');
  };

  if (!showNav) return null;

  return (
    <nav className="ai-navbar">
      <div className="nav-brand">
        <img src="/BellteusLogo.png" alt="Analítica de Llamadas con IA" className="navbar-logo" />
      </div>


      <div className="nav-links">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>Dashboard</NavLink>
        <NavLink to="/reports" className={({ isActive }) => isActive ? "active" : ""}>Reportes IA</NavLink>
      </div>

      <div className="nav-actions">
        <button className="ai-button" onClick={logout}>
          <span className="button-text">Salir</span>
          <span className="button-icon">→</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
