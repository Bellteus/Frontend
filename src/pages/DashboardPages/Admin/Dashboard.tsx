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

function extractHourUTC(raw?: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(/T(\d{2}):\d{2}:\d{2}/);
  if (m) return Number(m[1]) % 24;
  const dt = new Date(raw);
  if (!isNaN(dt.getTime())) return dt.getUTCHours();
  const m2 = raw.match(/\s(\d{2}):\d{2}:\d{2}/);
  if (m2) return Number(m2[1]) % 24;
  return null;
}

/* ======================= Tipos locales ======================= */
interface TimeseriesPoint {
  timestamp: string; // ISO (día)
  value: number;
}

/* ======================= Componente ======================= */
const Dashboard: React.FC = () => {
  const { loadingMe, errorMe } = useMe();
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
  }, [start, end, loadingMe]);

  /* ======================= Derivados ======================= */
  const days = useMemo(() => rangeDaysUTC(start, end), [start, end]);

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

  const topAgents = useMemo(() => {
    return (topAgentsRaw || [])
      .map((r: any) => ({
        id: r?.agent_id ?? r?.agent ?? r?.empleado_id ?? `${r?.agent_name || r?.empleado_nombre || "—"}`,
        name: r?.agent_name ?? r?.empleado_nombre ?? "—",
        llamadas: r?.llamadas ?? r?.calls ?? r?.count ?? 0,
      }))
      .sort((a: any, b: any) => b.llamadas - a.llamadas)
      .slice(0, 5);
  }, [topAgentsRaw]);

  /* ======================= UI compacta y fluida ======================= */
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

      <div className="ml-auto flex items-center gap-2">
        <select
          defaultValue="general"
          onChange={(e) => {
            const v = e.target.value;
            if (v === "agente") navigate("/dashboard/agente");
            else if (v === "pais") navigate("/dashboard/pais");
            else navigate("/dashboard");
          }}
          className="border border-slate-300 rounded-md px-2 py-1 text-[clamp(12px,0.85vw,13px)] h-[clamp(32px,3.2vh,36px)]"
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
      <div className="h-screen w-full bg-[#f6f7fb]">
        <div className="max-w-none h-full mx-auto px-[clamp(10px,1.2vw,28px)] py-[clamp(8px,1vh,16px)] flex flex-col gap-[clamp(8px,1vh,14px)]">
          {Filters}
          <div className="grid grid-cols-4 gap-[clamp(8px,1vw,14px)]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm animate-pulse h-[clamp(70px,9vh,110px)]" />
            ))}
          </div>
          <div className="grid grid-cols-12 gap-[clamp(8px,1vw,14px)] flex-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm animate-pulse col-span-12 xl:col-span-4" />
            ))}
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
          <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
            {error}
          </div>
        </div>
      </div>
    );
  }

  /* ======================= Render ======================= */
  return (
    <div className="h-screen w-full bg-[#f6f7fb] overflow-hidden">
      <div className="max-w-none h-full mx-auto px-[clamp(10px,1.2vw,28px)] py-[clamp(8px,1vh,16px)] flex flex-col gap-[clamp(8px,1vh,14px)]">
        {/* Header compacto */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#1f2a56] font-extrabold tracking-tight leading-none text-[clamp(18px,1.6vw,24px)]">
              Dashboard General
            </h1>
            <div className="text-slate-600 mt-1 text-[clamp(11px,0.9vw,13px)]">
              Rango <b>{start}</b> a <b>{end}</b> — Llamadas totales:{" "}
              <b>{numberFormat(items.length)}</b>
              {(metaUsuario || metaScopes) && (
                <>
                  <span className="mx-2">·</span>
                  Usuario: <b>{metaUsuario || "—"}</b>
                  <span className="mx-2">·</span>
                  Ámbito:{" "}
                  <b>{Array.isArray(metaScopes) ? metaScopes.join(", ") : (metaScopes ?? "—")}</b>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filtros */}
        {Filters}

        {/* KPIs compactos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[clamp(8px,1vw,14px)]">
          <KpiCard label="Llamadas totales" value={numberFormat(items.length)} />
          <KpiCard
            label="Agentes con actividad"
            value={numberFormat(
              new Set(items.map((i) =>
                String(i.agent_id ?? i.agent_name ?? i.empleado_nombre ?? "N/A")
              )).size
            )}
          />
          <KpiCard
            label="TMO promedio"
            value={secondsToMMSS(
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
            hint="mm:ss"
          />
          <KpiCard
            label="Tasa de atención"
            value={`${(
              (kpiSummary?.tasa_atencion ?? qualityMetrics?.summary?.answer_rate ?? 0) * 100
            ).toFixed(1)}%`}
          />
        </div>

        {/* Mini KPIs */}
        <div className="bg-white rounded-xl border border-slate-200 p-[clamp(8px,1vw,12px)] shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-[clamp(6px,0.8vw,12px)]">
            <MiniStat label="Únicos" value={numberFormat(qualityMetrics?.callers?.unique_callers ?? 0)} />
            <MiniStat label="Reincidentes" value={numberFormat(qualityMetrics?.callers?.repeat_callers ?? 0)} />
            <MiniStat label="Tasa repetición" value={`${((qualityMetrics?.callers?.repeat_rate ?? 0) * 100).toFixed(1)}%`} />
            <MiniStat label="Hold promedio" value={`${secondsToMin1(kpiSummary?.hold_prom ?? qualityMetrics?.summary?.hold_avg ?? 0).toFixed(1)} min`} />
            <MiniStat label="Tasa de hold" value={`${((kpiSummary?.hold_rate ?? qualityMetrics?.summary?.hold_rate ?? 0) * 100).toFixed(1)}%`} />
          </div>
        </div>

        {/* === Rejilla EXACTA: IZQ 8 col (verde) + DER 4 col (naranja/rojo) ===
            La altura disponible se reparte 47% (fila superior) y 53% (fila inferior):
            así el rojo queda más grande que la franja verde/naranja. */}
        <div className="grid grid-cols-12 gap-[clamp(8px,1vw,14px)] min-h-0 flex-1">
          {/* IZQUIERDA (8 col) */}
          <div
            className={[
              "col-span-12 xl:col-span-8 grid grid-cols-2 min-w-0 min-h-0 gap-[clamp(8px,1vw,14px)]",
              // filas proporcionadas: top 47% (verde), bottom 53% (rojo)
              "grid-rows-[minmax(0,0.47fr)_minmax(0,0.53fr)]",
            ].join(" ")}
          >
            {/* Arriba izq (Top agentes) */}
            <Panel
              title="Top agentes por llamadas (Top 5)"
              hint={chartLoading && "Actualizando…"}
              className="col-span-1 row-span-1 h-full min-w-0"
            >
              <Bar
                data={{
                  labels: (topAgents || []).map((a) => a.name),
                  datasets: [{
                    label: "Llamadas",
                    data: (topAgents || []).map((a) => a.llamadas),
                    backgroundColor: (topAgents || []).map((_, i) => PALETTE[i % PALETTE.length]),
                    borderRadius: 6,
                    categoryPercentage: 0.7,
                    barPercentage: 0.7,
                  }],
                }}
                options={{
                  indexAxis: "y",
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { beginAtZero: true, grid: { color: "#eef2ff" }, ticks: { font: { size: 10 } } },
                    y: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  },
                }}
              />
            </Panel>

            {/* Arriba der (Evolución diaria) */}
            <Panel title="Evolución diaria de llamadas" hint={chartLoading && "Actualizando…"} className="col-span-1 row-span-1 h-full min-w-0">
  <Line
    data={{
      labels: days,
      datasets: [{
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
        pointRadius: 0,          // puntos invisibles…
        pointHitRadius: 12,      // …pero fáciles de “tocar”
        pointHoverRadius: 4,
      }],
    }}
    options={{
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      interaction: { mode: "index", intersect: false }, // <- clave
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (items) => (items[0]?.label ? `Día: ${items[0].label}` : ""),
            label: (ctx) => `Llamadas: ${ctx.parsed.y ?? 0}`,
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

            {/* Abajo (Mejor TMO) - rojo izq: ocupa ambas columnas, más alto */}
            <Panel
              title="Mejor TMO (min, ≥ 2 llamadas)"
              hint="Eje en mm:ss"
              className="col-span-2 row-span-1 h-full min-w-0"
            >
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
                      .slice(0, 10);
                    return rows.map((r) => r.name);
                  })(),
                  datasets: [{
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
                        .slice(0, 10);
                      return rows.map((r) => r.tmoSec);
                    })(),
                    backgroundColor: Array.from({ length: 10 }, (_, i) => PALETTE[(i + 6) % PALETTE.length]),
                    borderRadius: 6,
                    categoryPercentage: 0.7,
                    barPercentage: 0.7,
                  }],
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
                      ticks: { callback: (v) => secondsToMMSS(Number(v)), font: { size: 10 } },
                    },
                    y: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  },
                }}
              />
            </Panel>
          </div>

          {/* DERECHA (4 col) */}
          <div
            className={[
              "col-span-12 xl:col-span-4 grid min-w-0 min-h-0 gap-[clamp(8px,1vw,14px)]",
              // misma proporción: arriba 47% (naranja), abajo 53% (rojo der)
              "grid-rows-[minmax(0,0.47fr)_minmax(0,0.53fr)]",
            ].join(" ")}
          >
            {/* Arriba: Distribución (naranja) */}
            <Panel title="Distribución por duración" className="h-full min-w-0">
              <Bar
                data={{
                  labels: (qualityMetrics?.buckets || []).map((b: any) => b.label),
                  datasets: [{
                    label: "Llamadas",
                    data: (qualityMetrics?.buckets || []).map((b: any) => b.count),
                    backgroundColor: (qualityMetrics?.buckets || []).map((_: any, i: number) => PALETTE[i % PALETTE.length]),
                    borderRadius: 6,
                    categoryPercentage: 0.7,
                    barPercentage: 0.7,
                  }],
                }}
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

            {/* Abajo: Actividad por hora (rojo der) */}
            <Panel title="Actividad por hora (UTC)" className="h-full min-w-0">
            <Line
              data={{
                labels: hoursLabels,
                datasets: [{
                  label: "Llamadas por hora (UTC)",
                  data: callsByHourUTC,
                  fill: false,
                  borderColor: "#2563eb",
                  backgroundColor: "#60a5fa",
                  borderWidth: 2,
                  tension: 0.25,
                  pointRadius: 0,
                  pointHitRadius: 12,
                  pointHoverRadius: 4,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false }, // <- clave
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    enabled: true,
                    callbacks: {
                      title: (items) =>
                        items[0]?.label != null ? `Hora: ${items[0].label}:00 UTC` : "",
                      label: (ctx) => `Llamadas: ${ctx.parsed.y ?? 0}`,
                    },
                  },
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: "#eef2ff" }, ticks: { precision: 0, font: { size: 10 } } },
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                },
              }}
            />
          </Panel>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===== Auxiliares ===== */
