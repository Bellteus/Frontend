import axios, { AxiosError } from "axios";
import type { UserCreate, UserOut, UserUpdate } from "../types/User";
import type { CallRecord2 } from "../types/CallRecord";
import { AgentPerformanceReport, CountryPerformanceReport } from "../types/AnalysisReport";
import { ActionLog, ActionLogCreate } from "../types/Logs";

/* ===============================================================
   AXIOS + JWT por HEADER
   =============================================================== */
const API_BASE_RAW = import.meta.env.VITE_API_URL || "https://bellteus.cbon.site";
/** Fuerza https por si alguna vez llega en http y evita redirecciones en preflight */
const API_BASE = API_BASE_RAW.replace(/^http:\/\//, "https://");

const api = axios.create({
  baseURL: API_BASE,
  headers: { Accept: "application/json" },
  withCredentials: false, // JWT por header, no cookies
});

/* ---------- Claves en localStorage para token y usuario ---------- */
const TOKEN_KEY = "token";
const USER_ID_KEY = "id";
const USER_EMAIL_KEY = "email";

/* ---------- Helpers JWT ---------- */
interface JWTPayload {
  sub?: string; // puede ser email o id
  email?: string;
  username?: string;
  user_id?: string | number;
  id?: string | number;
  exp?: number;
  [k: string]: unknown;
}

function parseJwt(token: string): JWTPayload | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Persiste id y email derivados del token (si existen) */
function persistUserFromToken(token: string) {
  const payload = parseJwt(token);
  if (!payload) return;

  // email: 'email', 'username' o 'sub' si parece email
  const email =
    (payload.email as string) ??
    (payload.username as string) ??
    (typeof payload.sub === "string" && payload.sub.includes("@") ? payload.sub : undefined);

  // id: 'user_id', 'id' o 'sub' si no es email
  const userIdRaw =
    payload.user_id ??
    payload.id ??
    (typeof payload.sub === "string" && !payload.sub.includes("@") ? payload.sub : undefined);

  if (email) localStorage.setItem(USER_EMAIL_KEY, String(email));
  if (userIdRaw !== undefined && userIdRaw !== null) localStorage.setItem(USER_ID_KEY, String(userIdRaw));
}

/* ---------- Helpers token ---------- */
function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
  api.defaults.headers.common.Authorization = `Bearer ${t}`;
  // Derivar y guardar email/id desde el JWT
  persistUserFromToken(t);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  delete api.defaults.headers.common.Authorization;
}

// Al recargar, si hay token lo activamos y persistimos email/id:
const bootToken = getToken();
if (bootToken) {
  api.defaults.headers.common.Authorization = `Bearer ${bootToken}`;
  persistUserFromToken(bootToken);
}

/* ---------- Manejo global de 401 ---------- */
export interface ApiError {
  status?: number;
  message: string;
  details?: unknown;
  url?: string;
  method?: string;
}
let onUnauthorized: ((err?: unknown) => void) | null = null;
export const setOnUnauthorized = (handler: (err?: unknown) => void) => {
  onUnauthorized = handler;
};

function normalizeError(err: unknown): ApiError {
  const axErr = err as AxiosError<any>;
  const status = axErr.response?.status;
  const message =
    axErr.response?.data?.detail ||
    axErr.response?.data?.message ||
    axErr.message ||
    "Error desconocido";
  return {
    status,
    message,
    details: axErr.response?.data,
    url: axErr.config?.url,
    method: axErr.config?.method,
  };
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const norm = normalizeError(error);
    if (norm.status === 401 || norm.status === 403) {
      clearToken();
      if (onUnauthorized) onUnauthorized(error);
    }
    return Promise.reject(norm);
  }
);

/* ===============================================================
   TIPOS
   =============================================================== */
export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface TimeseriesPoint {
  timestamp: string;
  value: number;
  group?: string;
}

export interface KpiSummary {
  total_calls: number;
  avg_duration?: number;
}

/** Respuesta del endpoint /calls/by-date */
export interface CallsByDateResponse {
  total: number;
  usuario: string;
  scopes: string[] | string | null;
  records: CallRecord2[];
}

/* ===============================================================
   HELPERS DE DESCARGA
   =============================================================== */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ===============================================================
   AUTH SERVICE (JWT por header)
   =============================================================== */
type LoginResponse = { access_token: string; token_type: string };

