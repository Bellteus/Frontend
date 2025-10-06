import './App.css'
import Layout from './components/layout'
import Dashboard from './pages/DashboardPages/Admin/Dashboard'
import LoginForm from './pages/LoginPage'
import { BrowserRouter, Route, Routes } from "react-router-dom"
import DashboardAgente from './pages/DashboardPages/Admin/DashboardAgente'
import PrivateRoute from './components/PrivateRoute'
import DashboardPais from './pages/DashboardPages/Admin/DashboardArea'
import CallsWithAnalysis from './pages/Reporteria'
import ReporteriaID from './pages/reporteriaById'
import PerformanceSelector from './pages/AnalysisPage'
import HistorialAgentePerformance from './pages/HistorialAgentePerformance'
import HistorialPaisPerformance from './pages/HistorialClientePerformance'
import LogsTable from './pages/Logs'
import PerfilUsuario from './pages/Profile'

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
          <Route path="dashboard/pais" element={<DashboardPais />} />
          <Route path="dashboard/agente" element={<DashboardAgente />} />
          <Route path="reporteria" element={<CallsWithAnalysis />} />
          <Route path="reporteria/:id" element={<ReporteriaID />} />
          <Route path="analisis" element={<PerformanceSelector />} />
          <Route path="historial/agentes" element={<HistorialAgentePerformance />} />
          <Route path="historial/pais" element={<HistorialPaisPerformance />} />
          <Route path="auditoria" element={<LogsTable />} />
          <Route path="profile" element={<PerfilUsuario />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
