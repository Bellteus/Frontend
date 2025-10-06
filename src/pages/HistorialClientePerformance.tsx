// src/pages/HistorialPaisPerformance.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CountryPerformanceReport,
  SentimentDistribution,
} from "../types/AnalysisReport";
import { CountryPerformanceService, LogsService } from "../services/Service";
import {
  FiArrowLeft,
  FiDownload,
  FiGlobe,
  FiSmile,
  FiTrendingUp,
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

/* ======================== Tipos extendidos ======================== */
type CountryReportStored = CountryPerformanceReport & {
  _id?: string;
  fecha_inicio?: string; // ISO
  fecha_fin?: string; // ISO
  created_at?: string; // ISO
};

/* ======================== Helpers ======================== */
const pct = (v?: number | null) =>
  typeof v === "number" && isFinite(v) ? `${(v * 100).toFixed(1)}%` : "—";
const n2 = (v?: number | null) =>
  typeof v === "number" && isFinite(v) ? v.toFixed(2) : "—";
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");
const fmtDateShort = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString() : "—";

const getRangeStart = (r: CountryReportStored) => r.fecha_inicio;
const getRangeEnd = (r: CountryReportStored) => r.fecha_fin;

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

const toPctMap = (map?: Record<string, number | null> | null) => {
  if (!map || typeof map !== "object") return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) out[k] = pct(v);
  return out;
};

const normalizeSentiment = (dist?: SentimentDistribution | null) => {
  if (!dist) return null;
  return {
    positivo: pct(dist.positivo ?? null),
    neutral: pct(dist.neutral ?? null),
    negativo: pct(dist.negativo ?? null),
  };
};

