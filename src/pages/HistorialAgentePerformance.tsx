// src/pages/HistorialAgentePerformance.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AgentPerformanceReport } from "../types/AnalysisReport";
import { LogsService, PerformanceService } from "../services/Service";
import {
  FiArrowLeft,
  FiDownload,
  FiFileText,
  FiSmile,
  FiUsers,
  FiTrendingUp,
  FiClock,
  FiAlertTriangle,
} from "react-icons/fi";
import { useMe } from "../hook/useMe";

/* ======================== Paleta coherente ======================== */
const CLASSES = {
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
  outline:
    "border border-slate-300 hover:border-slate-400 text-slate-700 bg-white",
  chip: "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border",
  chipPos: "border-green-300 bg-green-50 text-green-800",
  chipNeu: "border-sky-300 bg-sky-50 text-sky-800",
  chipNeg: "border-rose-300 bg-rose-50 text-rose-800",
};

/* ===== Country helpers ===== */
const CODE_TO_LABEL: Record<string, string> = {
  AR: "Argentina",
  CL: "Chile",
  PE: "Perú",
  CO: "Colombia",
  MX: "México",
};
const normalizeCountryLabel = (raw?: string | null) => {
  if (!raw) return "";
  const t = String(raw).trim();
  if (CODE_TO_LABEL[t]) return CODE_TO_LABEL[t];
  return t.charAt(0).toUpperCase() + t.slice(1);
};

type AgentReportStored = AgentPerformanceReport & {
  _id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  created_at?: string;
  DateTime_realizado?: string;
  fecha_inicio_busqueda?: string;
  fecha_fin_busqueda?: string;
  pais?: string; // para filtrar por país
};

/* ======================== Helpers ======================== */
const pct = (v?: number | null) =>
  typeof v === "number" && isFinite(v) ? `${(v * 100).toFixed(1)}%` : "—";
const n2 = (v?: number | null) =>
  typeof v === "number" && isFinite(v) ? v.toFixed(2) : "—";
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");
const fmtDateShort = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString() : "—";
const getRangeStart = (r: AgentReportStored) =>
  r.fecha_inicio || r.fecha_inicio_busqueda || r.created_at;
const getRangeEnd = (r: AgentReportStored) =>
  r.fecha_fin || r.fecha_fin_busqueda || r.created_at;
const inRange = (d: Date, from?: string, to?: string) => {
  if (!from && !to) return true;
  const t = d.getTime();
  const f = from ? new Date(from).getTime() : -Infinity;
  const e = to ? new Date(to).getTime() : Infinity;
  return t >= f && t <= e;
};

const sentimentChip = (s?: string) => {
  const v = (s || "").toLowerCase();
  if (v === "positivo")
    return <span className={`${CLASSES.chip} ${CLASSES.chipPos}`}>Positivo</span>;
  if (v === "negativo")
    return <span className={`${CLASSES.chip} ${CLASSES.chipNeg}`}>Negativo</span>;
  if (v === "neutral")
    return <span className={`${CLASSES.chip} ${CLASSES.chipNeu}`}>Neutral</span>;
  return <span className="text-xs text-slate-500">—</span>;
};

