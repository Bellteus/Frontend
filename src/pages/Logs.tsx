import { useEffect, useState } from "react";
import apiService from "../services/DataService";
import { FiRefreshCcw } from "react-icons/fi";

// ----- Types -----
interface LogEntry {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  timestamp: string;
}

// ----- Utils -----
const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

function formatDateInput(dt: string | Date) {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  return d.toISOString().slice(0, 10);
}

// ----- Main Component -----
const LogsTable = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedEmail, setSelectedEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // --- Fetch logs ---
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await apiService.getSupervisorLogs();
      setLogs(response);
      if (response.length && !startDate && !endDate) {
        const fechas = response.map((l: LogEntry) => l.timestamp);
        const minFecha = fechas.reduce((min: string, curr: string) => curr < min ? curr : min, fechas[0]);
        const maxFecha = fechas.reduce((max: string, curr: string) => curr > max ? curr : max, fechas[0]);
        setStartDate(formatDateInput(minFecha));
        setEndDate(formatDateInput(maxFecha));
      }
    } catch (err) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, []);

  // --- Extraer correos únicos ---
  const allEmails = Array.from(new Set(logs.map(l => l.user_email).filter(Boolean)));

  // --- Filtrado frontend ---
  const filteredLogs = logs.filter((log) => {
    // Filtro por correo
    if (selectedEmail && log.user_email !== selectedEmail) return false;
    // Filtro por fecha (rango)
    const fecha = formatDateInput(log.timestamp);
    if (startDate && fecha < startDate) return false;
    if (endDate && fecha > endDate) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-screen p-4 lg:p-6 overflow-hidden bg-white">
      <div className="bg-white p-4 rounded-xl shadow-md mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-700">Auditoría de Acciones</h1>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2 text-sm"
            onClick={fetchLogs}
            title="Recargar"
            disabled={loading}
          >
            <FiRefreshCcw size={18} />
            <span className="hidden sm:inline">Recargar</span>
          </button>
        </div>
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 text-xs gap-4 items-end">
          <div>
            <label className="font-medium text-sm">Correo</label>
            <select
              className="w-full border border-gray-300 rounded p-2"
              value={selectedEmail}
              onChange={e => setSelectedEmail(e.target.value)}
            >
              <option value="">Todos</option>
              {allEmails.map(email => (
                <option key={email} value={email}>{email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-medium text-sm">Desde</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded p-2"
              value={startDate}
              max={endDate || undefined}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="font-medium text-sm">Hasta</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded p-2"
              value={endDate}
              min={startDate || undefined}
              onChange={e => setEndDate(e.target.value)}
              max={formatDateInput(new Date())}
            />
          </div>
        </div>
      </div>

      {/* Tabla y mensajes */}
      <div className="bg-white rounded-xl shadow-md flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-blue-600 font-medium text-center">Cargando logs...</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <h1 className="text-center text-lg text-gray-500">No hay logs registrados</h1>
          </div>
        ) : (
          <div className="overflow-auto h-min-[500px]">
            <table className="w-full text-sm lg:text-xs text-center whitespace-nowrap">
              <thead className="sticky top-0 bg-gray-100 z-10 text-left">
                <tr>
                  <th className="p-2 text-gray-600 font-medium text-center">Usuario</th>
                  <th className="p-2 text-gray-600 font-medium text-center">Acción</th>
                  <th className="p-2 text-gray-600 font-medium text-center">Fecha/Hora</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="p-1">{log.user_email}</td>
                    <td className="p-1 text-left">{log.action}</td>
                    <td className="p-1">{formatDateTime(log.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsTable;