export const AuthService = {
  register: async (data: UserCreate) => {
    const { data: user } = await api.post<UserOut>("/auth/register", data);
    return user;
  },

  login: async (email: string, password: string) => {
    const form = new URLSearchParams({ username: email, password });
    const { data } = await api.post<LoginResponse>("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!data?.access_token) throw new Error("Token no recibido");
    setToken(data.access_token);

    // OPCIONAL: si el token no traía email/id, intenta enriquecer con /auth/me
    if (!localStorage.getItem(USER_EMAIL_KEY) || !localStorage.getItem(USER_ID_KEY)) {
      try {
        const { data: me } = await api.get<UserOut>("/auth/me");
        if ((me as any)?.email) localStorage.setItem(USER_EMAIL_KEY, String((me as any).email));
        if ((me as any)?.id) localStorage.setItem(USER_ID_KEY, String((me as any).id));
      } catch {
        // silencioso: no rompas el login si falla /auth/me
      }
    }

    return data;
  },

  logout: async () => {
    clearToken();
  },

  me: async () => {
    const { data } = await api.get<UserOut>("/auth/me");
    return data;
  },

  listUsers: async (skip = 0, limit = 50) => {
    const { data } = await api.get<UserOut[]>("/auth/users", { params: { skip, limit } });
    return data;
  },

  updateUser: async (userId: string, payload: UserUpdate) => {
    const { data } = await api.patch<UserOut>(`/auth/users/${userId}`, payload);
    return data;
  },
};

/* ===============================================================
   CALLS SERVICE
   =============================================================== */
export const CallsService = {
  kpiSummary: async (start: string, end: string, pais?: string) => {
    const { data } = await api.get<KpiSummary>("/calls/kpi-summary", {
      params: { start, end, pais },
    });
    return data;
  },

  /** NUEVO: metadata base (ligera) por rango y país opcional */
  callsByDate: async (start: string, end: string, pais?: string) => {
    const { data } = await api.get<CallsByDateResponse>("/calls/by-date", {
      params: { start, end, pais },
    });
    // Devolvemos normalizado y tipado
    return {
      total: Number(data?.total ?? 0),
      usuario: String(data?.usuario ?? ""),
      scopes: (data?.scopes ?? null) as string[] | string | null,
      records: (Array.isArray(data?.records) ? data.records : []) as CallRecord2[],
    };
  },

  withTranscription: async (
    start: string,
    end: string,
    page = 1,
    page_size = 50,
    only_with_transcription = true,
    agent_id?: number,
    pais?: string
  ) => {
    const { data } = await api.get<Page<any>>("/calls/with-transcription", {
      params: {
        start,
        end,
        page,
        page_size,
        only_with_transcription,
        agent_id,
        pais,
      },
    });
    return data;
  },

  topAgents: async (start: string, end: string, limit?: number, pais?: string) => {
    const { data } = await api.get<any[]>("/calls/top-agents", {
      params: { start, end, limit, pais },
    });
    return data;
  },

  topCountries: async (start: string, end: string, limit?: number, pais?: string) => {
    const { data } = await api.get<any[]>("/calls/top-countries", {
      params: { start, end, limit, pais },
    });
    return data;
  },

  agentsByCountry: async (start: string, end: string, pais?: string) => {
    const { data } = await api.get<any[]>("/calls/agents-by-country", {
      params: { start, end, pais },
    });
    return data;
  },

  timeseries: async (
    start: string,
    end: string,
    granularity: "hour" | "day" | "week" = "day",
    dimension?: "pais" | "agent",
    limit_groups = 10,
    pais?: string
  ) => {
    const { data } = await api.get<TimeseriesPoint[]>("/calls/timeseries", {
      params: { start, end, granularity, dimension, limit_groups, pais },
    });
    return data;
  },

  qualityMetrics: async (start: string, end: string, pais?: string) => {
    const { data } = await api.get<any>("/calls/quality-metrics", {
      params: { start, end, pais },
    });
    return data;
  },

  callWithTranscription: async (call_id: number, pais?: string) => {
    const { data } = await api.get<any>(`/calls/${call_id}/with-transcription`, {
      params: { pais },
    });
    return data;
  },
};

/* ===============================================================
   JOIN SERVICE
   =============================================================== */
export const JoinService = {
  listWithAnalysis: async (
    start: string,
    end: string,
    page = 1,
    page_size = 50,
    only_with_analysis = false
  ) => {
    const { data } = await api.get<Page<any>>("/calls/with-analysis", {
      params: { start, end, page, page_size, only_with_analysis },
    });
    return data;
  },

  getCallWithAnalysisById: async (call_id: number) => {
    const { data } = await api.get<any>(`/calls/${call_id}/with-analysis`);
    return data;
  },

  listFull: async (
    start: string,
    end: string,
    page = 1,
    page_size = 50,
    only_with_analysis = false,
    only_with_diarization = false
  ) => {
    const { data } = await api.get<Page<any>>("/calls/full", {
      params: { start, end, page, page_size, only_with_analysis, only_with_diarization },
    });
    return data;
  },

  getCallFullById: async (call_id: number) => {
    const { data } = await api.get<any>(`/calls/${call_id}/full`);
    return data;
  },
};

/* ===============================================================
   AUDIO SERVICE
   =============================================================== */
export const AudioService = {
  streamAudio: async (id_llamada: number, download = false, debug = false) => {
    const { data } = await api.get<Blob>(`/audio/${id_llamada}`, {
      params: { download, debug },
      responseType: "blob",
    });
    return data;
  },

  openInNewTab: async (id_llamada: number) => {
    const blob = await AudioService.streamAudio(id_llamada, false, false);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  download: async (id_llamada: number, filename = `audio_${id_llamada}.wav`) => {
    const blob = await AudioService.streamAudio(id_llamada, true, false);
    downloadBlob(blob, filename);
  },
};

/* ===============================================================
   ANALYSIS SERVICE
   =============================================================== */
export const AnalysisService = {
  getByCallId: async (call_id: number) => {
    const { data } = await api.get<any>(`/analysis/${call_id}`);
    return data;
  },
};

/* ===============================================================
   PERFORMANCE SERVICE (por agente)
   =============================================================== */
export const PerformanceService = {
  /** POST /performance/analyze?agente=...&fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD */
  analyzeAgent: async (agente: string, fecha_inicio: string, fecha_fin: string) => {
    const { data } = await api.post<AgentPerformanceReport>(
      "/performance/analyze",
      null,
      { params: { agente, fecha_inicio, fecha_fin } }
    );
    return data;
  },

  /** GET /performance/list[?agente=...] */
  listReports: async (agente?: string) => {
    const { data } = await api.get<AgentPerformanceReport[]>("/performance/list", {
      params: agente ? { agente } : undefined,
    });
    return data;
  },
};

/* ===============================================================
   COUNTRY PERFORMANCE SERVICE (por país)
   =============================================================== */
export const CountryPerformanceService = {
  /** POST /country-performance/analyze?pais=...&fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD */
  analyzeCountry: async (pais: string, fecha_inicio: string, fecha_fin: string) => {
    const { data } = await api.post<CountryPerformanceReport>(
      "/country-performance/analyze",
      null,
      { params: { pais, fecha_inicio, fecha_fin } }
    );
    return data;
  },

  /** GET /country-performance/list[?pais=...] */
  listReports: async (pais?: string) => {
    const { data } = await api.get<CountryPerformanceReport[]>("/country-performance/list", {
      params: pais ? { pais } : undefined,
    });
    return data;
  },
};

/* ===============================================================
   LOGS SERVICE (con trailing slash para evitar 307/redirect en preflight)
   =============================================================== */
export const LogsService = {
  /**
   * GET /logs/?limit=N
   */
  list: async (limit?: number) => {
    const { data } = await api.get<ActionLog[]>("/logs/", { params: { limit } });
    return data;
  },

  /**
   * POST /logs/
   */
  create: async (log: ActionLogCreate) => {
    const { data } = await api.post<ActionLog>("/logs/", log);
    return data;
  },

  /**
   * Azúcar sintáctico legacy.
   */
  postSupervisorLog: async (payload: {
    user_id: string;
    user_email: string;
    action: string;
    timestamp?: string;
  }) => {
    return LogsService.create(payload);
  },

  /**
   * Nuevo helper usado por PerformanceSelector:
   * Construye el payload con user_id y user_email desde localStorage.
   * Si faltan, hace fallback a leerlos del JWT al vuelo y los persiste.
   * No lanza error para no romper la UI.
   */
  audit: async (
    action: string,
    extras?: Partial<Pick<ActionLogCreate, "timestamp">>
  ): Promise<void> => {
    try {
      let user_id = localStorage.getItem(USER_ID_KEY) ?? "";
      let user_email = localStorage.getItem(USER_EMAIL_KEY) ?? "";

      // 🔒 Fallback: si no hay en localStorage, intenta leer del JWT
      if ((!user_id || !user_email) && getToken()) {
        const payload = parseJwt(getToken()!);
        if (!user_email) {
          user_email =
            String(payload?.email ?? payload?.username ?? "") ||
            (typeof payload?.sub === "string" && payload.sub.includes("@") ? payload.sub : "");
        }
        if (!user_id) {
          user_id = String(
            payload?.user_id ??
              payload?.id ??
              (typeof payload?.sub === "string" && !payload.sub.includes("@") ? payload.sub : "")
          );
        }
        if (user_email) localStorage.setItem(USER_EMAIL_KEY, user_email);
        if (user_id) localStorage.setItem(USER_ID_KEY, user_id);
      }

      await LogsService.create({
        user_id: user_id ?? "",
        user_email: user_email ?? "",
        action,
        ...(extras || {}),
      });
    } catch (err) {
      // No bloquees la UI si falla el log
      console.warn("[LogsService.audit] fallo al registrar log:", err);
    }
  },
};

/* ===============================================================
   EXPORT GLOBAL
   =============================================================== */
export const Services = {
  AuthService,
  CallsService,
  JoinService,
  AudioService,
  AnalysisService,
  PerformanceService,
  CountryPerformanceService,
  setOnUnauthorized,
  LogsService,
};

export default Services;
