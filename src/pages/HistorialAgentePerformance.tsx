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
} from "react-icons/fi";

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

type AgentReportStored = AgentPerformanceReport & {
  _id?: string;
  fecha_inicio?: string; // ISO
  fecha_fin?: string; // ISO
  created_at?: string; // ISO
  // compat con versiones anteriores
  DateTime_realizado?: string;
  fecha_inicio_busqueda?: string;
  fecha_fin_busqueda?: string;
};

/* ======================== Helpers ======================== */
const pct = (v?: number | null) =>
  typeof v === "number" && isFinite(v) ? `${(v * 100).toFixed(1)}%` : "—";
const n2 = (v?: number | null) =>
  typeof v === "number" && isFinite(v) ? v.toFixed(2) : "—";
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString() : "—";
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

/* =================== Export PDF (Agente) =================== */
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
      ["# Llamadas", val(data.numero_llamadas)],
      ["Score promedio", n2(data.performance_score_promedio)],
      ["Satisfacción promedio", n2(data.satisfaccion_cliente_promedio)],
      ["Duración prom. (min)", n2(data.duracion_promedio_min)],
      ["Resueltos", pct(data.resolucion_pct)],
      ["Escalados", pct(data.escalados_pct)],
      ["Follow-up", pct(data.followup_pct)],
      ["Sentimiento predominante", val(data.sentimiento_predominante)],
    ],
  });

  const lastY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 80;

  const addList = (title: string, items?: string[]) => {
    if (!items?.length) return;
    const y =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? lastY;
    doc.setFontSize(12);
    doc.text(title, 14, y + 8);
    doc.setFontSize(10);
    autoTable(doc, {
      startY: y + 10,
      head: [["Items"]],
      body: items.map((x) => [x]),
    });
  };

  addList("Fortalezas", data.fortalezas_recurrentes);
  addList("Oportunidades de mejora", data.oportunidades_mejora_recurrentes);
  addList("Recomendaciones", data.recomendaciones);

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? lastY;
  if (data.resumen_ejecutivo) {
    doc.setFontSize(12);
    doc.text("Resumen ejecutivo:", 14, finalY + 10);
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(data.resumen_ejecutivo, 180), 14, finalY + 16);
  }

  doc.save(
    `Analisis_Agente_${data.nombre_empleado}_${new Date().toISOString()}.pdf`
  );
}

/* ================== Componente ================== */
const HistorialAgentePerformance = () => {
  const [reports, setReports] = useState<AgentReportStored[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [agenteFiltro, setAgenteFiltro] = useState("");

  const navigate = useNavigate();

  // Obtener todos los reportes
  const fetchReports = async () => {
    setLoading(true);
    try {
      // Nota: el endpoint /performance/list acepta agente opcional.
      const data = await PerformanceService.listReports();
      setReports(Array.isArray(data) ? data : []);
    } catch (e) {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Opciones de agente únicas
  const agentesUnicos = useMemo(() => {
    return Array.from(
      new Set((reports || []).map((r) => r.nombre_empleado || "—"))
    )
      .filter((x) => x && x !== "—")
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [reports]);

  // Filtrado en frontend
  const filtered = useMemo(() => {
    const list = reports.filter((r) => {
      const nameOk = agenteFiltro ? r.nombre_empleado === agenteFiltro : true;
      const refDate =
        getRangeStart(r) || r.created_at || r.DateTime_realizado || "";
      const okDate = refDate
        ? inRange(new Date(refDate), fechaInicio, fechaFin)
        : true;
      return nameOk && okDate;
    });

    // Orden por creado desc
    return list.sort((a, b) => {
      const ad = new Date(a.created_at || getRangeStart(a) || 0).getTime();
      const bd = new Date(b.created_at || getRangeStart(b) || 0).getTime();
      return bd - ad;
    });
  }, [reports, agenteFiltro, fechaInicio, fechaFin]);

  // Buscar (para UX de spinner)
  const handleBuscar = () => {
    setSearching(true);
    setTimeout(() => setSearching(false), 350);
  };

  // Descargar PDF + log
  const handlePDF = async (r: AgentReportStored) => {
    exportarAgentePDF(r);
    const user_id = localStorage.getItem("id");
    const user_email = localStorage.getItem("email");
    if (user_id && user_email) {
      try {
        await LogsService.postSupervisorLog({
          user_id,
          user_email,
          action: `Descargó reporte PDF de agente "${r.nombre_empleado}"`,
        });
      } catch {}
    }
  };

  // Regresar + log
  const handleBack = async () => {
    const user_id = localStorage.getItem("id");
    const user_email = localStorage.getItem("email");
    if (user_id && user_email) {
      try {
        await LogsService.postSupervisorLog({
          user_id,
          user_email,
          action: "Regresó desde historial de reportes por agente",
        });
      } catch {}
    }
    navigate(-1);
  };

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
          <div className="w-[110px]" />
        </div>

        {/* Filtros */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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

            <div className="flex items-end">
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
            <span className="mt-3 text-indigo-700 font-semibold">
              Cargando…
            </span>
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
                      <td className="px-4 py-2 text-center">
                        {r.id_empleado ?? "—"}
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
                        {sentimentChip(r.sentimiento_predominante ?? undefined)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {pct(r.resolucion_pct)}
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
                        {fmtDate(creado)}
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
