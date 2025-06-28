import { useEffect, useState } from 'react';
import { ClientePerformanceService } from '../services/ClientePerformanceService';
import { ClienteResponsePerformance } from '../types/ClientesPerformance';
import { useNavigate } from 'react-router-dom';

const HistorialClientePerformance = () => {
  const [allReportsClientes, setAllReportsClientes] = useState<ClienteResponsePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const navigate = useNavigate(); // 👈 hook de navegación

  const fetchReports = async () => {
    try {
      const response = await ClientePerformanceService.getTodosLosReportesClientes();
      setAllReportsClientes(
        response.map((item) => ({
          ...item,
          dispersion_performance_score: item.dispersión_performance_score || 0,
          dispersion_satisfaccion_cliente: item.dispersión_satisfaccion_cliente || 0,
        }))
      );
    } catch (error) {
      console.error('Error al obtener reportes de clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleBuscar = () => {
    // Si quieres filtrar por fechas en el frontend, agrégalo aquí
    fetchReports();
  };

  const handleDescargarPDF = (reporte: ClienteResponsePerformance) => {
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
  };

  return (
<div className="h-screen flex flex-col bg-gray-100 p-6">
  {/* Header */}
  <div className="flex items-center justify-between mb-6">
    <button
      onClick={() => navigate(-1)}
      className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded shadow"
    >
      ← Regresar
    </button>
    <h1 className="text-2xl font-bold text-gray-800 text-center flex-1 uppercase">
      Historial Reportes Generados por Área
    </h1>
    <div className="w-32" />
  </div>

  {/* Filtro */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Desde:</label>
      <input 
        type="date"
        value={fechaInicio}
        onChange={(e) => setFechaInicio(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 w-full shadow-sm"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Hasta:</label>
      <input
        type="date"
        value={fechaFin}
        onChange={(e) => setFechaFin(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 w-full shadow-sm"
      />
    </div>
    <div className="flex items-end">
      <button
        onClick={handleBuscar}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
      >
        Buscar
      </button>
    </div>
  </div>

  {/* Tabla */}
  <div className="flex-1 overflow-auto border border-gray-200 rounded-lg shadow bg-white">
    {loading ? (
      <div className="p-6 text-center text-gray-500">Cargando...</div>
    ) : allReportsClientes.length === 0 ? (
      <div className="p-6 text-center text-gray-500">No hay reportes disponibles.</div>
    ) : (
      <table className="min-w-full text-sm text-gray-700">
        <thead className="bg-blue-100 sticky top-0">
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
              <th key={th} className="px-4 py-3 border text-center font-semibold">
                {th}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allReportsClientes.map((reporte) => (
            <tr
              key={reporte._id}
              className="hover:bg-gray-50 transition-all border-b text-center"
            >
              <td className="px-4 py-2">{reporte.cliente || '---'}</td>
              <td className="px-4 py-2">{reporte.numero_llamadas}</td>
              <td className="px-4 py-2">{reporte.performance_score_promedio.toFixed(2)}</td>
              <td className="px-4 py-2">{reporte.satisfaccion_cliente_promedio.toFixed(2)}</td>
              <td className="px-4 py-2">{reporte.sentimiento_global || '---'}</td>
              <td className="px-4 py-2">{new Date(reporte.fecha_inicio_busqueda).toLocaleDateString()}</td>
              <td className="px-4 py-2">{new Date(reporte.fecha_fin_busqueda).toLocaleDateString()}</td>
              <td className="px-4 py-2">{new Date(reporte.DateTime_realizado).toLocaleString()}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => handleDescargarPDF(reporte)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded shadow"
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
