// src/types/AnalysisReport.ts

export interface SentimentDistribution {
  // Para País (fracciones 0..1)
  positivo?: number | null;
  neutral?: number | null;
  negativo?: number | null;
}

export interface CountryPerformanceReport {
  pais: string;
  periodo?: string | null;
  numero_llamadas?: number | null;

  performance_score_promedio?: number | null;
  satisfaccion_cliente_promedio?: number | null;
  dispersion_performance_score?: number | null;
  dispersion_satisfaccion_cliente?: number | null;

  sentimiento_distribucion?: SentimentDistribution | null; // fracciones 0..1
  sentimiento_global?: "positivo" | "neutral" | "negativo" | string | null;

  porcentaje_resueltos?: number | null;  // fracción 0..1
  porcentaje_escalados?: number | null;  // fracción 0..1
  porcentaje_followup?: number | null;   // fracción 0..1

  cumplimiento_protocolo_distribucion?: Record<string, number> | null; // fracciones 0..1
  calltype_distribucion?: Record<string, number> | null;               // fracciones 0..1

  duracion_promedio_seg?: number | null;
  wrapup_promedio_seg?: number | null;
  hold_promedio_seg?: number | null;
  holds_promedio?: number | null;

  temas_principales?: string[];
  palabras_clave_frecuentes?: string[];
  fortalezas_recurrentes?: string[];
  oportunidades_mejora_recurrentes?: string[];
  alertas_calidad_recurrentes?: string[];

  organizaciones_destacadas?: string[] | null;
  organizaciones_con_riesgo?: string[] | null;
  agentes_destacados?: string[];
  agentes_con_bajo_performance?: string[];

  tendencias?: string | null;
  recomendaciones?: string[];
  resumen_ejecutivo?: string | null;

  // metadata opcional del backend
  _id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  created_at?: string;
  fuente?: string;
}

/** Para agente: el backend entrega CONTEOS (no fracciones) */
export interface SentimentCounts {
  positivo?: number | null;
  neutral?: number | null;
  negativo?: number | null;
}

export interface AgentPerformanceReport {
  id_empleado: number | string;
  nombre_empleado: string;

  // Nuevos contadores del backend
  numero_llamadas_crudas?: number | null;
  numero_llamadas_validas?: number | null;
  llamadas_descartadas?: number | null;
  cortas_pct?: number | null; // fracción 0..1

  // Alias legacy para no romper UI previa (el backend ya NO los envía)
  numero_llamadas?: number | null;

  // Métricas nuevas (nombres del backend)
  score_promedio?: number | null;
  satisfaccion_promedio?: number | null;
  duracion_promedio_min?: number | null;
  aht_promedio_min?: number | null;
  wrapup_promedio_seg?: number | null;
  hold_promedio_seg?: number | null;
  holds_promedio?: number | null;

  // Tasas (fracciones 0..1)
  resolucion_pct?: number | null;
  escalados_pct?: number | null;
  followup_pct?: number | null;

  // Protocolo: conteos globales
  cumplimiento_protocolo?: Record<string, number> | null; // {"sí": int, "parcial": int, "no": int}

  // Sentimiento
  sentimiento_predominante?: "positivo" | "neutral" | "negativo" | string | null;
  sentimiento_distribucion?: SentimentCounts | null; // CONTEOS en el backend

  // Hallazgos cualitativos
  fortalezas_recurrentes?: string[];
  oportunidades_mejora_recurrentes?: string[];
  recomendaciones?: string[];

  // Nuevos campos del prompt/LLM
  temas_frecuentes?: string[];
  motivos_followup_top?: string[];

  // Compatibilidad con UI anterior (si existía)
  temas_principales?: string[];

  // Otros
  palabras_clave_frecuentes?: string[];
  alertas_calidad_recurrentes?: string[];

  resumen_ejecutivo?: string | null;

  // Metadatos del backend
  _id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  created_at?: string;
  fuente?: string;

  // Legacy opcionales (si alguna vista antigua los usa)
  performance_score_promedio?: number | null;
  satisfaccion_cliente_promedio?: number | null;

  // Metas antiguas opcionales
  DateTime_realizado?: string;
  fecha_inicio_busqueda?: string;
  fecha_fin_busqueda?: string;
}
