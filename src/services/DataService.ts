// src/services/apiService.ts

import axios from "axios";
import { AudioWithAnalysis } from "../types/AnalysisAudio";
import { ClienteReporte } from "../types/ClientReport";
import { EmpleadoReporte } from "../types/AgentReport";




// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8002";

// ================== AUDIOS ==================

// Buscar audios (GET /audios/buscar)
export const buscarAudios = async (params: {
  FechaHoraInicio: string;
  fechafin: string;
  Cliente?: string;
  NombreArea?: string;
  IdEmpleado?: string;
}): Promise<AudioWithAnalysis[]> => {
  const response = await axios.get<AudioWithAnalysis[]>(`${API_URL}/audios/buscar`, { params });
  return response.data;
};

// Buscar audio por ID (GET /audios/{id})
export const buscarAudioPorId = async (id: string): Promise<AudioWithAnalysis> => {
  const response = await axios.get<AudioWithAnalysis>(`${API_URL}/audios/${id}`);
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
  const response = await axios.get<ClienteReporte[]>(`${API_URL}/audios/Reporteria`, { params });
  return response.data;
};

// ================== ANALISIS AREA / CLIENTE ==================

// POST /ReporteAnalisisArea - Agregar Reporte de Cliente (por área/cliente)
export const postReporteAnalisisArea = async (params: {
  Cliente: string;
  FechaInicio: string;
  FechaFin: string;
}): Promise<ClienteReporte> => {
  const response = await axios.post<ClienteReporte>(`${API_URL}/ReporteAnalisisArea`, null, { params });
  return response.data;
};

// ================== ANALISIS AGENTE ==================

// GET /reporteAnalisisAgente - Mostrar análisis de agente
export const getReporteAnalisisAgente = async (params: {
  Agente: string;
  fecha_inicio: string;
  fecha_fin: string;
}): Promise<EmpleadoReporte[]> => {
  const response = await axios.get<EmpleadoReporte[]>(`${API_URL}/reporteAnalisisAgente`, { params });
  return response.data;
};

// DataService.ts
export const postReporteAnalisisAgente = async (params: {
  Agente: string;
  fecha_inicio: string;
  fecha_fin: string;
}): Promise<EmpleadoReporte[]> => {
  // Body: undefined (NO null, NO {}), params tal cual
  const response = await axios.post<EmpleadoReporte[]>(
    `${API_URL}/reporteAnalisisAgente`,
    undefined,   // <--- esto es importante
    { params }
  );
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
};
