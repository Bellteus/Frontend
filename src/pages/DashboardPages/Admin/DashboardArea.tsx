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

/* ======================= Componente ======================= */
const DashboardPais: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loadingMe, errorMe } = useMe();

  // ---- State ----
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);
  const [onlyWithAnalysis, setOnlyWithAnalysis] = useState(false); // mantiene UI
  const [countryFilter, setCountryFilter] = useState<string>("");

  const [items, setItems] = useState<CallRecord2[]>([]);
  const [topCountriesRaw, setTopCountriesRaw] = useState<any[]>([]);
  const [agentsByCountryRaw, setAgentsByCountryRaw] = useState<any[]>([]);

  // nuevos endpoints
  const [kpiSummary, setKpiSummary] = useState<any | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any | null>(null);
  const [topAgentsRaw, setTopAgentsRaw] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);

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

  /* ======================= Derivados (useMemo) ======================= */
  const itemsFiltered = useMemo(() => {
    if (!countryFilter) return items;
    return items.filter((it) => (it.pais || "N/A") === countryFilter);
  }, [items, countryFilter]);

  const days = useMemo(() => rangeDaysUTC(start, end), [start, end]);
  void days;

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

  // Llamadas y agentes por país (corrige "Agentes únicos" = 1)
  const { callsByPaisFromAgents, uniqueAgentsByPais, showUniqueAgentsCol } =
    useMemo(() => {
      const callsBy = new Map<string, number>();
      const uniqCounts = new Map<string, number>();
      const uniqSets = new Map<string, Set<string>>();
      let reliable = false;

      agentsByCountryRaw.forEach((row) => {
        const pais = getCountry(row);
        if (!pais) return;

        // Sumatoria de llamadas si viene en el payload
        const t = getTotal(row);
        if (Number.isFinite(t)) {
          callsBy.set(pais, (callsBy.get(pais) || 0) + t);
        }

        // Caso 1: el endpoint trae total_agents (preferido)
        if (typeof row?.total_agents === "number") {
          reliable = true;
          const val = Math.max(0, Number(row.total_agents));
          uniqCounts.set(pais, Math.max(uniqCounts.get(pais) || 0, val));
          return;
        }

        // Caso 2: trae un arreglo de agents
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

        // Caso 3 (fallback): fila por agente
        const key = getAgentKey(row);
        if (key && key !== "N/A") {
          const set = uniqSets.get(pais) || new Set<string>();
          set.add(key);
          uniqSets.set(pais, set);
        }
      });

      // Completar counts desde sets cuando no hubo total_agents explícito
      uniqSets.forEach((set, pais) => {
        if (!uniqCounts.has(pais)) uniqCounts.set(pais, set.size);
      });

      const show =
        reliable || Array.from(uniqCounts.values()).some((v) => v > 1);

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

  // ⬇️ Ya no TOP: usamos todos los países disponibles
  const countriesAll = useMemo(() => rowsMerged, [rowsMerged]);
  const lineCountries = useMemo(() => rowsMerged, [rowsMerged]);

  const lineDatasets = useMemo(() => {
    return lineCountries.map((c, idx) => {
      const serie = rangeDaysUTC(start, end).map(
        (d) => (aggByPais.get(c.pais)?.byDay?.[d] || 0) as number
      );
      return {
        label: c.pais,
        data: serie,
        borderColor: PALETTE[idx % PALETTE.length],
        backgroundColor: `${PALETTE[idx % PALETTE.length]}22`,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 2.5,
        fill: true,
      };
    });
  }, [lineCountries, start, end, aggByPais]);

  const barCallsByCountryData = useMemo(
    () => ({
      labels: countriesAll.map((r) => r.pais),
      datasets: [
        {
          label: "Llamadas",
          data: countriesAll.map((r) => r.total),
          backgroundColor: countriesAll.map(
            (_, i) => PALETTE[i % PALETTE.length]
          ),
          borderRadius: 10,
          barThickness: 26,
        },
      ],
    }),
    [countriesAll]
  );

  const doughnutShareData = useMemo(
    () => ({
      labels: rowsMerged.map((r) => r.pais),
      datasets: [
        {
          data: rowsMerged.map((r) => r.total),
          backgroundColor: rowsMerged.map(
            (_, i) => PALETTE[i % PALETTE.length]
          ),
          borderWidth: 1,
        },
      ],
    }),
    [rowsMerged]
  );

  const lineEvolucionData = useMemo(
    () => ({ labels: rangeDaysUTC(start, end), datasets: lineDatasets }),
    [start, end, lineDatasets]
  );

  const countriesForSelect = useMemo(() => {
    const set = new Set<string>();
    rowsMerged.forEach((r) => set.add(r.pais));
    return ["", ...Array.from(set.values()).sort()];
  }, [rowsMerged]);

  // QUALITY: buckets (duración) y callers
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

  // ====================== UI (sin hooks nuevos) ======================

  const FilterBar = (
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
            defaultValue="pais"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "general") navigate("/dashboard");
              else if (v === "agente") navigate("/dashboard/agente");
              else navigate("/dashboard/pais");
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

  // ---- Guards de acceso ----
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
  if (errorMe || !isAdmin) {
    return (
      <div className="min-h-screen w-full bg-[#f6f7fb] px-6 2xl:px-10 py-6 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center max-w-lg">
          <h2 className="text-xl font-extrabold text-slate-800">
            Acceso restringido
          </h2>
          <p className="mt-2 text-slate-600">
            Esta vista está disponible solo para cuentas <b>Admin</b>.
          </p>
          <button
            className="mt-5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
            onClick={() => navigate("/dashboard")}
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ---- UI states ----
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#f6f7fb]">
        <div className="w-full mx-auto max-w-[1700px] px-6 2xl:px-10 py-6 space-y-6">
          {FilterBar}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse h-[300px]" />
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse h-[300px]" />
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse h-[320px]" />
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse h-[320px]" />
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen w-full bg-[#f6f7fb]">
        <div className="w-full mx-auto max-w-[1700px] px-6 2xl:px-10 py-6 space-y-4">
          {FilterBar}
          <div className="p-4 rounded-2xl bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
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
    <div className="min-h-screen w-full bg-[#f6f7fb]">
      <div className="w-full mx-auto max-w-[1700px] px-6 2xl:px-10 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[#1f2a56] text-[28px] font-extrabold tracking-tight">
              Rendimiento por País
            </h1>
            <p className="text-slate-600 mt-1 text-sm">
              Rango <b>{start}</b> a <b>{end}</b>
              {countryFilter ? (
                <>
                  {" "}
                  · País: <b>{countryFilter}</b>
                </>
              ) : null}{" "}
              — Total llamadas: <b>{numberFormat(totalLlamadas)}</b>
            </p>
          </div>
        </div>

        {/* Filtros */}
        {FilterBar}

        {/* KPIs fila 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">Países con actividad</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {numberFormat(totalPaises)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">Total de llamadas</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {numberFormat(totalLlamadas)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">País líder (llamadas)</div>
            <div className="text-base font-semibold text-slate-800">
              {topPaisNombre}
            </div>
            <div className="text-sm text-slate-500">
              {numberFormat(topPaisTotal)} llamadas
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">
              Agentes únicos (suma por país)
            </div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {numberFormat(totalAgentesUnicos)}
            </div>
          </div>
        </div>

        {/* KPIs fila 2 - Quality & KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">Tasa de atención</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {answeredRatePct.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">TMO promedio</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {avgDurMin.toFixed(1)} min
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">Hold promedio</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {holdAvgMin.toFixed(1)} min
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">Tasa de hold</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {holdRatePct.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Charts Fila 1 */}
        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm 2xl:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#1f2a56] font-semibold">Llamadas por país</h3>
              {chartLoading && (
                <span className="text-slate-500 text-xs animate-pulse">
                  Actualizando…
                </span>
              )}
            </div>
            <div className="h-[360px]">
              <Bar
                data={barCallsByCountryData}
                options={{
                  indexAxis: "y" as const,
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
                              ? ` (${(
                                  (value / totalLlamadas) *
                                  100
                                ).toFixed(1)}%)`
                              : "";
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
              <h3 className="text-[#1f2a56] font-semibold">
                Participación por país
              </h3>
              {chartLoading && (
                <span className="text-slate-500 text-xs animate-pulse">
                  Actualizando…
                </span>
              )}
            </div>
            <div className="h-[360px]">
              {pieHasData ? (
                <Pie
                  data={doughnutShareData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "right" },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => {
                            const v = ctx.parsed;
                            const p =
                              totalLlamadas > 0
                                ? ` (${((v / totalLlamadas) * 100).toFixed(
                                    1
                                  )}%)`
                                : "";
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

        {/* Charts Fila 2 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1f2a56] font-semibold">
              Evolución diaria de llamadas por país
            </h3>
            {chartLoading && (
              <span className="text-slate-500 text-xs animate-pulse">
                Actualizando…
              </span>
            )}
          </div>
          <div className="h-[340px]">
            <Line
              data={lineEvolucionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600 },
                plugins: {
                  legend: {
                    position: "top",
                    labels: {
                      boxWidth: 18,
                      usePointStyle: true,
                      pointStyle: "circle",
                    },
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

        {/* Quality buckets + callers */}
        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm 2xl:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#1f2a56] font-semibold">
                Distribución por duración (Quality Metrics)
              </h3>
            </div>
            <div className="h-[320px]">
              <Bar
                data={qualityBucketsData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, grid: { color: "#eef2ff" } },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-[#1f2a56] font-semibold mb-2">Llamantes</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Únicos</span>
                <span className="text-lg font-bold text-indigo-600">
                  {numberFormat(uniqueCallers)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Reincidentes</span>
                <span className="text-lg font-bold text-indigo-600">
                  {numberFormat(
                    (qualityMetrics?.callers?.repeat_callers ?? 0) as number
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Tasa de repetición</span>
                <span className="text-lg font-bold text-indigo-600">
                  {repeatRatePct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Agentes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#1f2a56] text-lg md:text-xl font-semibold">
              Top agentes {countryFilter ? `— ${countryFilter}` : ""}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-[#1f2a56]">
                  <th className="px-4 py-3 text-left font-semibold">Agente</th>
                  <th className="px-4 py-3 text-left font-semibold">País</th>
                  <th className="px-4 py-3 text-left font-semibold">Llamadas</th>
                  <th className="px-4 py-3 text-left font-semibold">Atendidas</th>
                  <th className="px-4 py-3 text-left font-semibold">Tasa atención</th>
                  <th className="px-4 py-3 text-left font-semibold">TMO prom. (min)</th>
                </tr>
              </thead>
              <tbody>
                {topAgents.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{r.pais || "—"}</td>
                    <td className="px-4 py-3">{numberFormat(r.llamadas)}</td>
                    <td className="px-4 py-3">{numberFormat(r.atendidas)}</td>
                    <td className="px-4 py-3">
                      {typeof r.tasa === "number" ? `${(r.tasa * 100).toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {typeof r.durPromMin === "number" ? r.durPromMin.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
                {topAgents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No hay agentes para este rango/país.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla por país */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#1f2a56] text-lg md:text-xl font-semibold">
              Resumen por País
            </h2>
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
                  <th className="px-4 py-3 text-left font-semibold">País</th>
                  <th className="px-4 py-3 text-left font-semibold">Llamadas</th>
                  <th className="px-4 py-3 text-left font-semibold">% del total</th>
                  <th className="px-4 py-3 text-left font-semibold">TMO prom. (min)</th>
                  {showUniqueAgentsCol && (
                    <th className="px-4 py-3 text-left font-semibold">Agentes únicos</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rowsToShow.map((r) => {
                  const percent =
                    totalLlamadas > 0
                      ? ((r.total / totalLlamadas) * 100).toFixed(1) + "%"
                      : "—";
                  const uniqueAgents = uniqueAgentsByPais.get(r.pais) || 0;
                  return (
                    <tr key={r.pais} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{r.pais}</td>
                      <td className="px-4 py-3">{numberFormat(r.total)}</td>
                      <td className="px-4 py-3">{percent}</td>
                      <td className="px-4 py-3">
                        {r.tmoMin ? r.tmoMin.toFixed(1) : "—"}
                      </td>
                      {showUniqueAgentsCol && (
                        <td className="px-4 py-3">{numberFormat(uniqueAgents)}</td>
                      )}
                    </tr>
                  );
                })}
                {rowsToShow.length === 0 && (
                  <tr>
                    <td colSpan={showUniqueAgentsCol ? 5 : 4} className="px-4 py-6 text-center text-slate-500">
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

export default DashboardPais;
