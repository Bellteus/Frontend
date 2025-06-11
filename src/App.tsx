// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Pages/DashboardComponents/Dashboard';
import Navbar from './Pages/NavBarComponents/NavBar'; // Asegúrate de la ruta correcta
import Reports from './Pages/ReportComponents/Reports'; // Asegúrate de que este componente exista
import MediaTable from './Pages/Media-TableComponent/Media-Table';
import TranscriptionAudio from './Pages/TranscriptionComponents/Transcription';
import FilterTMO from './Pages/FilterTMOComponent/FilterTMO';
import ClientSatisfaction from './Pages/ClientSatisfactionComponent/ClientSatisfaction';
import CallPerClientType from './Pages/CallPerClientTypeComponent/CallPerClientType';
import DataTable from './Pages/DataMetadataTableComponent/DataTable';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Redirigir raíz al dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Ruta del dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Ruta de reportes */}
        <Route path="/reports" element={<Reports />} />
        
        <Route path="/media" element={<MediaTable />} />
        <Route path="/transcriptionAudio/:id" element={<TranscriptionAudio />} />
        <Route path="/FilterTMO" element={<FilterTMO />} />
        <Route path="/Satisfaction" element={<ClientSatisfaction />} />
        <Route path="/Call-Per-Client" element={<CallPerClientType />} />
        <Route path="/Metadata" element={<DataTable />} />

        {/* Ruta de login (ejemplo) */}
        {/* Ejemplo: Ruta de reportes */}
        {/* <Route path="/reports" element={<Reports />} /> */}
      </Routes>
    </>
  );
}

export default App;
