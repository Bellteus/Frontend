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

/** Paleta (azules + 1 verde). */
const PALETTE = [
  "#0ea5e9", "#0284c7", "#38bdf8", "#3b82f6", "#2563eb", "#1d4ed8",
  "#60a5fa", "#93c5fd", "#bfdbfe", "#a5b4fc", "#6366f1", "#3f51b5",
  "#2d5a9e", "#64748b", "#94a3b8", "#475569", "#1e3a8a", "#0b4f82",
  "#4f46e5", "#7dd3fc", "#c7d2fe", "#22c55e",
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
const two = (n: number) => String(n).padStart(2, "0");

/* ======================= Skeletons (loading layout 1:1) ======================= */
const SkBar = ({ w = "w-40", h = "h-4" }) => (
  <div className={`bg-slate-200 rounded ${w} ${h}`} />
);

const SkKpiRow = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[clamp(8px,1vw,14px)]">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="bg-white rounded-xl border border-slate-200 p-[clamp(10px,1vw,14px)] shadow-sm h-[clamp(70px,9vh,110px)] animate-pulse"
      >
        <SkBar w="w-24" h="h-3" />
        <div className="mt-2"><SkBar w="w-16" h="h-7" /></div>
        <div className="mt-2"><SkBar w="w-28" h="h-3" /></div>
      </div>
    ))}
  </div>
);

const SkPanelChart: React.FC<{ h: number; className?: string }> = ({ h, className }) => (
  <div className={`bg-white rounded-xl border border-slate-200 p-[clamp(10px,1vw,14px)] shadow-sm animate-pulse ${className || ""}`}>
    <SkBar w="w-48" h="h-4" />
    <div className="h-[1px] w-full bg-slate-100 my-3" />
    <div className="w-full bg-slate-200/70 rounded" style={{ height: h }} />
  </div>
);

const SkPanelTable: React.FC<{ rows?: number; className?: string }> = ({ rows = 9, className }) => (
  <div className={`bg-white rounded-xl border border-slate-200 p-[clamp(10px,1vw,14px)] shadow-sm animate-pulse ${className || ""}`}>
    <SkBar w="w-48" h="h-4" />
    <div className="h-[1px] w-full bg-slate-100 my-3" />
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-slate-200/80 rounded" />
      ))}
    </div>
  </div>
);

/* ===== Auxiliares UI reutilizables ===== */
const KpiCard: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-[clamp(10px,1vw,14px)] shadow-sm h-[clamp(70px,9vh,110px)]">
    <div className="text-slate-500 text-[clamp(11px,0.85vw,12px)]">{label}</div>
    <div className="text-indigo-600 font-bold leading-tight text-[clamp(20px,2vw,28px)]">{value}</div>
    {hint && <div className="text-[clamp(10px,0.75vw,11px)] text-slate-500 -mt-0.5">{hint}</div>}
  </div>
);

const Panel: React.FC<
  React.PropsWithChildren<{ title: string; hint?: string | false; className?: string; extra?: React.ReactNode }>
