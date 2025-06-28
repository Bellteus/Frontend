
import './App.css'
import Layout from './components/layout'
import Dashboard from './pages/Dashboard'
import LoginForm from './pages/LoginPage'
import { BrowserRouter,Route, Routes } from "react-router-dom"
import Reporteria from './pages/Reporteria'
import ReporteriaID from './pages/reporteriaById'
import DashboardPerfomance from './pages/DashboardPerfomance'
import HistorialClientePerformance from './pages/HistorialClientePerformance'
function App() {
  return (
    // Definición de las rutas de la aplicación
    // La ruta raíz renderiza el Layout, que contiene el Sidebar y el Outlet para las páginas hijas
    <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/" element={<Layout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="dashboard/Performance" element={<DashboardPerfomance/>}/>
        <Route path="dashboard/Performance/HistorialCliente" element={<HistorialClientePerformance/>}/>
        <Route path="dashboard/Performance/HistorialAgente" element={<DashboardPerfomance/>}/>

        <Route path="reporteria" element={<Reporteria />} />
        <Route path="/reporteria/:id" element={<ReporteriaID />} />

      </Route>
    </Routes>
  </BrowserRouter>
 
  )
}

export default App