/* =================== Export PDF (País) =================== */
function exportarPaisPDF(data: CountryPerformanceReport) {
  const doc = new jsPDF();
  const now = new Date().toLocaleString();

  doc.setFontSize(16);
  doc.text("Reporte de Análisis por País", 14, 15);
  doc.setFontSize(10);
  doc.text(`Fecha de generación: ${now}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["Campo", "Valor"]],
    body: [
      ["País", data.pais],
      ["Periodo", data.periodo || "—"],
      ["# Llamadas", data.numero_llamadas ?? "—"],
      ["Score promedio", n2(data.performance_score_promedio)],
      ["Satisfacción promedio", n2(data.satisfaccion_cliente_promedio)],
      ["Sentimiento global", data.sentimiento_global || "—"],
      ["Resueltos", pct(data.porcentaje_resueltos)],
      ["Escalados", pct(data.porcentaje_escalados)],
      ["Follow-up", pct(data.porcentaje_followup)],
      ["Duración prom. (seg)", n2(data.duracion_promedio_seg ?? null)],
      ["Wrap-up prom. (seg)", n2(data.wrapup_promedio_seg ?? null)],
      ["Hold prom. (seg)", n2(data.hold_promedio_seg ?? null)],
      ["Holds prom.", n2(data.holds_promedio ?? null)],
    ],
  });

  const sentPct = normalizeSentiment(data.sentimiento_distribucion);
  if (sentPct) {
    const y =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? 80;
    autoTable(doc, {
      startY: y + 6,
      head: [["Sentimiento", "Distribución"]],
      body: [
        ["Positivo", sentPct.positivo],
        ["Neutral", sentPct.neutral],
        ["Negativo", sentPct.negativo],
      ],
    });
  }

  const calltypePct = toPctMap(data.calltype_distribucion);
  if (calltypePct) {
    const y =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? 80;
    autoTable(doc, {
      startY: y + 6,
      head: [["Tipo", "Distribución"]],
      body: Object.entries(calltypePct).map(([k, v]) => [k, v]),
    });
  }

  const addList = (title: string, items?: string[] | null) => {
    if (!items?.length) return;
    const y =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? 80;
    doc.setFontSize(12);
    doc.text(title, 14, y + 8);
    doc.setFontSize(10);
    autoTable(doc, {
      startY: y + 10,
      head: [["Items"]],
      body: items.map((x) => [x]),
    });
  };

  addList("Fortalezas recurrentes", data.fortalezas_recurrentes);
  addList("Oportunidades de mejora", data.oportunidades_mejora_recurrentes);
  addList("Temas principales", data.temas_principales);
  addList("Palabras clave frecuentes", data.palabras_clave_frecuentes);
  addList("Alertas de calidad recurrentes", data.alertas_calidad_recurrentes);
  addList("Agentes destacados", data.agentes_destacados);
  addList("Agentes con bajo performance", data.agentes_con_bajo_performance);
  addList("Organizaciones destacadas", data.organizaciones_destacadas || undefined);
  addList("Organizaciones con riesgo", data.organizaciones_con_riesgo || undefined);

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 80;
  if (data.resumen_ejecutivo) {
    doc.setFontSize(12);
    doc.text("Resumen ejecutivo:", 14, finalY + 10);
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(data.resumen_ejecutivo, 180), 14, finalY + 16);
  }

  doc.save(`Analisis_Pais_${data.pais}_${new Date().toISOString()}.pdf`);
}

/* ================== Componente ================== */
const HistorialPaisPerformance = () => {
  const [reports, setReports] = useState<CountryReportStored[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [paisFiltro, setPaisFiltro] = useState("");

  const navigate = useNavigate();
  const { isAdmin, loadingMe, errorMe, me } = useMe();

  // País del scope (si NO admin)
  const scopedCountryLabel = useMemo(() => {
    if (isAdmin) return "";
    const scope = Array.isArray((me as any)?.country_scope)
      ? (me as any).country_scope
      : [];
    const first = scope.find((s:any) => s !== "*");
    return normalizeCountryLabel(first || "");
  }, [isAdmin, me]);

  // Set inicial de país bloqueado para no-admin
  useEffect(() => {
    if (!isAdmin) setPaisFiltro(scopedCountryLabel);
  }, [isAdmin, scopedCountryLabel]);

  // Obtener todos los reportes (el backend ya debería respetar el JWT)
  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await CountryPerformanceService.listReports();
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

  // Países únicos (normalizados) para admin
  const paisesUnicos = useMemo(() => {
    const set = new Set<string>();
    (reports || []).forEach((r) => {
      const lbl = normalizeCountryLabel(r.pais);
      if (lbl) set.add(lbl);
    });
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "es"));
  }, [reports]);

  // Filtrado por país (admin selecciona; no-admin fijo al scope) + rango
  const filtered = useMemo(() => {
    const activeCountry = isAdmin ? paisFiltro : scopedCountryLabel;
    const list = reports.filter((r) => {
      const paisOk = activeCountry
        ? normalizeCountryLabel(r.pais) === activeCountry
        : true;
      const ref = getRangeStart(r) || r.created_at;
      const dateOk = ref ? inRange(new Date(ref), fechaInicio, fechaFin) : true;
      return paisOk && dateOk;
    });

    return list.sort((a, b) => {
      const ad = new Date(a.created_at || getRangeStart(a) || 0).getTime();
      const bd = new Date(b.created_at || getRangeStart(b) || 0).getTime();
      return bd - ad;
    });
  }, [reports, paisFiltro, fechaInicio, fechaFin, isAdmin, scopedCountryLabel]);

  // Buscar (aplicar filtros) => LOG
  const handleBuscar = async () => {
    setSearching(true);
    try {
      const pais = (isAdmin ? paisFiltro : scopedCountryLabel) || "Todos";
      const desde = fechaInicio || "—";
      const hasta = fechaFin || "—";
      await LogsService.audit(
        `Historial países — filtros { pais="${pais}", desde=${desde}, hasta=${hasta} }`
      );
    } catch {
    } finally {
      setTimeout(() => setSearching(false), 350);
    }
  };

  // Descargar PDF => LOG
  const handlePDF = async (r: CountryReportStored) => {
    try {
      exportarPaisPDF(r);
      await LogsService.audit(`Descargó reporte PDF de país "${r.pais}"`);
    } catch {}
  };

  // Regresar => LOG
  const handleBack = async () => {
    try {
      await LogsService.audit("Regresó desde historial de reportes por país");
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
            Historial de reportes generados por país
          </h1>
          {/* Chip país activo para no-admin */}
          {!isAdmin && scopedCountryLabel && (
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700">
              País: <b>{scopedCountryLabel}</b>
            </span>
          )}
          {isAdmin && <div className="w-[110px]" />}
        </div>

        {/* Filtros */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">País</label>
              {isAdmin ? (
                <select
                  value={paisFiltro}
                  onChange={(e) => setPaisFiltro(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">Todos</option>
                  {paisesUnicos.map((p) => (
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

            <div>
              <button
                onClick={handleBuscar}
                className={`w-full px-4 py-2 rounded-lg ${CLASSES.primary}`}
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
                    "País",
                    "Llamadas",
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
                  return (
                    <tr
                      key={r._id || `${r.pais}-${idx}`}
                      className="hover:bg-indigo-50/40 transition-colors"
                    >
                      <td className="px-4 py-2 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className="p-1.5 rounded-md bg-indigo-50 text-indigo-700">
                            <FiGlobe />
                          </span>
                          {normalizeCountryLabel(r.pais)}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {r.numero_llamadas ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {n2(r.performance_score_promedio)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {n2(r.satisfaccion_cliente_promedio)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {sentimentChip(r.sentimiento_global ?? undefined)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {pct(r.porcentaje_resueltos)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex flex-col">
                          <span className="text-slate-800">
                            {fmtDateShort(desde)}
                          </span>
                          <span className="text-slate-500 text-xs">
                            {fmtDateShort(hasta)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {fmtDate(r.created_at)}
                      </td>
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
                  <td className="px-4 py-3 text-sm text-slate-600" colSpan={9}>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-slate-200 bg-white">
                        <FiTrendingUp /> {filtered.length} reportes
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-slate-200 bg-white">
                        <FiSmile /> sentimiento legible (chips)
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

export default HistorialPaisPerformance;
