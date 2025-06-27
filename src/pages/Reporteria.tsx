import React, { useState } from 'react';
import { CallAnalysis } from '../types/AudiosMetadata';
import { CallService } from '../services/AudioMetadataService';
import { useNavigate } from 'react-router-dom';

const formatDateToDMY = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  };
  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const segundos = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${segundos}`;
  };
  const calcularDuracion = (inicio: string, fin: string): string => {
    const start = new Date(inicio);
    const end = new Date(fin);
    const diffMs = end.getTime() - start.getTime();
  
    if (diffMs < 0) return '00:00:00'; // Por si acaso
  
    const diffSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSec / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((diffSec % 3600) / 60).toString().padStart(2, '0');
    const seconds = (diffSec % 60).toString().padStart(2, '0');
  
    return `${hours}:${minutes}:${seconds}`;
  };
const CallSearchTable: React.FC = () => {
  const [calls, setCalls] = useState<CallAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [cliente, setCliente] = useState('');
  const [nombreArea, setNombreArea] = useState('');
  const [idEmpleado, setIdEmpleado] = useState('');
  const [filtroActivo, setFiltroActivo] = useState(false);

  const buscarLlamadas = async () => {
    setLoading(true);
    try {
        const fi = fechaInicio ? formatDateToDMY(fechaInicio) : '';
        const ff = fechaFin ? formatDateToDMY(fechaFin) : '';
        const data = await CallService.getAllCalls(
        fi,
        ff,
        cliente,
        nombreArea,
        idEmpleado
      );
      setCalls(data);
      setFiltroActivo(true);

    } catch (error) {
      console.error('Error al buscar llamadas:', error);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="flex flex-col h-[calc(100vh-80px)] p-6 overflow-hidden">
      <h1 className="text-2xl font-bold mb-4">Búsqueda de Llamadas</h1>

      {/* Filtros principales */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="font-medium">Fecha Inicio</label><br />
            <input placeholder="fecha Inicio"  type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="border rounded p-1" />
          </div>
          <div>
            <label className="font-medium">Fecha Fin</label><br />
            <input placeholder="fecha Fin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="border rounded p-1" />
          </div>
          <button onClick={buscarLlamadas} className="bg-blue-600 text-white px-4 py-1 rounded h-fit">
            Buscar
          </button>
          {filtroActivo && (
            <button onClick={() => setMostrarFiltros(!mostrarFiltros)} className="bg-gray-300 px-4 py-1 rounded h-fit">
              {mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros adicionales'}
            </button>
          )}
        </div>

        {/* Filtros adicionales */}
        {mostrarFiltros && (
          <div className="mt-4 flex flex-wrap gap-4">
            <div>
              <label className="font-medium">Cliente:</label><br />
              <input placeholder='Cliente' type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} className="border rounded p-1" />
            </div>
            <div>
              <label className="font-medium">Área:</label><br />
              <input  placeholder='Área' type="text" value={nombreArea} onChange={(e) => setNombreArea(e.target.value)} className="border rounded p-1" />
            </div>
            <div>
              <label className="font-medium">ID Empleado:</label><br />
              <input  placeholder='ID Empleado' type="text" value={idEmpleado} onChange={(e) => setIdEmpleado(e.target.value)} className="border rounded p-1" />
            </div>
          </div>
        )}
      </div>

      {/* Tabla de resultados */}
      <div className="flex-1 overflow-auto border rounded bg-white shadow">
        {loading ? (
          <div className="p-4">Cargando llamadas...</div>
        ) : (
          <table className="min-w-[1200px] w-full table-auto text-sm">
            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr>
                <th className="px-4 py-2 border">Call ID</th>
                <th className="px-4 py-2 border">Hora Inicio</th>
                <th className="px-4 py-2 border">Hora Fin</th>
                <th className="px-4 py-2 border">Duración</th>
                <th className="px-4 py-2 border">N° Destino</th>
                <th className="px-4 py-2 border">Agencia</th>
                <th className="px-4 py-2 border">Empleado</th>
                <th className="px-4 py-2 border">Área</th>
                <th className="px-4 py-2 border">Complejidad</th>
                <th className="px-4 py-2 border">Escalado</th>
                <th className="px-4 py-2 border">Sent. Inicial</th>
                <th className="px-4 py-2 border">Sent. Final</th>
                <th className="px-4 py-2 border">Tópicos</th>
                <th className="px-4 py-2 border">Resolución</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => (
                <tr
                key={call.CallId}
                className="text-center hover:bg-gray-100 cursor-pointer"
                onClick={() => navigate(`/reporteria/${call.CallId}`)}
              >                  
              <td className="px-2 py-1 border">{call.CallId}</td>
                  <td className="px-2 py-1 border">{formatDateTime(call.FechaHoraInicio)}</td>
                  <td className="px-2 py-1 border">{formatDateTime(call.FechaHoraFin)}</td>
                  <td className="px-2 py-1 border">{calcularDuracion(call.FechaHoraInicio, call.FechaHoraFin)}</td>
                  <td className="px-2 py-1 border">{call.ANI}</td>
                  <td className="px-2 py-1 border">{call.Cliente}</td>
                  <td className="px-2 py-1 border">{call.NombreEmpleado}</td>
                  <td className="px-2 py-1 border">{call.NombreArea}</td>
                  <td className="px-2 py-1 border">{call.ANALISIS_LLM.complejidad_caso}</td>
                  <td className="px-2 py-1 border">{call.ANALISIS_LLM.escalado}</td>
                  <td className="px-2 py-1 border">{call.ANALISIS_LLM.sentimiento_inicio}</td>
                  <td className="px-2 py-1 border">{call.ANALISIS_LLM.sentimiento_fin}</td>
                  <td className="px-2 py-1 border text-left">
                    <ul className="list-disc list-inside">
                      {call.ANALISIS_LLM.topicos_principales.map((topico, i) => (
                        <li key={i}>{topico}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-2 py-1 border">{call.ANALISIS_LLM.caso_resuelto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CallSearchTable;
