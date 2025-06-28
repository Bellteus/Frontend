import api from "./Api"; // Asegúrate que tienes una instancia Axios configurada
import { AgenteResponsePerformance } from "../types/AgentePerformance";

export const AgentePerformanceService = {
    async PostAgentePerformance(Agente:string,fecha_inicio:string,fecha_fin:string):Promise<AgenteResponsePerformance>{
    const params = new URLSearchParams();
    if (Agente) {
        params.append('Agente', Agente);
    }
    if (fecha_inicio) {
        params.append('fecha_inicio', fecha_inicio);
    }
    if (fecha_fin) {
        params.append('fecha_fin', fecha_fin);
    }
   
    const response = await api.post<AgenteResponsePerformance>(
        '/reporteAnalisisAgente',
        {}, 
        { params } // 👈 aquí van los query params correctamente
      );   
  return  response.data;
  ;
  }
};