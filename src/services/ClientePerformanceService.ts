import api from "./Api"; // Asegúrate que tienes una instancia Axios configurada
import { ClientePerformance,ClienteResponsePerformance } from "../types/ClientesPerformance";

export const ClientePerformanceService = {
  async getTodosLosReportesClientes(): Promise<ClientePerformance[]> {
    const response = await api.get<ClientePerformance[]>(`/ReporteAnalisisArea`);
    return response.data;
  },
  async postAnalisisClientePerformanceService(Cliente:string,FechaInicio:string,FechaFin:string):Promise<ClienteResponsePerformance>{
    const params = new URLSearchParams();
    if (FechaInicio) {
        params.append('FechaInicio', FechaInicio);
    }
    if (FechaFin) {
        params.append('FechaFin', FechaFin);
    }
    if (Cliente) {
        params.append('Cliente', Cliente);
    }
   
    const response = await api.post<ClienteResponsePerformance>(
        '/ReporteAnalisisArea',
        {}, // 👈 cuerpo vacío
        { params } // 👈 aquí van los query params correctamente
      );   
  return  response.data;
  ;
  }
};

