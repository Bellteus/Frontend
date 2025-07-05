// src/services/apiService.ts

import axios from "axios";
import { AudioWithAnalysis } from "../types/AnalysisAudio";
import { ClienteReporte } from "../types/ClientReport";
import { EmpleadoReporte } from "../types/AgentReport";
import api from "./Api"; // Asegúrate que tienes una instancia Axios configurada




// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

// ================== AUDIOS ==================

// Buscar audios (GET /audios/buscar)
export const buscarAudios = async (params: {
  FechaHoraInicio: string;
  fechafin: string;
  Cliente?: string;
  NombreArea?: string;
  IdEmpleado?: string;
}): Promise<AudioWithAnalysis[]> => {
  const response = await api.get<AudioWithAnalysis[]>(`/audios/buscar`, { params });
  return response.data;
};

// Buscar audio por ID (GET /audios/{id})
export const buscarAudioPorId = async (id: string): Promise<AudioWithAnalysis> => {
  const response = await api.get<AudioWithAnalysis>(`/audios/${id}`);
  return response.data;
};

// Reporteria de audios (GET /audios/Reporteria)
export const getReporteriaAudios = async (params: {
  FechaHoraInicio: string;
  fechafin: string;
  Cliente?: string;
  NombreArea?: string;
  IdEmpleado?: string;
}): Promise<ClienteReporte[]> => {
  const response = await api.get<ClienteReporte[]>(`/audios/Reporteria`, { params });
  return response.data;
};

// ================== ANALISIS AREA / CLIENTE ==================

// POST /ReporteAnalisisArea - Agregar Reporte de Cliente (por área/cliente)
export const postReporteAnalisisArea = async (params: {
  Cliente: string;
  FechaInicio: string;
  FechaFin: string;
}): Promise<ClienteReporte> => {
  const response = await api.post<ClienteReporte>(`/ReporteAnalisisArea`, null, { params });
  return response.data;
};

// ================== ANALISIS AGENTE ==================

// GET /reporteAnalisisAgente - Mostrar análisis de agente
export const getReporteAnalisisAgente = async (params: {
  Agente: string;
  fecha_inicio: string;
  fecha_fin: string;
}): Promise<EmpleadoReporte[]> => {
  const response = await api.get<EmpleadoReporte[]>(`/reporteAnalisisAgente`, { params });
  return response.data;
};

// DataService.ts
export const postReporteAnalisisAgente = async (params: {
  Agente: string;
  fecha_inicio: string;
  fecha_fin: string;
}): Promise<EmpleadoReporte[]> => {
  // Body: undefined (NO null, NO {}), params tal cual
  const response = await api.post<EmpleadoReporte[]>(
    `/reporteAnalisisAgente`,
    undefined,   // <--- esto es importante
    { params }
  );
  return response.data;
};


export const getSupervisorLogs = async () => {
  const response = await api.get('/logs');
  return response.data;
};

// Crear un nuevo log
export const postSupervisorLog = async (log: {
  user_id: string;
  user_email: string;
  action: string;
}) => {
  const response = await api.post('/logs', log);
  return response.data;
};

// Obtener logs filtrados por usuario
export const getSupervisorLogsByUser = async (user_id: string) => {
  const response = await api.get('/logs', { params: { user_id } });
  return response.data;
};

// ================== EXPORTS ==================

export default {
  buscarAudios,
  buscarAudioPorId,
  getReporteriaAudios,
  postReporteAnalisisArea,
  getReporteAnalisisAgente,
  postReporteAnalisisAgente,
  getSupervisorLogs,
  postSupervisorLog,
  getSupervisorLogsByUser,
};
