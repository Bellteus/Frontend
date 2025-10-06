// src/pages/DashboardPages/DashboardPais.tsx
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
import { useMe } from "../../../hook/useMe";
import { CallsService } from "../../../services/Service";
import { numberFormat } from "../../../utils/format";
import { CallRecord2 } from "../../../types/CallRecord";

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

/* ======================= Constantes / utils ======================= */
const DEFAULT_START = "2025-08-01";
const DEFAULT_END = "2025-08-07";

const PALETTE = [
  "#3f51b5",
  "#2d5a9e",
  "#0ea5e9",
  "#64748b",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a78bfa",
  "#14b8a6",
  "#94a3b8",
];

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
const toISODate = (s: string) => (s ? s.slice(0, 10) : "");
const secondsToMin1Dec = (sec: number) => +(sec / 60).toFixed(1);

/* Parsers robustos */
const getCountry = (row: any): string =>
  row?.pais ?? row?.country ?? row?.name ?? "N/A";
const getTotal = (row: any): number =>
  typeof row?.total === "number"
    ? row.total
    : typeof row?.calls === "number"
    ? row.calls
    : typeof row?.count === "number"
    ? row.count
    : typeof row?.total_calls === "number"
    ? row.total_calls
    : 0;
const getAgentKey = (row: any): string =>
  String(
    row?.agent_id ??
      row?.agent ??
      row?.agent_name ??
      row?.empleado_nombre ??
      "N/A"
  );

/* ======================= Auxiliares UI ======================= */
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

/* ====== Skeletons que calzan 1:1 con el layout real ====== */
const SkBar = ({ w = "w-40", h = "h-4" }) => <div className={`bg-slate-200 rounded ${w} ${h}`} />;

const SkKpiRow = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[clamp(8px,1vw,14px)]">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl border border-slate-200 p-[clamp(10px,1vw,14px)] shadow-sm h-[clamp(70px,9vh,110px)] animate-pulse">
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

const SkPanelTable: React.FC<{ rows?: number; className?: string }> = ({ rows = 8, className }) => (
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

const SkMiniStats = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-[clamp(10px,1vw,14px)] shadow-sm animate-pulse h-[clamp(220px,28vh,320px)]">
    <SkBar w="w-40" h="h-4" />
    <div className="space-y-4 mt-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <SkBar w="w-24" h="h-3" />
          <SkBar w="w-12" h="h-6" />
        </div>
      ))}
    </div>
  </div>
);

