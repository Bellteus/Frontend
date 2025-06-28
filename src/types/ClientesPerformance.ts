export interface ClientePerformance {
    _id: string;
    cliente: string;
    numero_llamadas: number;
    performance_score_promedio: number;
    satisfaccion_cliente_promedio: number;
    dispersión_performance_score: number | null;
    dispersión_satisfaccion_cliente: number | null;
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
    agentes_destacados: string[];
    agentes_con_bajo_performance: string[];
    tendencias: string;
    recomendaciones: string[];
    resumen_ejecutivo: string;
    fecha_inicio_busqueda: string;
    fecha_fin_busqueda: string;
    DateTime_realizado: string;
  }
  export interface ClienteResponsePerformance {
    _id: string;
    cliente: string | null;
    numero_llamadas: number;
    performance_score_promedio: number;
    satisfaccion_cliente_promedio: number;
    dispersion_performance_score: number | null;
    dispersion_satisfaccion_cliente: number | null;
    sentimiento_global: string | null;
    porcentaje_resueltos: number;
    porcentaje_escalados: number;
    porcentaje_followup: number;
    porcentaje_alertas_calidad: number;
    temas_principales: string[];
    palabras_clave_frecuentes: string[];
    fortalezas_recurrentes: string[];
    oportunidades_mejora_recurrentes: string[];
    alertas_calidad_recurrentes: string[];
    agentes_destacados: string[];
    agentes_con_bajo_performance: string[];
    tendencias: string | null;
    recomendaciones: string[];
    resumen_ejecutivo: string;
    fecha_inicio_busqueda: string; // ISO Date format
    fecha_fin_busqueda: string;    // ISO Date format
    DateTime_realizado: string;    // ISO Date format
  }