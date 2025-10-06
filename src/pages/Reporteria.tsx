// src/pages/CallsWithAnalysis.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { JoinService } from "../services/Service";
import { useMe } from "../hook/useMe";

/* ======================= Paleta común ======================= */
const PALETTE = [
  "#0ea5e9", "#0284c7", "#38bdf8", "#3b82f6", "#2563eb", "#1d4ed8",
  "#60a5fa", "#93c5fd", "#bfdbfe", "#a5b4fc", "#6366f1", "#3f51b5",
  "#2d5a9e", "#64748b", "#94a3b8", "#475569", "#1e3a8a", "#0b4f82",
  "#4f46e5", "#7dd3fc", "#c7d2fe", "#22c55e"
];

/* ======================= Fechas por defecto (primera semana) ======================= */
const DEFAULT_START = "2025-08-01";
const DEFAULT_END = "2025-08-07";

/* ======================= Helpers país / scope ======================= */
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
  if (!t) return "";
  if (CODE_TO_LABEL[t]) return CODE_TO_LABEL[t];
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/* ======================= Tipos ======================= */
export interface CallRecord2 {
  id_llamada: number;
  ani?: string | null;
  dnis?: string | null;
  calltype?: string | null;
  starttime?: string | null;
  endtime?: string | null;
  duration?: number | null;
  empleado_nombre?: string | null;
  organization?: string | null;
  organization_id?: number | null;
  extension?: number | null;
  pbx_login_id?: string | null;
  agent_id?: number | null;
  agent_name?: string | null;
  wrapup_time?: number | null;
  total_hold_time?: number | null;
  number_of_holds?: number | null;
  pais?: string | null;
}
export interface AnalysisData {
  callId: number;
  cumplimiento_protocolo: Record<string, unknown>;
  fortalezas: string[];
  oportunidades_mejora: string[];
  analisis_sentimiento_cliente: Record<string, unknown>;
  seguimiento: Record<string, unknown>;
  evidencias_textuales: string[];
  _class?: string;
}
export interface CallWithAnalysisItem {
  id: number;
  cdr: CallRecord2;
  analysis: AnalysisData | null;
}
interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total_items?: number;
  total_pages?: number;
}

/* ======================= Utils ======================= */
const PAGE_SIZE = 50;

const fmtDT = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const MM = String(d.getMinutes()).padStart(2, "0");
  const SS = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
};
const fmtMMSS = (sec?: number | null) => {
  if (typeof sec !== "number" || isNaN(sec)) return "0:00";
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};
const safeLower = (x: unknown) => (x == null ? "" : String(x).toLowerCase());
const getDurSec = (cdr?: CallRecord2) => {
  if (!cdr) return 0;
  if (typeof cdr.duration === "number" && !isNaN(cdr.duration)) return cdr.duration!;
  const s = cdr.starttime ? new Date(cdr.starttime).getTime() : NaN;
  const e = cdr.endtime ? new Date(cdr.endtime).getTime() : NaN;
  if (!isNaN(s) && !isNaN(e) && e >= s) return (e - s) / 1000;
  return 0;
};

/* ======================= Skeleton ======================= */
const RowSkeleton: React.FC = () => (
  <tr className="animate-pulse">
    {Array.from({ length: 9 }).map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-3 w-[70%] bg-slate-200 rounded" />
      </td>
    ))}
  </tr>
);

