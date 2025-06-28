import api from "./Api"; // Asegúrate que tienes una instancia Axios configurada
import { AgenteResponsePerformance } from "../types/AgentePerformance";

export const AgentePerformanceService = {
    async PostAgentePerformance(
        Agente: string,
        fecha_inicio: string,
        fecha_fin: string
      ): Promise<AgenteResponsePerformance | null> {
        const params = new URLSearchParams();
        if (Agente) params.append('Agente', Agente);
        if (fecha_inicio) params.append('fecha_inicio', fecha_inicio);
        if (fecha_fin) params.append('fecha_fin', fecha_fin);
      
        try {
          const response = await api.post<AgenteResponsePerformance>(
            '/reporteAnalisisAgente',
            {},
            { params }
          );
          return response.data;
      
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
