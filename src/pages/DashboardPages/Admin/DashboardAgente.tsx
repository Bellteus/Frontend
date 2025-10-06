// src/pages/DashboardPages/DashboardAgente.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pie, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
  Filler,
} from "chart.js";
import { CallRecord2 } from "../../../types/CallRecord";
import { CallsService } from "../../../services/Service";
import { useMe } from "../../../hook/useMe";
import { numberFormat } from "../../../utils/format";

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
  Filler
);

/* ======================= Utilidades / Constantes ======================= */
const DEFAULT_START = "2025-08-01";
const DEFAULT_END = "2025-08-07";

/** Paleta (solo azules + 1 verde). */
const PALETTE = [
  "#0ea5e9","#0284c7","#38bdf8","#3b82f6","#2563eb","#1d4ed8",
  "#60a5fa","#93c5fd","#bfdbfe","#a5b4fc","#6366f1","#3f51b5",
  "#2d5a9e","#64748b","#94a3b8","#475569","#1e3a8a","#0b4f82",
  "#4f46e5","#7dd3fc","#c7d2fe","#22c55e",
];

const toISODate = (s: string) => (s ? s.slice(0, 10) : "");
const rangeDaysUTC = (startISO: string, endISO: string) => {
  const out: string[] = [];
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ey, em, ed] = endISO.split("-").map(Number);
  const s = new Date(Date.UTC(sy, sm - 1, sd));
  const e = new Date(Date.UTC(ey, em - 1, ed));
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
};
const secondsToMin1Dec = (sec: number) => +(sec / 60).toFixed(1);
const secondsToMMSS = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

/* ======================= Skeleton ======================= */
const CardSkeleton: React.FC<{ h?: number }> = ({ h = 280 }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
    <div className="animate-pulse space-y-4">
      <div className="h-5 w-40 bg-slate-200 rounded" />
      <div className="h-[1px] w-full bg-slate-100" />
      <div className="w-full bg-slate-200 rounded" style={{ height: h }} />
    </div>
  </div>
);

