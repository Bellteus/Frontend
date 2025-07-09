// src/pages/LogsTable.tsx

import { useEffect, useState } from "react";
import apiService from "../services/DataService";
import { FiRefreshCcw } from "react-icons/fi";

interface LogEntry {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  timestamp: string;
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString();
};

function formatDateInput(dt: string | Date) {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  return d.toISOString().slice(0, 10);
}

const LogsTable = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedEmail, setSelectedEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  // Extraer correos únicos
  const allEmails = Array.from(new Set(logs.map(l => l.user_email).filter(Boolean)));

  // Filtrado frontend
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
    <div className="min-h-screen p-4 bg-gray-100 flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Auditoría</h1>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2 flex items-center gap-2 shadow"
          onClick={fetchLogs}
          title="Recargar"
          disabled={loading}
        >
          <FiRefreshCcw size={18} />
          <span className="hidden sm:inline">Recargar</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="font-semibold text-gray-700">Correo:</label>
          <select
            className="rounded border border-gray-300 px-2 py-1"
            value={selectedEmail}
            onChange={e => setSelectedEmail(e.target.value)}
          >
            <option value="">Todos</option>
            {allEmails.map(email => (
              <option key={email} value={email}>{email}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="font-semibold text-gray-700">Desde:</label>
          <input
            type="date"
            className="rounded border border-gray-300 px-2 py-1"
            value={startDate}
            max={endDate || undefined}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="font-semibold text-gray-700">Hasta:</label>
          <input
            type="date"
            className="rounded border border-gray-300 px-2 py-1"
            value={endDate}
            min={startDate || undefined}
            onChange={e => setEndDate(e.target.value)}
            max={formatDateInput(new Date())}
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-xl flex-1 overflow-hidden border">
        {loading ? (
          <div className="flex justify-center items-center h-72">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-blue-600 font-medium text-center">Cargando logs...</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex justify-center items-center h-48 text-gray-500">
            No hay logs registrados.
          </div>
        ) : (
          <div className="overflow-auto max-h-[70vh]">
            <table className="min-w-full text-sm text-gray-700">
              <thead className="bg-blue-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 border text-center font-semibold">Usuario</th>
                  <th className="px-4 py-3 border text-center font-semibold">Acción</th>
                  <th className="px-4 py-3 border text-center font-semibold">Fecha/Hora</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-all border-b text-center">
                    <td className="px-4 py-2">{log.user_email}</td>
                    <td className="px-4 py-2 text-left">{log.action}</td>
                    <td className="px-4 py-2">{formatDateTime(log.timestamp)}</td>
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
