// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, Line } from "react-chartjs-2";
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
import { CallsService, LogsService } from "../../../services/Service";
import { numberFormat } from "../../../utils/format";
import type { CallRecord2 } from "../../../types/CallRecord";

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

/* ======================= Constantes / Utils ======================= */
const DEFAULT_START = "2025-08-01";
const DEFAULT_END = "2025-08-07";

/** Paleta unificada (azules + 1 verde) */
const PALETTE = [
  "#0ea5e9", "#0284c7", "#38bdf8", "#3b82f6", "#2563eb", "#1d4ed8",
  "#60a5fa", "#93c5fd", "#bfdbfe", "#a5b4fc", "#6366f1", "#3f51b5",
  "#2d5a9e", "#64748b", "#94a3b8", "#475569", "#1e3a8a", "#0b4f82",
  "#4f46e5", "#7dd3fc", "#c7d2fe", "#22c55e"
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

const secondsToMin1 = (sec: number) => +(sec / 60).toFixed(1);
const secondsToMMSS = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

/** Hora (0-23) desde ISO (UTC) */
function extractHourUTC(raw?: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(/T(\d{2}):\d{2}:\d{2}/);
  if (m) {
    const h = Number(m[1]);
    return Number.isFinite(h) ? (h % 24) : null;
  }
  const dt = new Date(raw);
  if (!isNaN(dt.getTime())) return dt.getUTCHours();
  const m2 = raw.match(/\s(\d{2}):\d{2}:\d{2}/);
  if (m2) {
    const h = Number(m2[1]);
    return Number.isFinite(h) ? (h % 24) : null;
  }
  return null;
}

/* ======================= Tipos locales ======================= */
interface TimeseriesPoint {
  timestamp: string; // ISO (día)
  value: number;
}

/* ======================= Componente ======================= */
const Dashboard: React.FC = () => {
  const { loadingMe, errorMe } = useMe(); // ⬅️ sin isAdmin
  const navigate = useNavigate();

  // filtros
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);

  // data
  const [items, setItems] = useState<CallRecord2[]>([]);
  const [kpiSummary, setKpiSummary] = useState<any | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any | null>(null);
  const [topAgentsRaw, setTopAgentsRaw] = useState<any[]>([]);
  const [seriesDia, setSeriesDia] = useState<TimeseriesPoint[]>([]);

  // meta devuelta por /calls/by-date
  const [metaUsuario, setMetaUsuario] = useState<string>("");
  const [metaScopes, setMetaScopes] = useState<string | string[] | null>(null);

  // ui
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ======== Fetch =========
  async function fetchCalls() {
    setLoading(true);
    setError(null);
    try {
      const res = await CallsService.callsByDate(start, end);
      setItems(Array.isArray(res?.records) ? (res.records as CallRecord2[]) : []);

      setMetaUsuario(String(res?.usuario || ""));
      setMetaScopes(res?.scopes ?? null);

      // Log de consulta (no bloquea UI)
      try {
        const scopesTxt = Array.isArray(res?.scopes) ? res.scopes.join(",") : (res?.scopes ?? "");
        await LogsService.audit(
          `Consultó Dashboard General (${start} → ${end}) — user=${res?.usuario || ""}, scopes=${scopesTxt}`
        );
      } catch {}

      setLoading(false);
      setChartLoading(true);
      requestAnimationFrame(() => setChartLoading(false));
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los datos.");
      setLoading(false);
    }
  }

  async function fetchKpis() {
    try {
      const [kpi, qual, topA] = await Promise.all([
        CallsService.kpiSummary(start, end),
        CallsService.qualityMetrics(start, end),
        CallsService.topAgents(start, end, 5),
      ]);
      setKpiSummary(kpi || null);
      setQualityMetrics(qual || null);
      setTopAgentsRaw(Array.isArray(topA) ? topA : []);
    } catch {
      setKpiSummary(null);
      setQualityMetrics(null);
      setTopAgentsRaw([]);
    }
  }

  async function fetchTimeseries() {
    try {
      const ts = await CallsService.timeseries(start, end, "day");
      setSeriesDia(Array.isArray(ts) ? ts : []);
    } catch {
      setSeriesDia([]);
    }
  }

  useEffect(() => {
    if (!loadingMe) {
      fetchCalls();
      fetchKpis();
      fetchTimeseries();
    }
  }, [start, end, loadingMe]); // ⬅️ sin isAdmin

  /* ======================= Derivados ======================= */
  const days = useMemo(() => rangeDaysUTC(start, end), [start, end]);

  // Serie diaria: preferimos backend; si no, local
  const callsByDayFromServer = useMemo(() => {
    const map: Record<string, number> = {};
    days.forEach((d) => (map[d] = 0));
    seriesDia.forEach((p) => {
      const d = (p.timestamp || "").slice(0, 10);
      if (map[d] != null) map[d] += p.value || 0;
    });
    return map;
  }, [seriesDia, days]);

  const callsByDayLocal = useMemo(() => {
    const map: Record<string, number> = {};
    days.forEach((d) => (map[d] = 0));
    items.forEach((it) => {
      const d = (it.starttime || "").slice(0, 10);
      if (map[d] != null) map[d] += 1;
    });
    return map;
  }, [items, days]);

  const callsByDay = useMemo(() => {
    const hasServer = Object.values(callsByDayFromServer).some((v) => v > 0);
    return hasServer ? callsByDayFromServer : callsByDayLocal;
  }, [callsByDayFromServer, callsByDayLocal]);

  // Actividad por hora (UTC)
  const hoursLabels = useMemo(
    () => Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0")),
    []
  );

  const callsByHourUTC = useMemo(() => {
    const arr = Array(24).fill(0) as number[];
    items.forEach((it) => {
      const h = extractHourUTC(it.starttime);
      if (h != null && h >= 0 && h <= 23) arr[h] += 1;
    });
    return arr;
  }, [items]);

  // Top agentes (bar)
  const topAgents = useMemo(() => {
    return (topAgentsRaw || [])
      .map((r: any) => ({
        id: r?.agent_id ?? r?.agent ?? r?.empleado_id ?? `${r?.agent_name || r?.empleado_nombre || "—"}`,
        name: r?.agent_name ?? r?.empleado_nombre ?? "—",
        llamadas: r?.llamadas ?? r?.calls ?? r?.count ?? 0,
        durPromSec:
          typeof r?.dur_prom === "number"
            ? r.dur_prom
            : typeof r?.avg_dur === "number"
            ? r.avg_dur
            : null,
      }))
      .sort((a: any, b: any) => b.llamadas - a.llamadas)
      .slice(0, 5);
  }, [topAgentsRaw]);

  /* ======================= Filtros y Guards ======================= */
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

      <div className="ml-auto flex items-center gap-2">
        <select
          defaultValue="general"
          onChange={(e) => {
            const v = e.target.value;
            if (v === "agente") navigate("/dashboard/agente");
            else if (v === "pais") navigate("/dashboard/pais");
            else navigate("/dashboard");
          }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="general">General</option>
          <option value="agente">Por agente</option>
          <option value="pais">Por país</option>
        </select>
      </div>
    </div>
  );

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
          {Filters}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse h-[120px]" />
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse h-[120px]" />
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse h-[120px]" />
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse h-[120px]" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse h-[360px]" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse h-[360px]" />
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse h-[360px]" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse h-[340px]" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen w-full bg-[#f6f7fb]">
        <div className="w-full mx-auto max-w-[1700px] px-6 2xl:px-10 py-6 space-y-6">
          {Filters}
          <div className="p-4 rounded-2xl bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        </div>
      </div>
    );
  }

  /* ======================= Render ======================= */
  return (
    <div className="min-h-screen w-full bg-[#f6f7fb]">
      <div className="w-full mx-auto max-w-[1700px] px-6 2xl:px-10 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[#1f2a56] text-[28px] font-extrabold tracking-tight">
              Dashboard General
            </h1>
            <p className="text-slate-600 mt-1 text-sm">
              Rango <b>{start}</b> a <b>{end}</b> — Llamadas totales:{" "}
              <b>{numberFormat(items.length)}</b>
            </p>

            {(metaUsuario || metaScopes) && (
              <div className="mt-1 text-[12px] text-slate-500">
                Usuario: <b>{metaUsuario || "—"}</b>{" "}
                <span className="mx-2">·</span>
                Ámbito:{" "}
                <b>{Array.isArray(metaScopes) ? metaScopes.join(", ") : (metaScopes ?? "—")}</b>
              </div>
            )}
          </div>
        </div>

        {/* Filtros */}
        {Filters}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">Llamadas totales</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {numberFormat(items.length)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">Agentes con actividad</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {numberFormat(
                new Set(
                  items.map((i) =>
                    String(i.agent_id ?? i.agent_name ?? i.empleado_nombre ?? "N/A")
                  )
                ).size
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">TMO promedio</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {secondsToMMSS(
                (() => {
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
                })()
              )}
            </div>
            <div className="text-[11px] text-slate-500">mm:ss</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-xs text-slate-500">Tasa de atención</div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">
              {(
                (kpiSummary?.tasa_atencion ?? qualityMetrics?.summary?.answer_rate ?? 0) * 100
              ).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* “Llamantes” (resumen) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-[#1f2a56] font-semibold mb-2">Llamantes</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div>
              <div className="text-xs text-slate-500">Únicos</div>
              <div className="text-xl font-bold text-indigo-600">
                {numberFormat(qualityMetrics?.callers?.unique_callers ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Reincidentes</div>
              <div className="text-xl font-bold text-indigo-600">
                {numberFormat(qualityMetrics?.callers?.repeat_callers ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Tasa repetición</div>
              <div className="text-xl font-bold text-indigo-600">
                {((qualityMetrics?.callers?.repeat_rate ?? 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Hold promedio</div>
              <div className="text-xl font-bold text-indigo-600">
                {secondsToMin1(
                  kpiSummary?.hold_prom ?? qualityMetrics?.summary?.hold_avg ?? 0
                ).toFixed(1)}{" "}
                min
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Tasa de hold</div>
              <div className="text-xl font-bold text-indigo-600">
                {((kpiSummary?.hold_rate ?? qualityMetrics?.summary?.hold_rate ?? 0) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Top agentes (Top 5) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1f2a56] font-semibold">Top agentes por llamadas (Top 5)</h3>
            {chartLoading && (
              <span className="text-slate-500 text-xs animate-pulse">Actualizando…</span>
            )}
          </div>
          <div className="h-[320px]">
            <Bar
              data={{
                labels: (topAgents || []).map((a) => a.name),
                datasets: [
                  {
                    label: "Llamadas",
                    data: (topAgents || []).map((a) => a.llamadas),
                    backgroundColor: (topAgents || []).map(
                      (_: any, i: number) => PALETTE[i % PALETTE.length]
                    ),
                    borderRadius: 8,
                    barThickness: 26,
                  },
                ],
              }}
              options={{
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600 },
                plugins: { legend: { display: false } },
                scales: {
                  x: { beginAtZero: true, grid: { color: "#eef2ff" } },
                  y: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

        {/* Evolución diaria */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1f2a56] font-semibold">Evolución diaria de llamadas</h3>
            {chartLoading && (
              <span className="text-slate-500 text-xs animate-pulse">Actualizando…</span>
            )}
          </div>
          <div className="h-[320px]">
            <Line
              data={{
                labels: days,
                datasets: [
                  {
                    label: "Llamadas por día",
                    data: days.map((d) => callsByDay[d] || 0),
                    fill: true,
                    backgroundColor: (ctx: any) => {
                      const { chart } = ctx;
                      const { ctx: c, chartArea } = chart;
                      if (!chartArea) return "rgba(63,81,181,0.08)";
                      const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                      g.addColorStop(0, "rgba(63,81,181,0.25)");
                      g.addColorStop(1, "rgba(63,81,181,0.03)");
                      return g;
                    },
                    borderColor: "#3f51b5",
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 2.5,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600 },
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { color: "#eef2ff" } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

        {/* Distribución por duración */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1f2a56] font-semibold">Distribución por duración</h3>
          </div>
          <div className="h-[300px]">
            <Bar
              data={{
                labels: (qualityMetrics?.buckets || []).map((b: any) => b.label),
                datasets: [
                  {
                    label: "Llamadas",
                    data: (qualityMetrics?.buckets || []).map((b: any) => b.count),
                    backgroundColor: (qualityMetrics?.buckets || []).map(
                      (_: any, i: number) => PALETTE[i % PALETTE.length]
                    ),
                    borderRadius: 8,
                  },
                ],
              }}
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

        {/* Mejor TMO (>= 2 llamadas) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1f2a56] font-semibold">Mejor TMO (min, ≥ 2 llamadas)</h3>
            <span className="text-[11px] text-slate-500">Eje en mm:ss</span>
          </div>
          <div className="h-[340px]">
            <Bar
              data={{
                labels: (() => {
                  const acc = new Map<string, { totalSec: number; count: number }>();
                  items.forEach((it) => {
                    const name = it.agent_name || it.empleado_nombre || "N/A";
                    let durSec: number | null =
                      typeof it.duration === "number" && !isNaN(it.duration) ? it.duration : null;
                    if (durSec == null) {
                      const s = it.starttime ? new Date(it.starttime).getTime() : NaN;
                      const e = it.endtime ? new Date(it.endtime).getTime() : NaN;
                      if (!isNaN(s) && !isNaN(e) && e >= s) durSec = (e - s) / 1000;
                    }
                    if (durSec != null) {
                      const row = acc.get(name) || { totalSec: 0, count: 0 };
                      row.totalSec += durSec;
                      row.count += 1;
                      acc.set(name, row);
                    }
                  });
                  const rows = Array.from(acc.entries())
                    .filter(([_, v]) => v.count >= 2)
                    .map(([name, v]) => ({ name, tmoSec: v.totalSec / v.count }))
                    .sort((a, b) => a.tmoSec - b.tmoSec)
                    .slice(0, 12);
                  return rows.map((r) => r.name);
                })(),
                datasets: [
                  {
                    label: "TMO (mm:ss)",
                    data: (() => {
                      const acc = new Map<string, { totalSec: number; count: number }>();
                      items.forEach((it) => {
                        const name = it.agent_name || it.empleado_nombre || "N/A";
                        let durSec: number | null =
                          typeof it.duration === "number" && !isNaN(it.duration) ? it.duration : null;
                        if (durSec == null) {
                          const s = it.starttime ? new Date(it.starttime).getTime() : NaN;
                          const e = it.endtime ? new Date(it.endtime).getTime() : NaN;
                          if (!isNaN(s) && !isNaN(e) && e >= s) durSec = (e - s) / 1000;
                        }
                        if (durSec != null) {
                          const row = acc.get(name) || { totalSec: 0, count: 0 };
                          row.totalSec += durSec;
                          row.count += 1;
                          acc.set(name, row);
                        }
                      });
                      const rows = Array.from(acc.entries())
                        .filter(([_, v]) => v.count >= 2)
                        .map(([name, v]) => ({ name, tmoSec: v.totalSec / v.count }))
                        .sort((a, b) => a.tmoSec - b.tmoSec)
                        .slice(0, 12);
                      return rows.map((r) => r.tmoSec);
                    })(),
                    backgroundColor: (() => {
                      const n = 12;
                      return Array.from({ length: n }, (_, i) => PALETTE[(i + 6) % PALETTE.length]);
                    })(),
                    borderRadius: 8,
                    barThickness: 22,
                  },
                ],
              }}
              options={{
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const sec = ctx.parsed.x ?? ctx.parsed;
                        return `TMO: ${secondsToMMSS(Number(sec))}`;
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    grid: { color: "#eef2ff" },
                    ticks: {
                      callback: (value) => secondsToMMSS(Number(value)),
                    },
                  },
                  y: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

        {/* Actividad por hora (UTC) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1f2a56] font-semibold">Actividad por hora (UTC)</h3>
          </div>
          <div className="h-[260px]">
            <Line
              data={{
                labels: hoursLabels,
                datasets: [
                  {
                    label: "Llamadas por hora (UTC)",
                    data: callsByHourUTC,
                    fill: false,
                    borderColor: "#2563eb",
                    backgroundColor: "#60a5fa",
                    borderWidth: 2.5,
                    tension: 0.25,
                    pointRadius: 2.5,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: "#eef2ff" },
                    ticks: { precision: 0 },
                    title: { display: true, text: "Llamadas" },
                  },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
