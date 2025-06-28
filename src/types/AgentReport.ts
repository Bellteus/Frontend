export interface EmpleadoReporte {
    _id: string;
  length: number;
  id_empleado: string;
  nombre_empleado: string;
  numero_llamadas: number;
  performance_score_promedio: number;
  satisfaccion_cliente_promedio: number;
  "dispersión_performance_score": number;
  "dispersión_satisfaccion_cliente": number;
  sentimiento_predominante: string;
  porcentaje_resueltos: number;
  porcentaje_escalados: number;
  porcentaje_followup: number;
  porcentaje_alertas_calidad: number;
  protocolo_cumplido: {
    sí: number;
    parcial: number;
    no: number;
  };
  fortalezas_recurrentes: string[];
  oportunidades_mejora_recurrentes: string[];
  temas_principales: string[];
  palabras_clave_frecuentes: string[];
  alertas_calidad_recurrentes: string[];
  recomendaciones: string[];
  resumen_ejecutivo: string;
  fecha_inicio_busqueda: string;
  fecha_fin_busqueda: string;
  DateTime_realizado: string;
}
