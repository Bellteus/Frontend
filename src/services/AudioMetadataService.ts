import api from "./Api";
import {  CallAnalysis } from "../types/AudiosMetadata";

export const CallService = {
    async getAllCalls(fechainicio:string,FechaHoraFin:string,cliente:string,NombreArea:string,IdEmpleado:string): Promise<CallAnalysis[]> {
    //usar params
        const params = new URLSearchParams();
        if (fechainicio) {
            params.append('FechaHoraInicio', fechainicio);
        }
        if (FechaHoraFin) {
            params.append('fechafin', FechaHoraFin);
        }
        if (cliente) {
            params.append('Cliente', cliente);
        }
        if (NombreArea) {
            params.append('NombreArea', NombreArea);
        }
        if (IdEmpleado) {
            params.append('IdEmpleado', IdEmpleado);
        }
        const response = await api.get<CallAnalysis[]>('/audios/buscar', {
            params, // 👈 Esta es la forma correcta de pasar los parámetros con axios
          })    
          console.log(`Llamadas obtenidas: ${response}`);
      return  response.data;
      ;
    },
    async getCallsById(id: string) {
        const response = await api.get<CallAnalysis>(`/audios/${id}`);
        return response.data;
      }
}