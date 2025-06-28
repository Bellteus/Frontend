export interface ClienteReporte {
  _id: string;
  cliente: string;
  numero_llamadas: number;
  performance_score_promedio: number;
  satisfaccion_cliente_promedio: number;
  dispersion_performance_score: number;
  dispersion_satisfaccion_cliente: number;
  sentimiento_global: string;
  porcentaje_resueltos: number;
  porcentaje_escalados: number;
  porcentaje_followup: number;
  porcentaje_alertas_calidad: number;
  temas_principales: string[];
  palabras_clave_frecuentes: string[];
  fortalezas_recurrentes: string[];
  oportunidades_mejora_recurrentes: string[];
  alertas_calidad_recurrentes: string[];
}
