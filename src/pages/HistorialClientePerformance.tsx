import { useEffect, useState } from 'react';
import { ClientePerformanceService } from '../services/ClientePerformanceService';
import { ClienteResponsePerformance } from '../types/ClientesPerformance';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/DataService';

const HistorialClientePerformance = () => {
  const [allReportsClientes, setAllReportsClientes] = useState<ClienteResponsePerformance[]>([]);
  const [filteredReports, setFilteredReports] = useState<ClienteResponsePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false); // <--- Nuevo estado
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [clientesUnicos, setClientesUnicos] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await ClientePerformanceService.getTodosLosReportesClientes();
      const responseWithDispersion = response.map((r: any) => ({
        ...r,
        dispersion_performance_score: r.dispersion_performance_score ?? 0,
        dispersion_satisfaccion_cliente: r.dispersion_satisfaccion_cliente ?? 0,
      }));
      setAllReportsClientes(responseWithDispersion);
      setFilteredReports(responseWithDispersion);
      // Obtener clientes únicos (ordenados)
      const clientes = Array.from(new Set(responseWithDispersion.map(r => r.cliente || '---'))).sort();
      setClientesUnicos(clientes);
    } catch (error) {
      console.error('Error al obtener reportes de clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado por fechas y cliente
  const handleBuscar = () => {
    setSearching(true); // Activa loading
    setTimeout(() => { // Simula tiempo de carga (ajusta ms si quieres)
      let filtrados = allReportsClientes;

      if (clienteFiltro) {
        filtrados = filtrados.filter(rep => (rep.cliente || '---') === clienteFiltro);
      }
      if (fechaInicio) {
        const inicio = new Date(fechaInicio).getTime();
        filtrados = filtrados.filter(rep => new Date(rep.DateTime_realizado).getTime() >= inicio);
      }
      if (fechaFin) {
        const fin = new Date(fechaFin).getTime();
        filtrados = filtrados.filter(rep => new Date(rep.DateTime_realizado).getTime() <= fin);
      }
      setFilteredReports(filtrados);
      setSearching(false); // Desactiva loading
    }, 350); // Delay artificial para UX. Puedes bajarlo si gustas
  };

  const handleDescargarPDF = async (reporte: ClienteResponsePerformance) => {
    const contenido = `
Cliente: ${reporte.cliente}
Número de llamadas: ${reporte.numero_llamadas}
Score promedio: ${reporte.performance_score_promedio}
Satisfacción promedio: ${reporte.satisfaccion_cliente_promedio}
Sentimiento: ${reporte.sentimiento_global}
Fecha búsqueda: ${reporte.fecha_inicio_busqueda} a ${reporte.fecha_fin_busqueda}
Fecha generado: ${reporte.DateTime_realizado}
    `;
    const blob = new Blob([contenido], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_${reporte.cliente || 'cliente'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);

    // LOG al descargar PDF
    const user_id = localStorage.getItem("id");
    const user_email = localStorage.getItem("email");
    if (user_id && user_email) {
      await apiService.postSupervisorLog({
        user_id,
        user_email,
        action: `Descargó reporte PDF de área "${reporte.cliente}"`
      });
    }
  };

  const handleRegresar = async () => {
    const user_id = localStorage.getItem("id");
    const user_email = localStorage.getItem("email");
    if (user_id && user_email) {
      await apiService.postSupervisorLog({
        user_id,
        user_email,
        action: "Regresó desde historial de reportes por área"
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
          Historial Reportes Generados por Área
        </h1>
        <div className="w-36" />
      </div>

      {/* Filtro */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente:</label>
          <select
            value={clienteFiltro}
            onChange={e => setClienteFiltro(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 w-full shadow-sm"
          >
            <option value="">Todos</option>
            {clientesUnicos.map((cli) => (
              <option key={cli} value={cli}>{cli}</option>
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
                  'Cliente',
                  'Llamadas',
                  'Score Prom.',
                  'Satisfacción',
                  'Sentimiento',
                  'Desde',
                  'Hasta',
                  'Generado',
                  'PDF',
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
              {filteredReports.map((reporte) => (
                <tr
                  key={reporte._id}
                  className="hover:bg-blue-50 transition-all text-center border-b border-gray-200"
                >
                  <td className="px-4 py-2">{reporte.cliente || '---'}</td>
                  <td className="px-4 py-2">{reporte.numero_llamadas}</td>
                  <td className="px-4 py-2">{reporte.performance_score_promedio?.toFixed(2)}</td>
                  <td className="px-4 py-2">{reporte.satisfaccion_cliente_promedio?.toFixed(2)}</td>
                  <td className="px-4 py-2">{reporte.sentimiento_global || '---'}</td>
                  <td className="px-4 py-2">{new Date(reporte.fecha_inicio_busqueda).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{new Date(reporte.fecha_fin_busqueda).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{new Date(reporte.DateTime_realizado).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDescargarPDF(reporte)}
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

export default HistorialClientePerformance;
