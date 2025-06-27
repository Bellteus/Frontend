export interface AnalisisLLM {
    performance_score: number;
    sentimiento_cliente: string;
    satisfaccion_cliente: number;
    sentimiento_inicio: string;
    sentimiento_fin: string;
    caso_resuelto: string;
    escalado: string;
    complejidad_caso: string;
    acciones_acordadas: string[];
    necesita_followup: string;
    alerta_calidad: string[] | null;
    fortalezas: string[];
    oportunidades_mejora: string[];
    protocolo_cumplido: string;
    evidencia_frases: string[];
    personas_mencionadas: string[];
    palabras_clave: string[];
    topicos_principales: string[];
    resumen: string;
    observaciones_llm: string;
  }
  
  export interface CallAnalysis {
    _id: string;
    audio_file: string;
    CallId: number;
    FechaHoraInicio: string;
    FechaHoraFin: string;
    ANI: number;
    CallDirection: string;
    Cliente: string;
    NombreArea: string;
    IdEmpleado: string;
    NombreEmpleado: string;
    TRANSCRIPCION: string;
    ANALISIS_LLM: AnalisisLLM;
  }
  