const KpiCard: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-[clamp(10px,1vw,14px)] shadow-sm h-[clamp(70px,9vh,110px)]">
    <div className="text-slate-500 text-[clamp(11px,0.85vw,12px)]">{label}</div>
    <div className="text-indigo-600 font-bold leading-tight text-[clamp(20px,2vw,28px)]">{value}</div>
    {hint && <div className="text-[clamp(10px,0.75vw,11px)] text-slate-500 -mt-0.5">{hint}</div>}
  </div>
);

const Panel: React.FC<
  React.PropsWithChildren<{ title: string; hint?: string | false; className?: string }>
> = ({ title, hint, className, children }) => (
  <div className={`bg-white rounded-xl border border-slate-200 p-[clamp(10px,1vw,14px)] shadow-sm min-h-0 min-w-0 flex flex-col ${className || ""}`}>
    <div className="flex items-center justify-between pb-[clamp(6px,0.7vh,10px)]">
      <h3 className="text-[#1f2a56] font-semibold text-[clamp(12px,1vw,14px)]">{title}</h3>
      {hint ? <span className="text-slate-500 text-[clamp(10px,0.8vw,12px)]">{hint}</span> : null}
    </div>
    <div className="flex-1 min-h-0">{children}</div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-[clamp(11px,0.85vw,12px)] text-slate-500">{label}</span>
    <span className="text-indigo-600 font-bold leading-none mt-0.5 text-[clamp(14px,1.3vw,18px)]">{value}</span>
  </div>
);

export default Dashboard;