/* ======================= Componente ======================= */
const CallsWithAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { me, isAdmin: isAdminFromHook, loadingMe, errorMe } = useMe();

  // === Scope de país ===
  const hasStar = Array.isArray((me as any)?.country_scope)
    ? (me as any).country_scope.includes("*")
    : false;
  const isAdmin = isAdminFromHook || hasStar;
  const scopedCountry = useMemo(() => {
    if (isAdmin) return ""; // ve todos
    const scopeArr: string[] = Array.isArray((me as any)?.country_scope)
      ? (me as any).country_scope
      : [];
    const first = scopeArr.find((s) => s && s !== "*") || "";
    return normalizeCountryLabel(first);
  }, [isAdmin, me]);

  // filtros
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);
  const [onlyWithAnalysis, setOnlyWithAnalysis] = useState<boolean>(true);
  const [onlyGT5, setOnlyGT5] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");

  // paginación
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [totalItems, setTotalItems] = useState<number | null>(null);

  // data
  const [items, setItems] = useState<CallWithAnalysisItem[]>([]);

  // ui
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  async function fetchPage(p: number) {
    setLoading(true);
    setError(null);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // ⚠️ No pasamos 'pais'; el backend debe respetar el JWT (country_scope).
      const res = await JoinService.listWithAnalysis(
        start,
        end,
        p,
        PAGE_SIZE,
        onlyWithAnalysis
      );

      // Normalizar respuesta (acepta snake/camel)
      const r: any = Array.isArray(res)
        ? { items: res, page: p, page_size: PAGE_SIZE }
        : res;

      const normalized: Page<CallWithAnalysisItem> = {
        items: (r.items ?? r.data ?? []) as CallWithAnalysisItem[],
        page: Number(r.page ?? r.currentPage ?? p),
        page_size: Number(r.page_size ?? r.pageSize ?? PAGE_SIZE),
        total_items: Number(r.total_items ?? r.totalItems ?? r.total ?? r.count ?? 0) || undefined,
        total_pages: Number(r.total_pages ?? r.totalPages ?? 0) || undefined,
      };

      // Derivar total_pages si viene total_items
      let computedTotalPages = normalized.total_pages ?? null;
      if (!computedTotalPages && normalized.total_items && normalized.page_size) {
        computedTotalPages = Math.max(1, Math.ceil(normalized.total_items / normalized.page_size));
      }

      setItems(normalized.items || []);
      setPage(normalized.page || p);
      setTotalPages(computedTotalPages);
      setTotalItems(normalized.total_items ?? null);
      setLoading(false);
    } catch (e: any) {
      if (e?.name === "CanceledError") return;
      setError(e?.message || "No se pudo cargar la página.");
      setLoading(false);
    }
  }

  // Espera a que la sesión cargue para pedir datos
  useEffect(() => {
    if (!loadingMe && !errorMe) {
      fetchPage(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, start, end, onlyWithAnalysis, loadingMe, errorMe]);

  // reset página al cambiar filtros locales
  useEffect(() => {
    setPage(1);
  }, [start, end, onlyWithAnalysis, query, onlyGT5]);

  // búsqueda + filtro local en página + filtro country_scope
  const filtered = useMemo(() => {
    const q = safeLower(query);
    return items.filter((it) => {
      // Enforce country_scope si NO admin
      if (!isAdmin) {
        const rowCountry = normalizeCountryLabel(it.cdr?.pais);
        if (scopedCountry && rowCountry !== scopedCountry) return false;
      }
      // filtro > 5s
      if (onlyGT5 && getDurSec(it.cdr) <= 5) return false;

      if (!q) return true;
      const c = it.cdr || {};
      return [
        c.agent_name, c.empleado_nombre, c.ani, c.dnis,
        c.calltype, c.organization, c.pais, it.id
      ].some((v) => safeLower(v).includes(q));
    });
  }, [items, query, onlyGT5, isAdmin, scopedCountry]);

  // paginador helpers
  const canPrev = page > 1;
  const canNext = totalPages != null ? page < totalPages : items.length === PAGE_SIZE;

  const goFirst = () => canPrev && setPage(1);
  const goPrev = () => canPrev && setPage((p) => Math.max(1, p - 1));
  const goNext = () => canNext && setPage((p) => p + 1);
  const goLast = () => {
    if (totalPages != null) setPage(totalPages);
  };

  /* ======================= Guards de sesión ======================= */
  if (loadingMe) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="w-full mx-auto max-w-[1700px] px-6 2xl:px-10 py-6">
          <div className="h-24 bg-white border border-slate-200 rounded-2xl shadow-sm animate-pulse" />
        </div>
      </div>
    );
  }
  if (errorMe) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="w-full mx-auto max-w-[1700px] px-6 2xl:px-10 py-6">
          <div className="p-4 rounded-2xl bg-red-50 text-red-700 border border-red-200">
            No se pudo cargar la sesión. Intenta nuevamente.
          </div>
        </div>
      </div>
    );
  }

  /* ======================= Render ======================= */
  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <div className="w-full mx-auto max-w-[1700px] px-6 2xl:px-10 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[#1f2a56] text-[26px] md:text-[30px] font-extrabold tracking-tight">
              Llamadas con Análisis
            </h1>
            <p className="text-slate-600 mt-1 text-sm">
              Rango <b>{start}</b> a <b>{end}</b> ·{" "}
              {totalPages ? (
                <>Página <b>{page}</b> de <b>{totalPages}</b></>
              ) : (
                <>Página <b>{page}</b></>
              )}
              {totalItems != null && <> · Registros: <b>{totalItems}</b></>}
            </p>
            {!isAdmin && scopedCountry && (
              <div className="mt-1 text-[12px] text-slate-500">
                País (scope): <b>{scopedCountry}</b>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="hidden md:block rounded-xl px-3 py-2 text-sm border border-slate-300 hover:bg-slate-50"
          >
            Volver al Dashboard
          </button>
        </div>

        {/* Filtros */}
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

          <label className="text-sm text-slate-700 flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlyWithAnalysis}
              onChange={(e) => setOnlyWithAnalysis(e.target.checked)}
            />
            Solo con análisis
          </label>

          <label className="text-sm text-slate-700 flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlyGT5}
              onChange={(e) => setOnlyGT5(e.target.checked)}
            />
            Sólo &gt; 5s
          </label>

          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-semibold text-slate-600">Buscar</label>
            <input
              placeholder="Agente, ANI, DNIS, área, organización…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Paginador */}
          <div className="ml-auto flex items-center gap-2">
            <button
              className="px-2.5 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-40"
              onClick={goFirst}
              disabled={!canPrev}
              title="Primera página"
            >
              «
            </button>
            <button
              className="px-2.5 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-40"
              onClick={goPrev}
              disabled={!canPrev}
              title="Anterior"
            >
              ‹
            </button>
            <input
              type="number"
              min={1}
              value={page}
              onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 text-center border border-slate-300 rounded-lg px-2 py-2 text-sm"
              title="Ir a página"
            />
            <span className="text-sm text-slate-600">
              {totalPages ? <>/ {totalPages}</> : null}
            </span>
            <button
              className="px-2.5 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-40"
              onClick={goNext}
              disabled={!canNext}
              title="Siguiente"
            >
              ›
            </button>
            <button
              className="px-2.5 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-40"
              onClick={goLast}
              disabled={!(totalPages && page < totalPages)}
              title="Última página"
            >
              »
            </button>
          </div>
        </div>

        {/* Estado error */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[140px]" />
                <col className="w-[160px]" />
                <col className="w-[160px]" />
                <col className="w-[80px]" />
                <col className="w-[280px]" />
                <col className="w-[220px]" />
                <col className="w-[140px]" />
                <col className="w-[130px]" />
                <col className="w-[110px]" />
              </colgroup>
              <thead className="sticky top-0 bg-slate-50 text-[#1f2a56] z-10 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Call ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Inicio</th>
                  <th className="px-4 py-3 text-left font-semibold">Fin</th>
                  <th className="px-4 py-3 text-left font-semibold">Dur.</th>
                  <th className="px-4 py-3 text-left font-semibold">Agente</th>
                  <th className="px-4 py-3 text-left font-semibold">ANI → DNIS</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo / País</th>
                  <th className="px-4 py-3 text-left font-semibold">Wrap · Hold</th>
                  <th className="px-4 py-3 text-left font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading &&
                  Array.from({ length: 10 }).map((_, i) => <RowSkeleton key={i} />)}

                {!loading &&
                  filtered.map((row, idx) => {
                    const a = row.analysis;
                    const hasA = !!a && Object.keys(a || {}).length > 0;
                    const wrap = typeof row.cdr?.wrapup_time === "number" ? row.cdr?.wrapup_time : 0;
                    const hold = typeof row.cdr?.total_hold_time === "number" ? row.cdr?.total_hold_time : 0;
                    const holdsNum =
                      typeof row.cdr?.number_of_holds === "number" ? row.cdr?.number_of_holds : 0;
                    const dur = getDurSec(row.cdr);

                    return (
                      <tr
                        key={row.id}
                        className={idx % 2 ? "bg-white hover:bg-slate-50" : "bg-slate-50/40 hover:bg-slate-50"}
                      >
                        <td className="px-4 py-[14px] font-medium text-slate-800">{row.id}</td>
                        <td className="px-4 py-[14px]">{fmtDT(row.cdr?.starttime)}</td>
                        <td className="px-4 py-[14px]">{fmtDT(row.cdr?.endtime)}</td>
                        <td className="px-4 py-[14px]">{fmtMMSS(dur)}</td>

                        <td className="px-4 py-[14px]">
                          <div className="flex items-center gap-2">
                            <span className="font-medium line-clamp-1">
                              {row.cdr?.agent_name || row.cdr?.empleado_nombre || "—"}
                            </span>
                            {hasA ? (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: "#22c55e" }}
                                title="Con análisis"
                              />
                            ) : null}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-1">
                            {row.cdr?.organization || "—"}
                          </div>
                        </td>

                        <td className="px-4 py-[14px]">
                          <div className="text-slate-800">{row.cdr?.ani || "—"}</div>
                          <div className="text-xs text-slate-500">→ {row.cdr?.dnis || "—"}</div>
                        </td>

                        <td className="px-4 py-[14px]">
                          <span className="text-slate-800">{row.cdr?.calltype || "—"}</span>
                          <div className="text-xs text-slate-500">{normalizeCountryLabel(row.cdr?.pais) || "N/A"}</div>
                        </td>

                        <td className="px-4 py-[14px]">
                          <div className="text-slate-800">
                            Wrap: <b>{wrap}s</b>
                          </div>
                          <div className="text-xs text-slate-500">
                            Hold: {hold}s · #{holdsNum}
                          </div>
                        </td>

                        <td className="px-4 py-[14px]">
                          <button
                            onClick={() => navigate(`/reporteria/${row.id}`)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-white hover:opacity-90"
                            style={{ backgroundColor: PALETTE[0] }}
                            title="Ver detalle"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                      No hay registros para los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer de paginación */}
          <div className="border-t border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Tamaño de página: <b>{PAGE_SIZE}</b>
              {totalItems != null && <> · Total: <b>{totalItems}</b></>}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2.5 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-40"
                onClick={goFirst}
                disabled={!canPrev}
              >
                «
              </button>
              <button
                className="px-2.5 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-40"
                onClick={goPrev}
                disabled={!canPrev}
              >
                ‹
              </button>
              <span className="text-sm text-slate-600">
                {totalPages ? (
                  <>Página <b>{page}</b> de <b>{totalPages}</b></>
                ) : (
                  <>Página <b>{page}</b></>
                )}
              </span>
              <button
                className="px-2.5 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-40"
                onClick={goNext}
                disabled={!canNext}
              >
                ›
              </button>
              <button
                className="px-2.5 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-40"
                onClick={goLast}
                disabled={!(totalPages && page < totalPages)}
              >
                »
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CallsWithAnalysis;