/* ======================= Componente ======================= */
const DashboardPais: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loadingMe, errorMe } = useMe();

  // ---- State ----
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);
  const [onlyWithAnalysis, setOnlyWithAnalysis] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string>("");

  const [items, setItems] = useState<CallRecord2[]>([]);
  const [topCountriesRaw, setTopCountriesRaw] = useState<any[]>([]);
  const [agentsByCountryRaw, setAgentsByCountryRaw] = useState<any[]>([]);
  const [kpiSummary, setKpiSummary] = useState<any | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any | null>(null);
  const [topAgentsRaw, setTopAgentsRaw] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const [barTopCount, setBarTopCount] = useState<12 | 20>(12);
  const [tableTab, setTableTab] = useState<"pais">("pais");

  // ---- Fetch de llamadas con el NUEVO endpoint by-date ----
  const fetchCalls = async () => {
    setLoading(true);
    setError(null);
    try {
      const { records } = await CallsService.callsByDate(
        start,
        end,
        countryFilter || undefined
      );
      setItems(Array.isArray(records) ? records : []);
      setLoading(false);
      setChartLoading(true);
      requestAnimationFrame(() => setChartLoading(false));
      setShowAllRows(false);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los datos.");
      setLoading(false);
    }
  };

  const fetchCountryEndpoints = async () => {
    try {
      const pais = countryFilter || undefined;
      const [top, agents, kpi, quality, topAgents] = await Promise.all([
        CallsService.topCountries(start, end),
        CallsService.agentsByCountry(start, end),
        CallsService.kpiSummary(start, end, pais),
        CallsService.qualityMetrics(start, end, pais),
        CallsService.topAgents(start, end, 10, pais),
      ]);
      setTopCountriesRaw(Array.isArray(top) ? top : []);
      setAgentsByCountryRaw(Array.isArray(agents) ? agents : []);
      setKpiSummary(kpi || null);
      setQualityMetrics(quality || null);
      setTopAgentsRaw(Array.isArray(topAgents) ? topAgents : []);
    } catch {
      setTopCountriesRaw([]);
      setAgentsByCountryRaw([]);
      setKpiSummary(null);
      setQualityMetrics(null);
      setTopAgentsRaw([]);
    }
  };

  // ---- Efecto: recarga todo al cambiar filtros ----
  useEffect(() => {
    if (!loadingMe && isAdmin) {
      fetchCalls();
      fetchCountryEndpoints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, onlyWithAnalysis, isAdmin, loadingMe, countryFilter]);

  /* ======================= Derivados ======================= */
  const itemsFiltered = useMemo(() => {
    if (!countryFilter) return items;
    return items.filter((it) => (it.pais || "N/A") === countryFilter);
  }, [items, countryFilter]);

  const days = useMemo(() => rangeDaysUTC(start, end), [start, end]);

  type PaisAgg = {
    total: number;
    totalDurSec: number;
    durCount: number;
    byDay: Record<string, number>;
  };
  const aggByPais = useMemo(() => {
    const map = new Map<string, PaisAgg>();
    itemsFiltered.forEach((it) => {
      const pais = it.pais || "N/A";
      const row =
        map.get(pais) || { total: 0, totalDurSec: 0, durCount: 0, byDay: {} };
      row.total += 1;

      let durSec: number | null =
        typeof it.duration === "number" && !isNaN(it.duration)
          ? it.duration
          : null;
      if (durSec == null) {
        const s = it.starttime ? new Date(it.starttime).getTime() : NaN;
        const e = it.endtime ? new Date(it.endtime).getTime() : NaN;
        if (!isNaN(s) && !isNaN(e) && e >= s) durSec = (e - s) / 1000;
      }
      if (durSec != null) {
        row.totalDurSec += durSec;
        row.durCount += 1;
      }

      const d = toISODate(it.starttime || "");
      if (d) row.byDay[d] = (row.byDay[d] || 0) + 1;

      map.set(pais, row);
    });
    return map;
  }, [itemsFiltered]);

  const rowsFromCalls = useMemo(
    () =>
      Array.from(aggByPais.entries())
        .map(([pais, v]) => ({
          pais,
          total: v.total,
          tmoMin: v.durCount ? secondsToMin1Dec(v.totalDurSec / v.durCount) : 0,
        }))
        .sort((a, b) => b.total - a.total),
    [aggByPais]
  );

  const totalLlamadasFromCalls = useMemo(
    () => rowsFromCalls.reduce((a, b) => a + b.total, 0),
    [rowsFromCalls]
  );

  const callsByCountriesEndpoint = useMemo(() => {
    const rows = topCountriesRaw
      .map((r) => ({ pais: getCountry(r), total: getTotal(r) }))
      .filter((r) => r.pais && Number.isFinite(r.total));
    const agg = new Map<string, number>();
    rows.forEach((r) => agg.set(r.pais, (agg.get(r.pais) || 0) + r.total));
    return Array.from(agg.entries())
      .map(([pais, total]) => ({ pais, total }))
      .sort((a, b) => b.total - a.total);
  }, [topCountriesRaw]);

  const { callsByPaisFromAgents, uniqueAgentsByPais, showUniqueAgentsCol } =
    useMemo(() => {
      const callsBy = new Map<string, number>();
      const uniqCounts = new Map<string, number>();
      const uniqSets = new Map<string, Set<string>>();
      let reliable = false;

      agentsByCountryRaw.forEach((row) => {
        const pais = getCountry(row);
        if (!pais) return;

        const t = getTotal(row);
        if (Number.isFinite(t)) {
          callsBy.set(pais, (callsBy.get(pais) || 0) + t);
        }

        if (typeof row?.total_agents === "number") {
          reliable = true;
          const val = Math.max(0, Number(row.total_agents));
          uniqCounts.set(pais, Math.max(uniqCounts.get(pais) || 0, val));
          return;
        }

        if (Array.isArray(row?.agents)) {
          reliable = true;
          const set = uniqSets.get(pais) || new Set<string>();
          row.agents.forEach((ag: any) => {
            const key = getAgentKey(ag);
            if (key && key !== "N/A") set.add(key);
          });
          uniqSets.set(pais, set);
          return;
        }

        const key = getAgentKey(row);
        if (key && key !== "N/A") {
          const set = uniqSets.get(pais) || new Set<string>();
          set.add(key);
          uniqSets.set(pais, set);
        }
      });

      uniqSets.forEach((set, pais) => {
        if (!uniqCounts.has(pais)) uniqCounts.set(pais, set.size);
      });

      const show = reliable || Array.from(uniqCounts.values()).some((v) => v > 1);

      return {
        callsByPaisFromAgents: callsBy,
        uniqueAgentsByPais: uniqCounts,
        showUniqueAgentsCol: show,
      };
    }, [agentsByCountryRaw]);

  const rowsMerged = useMemo(() => {
    const map = new Map<string, { total: number; tmoMin: number }>();
    rowsFromCalls.forEach((r) =>
      map.set(r.pais, { total: r.total, tmoMin: r.tmoMin })
    );
    callsByCountriesEndpoint.forEach((r) => {
      if (!map.has(r.pais)) map.set(r.pais, { total: r.total, tmoMin: 0 });
    });
    callsByPaisFromAgents.forEach((total, pais) => {
      if (!map.has(pais)) map.set(pais, { total, tmoMin: 0 });
    });
    return Array.from(map.entries())
      .map(([pais, v]) => ({ pais, total: v.total, tmoMin: v.tmoMin }))
      .sort((a, b) => b.total - a.total);
  }, [rowsFromCalls, callsByCountriesEndpoint, callsByPaisFromAgents]);

  const totalLlamadas = useMemo(() => {
    const a = totalLlamadasFromCalls;
    if (a > 0) return a;
    const b = callsByCountriesEndpoint.reduce((s, r) => s + r.total, 0);
    if (b > 0) return b;
    const c = Array.from(callsByPaisFromAgents.values()).reduce(
      (s, v) => s + v,
      0
    );
    return c;
  }, [totalLlamadasFromCalls, callsByCountriesEndpoint, callsByPaisFromAgents]);

  const countriesAll = useMemo(() => rowsMerged, [rowsMerged]);
  const lineCountries = useMemo(() => rowsMerged, [rowsMerged]);

  const lineDatasets = useMemo(() => {
    return lineCountries.map((c, idx) => {
      const serie = days.map(
        (d) => (aggByPais.get(c.pais)?.byDay?.[d] || 0) as number
      );
      return {
        label: c.pais,
        data: serie,
        borderColor: PALETTE[idx % PALETTE.length],
        backgroundColor: `${PALETTE[idx % PALETTE.length]}22`,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 12,
        pointHoverRadius: 4,
        fill: true,
      };
    });
  }, [lineCountries, days, aggByPais]);

  const barCallsByCountryData = useMemo(() => {
    const top = countriesAll.slice(0, barTopCount);
    return {
      labels: top.map((r) => r.pais),
      datasets: [
        {
          label: "Llamadas",
          data: top.map((r) => r.total),
          backgroundColor: top.map((_, i) => PALETTE[i % PALETTE.length]),
          borderRadius: 8,
          barThickness: 22,
          categoryPercentage: 0.7,
          barPercentage: 0.8,
        },
      ],
    };
  }, [countriesAll, barTopCount]);

  const doughnutShareData = useMemo(
    () => ({
      labels: rowsMerged.map((r) => r.pais),
      datasets: [
        {
          data: rowsMerged.map((r) => r.total),
          backgroundColor: rowsMerged.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 1,
        },
      ],
    }),
    [rowsMerged]
  );

  const lineEvolucionData = useMemo(
    () => ({ labels: days, datasets: lineDatasets }),
    [days, lineDatasets]
  );

  const countriesForSelect = useMemo(() => {
    const set = new Set<string>();
    rowsMerged.forEach((r) => set.add(r.pais));
    return ["", ...Array.from(set.values()).sort()];
  }, [rowsMerged]);

  // QUALITY
  const qualityBucketsData = useMemo(() => {
    const buckets: Array<{ label: string; count: number }> =
      qualityMetrics?.buckets || [];
    return {
      labels: buckets.map((b) => b.label),
      datasets: [
        {
          label: "Llamadas",
          data: buckets.map((b) => b.count),
          backgroundColor: buckets.map((_, i) => PALETTE[i % PALETTE.length]),
          borderRadius: 8,
        },
      ],
    };
  }, [qualityMetrics]);

  const answeredRatePct = useMemo(() => {
    const val =
      (kpiSummary?.tasa_atencion ??
        qualityMetrics?.summary?.answer_rate ??
        0) * 100;
    return Number.isFinite(val) ? val : 0;
  }, [kpiSummary, qualityMetrics]);

  const avgDurMin = useMemo(() => {
    const sec =
      kpiSummary?.dur_prom ?? qualityMetrics?.summary?.dur_avg ?? null;
    return typeof sec === "number" ? secondsToMin1Dec(sec) : 0;
  }, [kpiSummary, qualityMetrics]);

  const holdRatePct = useMemo(() => {
    const val =
      (kpiSummary?.hold_rate ?? qualityMetrics?.summary?.hold_rate ?? 0) * 100;
    return Number.isFinite(val) ? val : 0;
  }, [kpiSummary, qualityMetrics]);

  const holdAvgMin = useMemo(() => {
    const sec =
      kpiSummary?.hold_prom ?? qualityMetrics?.summary?.hold_avg ?? null;
    return typeof sec === "number" ? secondsToMin1Dec(sec) : 0;
  }, [kpiSummary, qualityMetrics]);

  const uniqueCallers = useMemo(
    () => qualityMetrics?.callers?.unique_callers ?? 0,
    [qualityMetrics]
  );
  const repeatRatePct = useMemo(() => {
    const val = (qualityMetrics?.callers?.repeat_rate ?? 0) * 100;
    return Number.isFinite(val) ? val : 0;
  }, [qualityMetrics]);

  // Top Agents parse
  const topAgents = useMemo(() => {
    return (topAgentsRaw || [])
      .map((r: any) => ({
        id:
          r?.agent_id ??
          r?.agent ??
          r?.empleado_id ??
          `${r?.agent_name || r?.empleado_nombre || "—"}`,
        name: r?.agent_name ?? r?.empleado_nombre ?? "—",
        pais: r?.pais ?? r?.country ?? "",
        llamadas: r?.llamadas ?? r?.calls ?? r?.count ?? 0,
        atendidas: r?.atendidas ?? r?.answered ?? 0,
        tasa:
          typeof r?.tasa_atencion === "number"
            ? r.tasa_atencion
            : typeof r?.answer_rate === "number"
            ? r.answer_rate
            : null,
        durPromMin:
          typeof r?.dur_prom === "number"
            ? secondsToMin1Dec(r.dur_prom)
            : typeof r?.avg_dur === "number"
            ? secondsToMin1Dec(r.avg_dur)
            : null,
      }))
      .sort((a: any, b: any) => b.llamadas - a.llamadas)
      .slice(0, 10);
  }, [topAgentsRaw]);

  /* ======================= FilterBar ======================= */
  const FilterBar = (
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
            defaultValue="pais"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "general") navigate("/dashboard");
              else if (v === "agente") navigate("/dashboard/agente");
              else navigate("/dashboard/pais");
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

  // ---- Guards de acceso ----
  if (loadingMe) {
    return (
      <div className="h-screen w-full bg-[#f6f7fb] flex items-center justify-center">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-pulse w-[360px] h-[120px]" />
      </div>
    );
  }
  if (errorMe || !isAdmin) {
    return (
      <div className="h-screen w-full bg-[#f6f7fb] px-6 2xl:px-10 py-6 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center max-w-lg">
          <h2 className="text-lg font-extrabold text-slate-800">Acceso restringido</h2>
          <p className="mt-1 text-slate-600 text-sm">Esta vista está disponible solo para cuentas <b>Admin</b>.</p>
          <button
            className="mt-4 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            onClick={() => navigate("/dashboard")}
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ======================= LOADING que calza con la vista ======================= */
  if (loading) {
    return (
      <div className="h-screen w-full bg-[#f6f7fb] overflow-hidden">
        <div className="max-w-none h-full mx-auto px-[clamp(10px,1.2vw,28px)] py-[clamp(8px,1vh,16px)] flex flex-col gap-[clamp(8px,1vh,14px)]">
          {FilterBar}

          {/* KPIs */}
          <SkKpiRow />

          {/* Rejilla principal: IZQ 8 col / DER 4 col */}
          <div className="grid grid-cols-12 gap-[clamp(8px,1vw,14px)] min-h-0 flex-1">
            {/* IZQ */}
            <div className="col-span-12 xl:col-span-8 grid grid-cols-1 gap-[clamp(8px,1vw,14px)]">
              <SkPanelChart h={360} />
              <SkPanelChart h={340} />
            </div>
            {/* DER */}
            <div className="col-span-12 xl:col-span-4 grid grid-cols-1 gap-[clamp(8px,1vw,14px)]">
              <SkPanelChart h={360} />
              <SkPanelTable rows={8} />
            </div>
          </div>

          {/* Bloque inferior: Buckets + Llamantes */}
          <div className="grid grid-cols-12 gap-[clamp(8px,1vw,14px)]">
            <SkPanelChart h={320} className="col-span-12 xl:col-span-8" />
            <SkMiniStats />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full bg-[#f6f7fb]">
        <div className="max-w-none h-full mx-auto px-[clamp(10px,1.2vw,28px)] py-[clamp(8px,1vh,16px)] flex flex-col gap-[clamp(8px,1vh,14px)]">
          {FilterBar}
          <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  // ---- Datos finales para render ----
  const rowsSorted = countriesAll;
  const rowsToShow = showAllRows ? rowsSorted : rowsSorted.slice(0, 12);
  const pieHasData = (doughnutShareData.datasets[0]?.data as number[]).some(
    (v) => Number(v) > 0
  );

  const topPaisNombre = rowsMerged.length ? rowsMerged[0].pais : "—";
  const topPaisTotal = rowsMerged.length ? rowsMerged[0].total : 0;
  const totalPaises = rowsMerged.length;
  const totalAgentesUnicos = Array.from(uniqueAgentsByPais.values()).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <div className="h-screen w-full bg-[#f6f7fb] overflow-hidden">
      <div className="max-w-none h-full mx-auto px-[clamp(10px,1.2vw,28px)] py-[clamp(8px,1vh,16px)] flex flex-col gap-[clamp(8px,1vh,14px)]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#1f2a56] font-extrabold tracking-tight leading-none text-[clamp(18px,1.6vw,24px)]">
              Rendimiento por País
            </h1>
            <div className="text-slate-600 mt-1 text-[clamp(11px,0.9vw,13px)]">
              Rango <b>{start}</b> a <b>{end}</b>
              {countryFilter ? <> · País: <b>{countryFilter}</b></> : null} — Total llamadas:{" "}
              <b>{numberFormat(totalLlamadas)}</b>
            </div>
          </div>
        </div>

        {/* Filtros */}
        {FilterBar}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[clamp(8px,1vw,14px)]">
          <KpiCard label="Países con actividad" value={numberFormat(totalPaises)} />
          <KpiCard label="Total de llamadas" value={numberFormat(totalLlamadas)} />
          <KpiCard label="País líder (llamadas)" value={topPaisNombre} hint={`${numberFormat(topPaisTotal)} llamadas`} />
          <KpiCard label="Agentes únicos (suma por país)" value={numberFormat(totalAgentesUnicos)} />
        </div>

        {/* Rejilla principal */}
        <div className="grid grid-cols-12 gap-[clamp(8px,1vw,14px)] min-h-0 flex-1">
          {/* IZQUIERDA */}
          <div className="col-span-12 xl:col-span-8 grid grid-cols-1 min-w-0 min-h-0 gap-[clamp(8px,1vw,14px)] grid-rows-[minmax(0,0.47fr)_minmax(0,0.53fr)]">
            <Panel
              title="Llamadas por país"
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
              className="h-full min-w-0"
            >
              <Bar
                data={barCallsByCountryData}
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
                          const p =
                            totalLlamadas > 0
                              ? ` (${((value / totalLlamadas) * 100).toFixed(1)}%)`
                              : "";
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

            <Panel title="Evolución diaria de llamadas por país" className="h-full min-w-0">
              <Line
                data={lineEvolucionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: { duration: 500 },
                  interaction: { mode: "index", intersect: false },
                  plugins: {
                    legend: {
                      position: "top",
                      labels: { boxWidth: 16, usePointStyle: true, pointStyle: "circle" },
                    },
                    tooltip: {
                      enabled: true,
                      callbacks: {
                        title: (items) => (items[0]?.label ? `Día: ${items[0].label}` : ""),
                        label: (ctx) => `${ctx.dataset?.label || "País"}: ${ctx.parsed.y ?? 0}`,
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
          </div>

          {/* DERECHA */}
          <div className="col-span-12 xl:col-span-4 grid min-w-0 min-h-0 gap-[clamp(8px,1vw,14px)] grid-rows-[minmax(0,0.47fr)_minmax(0,0.53fr)]">
            <Panel title="Participación por país" className="h-full min-w-0">
              {pieHasData ? (
                <Pie
                  data={doughnutShareData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom", labels: { font: { size: 11 } } },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => {
                            const v = ctx.parsed;
                            const p = totalLlamadas > 0 ? ` (${((v / totalLlamadas) * 100).toFixed(1)}%)` : "";
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

            <Panel
              title={tableTab === "pais" ? "Resumen por País" : "Top agentes"}
              extra={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTableTab("pais")}
                    className={`px-3 py-1.5 rounded-lg border text-[clamp(11px,0.85vw,13px)] ${tableTab==="pais" ? "bg-slate-100 border-slate-300" : "border-slate-300 hover:bg-slate-50"}`}
                  >
                    País
                  </button>
                  {tableTab === "pais" && rowsSorted.length > 12 && (
                    <button
                      onClick={() => setShowAllRows((v) => !v)}
                      className="text-[clamp(11px,0.85vw,13px)] px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                    >
                      {showAllRows ? "Ver menos" : "Ver más"}
                    </button>
                  )}
                </div>
              }
              className="h-full min-w-0"
            >
              {tableTab === "pais" ? (
                <div className="overflow-auto h-full">
                  <table className="w-full min-w-[820px] text-[clamp(11px,0.85vw,13px)]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 text-[#1f2a56]">
                        <th className="px-3 py-2 text-left font-semibold">País</th>
                        <th className="px-3 py-2 text-left font-semibold">Llamadas</th>
                        <th className="px-3 py-2 text-left font-semibold">% del total</th>
                        <th className="px-3 py-2 text-left font-semibold">TMO prom. (min)</th>
                        {showUniqueAgentsCol && (
                          <th className="px-3 py-2 text-left font-semibold">Agentes únicos</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rowsToShow.map((r) => {
                        const percent =
                          totalLlamadas > 0 ? ((r.total / totalLlamadas) * 100).toFixed(1) + "%" : "—";
                        const uniqueAgents = uniqueAgentsByPais.get(r.pais) || 0;
                        return (
                          <tr key={r.pais} className="border-b last:border-0 hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium">{r.pais}</td>
                            <td className="px-3 py-2">{numberFormat(r.total)}</td>
                            <td className="px-3 py-2">{percent}</td>
                            <td className="px-3 py-2">{r.tmoMin ? r.tmoMin.toFixed(1) : "—"}</td>
                            {showUniqueAgentsCol && <td className="px-3 py-2">{numberFormat(uniqueAgents)}</td>}
                          </tr>
                        );
                      })}
                      {rowsToShow.length === 0 && (
                        <tr>
                          <td colSpan={showUniqueAgentsCol ? 5 : 4} className="px-3 py-6 text-center text-slate-500">
                            No hay registros para este rango.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-auto h-full">
                  <table className="w-full min-w-[820px] text-[clamp(11px,0.85vw,13px)]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 text-[#1f2a56]">
                        <th className="px-3 py-2 text-left font-semibold">Agente</th>
                        <th className="px-3 py-2 text-left font-semibold">País</th>
                        <th className="px-3 py-2 text-left font-semibold">Llamadas</th>
                        <th className="px-3 py-2 text-left font-semibold">Atendidas</th>
                        <th className="px-3 py-2 text-left font-semibold">Tasa atención</th>
                        <th className="px-3 py-2 text-left font-semibold">TMO prom. (min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topAgents.map((r) => (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium">{r.name}</td>
                          <td className="px-3 py-2">{r.pais || "—"}</td>
                          <td className="px-3 py-2">{numberFormat(r.llamadas)}</td>
                          <td className="px-3 py-2">{numberFormat(r.atendidas)}</td>
                          <td className="px-3 py-2">{typeof r.tasa === "number" ? `${(r.tasa * 100).toFixed(1)}%` : "—"}</td>
                          <td className="px-3 py-2">{typeof r.durPromMin === "number" ? r.durPromMin.toFixed(1) : "—"}</td>
                        </tr>
                      ))}
                      {topAgents.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                            No hay agentes para este rango/país.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </div>

        {/* Bloque inferior */}
        <div className="grid grid-cols-12 gap-[clamp(8px,1vw,14px)]">
          <Panel title="Distribución por duración (Quality Metrics)" className="col-span-12 xl:col-span-8 h-[clamp(220px,28vh,320px)]">
            <Bar
              data={qualityBucketsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  y: { beginAtZero: true, grid: { color: "#eef2ff" }, ticks: { font: { size: 10 } } },
                },
              }}
            />
          </Panel>

          <Panel title="Llamantes" className="col-span-12 xl:col-span-4 h-[clamp(220px,28vh,320px)]">
            <div className="h-full w-full grid content-center gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[clamp(12px,0.9vw,13px)] text-slate-600">Únicos</span>
                <span className="text-indigo-600 font-bold text-[clamp(18px,1.6vw,24px)]">
                  {numberFormat(uniqueCallers)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[clamp(12px,0.9vw,13px)] text-slate-600">Reincidentes</span>
                <span className="text-indigo-600 font-bold text-[clamp(18px,1.6vw,24px)]">
                  {numberFormat((qualityMetrics?.callers?.repeat_callers ?? 0) as number)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[clamp(12px,0.9vw,13px)] text-slate-600">Tasa de repetición</span>
                <span className="text-indigo-600 font-bold text-[clamp(18px,1.6vw,24px)]">
                  {repeatRatePct.toFixed(1)}%
                </span>
              </div>
              <div className="h-[1px] bg-slate-100 my-1" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[clamp(11px,0.8vw,12px)] text-slate-500">Tasa de atención</div>
                  <div className="text-indigo-600 font-bold text-[clamp(16px,1.3vw,20px)]">{answeredRatePct.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[clamp(11px,0.8vw,12px)] text-slate-500">TMO prom.</div>
                  <div className="text-indigo-600 font-bold text-[clamp(16px,1.3vw,20px)]">{avgDurMin.toFixed(1)} min</div>
                </div>
                <div>
                  <div className="text-[clamp(11px,0.8vw,12px)] text-slate-500">Hold prom.</div>
                  <div className="text-indigo-600 font-bold text-[clamp(16px,1.3vw,20px)]">{holdAvgMin.toFixed(1)} min</div>
                </div>
                <div>
                  <div className="text-[clamp(11px,0.8vw,12px)] text-slate-500">Tasa de hold</div>
                  <div className="text-indigo-600 font-bold text-[clamp(16px,1.3vw,20px)]">{holdRatePct.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default DashboardPais;