> = ({ title, hint, extra, className, children }) => (
  <div className={`bg-white rounded-xl border border-slate-200 p-[clamp(10px,1vw,14px)] shadow-sm min-h-0 min-w-0 flex flex-col ${className || ""}`}>
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[#1f2a56] font-semibold text-[clamp(12px,1vw,14px)]">{title}</h3>
      <div className="flex items-center gap-3">
        {hint ? <span className="text-slate-500 text-[clamp(10px,0.8vw,12px)]">{hint}</span> : null}
        {extra ?? null}
      </div>
    </div>
    <div className="flex-1 min-h-0 mt-[clamp(6px,0.7vh,10px)]">{children}</div>
  </div>
);

/* ======================= Componente ======================= */
const DashboardAgente: React.FC = () => {
  const { isAdmin, loadingMe, errorMe } = useMe();
  const navigate = useNavigate();

  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [onlyWithAnalysis, setOnlyWithAnalysis] = useState(false);
  const [agentQuery, setAgentQuery] = useState("");

  const [items, setItems] = useState<CallRecord2[]>([]);
  const [allCountries, setAllCountries] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  // usamos solo el setter para forzar un micro re-render tras los gráficos
  const [, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);

  // NUEVO: control de “Top” en barras y modo de evolución
  const [barTopCount, setBarTopCount] = useState<12 | 20>(12);
  const [lineTopN, setLineTopN] = useState<5 | 10>(5);
  const [evoMode, setEvoMode] = useState<"day" | "hour">("day");

  // ========= Fetch =========
  async function fetchCalls() {
    setLoading(true);
    setError(null);
    try {
      const pais = isAdmin ? (countryFilter || undefined) : undefined;
      const { records } = await CallsService.callsByDate(start, end, pais);
      setItems(Array.isArray(records) ? (records as CallRecord2[]) : []);
      setLoading(false);
      // micro tick para evitar artefactos al montar gráficas
      setChartLoading(true);
      requestAnimationFrame(() => setChartLoading(false));
      setShowAllRows(false);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los datos de llamadas.");
      setLoading(false);
    }
  }

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
    byHour: number[]; // 0..23
  };

  const hourOf = (iso?: string | null): number | null => {
    if (!iso) return null;
    const m = iso.match(/T(\d{2}):/);
    if (m) return Number(m[1]) % 24;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.getUTCHours();
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
          byDay: {} as Record<string, number>,
          byHour: Array(24).fill(0),
        };

      row.total += 1;
      if (durSec != null) {
        row.totalDurSec += durSec;
        row.durCount += 1;
      }
      if (wrap != null) { row.wrapSum += wrap; row.wrapCount += 1; }
      if (hold != null) { row.holdSum += hold; row.holdCount += 1; }
      if (holdsNum != null) { row.holdsNumSum += holdsNum; row.holdsNumCount += 1; }

      const day = toISODate(it.starttime || "");
      if (day) row.byDay[day] = (row.byDay[day] || 0) + 1;

      const h = hourOf(it.starttime);
      if (h != null) row.byHour[h] = (row.byHour[h] || 0) + 1;

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

  const agentesResumen = useMemo(() => {
    const q = agentQuery.trim().toLowerCase();
    if (!q) return [...agentesResumenAll];
    return agentesResumenAll.filter((a) => a.nombre.toLowerCase().includes(q));
  }, [agentesResumenAll, agentQuery]);

  /* ======================= Select País ======================= */
  const countriesForSelect = useMemo(() => {
    const base =
      allCountries.length > 0
        ? allCountries
        : Array.from(new Set(items.map((i) => (i.pais as string) || "N/A")));
    const arr = [...base].sort((a, b) => a.localeCompare(b));
    return ["", ...arr];
  }, [allCountries, items]);

  /* ======================= Colores por agente ======================= */
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

  const totalCalls = items.length;

  // BARRAS (limitado por barTopCount)
  const barAgents = useMemo(() => agentsSorted.slice(0, barTopCount), [agentsSorted, barTopCount]);
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
          borderRadius: 8,
          barThickness: 22,
          categoryPercentage: 0.7,
          barPercentage: 0.8,
        },
      ],
    }),
    [barAgents, colorByAgent]
  );

  // PIE (top 12 + “Otros”)
  const MAX_PIE = 12;
  const pieAgents = useMemo(() => {
    const top = agentsSorted.slice(0, MAX_PIE);
    const rest = agentsSorted.slice(MAX_PIE);
    const otrosTotal = rest.reduce((s, r) => s + r.total, 0);
    return { top, otrosTotal };
  }, [agentsSorted]);

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

  // LÍNEA (Día / Hora)
  const lineAgents = useMemo(
    () => agentsSorted.slice(0, lineTopN),
    [agentsSorted, lineTopN]
  );

  const lineSeriesAgentes = useMemo(() => {
    return lineAgents.map((ag, idx) => {
      const agg = aggByAgente.get(ag.idKey);
      const color = colorFor(ag.nombre, idx);
      if (evoMode === "day") {
        const byDay = (agg?.byDay || {}) as Record<string, number>;
        const serie = days.map((d) => byDay[d] || 0);
        return {
          label: ag.nombre,
          data: serie,
          borderColor: color,
          backgroundColor: `${color}22`,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 12,
          pointHoverRadius: 4,
          fill: true,
        };
      } else {
        const byHour = agg?.byHour || Array(24).fill(0);
        return {
          label: ag.nombre,
          data: byHour,
          borderColor: color,
          backgroundColor: `${color}22`,
          tension: 0.25,
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 12,
          pointHoverRadius: 4,
          fill: true,
        };
      }
    });
  }, [lineAgents, days, aggByAgente, colorByAgent, evoMode]);

  const lineLabels = useMemo(
    () => (evoMode === "day" ? days : Array.from({ length: 24 }, (_, h) => `${two(h)}:00`)),
    [days, evoMode]
  );

  const lineEvolucionAgentesData = useMemo(
    () => ({ labels: lineLabels, datasets: lineSeriesAgentes }),
    [lineLabels, lineSeriesAgentes]
  );

  // Mejor TMO (>= 2 llamadas)
  const mejoresTMO = useMemo(() => {
    const base = agentsSorted.filter((a) => a.total >= 2);
    return base.sort((a, b) => a.tmoMin - b.tmoMin).slice(0, 12);
  }, [agentsSorted]);

  const barTMOData = useMemo(
    () => ({
      labels: mejoresTMO.map((a) => a.nombre),
      datasets: [
        {
          label: "TMO (min)",
          data: mejoresTMO.map((a) => a.tmoMin),
          backgroundColor: (ctx: any) => {
            const name = (ctx.chart.data.labels?.[ctx.dataIndex] as string) || "";
            return colorFor(name, ctx.dataIndex);
          },
          borderRadius: 8,
          barThickness: 20,
          categoryPercentage: 0.75,
          barPercentage: 0.8,
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

  /* ======================= Filtros (UI) ======================= */
  const Filters = (
    <div className="bg-white/95 border border-slate-200 rounded-xl p-[clamp(8px,1vw,14px)] shadow-sm flex flex-wrap items-end gap-[clamp(6px,0.8vw,12px)]">
      <div className="flex flex-col">
        <label className="text-[clamp(11px,0.8vw,12px)] font-semibold text-slate-600">Desde</label>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="border border-slate-300 rounded-md px-2 py-1 text-[clamp(12px,0.85vw,13px)] h-[clamp(32px,3.2vh,36px)]"
          max={end}
        />
      </div>
      <div className="flex flex-col">
        <label className="text-[clamp(11px,0.8vw,12px)] font-semibold text-slate-600">Hasta</label>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="border border-slate-300 rounded-md px-2 py-1 text-[clamp(12px,0.85vw,13px)] h-[clamp(32px,3.2vh,36px)]"
          min={start}
        />
      </div>

      {isAdmin && (
        <div className="flex flex-col">
          <label className="text-[clamp(11px,0.8vw,12px)] font-semibold text-slate-600">País</label>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="border border-slate-300 rounded-md px-2 py-1 text-[clamp(12px,0.85vw,13px)] min-w-[180px] h-[clamp(32px,3.2vh,36px)]"
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
        <label className="text-[clamp(11px,0.8vw,12px)] font-semibold text-slate-600">Buscar agente</label>
        <input
          type="text"
          value={agentQuery}
          placeholder="Nombre del agente"
          onChange={(e) => setAgentQuery(e.target.value)}
          className="border border-slate-300 rounded-md px-2 py-1 text-[clamp(12px,0.85vw,13px)] min-w-[220px] h-[clamp(32px,3.2vh,36px)]"
        />
      </div>
      <label className="text-[clamp(12px,0.9vw,13px)] text-slate-700 flex items-center gap-2">
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
              else if (v === "pais") navigate("/dashboard/pais");
              else navigate("/dashboard/agente");
            }}
            className="border border-slate-300 rounded-md px-2 py-1 text-[clamp(12px,0.85vw,13px)] h-[clamp(32px,3.2vh,36px)]"
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
      <div className="h-screen w-full bg-[#f6f7fb] flex items-center justify-center">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-pulse w-[360px] h-[120px]" />
      </div>
    );
  }
  if (errorMe) {
    return (
      <div className="h-screen w-full bg-[#f6f7fb] px-6 2xl:px-10 py-6 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center max-w-lg">
          <h2 className="text-lg font-extrabold text-slate-800">No se pudo cargar tu sesión</h2>
          <p className="mt-1 text-slate-600 text-sm">Vuelve a iniciar sesión e inténtalo otra vez.</p>
          <button
            className="mt-4 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
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
      <div className="h-screen w-full bg-[#f6f7fb] overflow-hidden">
        <div className="max-w-none h-full mx-auto px-[clamp(10px,1.2vw,28px)] py-[clamp(8px,1vh,16px)] flex flex-col gap-[clamp(8px,1vh,14px)]">
          {Filters}

          {/* KPIs */}
          <SkKpiRow />

          {/* Rejilla principal: IZQ 8 / DER 4 */}
          <div className="grid grid-cols-12 gap-[clamp(8px,1vw,14px)] min-h-0 flex-1">
            {/* IZQUIERDA (8 col) */}
            <div className="col-span-12 xl:col-span-8 grid grid-cols-2 min-w-0 min-h-0 gap-[clamp(8px,1vw,14px)] grid-rows-[minmax(0,0.47fr)_minmax(0,0.53fr)]">
              <SkPanelChart h={360} className="col-span-1" />
              <SkPanelChart h={360} className="col-span-1" />
              <SkPanelChart h={340} className="col-span-2" />
            </div>

            {/* DERECHA (4 col) */}
            <div className="col-span-12 xl:col-span-4 grid min-w-0 min-h-0 gap-[clamp(8px,1vw,14px)] grid-rows-[minmax(0,0.47fr)_minmax(0,0.53fr)]">
              <SkPanelChart h={360} />
              <SkPanelTable rows={9} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full bg-[#f6f7fb]">
        <div className="max-w-none h-full mx-auto px-[clamp(10px,1.2vw,28px)] py-[clamp(8px,1vh,16px)] flex flex-col gap-[clamp(8px,1vh,14px)]">
          {Filters}
          <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  const rowsSorted = [...agentesResumen].sort((a, b) => b.total - a.total);
  const rowsToShow = showAllRows ? rowsSorted : rowsSorted.slice(0, 12);
  const pieHasData = (doughnutShareAgentsData.datasets[0] as any).data.some(
    (v: number) => Number(v) > 0
  );

  /* ======================= Render ======================= */
  return (
    <div className="h-screen w-full bg-[#f6f7fb] overflow-hidden">
      <div className="max-w-none h-full mx-auto px-[clamp(10px,1.2vw,28px)] py-[clamp(8px,1vh,16px)] flex flex-col gap-[clamp(8px,1vh,14px)]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#1f2a56] font-extrabold tracking-tight leading-none text-[clamp(18px,1.6vw,24px)]">
              Rendimiento por Agente
            </h1>
            <div className="text-slate-600 mt-1 text-[clamp(11px,0.9vw,13px)]">
              Rango <b>{start}</b> a <b>{end}</b>
              {isAdmin && countryFilter ? <> · País: <b>{countryFilter}</b></> : null} — Total llamadas:{" "}
              <b>{numberFormat(items.length)}</b>
            </div>
          </div>
        </div>

        {/* Filtros */}
        {Filters}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[clamp(8px,1vw,14px)]">
          <KpiCard label="Agentes con actividad" value={numberFormat(uniqueAgents)} />
          <KpiCard label="Llamadas totales" value={numberFormat(items.length)} />
          <KpiCard label="TMO promedio" value={`${secondsToMin1Dec(avgSecAll).toFixed(1)} min`} hint={`(${secondsToMMSS(avgSecAll)})`} />
          <KpiCard
            label="Mejor TMO (≥ 2 llamadas)"
            value={rowsSorted.filter(r=>r.total>=2).length ? `${rowsSorted.filter(r=>r.total>=2)[0].tmoMin.toFixed(1)} min` : "—"}
            hint={rowsSorted.filter(r=>r.total>=2).length ? rowsSorted.filter(r=>r.total>=2)[0].nombre : "Sin datos"}
          />
        </div>

        {/* === Rejilla EXACTA: IZQ 8 col + DER 4 col === */}
        <div className="grid grid-cols-12 gap-[clamp(8px,1vw,14px)] min-h-0 flex-1">
          {/* IZQUIERDA (8 col) */}
          <div className="col-span-12 xl:col-span-8 grid grid-cols-2 min-w-0 min-h-0 gap-[clamp(8px,1vw,14px)] grid-rows-[minmax(0,0.47fr)_minmax(0,0.53fr)]">
            {/* Arriba izq: Llamadas por agente */}
            <Panel
              title="Llamadas por agente"
              extra={
                <div className="flex items-center gap-2">
                  <span className="text-[clamp(10px,0.8vw,12px)] text-slate-600">Mostrar:</span>
                  <select
                    value={barTopCount}
                    onChange={(e) => setBarTopCount(Number(e.target.value) === 20 ? 20 : 12)}
                    className="border border-slate-300 rounded-md px-2 py-1 text-[clamp(10px,0.8vw,12px)]"
                  >
                    <option value={12}>Top 12</option>
                    <option value={20}>Top 20</option>
                  </select>
                </div>
              }
              className="col-span-1 row-span-1 h-full min-w-0"
            >
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
                    x: { beginAtZero: true, grid: { color: "#eef2ff" }, ticks: { font: { size: 10 } } },
                    y: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  },
                }}
              />
            </Panel>

            {/* Arriba der: Evolución (Días/Horas + Top 5/10) */}
            <Panel
              title="Evolución por agente"
              extra={
                <div className="flex items-center gap-2">
                  <span className="text-[clamp(10px,0.8vw,12px)] text-slate-600">Modo:</span>
                  <select
                    value={evoMode}
                    onChange={(e) => setEvoMode(e.target.value === "hour" ? "hour" : "day")}
                    className="border border-slate-300 rounded-md px-2 py-1 text-[clamp(10px,0.8vw,12px)]"
                  >
                    <option value="day">Días</option>
                    <option value="hour">Horas</option>
                  </select>
                  <span className="text-[clamp(10px,0.8vw,12px)] text-slate-600">Series:</span>
                  <select
                    value={lineTopN}
                    onChange={(e) => setLineTopN(Number(e.target.value) === 10 ? 10 : 5)}
                    className="border border-slate-300 rounded-md px-2 py-1 text-[clamp(10px,0.8vw,12px)]"
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                  </select>
                </div>
              }
              className="col-span-1 row-span-1 h-full min-w-0"
            >
              <Line
                data={lineEvolucionAgentesData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: { duration: 500 },
                  interaction: { mode: "index", intersect: false },
                  plugins: {
                    legend: {
                      display: lineSeriesAgentes.length <= 6,
                      position: "top",
                      labels: { boxWidth: 16, usePointStyle: true, pointStyle: "circle" },
                    },
                    tooltip: {
                      enabled: true,
                      callbacks: {
                        title: (items) =>
                          evoMode === "day"
                            ? (items[0]?.label ? `Día: ${items[0].label}` : "")
                            : (items[0]?.label ? `Hora: ${items[0].label} UTC` : ""),
                        label: (ctx) => `${ctx.dataset?.label || "Agente"}: ${ctx.parsed.y ?? 0}`,
                      },
                    },
                  },
                  scales: {
                    y: { beginAtZero: true, grid: { color: "#eef2ff" }, ticks: { font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  },
                }}
              />
            </Panel>

            {/* Abajo: Mejor TMO (ocupa 2 cols) */}
            <Panel title="Mejor TMO (≥ 2 llamadas)" className="col-span-2 row-span-1 h-full min-w-0">
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
                    x: { beginAtZero: true, grid: { color: "#eef2ff" }, ticks: { font: { size: 10 } } },
                    y: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  },
                }}
              />
            </Panel>
          </div>

          {/* DERECHA (4 col) */}
          <div className="col-span-12 xl:col-span-4 grid min-w-0 min-h-0 gap-[clamp(8px,1vw,14px)] grid-rows-[minmax(0,0.47fr)_minmax(0,0.53fr)]">
            {/* Arriba: Pie */}
            <Panel title="Participación por agente" className="h-full min-w-0">
              {pieHasData ? (
                <Pie
                  data={doughnutShareAgentsData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom", labels: { font: { size: 11 } } },
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
            </Panel>

            {/* Abajo: Tabla con botón en header */}
            <Panel
              title="Resumen por Agente"
              extra={
                rowsSorted.length > 12 && (
                  <button
                    onClick={() => setShowAllRows((v) => !v)}
                    className="text-[clamp(11px,0.85vw,13px)] px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                  >
                    {showAllRows ? "Ver menos" : "Ver más"}
                  </button>
                )
              }
              className="h-full min-w-0"
            >
              <div className="overflow-auto h-full">
                <table className="w-full min-w-[860px] text-[clamp(11px,0.85vw,13px)]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 text-[#1f2a56]">
                      <th className="px-3 py-2 text-left font-semibold">Agente</th>
                      <th className="px-3 py-2 text-left font-semibold">Llamadas</th>
                      <th className="px-3 py-2 text-left font-semibold">% del total</th>
                      <th className="px-3 py-2 text-left font-semibold">TMO prom. (min)</th>
                      <th className="px-3 py-2 text-left font-semibold">Wrap-up prom. (s)</th>
                      <th className="px-3 py-2 text-left font-semibold">Hold prom. (s)</th>
                      <th className="px-3 py-2 text-left font-semibold"># Holds prom.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsToShow.map((a) => {
                      const pct = totalCalls > 0 ? ((a.total / totalCalls) * 100).toFixed(1) + "%" : "—";
                      return (
                        <tr key={a.idKey} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">{a.nombre}</td>
                          <td className="px-3 py-2">{numberFormat(a.total)}</td>
                          <td className="px-3 py-2">{pct}</td>
                          <td className="px-3 py-2">{a.tmoMin ? a.tmoMin.toFixed(1) : "—"}</td>
                          <td className="px-3 py-2">{a.avgWrapupSec ? a.avgWrapupSec.toFixed(1) : "—"}</td>
                          <td className="px-3 py-2">{a.avgHoldSec ? a.avgHoldSec.toFixed(1) : "—"}</td>
                          <td className="px-3 py-2">{a.avgHolds ? a.avgHolds.toFixed(2) : "—"}</td>
                        </tr>
                      );
                    })}
                    {rowsToShow.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                          No hay registros para este rango.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAgente;
