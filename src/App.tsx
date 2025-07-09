import './App.css'
import Layout from './components/layout'
import Dashboard from './pages/DashboardPages/Dashboard'
import LoginForm from './pages/LoginPage'
import { BrowserRouter, Route, Routes } from "react-router-dom"
import Reporteria from './pages/Reporteria'
import ReporteriaID from './pages/reporteriaById'
import DashboardPerfomance from './pages/DashboardPerfomance'
import HistorialClientePerformance from './pages/HistorialClientePerformance'
import LogsTable from './pages/Logs'
import PerfilUsuario from './pages/Profile'
import DashboardArea from './pages/DashboardPages/DashboardArea'
import DashboardAgente from './pages/DashboardPages/DashboardAgente'
import PrivateRoute from './components/PrivateRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        {/* Todo lo privado va dentro del PrivateRoute */}
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dashboard/Performance" element={<DashboardPerfomance />} />
          <Route path="dashboard/Performance/HistorialCliente" element={<HistorialClientePerformance />} />
          <Route path="dashboard/Performance/HistorialAgente" element={<DashboardPerfomance />} />
          <Route path="auditoria" element={<LogsTable />} />
          <Route path="reporteria" element={<Reporteria />} />
          <Route path="/reporteria/:id" element={<ReporteriaID />} />
          <Route path="/profile" element={<PerfilUsuario />} />
          <Route path="dashboard/area" element={<DashboardArea />} />
          <Route path="dashboard/agente" element={<DashboardAgente />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
