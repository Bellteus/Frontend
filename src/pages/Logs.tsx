import { useEffect, useMemo, useState } from "react";
import { FiRefreshCcw, FiClock, FiUser, FiFilter, FiList } from "react-icons/fi";
import { LogsService } from "../services/Service";

/* ======================== Paleta coherente con Performance ======================== */
const CLASSES = {
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
  outline: "border border-slate-300 hover:border-slate-400 text-slate-700 bg-white",
  chip: "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white",
};

/* ======================== Tipos ======================== */
export interface ActionLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  timestamp: string; // ISO
}

/* ======================== Utils ======================== */
const formatDateTime = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const toDateInput = (dt: string | Date) => {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

/** Normaliza distintas formas posibles del backend para email/id/fecha/acción */
const normalizeLogs = (raw: any[]): ActionLog[] =>
  (raw || []).map((l: any, i: number) => {
    const user_email =
      l.user_email ??
      l.userEmail ??
      l.email ??
      l.usuario_email ??
      l.usuario?.email ??
      l.user?.email ??
      l.actor?.email ??
      "";

    const user_id =
      l.user_id ??
      l.userId ??
      l.usuario_id ??
      l.usuario?.id ??
      l.user?.id ??
      l.actor?.id ??
      "";

    const timestamp =
      l.timestamp ?? l.created_at ?? l.createdAt ?? l.time ?? l.fecha ?? "";

    const action = l.action ?? l.accion ?? l.event ?? l.evento ?? "";

    const id =
      l.id ??
      l._id ??
      l.log_id ??
      `${user_email || user_id || "log"}-${timestamp || i}`;

    return {
      id: String(id),
      user_id: String(user_id ?? ""),
      user_email: String(user_email ?? ""),
      action: String(action ?? ""),
      timestamp: String(timestamp ?? ""),
    };
  });

/* ======================== Componente ======================== */
const LogsTable = () => {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedEmail, setSelectedEmail] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [limit, setLimit] = useState<number>(500);

  // Email del usuario actual (almacenado por el login/jwt)
  const currentEmail = useMemo(() => localStorage.getItem("email") || "", []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const resp = await LogsService.list(limit);
      const data = normalizeLogs(Array.isArray(resp) ? resp : []);
      setLogs(data);

      // inicializar rango si no hay
      if (data.length && !startDate && !endDate) {
        const timestamps = data.map((l) => l.timestamp).filter(Boolean);
        const min = timestamps.reduce((m, c) => (c < m ? c : m), timestamps[0]);
        const max = timestamps.reduce((m, c) => (c > m ? c : m), timestamps[0]);
        setStartDate(toDateInput(min));
        setEndDate(toDateInput(max));
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  // Correos únicos
  const allEmails = useMemo(
    () =>
      Array.from(new Set(logs.map((l) => l.user_email).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "es")
      ),
    [logs]
  );

  // Filtrado frontend
  const filteredLogs = useMemo(() => {
    const s = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (selectedEmail && log.user_email !== selectedEmail) return false;

      const dStr = toDateInput(log.timestamp);
      if (startDate && dStr < startDate) return false;
      if (endDate && dStr > endDate) return false;

      if (s) {
        const haystack =
          `${log.user_email} ${log.action} ${formatDateTime(log.timestamp)}`.toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [logs, selectedEmail, startDate, endDate, search]);

  // Stats rápidas
  const quickStats = useMemo(() => {
    const users = new Set(filteredLogs.map((l) => l.user_email).filter(Boolean));
    const first = filteredLogs.length ? filteredLogs[filteredLogs.length - 1]?.timestamp : "";
    const last = filteredLogs.length ? filteredLogs[0]?.timestamp : "";
    return {
      total: filteredLogs.length,
      users: users.size,
      first,
      last,
    };
  }, [filteredLogs]);

  return (
    <div className="min-h-screen p-4 space-y-4">
      {/* Header / filtros card */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
          <h1 className="text-lg md:text-xl font-bold text-slate-900 flex-1">
            Auditoría de acciones
          </h1>
          <div className="hidden md:flex items-center gap-2">
            <span className={`${CLASSES.chip} border-slate-200`}>
              <FiList /> {quickStats.total} registros
            </span>
            <span className={`${CLASSES.chip} border-slate-200`}>
              <FiUser /> {quickStats.users} usuarios
            </span>
            <span className={`${CLASSES.chip} border-slate-200`}>
              <FiClock /> {formatDateTime(quickStats.last)} — {formatDateTime(quickStats.first)}
            </span>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${CLASSES.primary} disabled:opacity-60`}
            title="Recargar"
          >
            <FiRefreshCcw />
            <span className="hidden sm:inline">Recargar</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Correo</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
              >
                <option value="">Todos</option>
                {allEmails.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Desde</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Hasta</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                value={endDate}
                min={startDate || undefined}
                max={toDateInput(new Date())}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Buscar (acción, correo, fecha)</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2"
                    placeholder="Ej.: Exportó PDF, performance, historial…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  value={String(limit)}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-[110px] border border-slate-300 rounded-lg px-3 py-2"
                  title="Límite de registros a cargar"
                >
                  {[100, 250, 500, 1000].map((n) => (
                    <option key={n} value={n}>
                      Límite: {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-indigo-700 font-semibold">Cargando logs…</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-6 text-center text-slate-600">No hay logs registrados</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-[15px]">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-slate-700">
                  {["Usuario", "Acción", "Fecha/Hora"].map((th) => (
                    <th key={th} className="px-4 py-3 font-semibold text-center">
                      {th}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map((log) => {
                  const isYou = log.user_email && log.user_email === currentEmail;
                  return (
                    <tr key={log.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-4 py-2 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className="p-1.5 rounded-md bg-indigo-50 text-indigo-700">
                            <FiUser />
                          </span>
                          {log.user_email ? (
                            <a
                              href={`mailto:${log.user_email}`}
                              className="text-slate-800 hover:underline"
                              title={log.user_email}
                            >
                              {log.user_email}
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                          {isYou && <span className="text-xs text-indigo-700">(tú)</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-left">{log.action || "—"}</td>
                      <td className="px-4 py-2 text-center">{formatDateTime(log.timestamp)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td className="px-4 py-3 text-sm text-slate-600" colSpan={3}>
                    Mostrando {filteredLogs.length} de {logs.length} registros cargados.
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

export default LogsTable;