/* =================== Export PDF (Agente) — actualizado =================== */
function exportarAgentePDF(data: AgentPerformanceReport) {
  const doc = new jsPDF();
  const now = new Date().toLocaleString();

  const val = (v: any) => (v === null || v === undefined ? "—" : v);

  doc.setFontSize(16);
  doc.text("Reporte de Análisis de Agente", 14, 15);
  doc.setFontSize(10);
  doc.text(`Fecha de generación: ${now}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["Campo", "Valor"]],
    body: [
      ["ID Empleado", String(val(data.id_empleado))],
      ["Nombre", val(data.nombre_empleado)],
      [
        "# Llamadas (válidas)",
        val(
          (data as any).numero_llamadas_validas ??
            (data as any).numero_llamadas ??
            (data as any).numero_llamadas_crudas ??
            "—"
        ),
      ],
      ...(typeof (data as any).numero_llamadas_crudas === "number" &&
      typeof (data as any).numero_llamadas_validas === "number"
        ? ([
            ["# Llamadas (crudas)", String((data as any).numero_llamadas_crudas)],
            [
              "Descartadas",
              String(
                ((data as any).numero_llamadas_crudas -
                  (data as any).numero_llamadas_validas) || 0
              ),
            ],
            [
              "Cortas (%)",
              pct(((data as any).cortas_pct as number) ?? null),
            ],
          ] as [string, string][])
        : []),
      ["Score promedio", n2((data as any).score_promedio ?? null)],
      ["Satisfacción promedio", n2((data as any).satisfaccion_promedio ?? null)],
      ["Duración prom. (min)", n2((data as any).duracion_promedio_min ?? null)],
      ...(typeof (data as any).aht_promedio_min === "number"
        ? ([["AHT prom. (min)", n2((data as any).aht_promedio_min)]] as [
            string,
            string
          ][])
        : []),
      ...(typeof (data as any).wrapup_promedio_seg === "number"
        ? ([["Wrap-up prom. (seg)", n2((data as any).wrapup_promedio_seg)]] as [
            string,
            string
          ][])
        : []),
      ...(typeof (data as any).hold_promedio_seg === "number"
        ? ([["Hold prom. (seg)", n2((data as any).hold_promedio_seg)]] as [
            string,
            string
          ][])
        : []),
      ...(typeof (data as any).holds_promedio === "number"
        ? ([["# Holds prom.", n2((data as any).holds_promedio)]] as [
            string,
            string
          ][])
        : []),
      ["Resueltos", pct((data as any).resolucion_pct ?? null)],
      ["Escalados", pct((data as any).escalados_pct ?? null)],
      ["Follow-up", pct((data as any).followup_pct ?? null)],
      [
        "Sentimiento predominante",
        val((data as any).sentimiento_predominante),
      ],
    ],
  });

  const lastY0 =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 80;

  // Cumplimiento protocolo (si viene)
  if ((data as any).cumplimiento_protocolo) {
    autoTable(doc, {
      startY: lastY0 + 6,
      head: [["Protocolo", "Cantidad"]],
      body: Object.entries((data as any).cumplimiento_protocolo).map(
        ([k, v]) => [String(k).charAt(0).toUpperCase() + String(k).slice(1), String(v ?? 0)]
      ),
    });
  }

  // Listas cualitativas
  const addList = (title: string, items?: string[]) => {
    if (!items?.length) return;
    const y =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? lastY0;
    doc.setFontSize(12);
    doc.text(title, 14, y + 8);
    doc.setFontSize(10);
    autoTable(doc, {
      startY: y + 10,
      head: [["Items"]],
      body: items.map((x) => [x]),
    });
  };

  addList("Fortalezas", (data as any).fortalezas_recurrentes);
  addList("Oportunidades de mejora", (data as any).oportunidades_mejora_recurrentes);
  addList("Temas frecuentes", (data as any).temas_frecuentes);
  addList("Motivos de follow-up", (data as any).motivos_followup_top);
  addList("Palabras clave frecuentes", (data as any).palabras_clave_frecuentes);
  addList("Alertas de calidad recurrentes", (data as any).alertas_calidad_recurrentes);
  addList("Recomendaciones", (data as any).recomendaciones);

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? lastY0;
  if ((data as any).resumen_ejecutivo) {
    doc.setFontSize(12);
    doc.text("Resumen ejecutivo:", 14, finalY + 10);
    doc.setFontSize(10);
    doc.text(
      doc.splitTextToSize((data as any).resumen_ejecutivo, 180),
      14,
      finalY + 16
    );
  }

  doc.save(
    `Analisis_Agente_${(data as any).nombre_empleado}_${new Date().toISOString()}.pdf`
  );
}

/* ================== Componente ================== */
const HistorialAgentePerformance = () => {
  const [reports, setReports] = useState<AgentReportStored[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // filtros UI
  const [agenteFiltro, setAgenteFiltro] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>(""); // bloqueado si no-admin

  const navigate = useNavigate();
  const { isAdmin, loadingMe, errorMe, me } = useMe();

  // País del scope (si no-admin)
  const scopedCountryLabel = useMemo(() => {
    if (isAdmin) return "";
    const scope = Array.isArray((me as any)?.country_scope)
      ? (me as any).country_scope
      : [];
    const first = scope.find((s: any) => s !== "*");
    return normalizeCountryLabel(first || "");
  }, [isAdmin, me]);

  // Seteo inicial del país filtrado
  useEffect(() => {
    if (!isAdmin) {
      setCountryFilter(scopedCountryLabel);
    }
  }, [isAdmin, scopedCountryLabel]);

  // Traer reportes
  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await PerformanceService.listReports();
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Lista de países presentes en los reportes (normalizados)
  const countriesInReports = useMemo(() => {
    const set = new Set<string>();
    (reports || []).forEach((r) => {
      const lbl = normalizeCountryLabel((r as any).pais);
      if (lbl) set.add(lbl);
    });
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "es"));
  }, [reports]);

  // Recorte por país según selección (admin) o scope (no-admin)
  const reportsByCountry = useMemo(() => {
    const hasPais = (r: AgentReportStored) => Boolean((r as any).pais);
    if (!isAdmin) {
      if (!scopedCountryLabel) return reports;
      if (!reports.some(hasPais)) return reports;
      return reports.filter(
        (r) => normalizeCountryLabel((r as any).pais) === scopedCountryLabel
      );
    }
    // admin
    if (!countryFilter) return reports;
    if (!reports.some(hasPais)) return reports;
    return reports.filter(
      (r) => normalizeCountryLabel((r as any).pais) === countryFilter
    );
  }, [reports, isAdmin, countryFilter, scopedCountryLabel]);

  // Opciones de agente únicas (ya recortadas por país)
  const agentesUnicos = useMemo(() => {
    return Array.from(
      new Set((reportsByCountry || []).map((r) => r.nombre_empleado || "—"))
    )
      .filter((x) => x && x !== "—")
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [reportsByCountry]);

  // Filtrado final por agente + fechas
  const filtered = useMemo(() => {
    const list = reportsByCountry.filter((r) => {
      const nameOk = agenteFiltro ? r.nombre_empleado === agenteFiltro : true;
      const refDate =
        getRangeStart(r) || r.created_at || r.DateTime_realizado || "";
      const okDate = refDate
        ? inRange(new Date(refDate), fechaInicio, fechaFin)
        : true;
      return nameOk && okDate;
    });

    return list.sort((a, b) => {
      const ad = new Date(a.created_at || getRangeStart(a) || 0).getTime();
      const bd = new Date(b.created_at || getRangeStart(b) || 0).getTime();
      return bd - ad;
    });
  }, [reportsByCountry, agenteFiltro, fechaInicio, fechaFin]);

  // Buscar (aplicar filtros) => LOG
  const handleBuscar = async () => {
    setSearching(true);
    try {
      const agente = agenteFiltro || "Todos";
      const desde = fechaInicio || "—";
      const hasta = fechaFin || "—";
      await LogsService.audit(
        `Historial agentes — filtros { agente="${agente}", desde=${desde}, hasta=${hasta}, pais=${
          isAdmin ? countryFilter || "Todos" : scopedCountryLabel
        } }`
      );
    } catch {
    } finally {
      setTimeout(() => setSearching(false), 350);
    }
  };

  // Descargar PDF => LOG
  const handlePDF = async (r: AgentReportStored) => {
    try {
      exportarAgentePDF(r);
      await LogsService.audit(
        `Descargó reporte PDF de agente "${r.nombre_empleado}"${
          (r as any).pais
            ? ` (pais=${normalizeCountryLabel((r as any).pais)})`
            : ""
        }`
      );
    } catch {}
  };

  const handleBack = async () => {
    try {
      await LogsService.audit("Regresó desde historial de reportes por agente");
    } catch {}
    navigate(-1);
  };

  /* ===== Guards de sesión ===== */
  if (loadingMe) {
    return (
      <div className="min-h-screen p-4">
        <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
          <div className="h-20 bg-slate-100 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }
  if (errorMe) {
    return (
      <div className="min-h-screen p-4">
        <div className="bg-white rounded-xl shadow border border-slate-200 p-4 text-red-600">
          No se pudo cargar tu sesión. Vuelve a iniciar sesión.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
          <button
            onClick={handleBack}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${CLASSES.outline}`}
          >
            <FiArrowLeft /> Regresar
          </button>
          <h1 className="text-xl font-bold text-slate-900 flex-1 text-center">
            Historial de reportes generados por agente
          </h1>
          {/* Chip país activo (solo informativo en no-admin) */}
          {!isAdmin && scopedCountryLabel && (
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700">
              País: <b>{scopedCountryLabel}</b>
            </span>
          )}
          {isAdmin && <div className="w-[110px]" />}
        </div>

        {/* Filtros */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            {/* País */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">País</label>
              {isAdmin ? (
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">Todos</option>
                  {countriesInReports.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={scopedCountryLabel}
                  disabled
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700"
                >
                  <option value={scopedCountryLabel}>
                    {scopedCountryLabel || "—"}
                  </option>
                </select>
              )}
            </div>

            {/* Agente */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Agente</label>
              <select
                value={agenteFiltro}
                onChange={(e) => setAgenteFiltro(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="">Todos</option>
                {agentesUnicos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Fechas */}
            <div>
              <label className="block text-sm font-medium mb-1">Desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>

            <div className="md:col-span-6 flex items-end">
              <button
                onClick={handleBuscar}
                className={`w-full md:w-auto px-4 py-2 rounded-lg ${CLASSES.primary}`}
                disabled={searching}
              >
                {searching ? "Buscando…" : "Aplicar"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        {(loading || searching) && (
          <div className="flex flex-col items-center justify-center h-48">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="mt-3 text-indigo-700 font-semibold">Cargando…</span>
          </div>
        )}

        {!loading && !searching && filtered.length === 0 && (
          <div className="p-6 text-center text-slate-600">
            No hay reportes disponibles.
          </div>
        )}

        {!loading && !searching && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[15px]">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-slate-700">
                  {[
                    "Nombre",
                    "ID",
                    "Llamadas (válidas)",
                    "Score prom.",
                    "Satisfacción",
                    "Sentimiento",
                    "Resueltos",
                    "Rango analizado",
                    "Generado",
                    "PDF",
                  ].map((th) => (
                    <th key={th} className="px-4 py-3 font-semibold text-center">
                      {th}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((r, idx) => {
                  const desde = getRangeStart(r);
                  const hasta = getRangeEnd(r);
                  const creado = r.created_at || r.DateTime_realizado;

                  return (
                    <tr
                      key={r._id || `${r.id_empleado}-${idx}`}
                      className="hover:bg-indigo-50/40 transition-colors"
                    >
                      <td className="px-4 py-2 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className="p-1.5 rounded-md bg-indigo-50 text-indigo-700">
                            <FiUsers />
                          </span>
                          {r.nombre_empleado || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">{r.id_empleado ?? "—"}</td>
                      <td className="px-4 py-2 text-center">
                        {(r as any).numero_llamadas_validas ??
                          (r as any).numero_llamadas ??
                          (r as any).numero_llamadas_crudas ??
                          "—"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {n2((r as any).score_promedio ?? null)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {n2((r as any).satisfaccion_promedio ?? null)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {sentimentChip((r as any).sentimiento_predominante ?? undefined)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {pct((r as any).resolucion_pct ?? null)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex flex-col">
                          <span className="text-slate-800">{fmtDateShort(desde)}</span>
                          <span className="text-slate-500 text-xs">{fmtDateShort(hasta)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">{fmtDate(creado)}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handlePDF(r)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                          title="Descargar PDF"
                        >
                          <FiDownload /> PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td className="px-4 py-3 text-sm text-slate-600" colSpan={10}>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-slate-200 bg-white">
                        <FiTrendingUp /> {filtered.length} reportes
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-slate-200 bg-white">
                        <FiSmile /> sentimiento legible (chips)
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-slate-200 bg-white">
                        <FiFileText /> exportación PDF por fila
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-slate-200 bg-white">
                        <FiClock /> campos AHT/Hold/Wrap-up incluidos en PDF
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-slate-200 bg-white">
                        <FiAlertTriangle /> alertas/temas en PDF si existen
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorialAgentePerformance;
