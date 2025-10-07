// src/pages/PerformanceSelector.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CountryPerformanceReport,
  AgentPerformanceReport,
  SentimentDistribution,
} from "../types/AnalysisReport";
import {
  CountryPerformanceService,
  PerformanceService,
  LogsService,
  CallsService,
} from "../services/Service";
import {
  FiBarChart2,
  FiSmile,
  FiClock,
  FiTrendingUp,
  FiFileText,
  FiDownload,
  FiUsers,
  FiAlertTriangle,
  FiTarget,
  FiUser,
  FiHash,
} from "react-icons/fi";
import { useMe } from "../hook/useMe";

/* ======================== Paleta coherente ======================== */
const CLASSES = {
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
  outline:
    "border border-slate-300 hover:border-slate-400 text-slate-700 bg-white",
};

/* ======================== Países y normalización ======================== */
const COUNTRY_OPTIONS = ["Argentina", "Chile", "Perú", "Colombia"] as const;
const CODE_TO_LABEL: Record<string, string> = {
  AR: "Argentina",
  CL: "Chile",
  PE: "Perú",
  CO: "Colombia",
  MX: "México",
};
const LABEL_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(CODE_TO_LABEL).map(([k, v]) => [v, k])
);
function normalizeCountryLabel(raw?: string | null): string {
  if (!raw) return "";
  const t = raw.trim();
  if (COUNTRY_OPTIONS.includes(t as any)) return t;
  if (CODE_TO_LABEL[t]) return CODE_TO_LABEL[t];
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* ======================== Helpers ======================== */
const pct = (v?: number | null) =>
  typeof v === "number" && isFinite(v) ? `${(v * 100).toFixed(1)}%` : "—";
const n2 = (v?: number | null) =>
  typeof v === "number" && isFinite(v) ? v.toFixed(2) : "—";
const secLegible = (s?: number | null) => {
  if (s == null || !isFinite(s)) return "—";
  const total = Math.round(s);
  const m = Math.floor(total / 60);
  const ss = total % 60;
  return m ? `${m}m ${ss}s` : `${ss}s`;
};
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const safeFrac = (v?: number | null) =>
  typeof v === "number" && isFinite(v) && v >= 0 ? Math.min(v, 1) : 0;

function toPctMap(
  map?: Record<string, number | null> | null
): Record<string, string> | null {
  if (!map || typeof map !== "object") return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) out[k] = pct(v);
  return out;
}
function normalizeSentiment(dist?: SentimentDistribution | null) {
  const base: Record<string, number | null> | null = dist
    ? {
        positivo: dist.positivo ?? null,
        neutral: dist.neutral ?? null,
        negativo: dist.negativo ?? null,
      }
    : null;
  return toPctMap(base);
}

