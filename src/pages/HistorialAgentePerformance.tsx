import { useEffect, useState } from 'react';
import apiService from '../services/DataService';
import { EmpleadoReporte } from '../types/AgentReport';
import { useNavigate } from 'react-router-dom';

// Utilidad para formatear a DD-MM-YYYY
const toDMY = (date: string | Date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const HistorialAgentePerformance = () => {
  const [allReports, setAllReports] = useState<EmpleadoReporte[]>([]);
  const [filteredReports, setFilteredReports] = useState<EmpleadoReporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false); // Para animación de buscar
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [agenteFiltro, setAgenteFiltro] = useState('');
  const [agentesUnicos, setAgentesUnicos] = useState<string[]>([]);
  const navigate = useNavigate();

  // Obtiene los reportes desde el backend
  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const fechaInicioStr = fechaInicio ? toDMY(fechaInicio) : '01-01-2000';
      const fechaFinStr = fechaFin ? toDMY(fechaFin) : toDMY(new Date());
      const agenteStr = agenteFiltro || 'TODOS';

      const data = await apiService.getReporteAnalisisAgente({
        Agente: agenteStr,
        fecha_inicio: fechaInicioStr,
        fecha_fin: fechaFinStr
      });

      setAllReports(data);
      setFilteredReports(data);
      setAgentesUnicos(Array.from(new Set(data.map(d => d.nombre_empleado || '---'))).sort());
    } catch (error) {
      console.error('Error al obtener reportes de agentes:', error);
      setAllReports([]);
      setFilteredReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
    // eslint-disable-next-line
  }, []);

  // Filtro por agente (solo frontend)
  useEffect(() => {
    if (!agenteFiltro) {
      setFilteredReports(allReports);
    } else {
      setFilteredReports(allReports.filter(r => r.nombre_empleado === agenteFiltro));
    }
  }, [agenteFiltro, allReports]);

  // Filtro avanzado con loading UX
  const handleBuscar = () => {
    setSearching(true);
    setTimeout(() => {
      fetchAllReports();
      setSearching(false);
    }, 350);
  };

  // Descargar PDF (placeholder)
  const handleDescargarPDF = async (reporte: EmpleadoReporte) => {
    const contenido = `
Agente: ${reporte.nombre_empleado}
ID: ${reporte.id_empleado}
Score promedio: ${reporte.performance_score_promedio}
Satisfacción promedio: ${reporte.satisfaccion_cliente_promedio}
Sentimiento: ${reporte.sentimiento_predominante}
Fecha: ${reporte.fecha_inicio_busqueda} a ${reporte.fecha_fin_busqueda}
Fecha generado: ${reporte.DateTime_realizado}
    `;
    const blob = new Blob([contenido], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_${reporte.nombre_empleado || 'agente'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);

    // LOG al descargar PDF
    const user_id = localStorage.getItem("id");
    const user_email = localStorage.getItem("email");
    if (user_id && user_email) {
      await apiService.postSupervisorLog({
        user_id,
        user_email,
        action: `Descargó reporte PDF de agente "${reporte.nombre_empleado}"`
      });
    }
  };

  // Botón regresar + LOG
  const handleRegresar = async () => {
    const user_id = localStorage.getItem("id");
    const user_email = localStorage.getItem("email");
    if (user_id && user_email) {
      await apiService.postSupervisorLog({
        user_id,
        user_email,
        action: "Regresó desde historial de reportes por agente"
      });
    }
    navigate(-1);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleRegresar}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded shadow font-semibold"
        >
          ← Regresar
        </button>
        <h1 className="text-2xl font-bold text-gray-800 text-center flex-1 uppercase">
          Historial Reportes Generados por Agente
        </h1>
        <div className="w-36" />
      </div>

      {/* Filtro */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Agente:</label>
          <select
            value={agenteFiltro}
            onChange={e => setAgenteFiltro(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 w-full shadow-sm"
          >
            <option value="">Todos</option>
            {agentesUnicos.map((ag) => (
              <option value={ag} key={ag}>{ag}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Desde:</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 w-full shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hasta:</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 w-full shadow-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleBuscar}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow font-semibold"
            disabled={searching}
          >
            {searching ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Buscando...
              </span>
            ) : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white shadow">
        {loading || searching ? (
          <div className="flex flex-col items-center justify-center h-48">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="mt-4 text-blue-600 font-semibold text-lg">Cargando...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No hay reportes disponibles.</div>
        ) : (
          <table className="min-w-full text-[15px] text-gray-800">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {[
                  'Nombre',
                  'ID',
                  'Llamadas',
                  'Score Prom.',
                  'Satisfacción',
                  'Sentimiento',
                  'Desde',
                  'Hasta',
                  'Generado',
                  'PDF'
                ].map((th) => (
                  <th
                    key={th}
                    className="px-4 py-3 font-bold text-center"
                  >
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((r, idx) => (
                <tr
                  key={r._id || idx}
                  className="hover:bg-blue-50 transition-all text-center border-b border-gray-200"
                >
                  <td className="px-4 py-2">{r.nombre_empleado || '---'}</td>
                  <td className="px-4 py-2">{r.id_empleado || '---'}</td>
                  <td className="px-4 py-2">{r.numero_llamadas || 0}</td>
                  <td className="px-4 py-2">{r.performance_score_promedio?.toFixed(2) || '-'}</td>
                  <td className="px-4 py-2">{r.satisfaccion_cliente_promedio?.toFixed(2) || '-'}</td>
                  <td className="px-4 py-2">{r.sentimiento_predominante || '---'}</td>
                  <td className="px-4 py-2">{new Date(r.fecha_inicio_busqueda).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{new Date(r.fecha_fin_busqueda).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{new Date(r.DateTime_realizado).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDescargarPDF(r)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded shadow-sm font-bold transition"
                      title="Descargar PDF"
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default HistorialAgentePerformance;
