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
   try{
    const response = await api.post<ClienteResponsePerformance>(
        '/ReporteAnalisisArea',
        {}, // 👈 cuerpo vacío
        { params } // 👈 aquí van los query params correctamente
      );   
      return  response.data;

    } catch (error: any) {
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.detail || "Error desconocido";
    
          // 🔍 Manejamos errores específicos
          if (status === 404) {
            console.warn("❗Agente no encontrado:", message);
            // Puedes mostrar un toast, alert o retornar un error personalizado
            throw new Error("El agente no fue encontrado.");
          }
    
          if (status === 500) {
            console.error("💥 Error interno del servidor:", message);
            throw new Error("Error interno del servidor. Intente más tarde.");
          }
    
          // Otro código de error
          throw new Error(`Error ${status}: ${message}`);
        }
    
        if (error.request) {
          // No hubo respuesta del servidor
          throw new Error("No se recibió respuesta del servidor.");
        }
    
        // Error desconocido
        throw new Error("Error desconocido al procesar la solicitud.");
      }
    }

  
}