/* =================== Export PDF (País) =================== */
export function exportarPaisPDF(
  data: CountryPerformanceReport,
  generatedByEmail?: string
) {
  const doc = new jsPDF();
  const now = new Date().toLocaleString();
  doc.setFontSize(16);
  doc.text("Reporte de Análisis por País", 14, 15);
  doc.setFontSize(10);
  doc.text(`Fecha de generación: ${now}`, 14, 22);
  if (generatedByEmail) doc.text(`Generado por: ${generatedByEmail}`, 14, 27);

  autoTable(doc, {
    startY: generatedByEmail ? 33 : 28,
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

  const lastY0 =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 80;

  const sentPct = normalizeSentiment(data.sentimiento_distribucion);
  if (sentPct) {
    autoTable(doc, {
      startY: lastY0 + 6,
      head: [["Sentimiento", "Distribución"]],
      body: [
        ["Positivo", sentPct["positivo"] ?? "—"],
        ["Neutral", sentPct["neutral"] ?? "—"],
        ["Negativo", sentPct["negativo"] ?? "—"],
      ],
    });
  }

  const lastY1 =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 80;
  const calltypePct = toPctMap(data.calltype_distribucion);
  if (calltypePct) {
    autoTable(doc, {
      startY: lastY1 + 6,
      head: [["Tipo", "Distribución"]],
      body: Object.entries(calltypePct).map(([k, v]) => [k, v]),
    });
  }

  const addList = (title: string, items?: string[] | null) => {
    if (!items?.length) return;
    const lastY =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? 80;
    doc.setFontSize(12);
    doc.text(title, 14, lastY + 8);
    doc.setFontSize(10);
    autoTable(doc, {
      startY: lastY + 10,
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
  addList(
    "Organizaciones destacadas",
    data.organizaciones_destacadas || undefined
  );
  addList(
    "Organizaciones con riesgo",
    data.organizaciones_con_riesgo || undefined
  );

  const lastY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 80;
  if (data.resumen_ejecutivo) {
    doc.setFontSize(12);
    doc.text("Resumen ejecutivo:", 14, lastY + 10);
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(data.resumen_ejecutivo, 180), 14, lastY + 16);
  }
  doc.save(`Analisis_Pais_${data.pais}_${new Date().toISOString()}.pdf`);
}

/* ================== Export PDF (Agente) ================== */
export function exportarAgentePDF(
  data: AgentPerformanceReport,
  generatedByEmail?: string
) {
  const doc = new jsPDF();
  const now = new Date().toLocaleString();
  doc.setFontSize(16);
  doc.text("Reporte de Análisis de Agente", 14, 15);
  doc.setFontSize(10);
  doc.text(`Fecha de generación: ${now}`, 14, 22);
  if (generatedByEmail) doc.text(`Generado por: ${generatedByEmail}`, 14, 27);

  autoTable(doc, {
    startY: generatedByEmail ? 33 : 28,
    head: [["Campo", "Valor"]],
    body: [
      ["ID Empleado", String(data.id_empleado)],
      ["Nombre", data.nombre_empleado],
      ["# Llamadas (válidas)", data.numero_llamadas_validas ?? data.numero_llamadas_crudas ?? "—"],
      ...(typeof data.numero_llamadas_crudas === "number" && typeof data.numero_llamadas_validas === "number"
        ? ([
            ["# Llamadas (crudas)", String(data.numero_llamadas_crudas)],
            ["Descartadas", String((data.numero_llamadas_crudas - data.numero_llamadas_validas) || 0)],
            ["Cortas (%)", pct((data as any).cortas_pct as number)],
          ] as [string, string][])
        : []),
      ["Score promedio", n2(data.score_promedio)],
      ["Satisfacción promedio", n2(data.satisfaccion_promedio)],
      ["Duración prom. (min)", n2(data.duracion_promedio_min)],
      ...(typeof data.aht_promedio_min === "number"
        ? ([["AHT prom. (min)", n2(data.aht_promedio_min)]] as [string, string][])
        : []),
      ["Resueltos", pct(data.resolucion_pct)],
      ["Escalados", pct(data.escalados_pct)],
      ["Follow-up", pct(data.followup_pct)],
      ["Sentimiento predominante", data.sentimiento_predominante || "—"],
    ],
  });

  const lastY0 =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 80;

  // Cumplimiento protocolo
  if (data.cumplimiento_protocolo) {
    autoTable(doc, {
      startY: lastY0 + 6,
      head: [["Protocolo", "Cantidad"]],
      body: Object.entries(data.cumplimiento_protocolo).map(([k, v]) => [
        cap(k),
        String(v ?? 0),
      ]),
    });
  }

  // Sentimiento distribución (agente)
  const sent = (data as any).sentimiento_distribucion as SentimentDistribution | undefined;
  if (sent) {
    const lastY1 =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? 80;
    const sentPct = normalizeSentiment(sent);
    if (sentPct) {
      autoTable(doc, {
        startY: lastY1 + 6,
        head: [["Sentimiento", "Distribución"]],
        body: [
          ["Positivo", sentPct["positivo"] ?? "—"],
          ["Neutral", sentPct["neutral"] ?? "—"],
          ["Negativo", sentPct["negativo"] ?? "—"],
        ],
      });
    }
  }

  const addList = (title: string, items?: string[]) => {
    if (!items?.length) return;
    const lastY =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? 80;
    doc.setFontSize(12);
    doc.text(title, 14, lastY + 8);
    doc.setFontSize(10);
    autoTable(doc, {
      startY: lastY + 10,
      head: [["Items"]],
      body: items.map((x) => [x]),
    });
  };

  addList("Fortalezas", data.fortalezas_recurrentes);
  addList("Oportunidades de mejora", data.oportunidades_mejora_recurrentes);
  addList("Temas frecuentes", (data as any).temas_frecuentes);
  addList("Motivos de follow-up", (data as any).motivos_followup_top);
  addList("Palabras clave frecuentes", data.palabras_clave_frecuentes);
  addList("Alertas de calidad recurrentes", data.alertas_calidad_recurrentes);
  addList("Recomendaciones", data.recomendaciones);

  const lastY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 80;
  if (data.resumen_ejecutivo) {
    doc.setFontSize(12);
    doc.text("Resumen ejecutivo:", 14, lastY + 10);
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(data.resumen_ejecutivo, 180), 14, lastY + 16);
  }
  doc.save(
    `Analisis_Agente_${data.nombre_empleado}_${new Date().toISOString()}.pdf`
  );
}

/* ================== Subcomponentes UI ================== */
type CardProps = {
  title?: string;
  right?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};
const Card = ({ title, right, className, children }: CardProps) => (
  <div className={`bg-white rounded-xl shadow border border-slate-200 ${className || ""}`}>
    {(title || right) && (
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {right}
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}> = ({ icon, label, value, hint }) => (
  <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
    <div className="flex items-center gap-2 text-slate-700 mb-1">
      <span className="p-1.5 rounded-md bg-indigo-50 text-indigo-700">{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
    <div className="text-2xl font-semibold text-slate-900 leading-tight">{value}</div>
    {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
  </div>
);

const SegBar: React.FC<{
  items: { label: string; value: number; className: string }[];
}> = ({ items }) => {
  const total = items.reduce((a, b) => a + b.value, 0);
  return (
    <div>
      <div className="h-3 rounded-md overflow-hidden flex border border-slate-200">
        {items.map((it, i) => {
          const w = total ? Math.round((it.value / total) * 100) : 0;
          return (
            <div
              key={i}
              className={`${it.className}`}
              style={{ width: `${w}%` }}
              aria-label={`${it.label} ${w}%`}
              title={`${it.label}: ${w}%`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {items.map((it, i) => {
          const w = total ? Math.round((it.value / total) * 1000) / 10 : 0;
          return (
            <span key={i} className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-white">
              {it.label}: {w}%
            </span>
          );
        })}
      </div>
    </div>
  );
};

/* ================== Componente principal ================== */
const PerformanceSelector = () => {
  const [modo, setModo] = useState<"pais" | "agente">("pais");
  const [nombre, setNombre] = useState(""); // para agente
  const [paisReport, setPaisReport] = useState<CountryPerformanceReport | null>(null);
  const [agentReport, setAgentReport] = useState<AgentPerformanceReport | null>(null);
  const [error, setError] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentOptions, setAgentOptions] = useState<string[]>([]);
  const [agentsEnabled, setAgentsEnabled] = useState(false);
  const [selectedPais, setSelectedPais] = useState<string>(""); // ⬅️ País vigente (bloqueado para no-admin)

  const navigate = useNavigate();
  const { isAdmin, loadingMe, errorMe, me } = useMe();

  // Email del usuario para imprimir en PDF
  const currentEmail = useMemo(() => localStorage.getItem("email") || "", []);

  // Auditoría breve
  const audit = (action: string) => LogsService.audit(action);

  // Definir país por defecto según country_scope
  useEffect(() => {
    if (loadingMe) return;
    if (isAdmin) {
      setSelectedPais(""); // Admin: "Todos" por defecto
      return;
    }
    const scope: string[] = Array.isArray((me as any)?.country_scope)
      ? (me as any).country_scope
      : [];
    const first = scope.find((s) => s !== "*");
    const label = normalizeCountryLabel(first || "");
    setSelectedPais(label);
  }, [isAdmin, loadingMe, me]);

  // Cargar agentes cuando haya fechas (y opcionalmente país seleccionado)
  useEffect(() => {
    setAgentOptions([]);
    setAgentsEnabled(false);
    setNombre("");

    const bothDates = Boolean(fechaInicio && fechaFin);
    if (!bothDates) return;

    async function loadAgents() {
      try {
        audit(
          `Consultó agentes por rango (${fechaInicio} → ${fechaFin})` +
            (isAdmin && selectedPais ? ` en país=${selectedPais}` : "")
        );
        const paisForQuery =
          isAdmin && selectedPais && LABEL_TO_CODE[selectedPais]
            ? selectedPais
            : !isAdmin && selectedPais
            ? selectedPais
            : undefined;

        const res = await CallsService.callsByDate(
          fechaInicio,
          fechaFin,
          paisForQuery
        );
        const names = Array.from(
          new Set(
            (res.records || [])
              .filter((r: any) => {
                if (isAdmin && selectedPais) {
                  return normalizeCountryLabel(r.pais) === selectedPais;
                }
                return true;
              })
              .map((r: any) => r.agent_name || r.empleado_nombre)
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, "es"));
        setAgentOptions(names);
        setAgentsEnabled(true);
      } catch {
        setAgentOptions([]);
        setAgentsEnabled(true);
      }
    }
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin, selectedPais, isAdmin]);

  // Ver historial
  const logAndGoHistory = async () => {
    try {
      await audit(
        modo === "pais"
          ? "Visualizó historial de análisis por país"
          : "Visualizó historial de análisis por agente"
      );
    } finally {
      navigate(modo === "pais" ? "/historial/pais" : "/historial/agentes");
    }
  };

  // Exportar PDF
  const handleDescargarPDF = async () => {
    try {
      if (modo === "pais" && paisReport) {
        await audit(`Descargó análisis del país "${paisReport.pais}" en PDF`);
        exportarPaisPDF(paisReport, currentEmail);
      } else if (modo === "agente" && agentReport) {
        await audit(
          `Descargó análisis del agente "${agentReport.nombre_empleado}" en PDF`
        );
        exportarAgentePDF(agentReport, currentEmail);
      }
    } catch {
      if (modo === "pais" && paisReport) exportarPaisPDF(paisReport, currentEmail);
      if (modo === "agente" && agentReport) exportarAgentePDF(agentReport, currentEmail);
    }
  };

  // Buscar (análisis) -> AHORA ENVÍA QUERY PARAMS (no body)
  const handleBuscar = async () => {
    setLoading(true);
    setError("");
    setPaisReport(null);
    setAgentReport(null);

    try {
      const fi = fechaInicio || "";
      const ff = fechaFin || "";
      if (!fi || !ff) throw new Error("Seleccione fecha inicio y fin.");

      if (modo === "pais") {
        const pais = selectedPais;
        if (!pais) throw new Error("Seleccione un país.");
        audit(`Buscó análisis por país "${pais}" (${fi} → ${ff})`);

        // ✅ Query params
        const data = await CountryPerformanceService.analyzeCountry(pais, fi, ff);
        setPaisReport(data);
      } else {
        if (!nombre) throw new Error("Seleccione un agente.");
        audit(
          `Buscó análisis por agente "${nombre}" (${fi} → ${ff})` +
            (isAdmin && selectedPais ? ` en país=${selectedPais}` : "")
        );

        // ✅ Query params (sin país; el backend no lo pide)
        const data = await PerformanceService.analyzeAgent(nombre, fi, ff);
        setAgentReport(data);
      }
    } catch (e: any) {
      setError(e?.message || "Error al buscar el análisis");
    } finally {
      setLoading(false);
    }
  };

  /* ================== Render ================== */
  if (loadingMe) {
    return (
      <div className="w-full min-h-screen p-4">
        <Card><div className="h-24 animate-pulse bg-slate-100 rounded-lg" /></Card>
      </div>
    );
  }
  if (errorMe) {
    return (
      <div className="w-full min-h-screen p-4">
        <Card><div className="text-red-600">No se pudo cargar tu sesión. Vuelve a iniciar sesión.</div></Card>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-4 space-y-6">
      {/* Filtros */}
      <Card
        className="sticky top-0 z-10"
        title="🔎 Seleccione qué desea analizar"
        right={
          <div className="flex gap-2 items-center">
            <span
              className="hidden md:inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-slate-200 text-slate-700 bg-white"
              title="Usuario actual"
            >
              <FiUser />
              <span className="text-sm">{currentEmail || "sin sesión"}</span>
            </span>
            <button
              className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
              onClick={logAndGoHistory}
            >
              <FiFileText /> Ver historial por {modo === "pais" ? "país" : "agente"}
            </button>
            {(modo === "pais" ? paisReport : agentReport) && (
              <button
                onClick={handleDescargarPDF}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                <FiDownload /> Exportar PDF
              </button>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            className={`px-3 py-2 rounded-lg ${
              modo === "pais" ? CLASSES.primary : CLASSES.outline
            }`}
            onClick={() => {
              setModo("pais");
              setPaisReport(null);
              setAgentReport(null);
              setNombre("");
            }}
          >
            Por país
          </button>
          <button
            className={`px-3 py-2 rounded-lg ${
              modo === "agente" ? CLASSES.primary : CLASSES.outline
            }`}
            onClick={() => {
              setModo("agente");
              setPaisReport(null);
              setAgentReport(null);
              setNombre("");
            }}
          >
            Por agente
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Fecha inicio</label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Fecha fin</label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>

          {/* País: admin editable; no-admin bloqueado */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">País</label>
            <select
              value={selectedPais}
              onChange={(e) => setSelectedPais(e.target.value)}
              disabled={!isAdmin}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 disabled:opacity-60"
            >
              {isAdmin && <option value="">Todos</option>}
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {!isAdmin && !selectedPais && (
                <option value="" disabled>
                  Detectando país…
                </option>
              )}
            </select>
          </div>

          {/* Selector de agente SOLO en modo agente */}
          {modo === "agente" && (
            <div className="md:col-span-4">
              <label className="block text-sm font-medium mb-1">Agente</label>
              <select
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 disabled:opacity-60"
                disabled={!agentsEnabled}
              >
                <option value="">
                  {agentsEnabled ? "Seleccione un agente…" : "Seleccione fechas primero"}
                </option>
                {agentOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-2">
            <button
              onClick={handleBuscar}
              disabled={loading}
              className={`w-full px-4 py-2 rounded-lg ${CLASSES.primary} disabled:opacity-60`}
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        {/* Acciones móviles */}
        <div className="mt-3 flex md:hidden gap-2">
          <button
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
            onClick={logAndGoHistory}
          >
            <FiFileText /> Historial
          </button>
          {(modo === "pais" ? paisReport : agentReport) && (
            <button
              onClick={handleDescargarPDF}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
            >
              <FiDownload /> PDF
            </button>
          )}
        </div>
      </Card>

      {/* ===== Resultados País ===== */}
      {!loading && modo === "pais" && paisReport && (
        <Card
          title="📊 Resultado del análisis (País)"
          right={
            paisReport.periodo ? (
              <span className="text-sm text-slate-500">{paisReport.periodo}</span>
            ) : null
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <StatCard icon={<FiUsers />} label="# Llamadas" value={paisReport.numero_llamadas ?? "—"} />
            <StatCard icon={<FiTrendingUp />} label="Score prom." value={n2(paisReport.performance_score_promedio)} />
            <StatCard icon={<FiSmile />} label="Satisfacción prom." value={n2(paisReport.satisfaccion_cliente_promedio)} />
            <StatCard icon={<FiTarget />} label="Resueltos" value={pct(paisReport.porcentaje_resueltos)} />
            <StatCard icon={<FiClock />} label="Duración prom." value={secLegible(paisReport.duracion_promedio_seg)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold">
                <FiBarChart2 /> Distribución de sentimiento
              </div>
              <SegBar items={[
                { label: "Positivo", value: safeFrac(paisReport?.sentimiento_distribucion?.positivo), className: "bg-green-500/70" },
                { label: "Neutral", value: safeFrac(paisReport?.sentimiento_distribucion?.neutral), className: "bg-sky-500/70" },
                { label: "Negativo", value: safeFrac(paisReport?.sentimiento_distribucion?.negativo), className: "bg-indigo-500/70" },
              ]} />
              {paisReport.sentimiento_global && (
                <div className="mt-2 text-sm text-slate-600">
                  Sentimiento global: <span className="font-medium">{paisReport.sentimiento_global}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold">
                <FiBarChart2 /> Distribución de tipo de llamada
              </div>
              <SegBar items={[
                { label: "In", value: safeFrac((paisReport as any)?.calltype_distribucion?.In), className: "bg-sky-500/70" },
                { label: "Out", value: safeFrac((paisReport as any)?.calltype_distribucion?.Out), className: "bg-indigo-500/70" },
              ]} />
            </div>
          </div>

          {paisReport.resumen_ejecutivo && (
            <div className="mt-6">
              <div className="flex items-center gap-2 text-slate-800 font-semibold mb-1">
                <FiFileText /> Resumen ejecutivo
              </div>
              <p className="text-slate-700">{paisReport.resumen_ejecutivo}</p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="font-semibold text-slate-800 mb-2">⭐ Fortalezas</div>
              <ul className="list-disc ml-5 space-y-1">
                {paisReport.fortalezas_recurrentes?.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-slate-800 mb-2">🔧 Oportunidades</div>
              <ul className="list-disc ml-5 space-y-1">
                {paisReport.oportunidades_mejora_recurrentes?.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-slate-800 mb-2">📣 Recomendaciones</div>
              <ul className="list-disc ml-5 space-y-1">
                {paisReport.recomendaciones?.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="font-semibold text-slate-800 mb-2">🏆 Agentes destacados</div>
              <ul className="list-disc ml-5 space-y-1">
                {paisReport.agentes_destacados?.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-slate-800 mb-2">
                <FiAlertTriangle className="inline mr-1 text-amber-600" />
                Agentes con bajo performance
              </div>
              <ul className="list-disc ml-5 space-y-1">
                {paisReport.agentes_con_bajo_performance?.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* ===== Resultados Agente ===== */}
      {!loading && modo === "agente" && agentReport && (
        <Card title="📈 Resultado del análisis (Agente)">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <StatCard icon={<FiUsers />} label="Nombre" value={agentReport.nombre_empleado} />
            <StatCard icon={<FiFileText />} label="ID" value={String(agentReport.id_empleado)} />
            <StatCard
              icon={<FiUsers />}
              label="# Llamadas (válidas)"
              value={agentReport.numero_llamadas_validas ?? agentReport.numero_llamadas_crudas ?? "—"}
            />
            <StatCard icon={<FiTrendingUp />} label="Score prom." value={n2(agentReport.score_promedio)} />
            <StatCard icon={<FiSmile />} label="Satisfacción prom." value={n2(agentReport.satisfaccion_promedio)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <StatCard icon={<FiTarget />} label="Resueltos" value={pct(agentReport.resolucion_pct)} />
            <StatCard icon={<FiAlertTriangle />} label="Escalados" value={pct(agentReport.escalados_pct)} />
            <StatCard icon={<FiFileText />} label="Follow-up" value={pct(agentReport.followup_pct)} />
          </div>

          {/* AHT y tiempos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <StatCard icon={<FiClock />} label="Duración prom. (min)" value={n2(agentReport.duracion_promedio_min)} />
            {"aht_promedio_min" in agentReport && (
              <StatCard icon={<FiClock />} label="AHT prom. (min)" value={n2((agentReport as any).aht_promedio_min as number)} />
            )}
            {"wrapup_promedio_seg" in (agentReport as any) && (
              <StatCard icon={<FiClock />} label="Wrap-up prom. (seg)" value={n2((agentReport as any).wrapup_promedio_seg as number)} />
            )}
          </div>

          {/* Distribución de sentimiento (Agente) */}
          { (agentReport as any).sentimiento_distribucion && (
            <div className="rounded-lg border border-slate-200 p-4 mt-4">
              <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold">
                <FiBarChart2 /> Distribución de sentimiento (Agente)
              </div>
              <SegBar items={[
                { label: "Positivo", value: safeFrac((agentReport as any).sentimiento_distribucion?.positivo), className: "bg-green-500/70" },
                { label: "Neutral", value: safeFrac((agentReport as any).sentimiento_distribucion?.neutral), className: "bg-sky-500/70" },
                { label: "Negativo", value: safeFrac((agentReport as any).sentimiento_distribucion?.negativo), className: "bg-indigo-500/70" },
              ]} />
            </div>
          )}

          {agentReport.resumen_ejecutivo && (
            <div className="mt-6">
              <div className="flex items-center gap-2 text-slate-800 font-semibold mb-1">
                <FiFileText /> Resumen ejecutivo
              </div>
              <p className="text-slate-700">{agentReport.resumen_ejecutivo}</p>
            </div>
          )}

          {/* Listas cualitativas */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="font-semibold text-slate-800 mb-2">⭐ Fortalezas</div>
              <ul className="list-disc ml-5 space-y-1">
                {agentReport.fortalezas_recurrentes?.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-slate-800 mb-2">🔧 Oportunidades</div>
              <ul className="list-disc ml-5 space-y-1">
                {agentReport.oportunidades_mejora_recurrentes?.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-slate-800 mb-2">📣 Recomendaciones</div>
              <ul className="list-disc ml-5 space-y-1">
                {agentReport.recomendaciones?.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>

          {/* Nuevos: temas y motivos follow-up + keywords/alertas */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {(agentReport as any).temas_frecuentes?.length ? (
              <div>
                <div className="font-semibold text-slate-800 mb-2">🏷️ Temas frecuentes</div>
                <div className="flex flex-wrap gap-2">
                  {(agentReport as any).temas_frecuentes.map((t: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-slate-50 flex items-center gap-1">
                      <FiHash /> {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {(agentReport as any).motivos_followup_top?.length ? (
              <div>
                <div className="font-semibold text-slate-800 mb-2">📬 Motivos de follow-up</div>
                <ul className="list-disc ml-5 space-y-1">
                  {(agentReport as any).motivos_followup_top.map((m: string, i: number) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            ) : null}
          </div>

          {(agentReport.palabras_clave_frecuentes?.length || agentReport.alertas_calidad_recurrentes?.length) && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {agentReport.palabras_clave_frecuentes?.length ? (
                <div>
                  <div className="font-semibold text-slate-800 mb-2">🔑 Palabras clave</div>
                  <div className="flex flex-wrap gap-2">
                    {agentReport.palabras_clave_frecuentes.map((k, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-white">{k}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {agentReport.alertas_calidad_recurrentes?.length ? (
                <div>
                  <div className="font-semibold text-slate-800 mb-2">
                    <FiAlertTriangle className="inline mr-1 text-amber-600" />
                    Alertas de calidad
                  </div>
                  <ul className="list-disc ml-5 space-y-1">
                    {agentReport.alertas_calidad_recurrentes.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      )}

      {/* Loading / Error */}
      {loading && (
        <div className="flex justify-center items-center mt-6">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-indigo-700 font-semibold">Cargando datos…</p>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
};

export default PerformanceSelector;