/* ======================= Componente ======================= */
const DashboardAgente: React.FC = () => {
  const { isAdmin, loadingMe, errorMe } = useMe();
  const navigate = useNavigate();

  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);
  const [countryFilter, setCountryFilter] = useState<string>(""); // solo Admin
  const [onlyWithAnalysis, setOnlyWithAnalysis] = useState(false); // fuerza refresh
  const [agentQuery, setAgentQuery] = useState("");

  const [items, setItems] = useState<CallRecord2[]>([]);
  const [allCountries, setAllCountries] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const [lineTopN, setLineTopN] = useState<5 | 10>(5);

  // ========= Fetch (endpoint ligero calls/by-date) =========
  async function fetchCalls() {
    setLoading(true);
    setError(null);
    try {
      // Solo Admin puede forzar 'pais'; para el resto, el backend aplica country_scope del JWT.
      const pais = isAdmin ? (countryFilter || undefined) : undefined;
      const { records } = await CallsService.callsByDate(start, end, pais);
      setItems(Array.isArray(records) ? (records as CallRecord2[]) : []);
      setLoading(false);
      setChartLoading(true);
      requestAnimationFrame(() => setChartLoading(false));
      setShowAllRows(false);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los datos de llamadas.");
      setLoading(false);
    }
  }

  // Lista de países para el SELECT (solo Admin)
  async function fetchCountriesList() {
    try {
      const rows = await CallsService.topCountries(start, end);
      const set = new Set<string>();
      (rows || []).forEach((r: any) => {
        const name = r?.pais ?? r?.country ?? r?.name ?? "";
        if (name) set.add(String(name));
      });
      const arr = Array.from(set.values()).sort((a, b) => a.localeCompare(b));
      setAllCountries(arr);
    } catch {
      setAllCountries([]);
    }
  }

  useEffect(() => {
    if (!loadingMe) {
      fetchCalls();
      if (isAdmin) fetchCountriesList();
    }
  }, [start, end, countryFilter, onlyWithAnalysis, isAdmin, loadingMe]); // eslint-disable-line

  /* ======================= Agregaciones por agente ======================= */
  type AgentAgg = {
    nombre: string;
    total: number;
    totalDurSec: number;
    durCount: number;
    wrapSum: number;
    wrapCount: number;
    holdSum: number;
    holdCount: number;
    holdsNumSum: number;
    holdsNumCount: number;
    byDay: Record<string, number>;
  };

  const aggByAgente = useMemo(() => {
    const map = new Map<string, AgentAgg>();
    items.forEach((it) => {
      const idKey = String(it.agent_id ?? it.agent_name ?? (it as any).empleado_nombre ?? "N/A");
      const nombre = (it.agent_name ?? (it as any).empleado_nombre ?? "N/A") as string;

      let durSec: number | null = typeof it.duration === "number" && !isNaN(it.duration) ? it.duration : null;
      if (durSec == null) {
        const s = it.starttime ? new Date(it.starttime).getTime() : NaN;
        const e = it.endtime ? new Date(it.endtime).getTime() : NaN;
        if (!isNaN(s) && !isNaN(e) && e >= s) durSec = (e - s) / 1000;
      }

      const wrap = typeof (it as any)?.wrapup_time === "number" ? (it as any).wrapup_time : null;
      const hold = typeof (it as any)?.total_hold_time === "number" ? (it as any).total_hold_time : null;
      const holdsNum = typeof (it as any)?.number_of_holds === "number" ? (it as any).number_of_holds : null;

      const row =
        map.get(idKey) ||
        {
          nombre,
          total: 0,
          totalDurSec: 0,
          durCount: 0,
          wrapSum: 0,
          wrapCount: 0,
          holdSum: 0,
          holdCount: 0,
          holdsNumSum: 0,
          holdsNumCount: 0,
          byDay: {},
        };

      row.total += 1;
      if (durSec != null) {
        row.totalDurSec += durSec;
        row.durCount += 1;
      }
      if (wrap != null) {
        row.wrapSum += wrap;
        row.wrapCount += 1;
      }
      if (hold != null) {
        row.holdSum += hold;
        row.holdCount += 1;
      }
      if (holdsNum != null) {
        row.holdsNumSum += holdsNum;
        row.holdsNumCount += 1;
      }

      const day = toISODate(it.starttime || "");
      if (day) row.byDay[day] = (row.byDay[day] || 0) + 1;

      row.nombre = nombre || row.nombre;
      map.set(idKey, row);
    });
    return map;
  }, [items]);

  type AgentRow = {
    idKey: string;
    nombre: string;
    total: number;
    tmoMin: number;
    tmoMMSS: string;
    avgWrapupSec: number;
    avgHoldSec: number;
    avgHolds: number;
  };

  const agentesResumenAll = useMemo<AgentRow[]>(() => {
    return Array.from(aggByAgente.entries()).map(([idKey, v]) => {
      const avgSec = v.durCount ? v.totalDurSec / v.durCount : 0;
      return {
        idKey,
        nombre: v.nombre,
        total: v.total,
        tmoMin: secondsToMin1Dec(avgSec),
        tmoMMSS: secondsToMMSS(avgSec),
        avgWrapupSec: v.wrapCount ? +(v.wrapSum / v.wrapCount).toFixed(1) : 0,
        avgHoldSec: v.holdCount ? +(v.holdSum / v.holdCount).toFixed(1) : 0,
        avgHolds: v.holdsNumCount ? +(v.holdsNumSum / v.holdsNumCount).toFixed(2) : 0,
      };
    });
  }, [aggByAgente]);

  // Filtro por texto para tabla y gráficos
  const agentesResumen = useMemo(() => {
    const q = agentQuery.trim().toLowerCase();
    if (!q) return [...agentesResumenAll];
    return agentesResumenAll.filter((a) => a.nombre.toLowerCase().includes(q));
  }, [agentesResumenAll, agentQuery]);

  /* ======================= Selector de País ======================= */
  const countriesForSelect = useMemo(() => {
    const base =
      allCountries.length > 0
        ? allCountries
        : Array.from(new Set(items.map((i) => (i.pais as string) || "N/A")));
    const arr = [...base].sort((a, b) => a.localeCompare(b));
    return ["", ...arr]; // "" = Todos
  }, [allCountries, items]);

  /* ======================= Colores CONSISTENTES por agente ======================= */
  const colorByAgent = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    [...agentesResumen].sort((a, b) => b.total - a.total).forEach((a) => {
      if (!map.has(a.nombre)) {
        map.set(a.nombre, PALETTE[i % PALETTE.length]);
        i += 1;
      }
    });
    return map;
  }, [agentesResumen]);
  const colorFor = (name: string, idx: number) =>
    colorByAgent.get(name) || PALETTE[idx % PALETTE.length];

  /* ======================= Datasets / Gráficas ======================= */
  const days = useMemo(() => rangeDaysUTC(start, end), [start, end]);
  const agentsSorted = useMemo(
    () => [...agentesResumen].sort((a, b) => b.total - a.total),
    [agentesResumen]
  );

  const MAX_BARS = 20;
  const MAX_PIE = 12;

  const barAgents = useMemo(() => agentsSorted.slice(0, MAX_BARS), [agentsSorted]);

  const barCallsByAgentData = useMemo(
    () => ({
      labels: barAgents.map((a) => a.nombre),
      datasets: [
        {
          label: "Llamadas",
          data: barAgents.map((a) => a.total),
          backgroundColor: (ctx: any) => {
            const name = ctx.chart.data.labels?.[ctx.dataIndex] as string;
            return colorFor(name, ctx.dataIndex);
          },
          borderRadius: 10,
          barThickness: 26,
        },
      ],
    }),
    [barAgents, colorByAgent]
  );

  // Pie: top 12 + “Otros”
  const pieAgents = useMemo(() => {
    const top = agentsSorted.slice(0, MAX_PIE);
    const rest = agentsSorted.slice(MAX_PIE);
    const otrosTotal = rest.reduce((s, r) => s + r.total, 0);
    return { top, otrosTotal };
  }, [agentsSorted]);

  const totalCalls = items.length;

  const doughnutShareAgentsData = useMemo(() => {
    const labels = pieAgents.top.map((a) => a.nombre);
    const data = pieAgents.top.map((a) => a.total);
    if (pieAgents.otrosTotal > 0) {
      labels.push("Otros");
      data.push(pieAgents.otrosTotal);
    }
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: (ctx: any) => {
            const i = ctx.dataIndex;
            const name = labels[i];
            return name === "Otros" ? "#cbd5e1" : colorFor(name, i);
          },
          borderWidth: 1,
        },
      ],
    };
  }, [pieAgents, colorByAgent]);

  // Línea: TopN (5/10)
  const lineAgents = useMemo(
    () => agentsSorted.slice(0, lineTopN),
    [agentsSorted, lineTopN]
  );

  const lineSeriesAgentes = useMemo(() => {
    return lineAgents.map((ag, idx) => {
      const byDay = (aggByAgente.get(ag.idKey)?.byDay || {}) as Record<string, number>;
      const serie = days.map((d) => byDay[d] || 0);
      const color = colorFor(ag.nombre, idx);
      return {
        label: ag.nombre,
        data: serie,
        borderColor: color,
        backgroundColor: `${color}22`,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 2.5,
        fill: true,
      };
    });
  }, [lineAgents, days, aggByAgente, colorByAgent]);

  const lineEvolucionAgentesData = useMemo(
    () => ({ labels: days, datasets: lineSeriesAgentes }),
    [days, lineSeriesAgentes]
  );

  // Mejor TMO (>=2 llamadas)
  const mejoresTMO = useMemo(() => {
    const base = agentsSorted.filter((a) => a.total >= 2);
    return base.sort((a, b) => a.tmoMin - b.tmoMin).slice(0, 12);
  }, [agentsSorted]);

  const barTMOData = useMemo(
    () => ({
      labels: mejoresTMO.map((a) => a.nombre),
      datasets: [
        {
          label: "TMO (min, 1 dec)",
          data: mejoresTMO.map((a) => a.tmoMin),
          backgroundColor: (ctx: any) => {
            const name = (ctx.chart.data.labels?.[ctx.dataIndex] as string) || "";
            return colorFor(name, ctx.dataIndex);
          },
          borderRadius: 8,
          barThickness: 22,
        },
      ],
    }),
    [mejoresTMO, colorByAgent]
  );

  /* ======================= KPIs ======================= */
  const uniqueAgents = agentsSorted.length;
  const avgSecAll = useMemo(() => {
    const secs: number[] = [];
    items.forEach((it) => {
      if (typeof it.duration === "number" && !isNaN(it.duration)) {
        secs.push(it.duration);
      } else {
        const s = it.starttime ? new Date(it.starttime).getTime() : NaN;
        const e = it.endtime ? new Date(it.endtime).getTime() : NaN;
        if (!isNaN(s) && !isNaN(e) && e >= s) secs.push((e - s) / 1000);
      }
    });
    if (!secs.length) return 0;
    return secs.reduce((a, b) => a + b, 0) / secs.length;
  }, [items]);
  const avgTmoMMSS = secondsToMMSS(avgSecAll);

  /* ======================= Filtros (UI) ======================= */
  const Filters = (
    <div className="bg-white/95 border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-end gap-3">
      <div className="flex flex-col">
        <label className="text-xs font-semibold text-slate-600">Desde</label>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          max={end}
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-semibold text-slate-600">Hasta</label>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          min={start}
        />
      </div>

      {/* Select de País: SOLO visible para Admin */}
      {isAdmin && (
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-600">País</label>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[180px]"
          >
            {countriesForSelect.map((p) => (
              <option key={p || "all"} value={p}>
                {p ? p : "Todos"}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col">
        <label className="text-xs font-semibold text-slate-600">Buscar agente</label>
        <input
          type="text"
          value={agentQuery}
          placeholder="Nombre del agente"
          onChange={(e) => setAgentQuery(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[220px]"
        />
      </div>
      <label className="text-sm text-slate-700 flex items-center gap-2">
        <input
          type="checkbox"
          checked={onlyWithAnalysis}
          onChange={(e) => setOnlyWithAnalysis(e.target.checked)}
        />
        Solo con análisis
      </label>

      <div className="ml-auto flex items-center gap-2">
        {isAdmin && (
          <select
            defaultValue="agente"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "general") navigate("/dashboard");
              else if (v === "pais") navigate("/dashboard/area");
              else navigate("/dashboard/agente");
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="general">General</option>
            <option value="agente">Por agente</option>
            <option value="pais">Por país</option>
          </select>
        )}
      </div>
    </div>
  );

  /* ======================= Guards / Loading / Error ======================= */
  if (loadingMe) {
    return (
      <div className="min-h-screen w-full bg-[#f6f7fb]">
        <div className="w-full mx-auto max-w-[1700px] px-6 2xl:px-10 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse h-[120px]" />
          </div>
        </div>
      </div>
    );
  }
  if (errorMe) {
    return (
      <div className="min-h-screen w-full bg-[#f6f7fb] px-6 2xl:px-10 py-6 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center max-w-lg">
          <h2 className="text-xl font-extrabold text-slate-800">No se pudo cargar tu sesión</h2>
          <p className="mt-2 text-slate-600">Vuelve a iniciar sesión e inténtalo otra vez.</p>
          <button
            className="mt-5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
            onClick={() => navigate("/login")}
          >
            Ir a Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#f6f7fb]">
        <div className="w-full mx-auto max-w-[1700px] px-6 2xl:px-10 py-6 space-y-6">
          <div>{Filters}</div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <CardSkeleton h={120} />
            <CardSkeleton h={120} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <CardSkeleton h={340} />
          <CardSkeleton h={420} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-[#f6f7fb]">
        <div className="w-full mx-auto max-w-[1700px] px-6 2xl:px-10 py-6 space-y-6">
          <div>{Filters}</div>
          <div className="p-4 rounded-2xl bg-red-50 text-red-700 border border-red-200">{error}</div>
        </div>
      </div>
    );
  }

  const rowsSorted = agentsSorted;
  const rowsToShow = showAllRows ? rowsSorted : rowsSorted.slice(0, 12);
  const pieHasData = (doughnutShareAgentsData.datasets[0] as any).data.some(
    (v: number) => Number(v) > 0
  );

  /* ======================= Render ======================= */
  return (
    <div className="min-h-screen w-full bg-[#f6f7fb]">
      <div className="w-full mx-auto max-w-[1700px] px-6 2xl:px-10 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[#1f2a56] text-[28px] font-extrabold tracking-tight">Rendimiento por Agente</h1>
            <p className="text-slate-600 mt-1 text-sm">
              Rango <b>{start}</b> a <b>{end}</b>
              {isAdmin && countryFilter ? <> · País: <b>{countryFilter}</b></> : null} — Total llamadas:{" "}
              <b>{numberFormat(items.length)}</b>
            </p>
          </div>
        </div>

        {/* Filtros */}
        {Filters}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">Agentes con actividad</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {numberFormat(uniqueAgents)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">Llamadas totales</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {numberFormat(totalCalls)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">TMO promedio</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {secondsToMin1Dec(avgSecAll).toFixed(1)} min
            </div>
            <div className="text-[11px] text-slate-500">({avgTmoMMSS})</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">Mejor TMO (≥ 2 llamadas)</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {mejoresTMO.length ? `${mejoresTMO[0].tmoMin.toFixed(1)} min` : "—"}
            </div>
            <div className="text-[11px] text-slate-500">{mejoresTMO.length ? mejoresTMO[0].nombre : "Sin datos"}</div>
          </div>
        </div>

        {/* Charts fila 1 */}
        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm 2xl:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#1f2a56] font-semibold">Llamadas por agente</h3>
              {chartLoading && <span className="text-slate-500 text-xs animate-pulse">Actualizando…</span>}
            </div>
            <div className="h-[360px]">
              <Bar
                data={barCallsByAgentData}
                options={{
                  indexAxis: "y",
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: { duration: 600 },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const value = ctx.parsed.x ?? ctx.parsed;
                          const total = Math.max(1, totalCalls);
                          const p = ` (${((value / total) * 100).toFixed(1)}%)`;
                          return `Llamadas: ${numberFormat(value)}${p}`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: { beginAtZero: true, grid: { color: "#eef2ff" } },
                    y: { grid: { display: false } },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#1f2a56] font-semibold">Participación por agente</h3>
              {chartLoading && <span className="text-slate-500 text-xs animate-pulse">Actualizando…</span>}
            </div>
            <div className="h-[360px]">
              {pieHasData ? (
                <Pie
                  data={doughnutShareAgentsData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "right" },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => {
                            const v = ctx.parsed;
                            const p = totalCalls > 0 ? ` (${((v / totalCalls) * 100).toFixed(1)}%)` : "";
                            return `${numberFormat(v)}${p}`;
                          },
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-slate-500 text-sm">
                  Sin datos para graficar
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Evolución diaria */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1f2a56] font-semibold">Evolución diaria de llamadas por agente</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Series:</span>
              <select
                value={lineTopN}
                onChange={(e) => setLineTopN(Number(e.target.value) === 10 ? 10 : 5)}
                className="border border-slate-300 rounded-lg px-2 py-1 text-xs"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
              </select>
            </div>
          </div>
          <div className="h-[340px]">
            <Line
              data={lineEvolucionAgentesData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600 },
                plugins: {
                  legend: {
                    display: lineSeriesAgentes.length <= 8,
                    position: "top",
                    labels: { boxWidth: 18, usePointStyle: true, pointStyle: "circle" },
                  },
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: "#eef2ff" } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

        {/* Mejor TMO */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1f2a56] font-semibold">Mejor TMO (≥ 2 llamadas)</h3>
            {chartLoading && <span className="text-slate-500 text-xs animate-pulse">Actualizando…</span>}
          </div>
          <div className="h-[300px]">
            <Bar
              data={barTMOData}
              options={{
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600 },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const row = mejoresTMO[ctx.dataIndex];
                        return `TMO: ${row?.tmoMMSS} (${row?.tmoMin.toFixed(1)} min)`;
                      },
                    },
                  },
                },
                scales: {
                  x: { beginAtZero: true, grid: { color: "#eef2ff" } },
                  y: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

        {/* Tabla resumen */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#1f2a56] text-lg md:text-xl font-semibold">Resumen por Agente</h2>
            {rowsSorted.length > 12 && (
              <button
                onClick={() => setShowAllRows((v) => !v)}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                {showAllRows ? "Ver menos" : "Ver más"}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-[#1f2a56]">
                  <th className="px-4 py-3 text-left font-semibold">Agente</th>
                  <th className="px-4 py-3 text-left font-semibold">Llamadas</th>
                  <th className="px-4 py-3 text-left font-semibold">% del total</th>
                  <th className="px-4 py-3 text-left font-semibold">TMO prom. (min)</th>
                  <th className="px-4 py-3 text-left font-semibold">Wrap-up prom. (s)</th>
                  <th className="px-4 py-3 text-left font-semibold">Hold prom. (s)</th>
                  <th className="px-4 py-3 text-left font-semibold"># Holds prom.</th>
                </tr>
              </thead>
              <tbody>
                {rowsToShow.map((a) => {
                  const pct = totalCalls > 0 ? ((a.total / totalCalls) * 100).toFixed(1) + "%" : "—";
                  return (
                    <tr key={a.idKey} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{a.nombre}</td>
                      <td className="px-4 py-3">{numberFormat(a.total)}</td>
                      <td className="px-4 py-3">{pct}</td>
                      <td className="px-4 py-3">{a.tmoMin ? a.tmoMin.toFixed(1) : "—"}</td>
                      <td className="px-4 py-3">{a.avgWrapupSec ? a.avgWrapupSec.toFixed(1) : "—"}</td>
                      <td className="px-4 py-3">{a.avgHoldSec ? a.avgHoldSec.toFixed(1) : "—"}</td>
                      <td className="px-4 py-3">{a.avgHolds ? a.avgHolds.toFixed(2) : "—"}</td>
                    </tr>
                  );
                })}
                {rowsToShow.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      No hay registros para este rango.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAgente;
