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
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const calcularDuracion = (inicio: string, fin: string): string => {
  const start = new Date(inicio);
  const end = new Date(fin);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return '00:00:00';
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
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [cliente, setCliente] = useState('');
  const [nombreArea, setNombreArea] = useState('');
  const [idEmpleado, setIdEmpleado] = useState('');
  const [NombreEmpleado,setnombreEmpleado] = useState('')
  const [filtroActivo, setFiltroActivo] = useState(false);
  const [ArrayIds,setArrayIds] = useState<string[]>([])
  const [ArrayAgencias,setArrayAgencias] = useState<string[]>([])
  const [ArrayArea,setArrayArea] = useState<string[]>([])
  const [ArrayEmpleados,setArrayEmpleados] = useState<string[]>([])

  const buscarLlamadas = async () => {
    setLoading(true);
    try {
      const fi = fechaInicio ? formatDateToDMY(fechaInicio) : '';
      const ff = fechaFin ? formatDateToDMY(fechaFin) : '';
      const data = await CallService.getAllCalls(fi, ff, cliente, nombreArea, idEmpleado,NombreEmpleado);
      setCalls(data);
          const idsUnicos = [...new Set(data.map((item) => item.IdEmpleado))];
    const agenciasUnicas = [...new Set(data.map((item) => item.Cliente))];
    const areasUnicas = [...new Set(data.map((item) => item.NombreArea))];
    const empleadosUnicos = [...new Set(data.map((item) => item.NombreEmpleado))];

    setArrayIds(idsUnicos);
    setArrayAgencias(agenciasUnicas);
    setArrayArea(areasUnicas);
    setArrayEmpleados(empleadosUnicos);
    console.log(agenciasUnicas)
    console.log(empleadosUnicos)
      setFiltroActivo(true);
    } catch (error) {
      console.error('Error al buscar llamadas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen p-4 lg:p-6 overflow-hidden bg-white">
      <div className="bg-white p-4 rounded-xl shadow-md mb-4">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-700 mb-4">Búsqueda de Llamadas</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 text-xs gap-4 items-end">
          <div>
            <label className="font-medium text-sm">Fecha Inicio</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full border border-gray-300 rounded p-2" />
          </div>
          <div>
            <label className="font-medium text-sm">Fecha Fin</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full border border-gray-300 rounded p-2" />
          </div>
          <button onClick={buscarLlamadas} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm">Buscar</button>
          {filtroActivo && (
            <button onClick={() => setMostrarFiltros(!mostrarFiltros)} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition">
              {mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros adicionales'}
            </button>
          )}
        </div>
{mostrarFiltros && (
  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <div>
      <label className="font-medium text-sm">Agencia</label>
      <select
        value={cliente}
        onChange={(e) => setCliente(e.target.value)}
        className="w-full border border-gray-300 rounded p-2"
      >
        <option value="">Todas</option>
        {ArrayAgencias.map((agencia, idx) => (
          <option key={idx} value={agencia}>{agencia}</option>
        ))}
      </select>
    </div>

    <div>
      <label className="font-medium text-sm">Área</label>
      <select
        value={nombreArea}
        onChange={(e) => setNombreArea(e.target.value)}
        className="w-full border border-gray-300 rounded p-2"
      >
        <option value="">Todas</option>
        {ArrayArea.map((area, idx) => (
          <option key={idx} value={area}>{area}</option>
        ))}
      </select>
    </div>

    <div>
      <label className="font-medium text-sm">ID Empleado</label>
      <select
        value={idEmpleado}
        onChange={(e) => setIdEmpleado(e.target.value)}
        className="w-full border border-gray-300 rounded p-2"
      >
        <option value="">Todos</option>
        {ArrayIds.map((id, idx) => (
          <option key={idx} value={id}>{id}</option>
        ))}
      </select>
    </div>

    <div>
      <label className="font-medium text-sm">Nombre Empleado</label>
      <select
        value={NombreEmpleado}
        onChange={(e) => setnombreEmpleado(e.target.value)}
        className="w-full border border-gray-300 rounded p-2"
      >
        <option value="">Todos</option>
        {ArrayEmpleados.map((empleado, idx) => (
          <option key={idx} value={empleado}>{empleado}</option>
        ))}
      </select>
    </div>
  </div>
)}

      </div>

        {loading && (
        <div className="bg-white  rounded-xl shadow-md flex-1 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-blue-600 font-medium text-center">Cargando datos...</p>
            </div>
          </div>
          </div>
        )}
        { !loading && calls.length > 0 && (
      <div className="overflow-auto h-min-[500px]">
      <table className=" w-full text-sm lg:text-xs text-center whitespace-nowrap">
        <thead className="sticky top-0 bg-gray-100 z-10 text-left">
          <tr>
            <th className="p-2 text-gray-600 font-medium text-center">Call ID</th>
            <th className="p-2 text-gray-600 font-medium text-center">Hora Inicio</th>
            <th className="p-2 text-gray-600 font-medium text-center">Hora Fin</th>
            <th className="p-2 text-gray-600 font-medium text-center">Duración</th>
            <th className="p-2 text-gray-600 font-medium text-center">N° Destino</th>
            <th className="p-2 text-gray-600 font-medium text-center">Agencia</th>
            <th className="p-2 text-gray-600 font-medium text-center">ID Empleado</th>
            <th className="p-2 text-gray-600 font-medium text-center">Empleado</th>
            <th className="p-2 text-gray-600 font-medium text-center">Área</th>
            <th className="p-2 text-gray-600 font-medium text-center">Complejidad</th>
            <th className="p-2 text-gray-600 font-medium text-center">Escalado</th>
            <th className="p-2 text-gray-600 font-medium text-center">Sent. Inicial</th>
            <th className="p-2 text-gray-600 font-medium text-center">Sent. Final</th>
            <th className="p-2 text-gray-600 font-medium text-center">Tópicos</th>
            <th className="p-2 text-gray-600 font-medium text-center">Resolución</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr
              key={call.CallId}
              className="border-b border-gray-200 hover:bg-gray-50 transition"
              onClick={() => navigate(`/reporteria/${call.CallId}`)}
            >
              <td className="p-1">{call.CallId}</td>
              <td className="p-1">{formatDateTime(call.FechaHoraInicio)}</td>
              <td className="p-1">{formatDateTime(call.FechaHoraFin)}</td>
              <td className="p-1">{calcularDuracion(call.FechaHoraInicio, call.FechaHoraFin)}</td>
              <td className="p-1">{call.ANI}</td>
              <td className="p-1">{call.Cliente}</td>
              <td className="p-1">{call.IdEmpleado}</td>
              <td className="p-1">{call.NombreEmpleado}</td>
              <td className="p-1">{call.NombreArea}</td>
              <td className="p-1">{call.ANALISIS_LLM.complejidad_caso}</td>
              <td className="p-1">{call.ANALISIS_LLM.escalado}</td>
              <td className="p-1">{call.ANALISIS_LLM.sentimiento_inicio}</td>
              <td className="p-1">{call.ANALISIS_LLM.sentimiento_fin}</td>
              <td className="p-1 text-left">
                <ul className="list-disc list-inside">
                  {call.ANALISIS_LLM.topicos_principales.map((topico, i) => (
                    <li key={i}>{topico}</li>
                  ))}
                </ul>
              </td>
              <td className="p-1 text-left">{call.ANALISIS_LLM.caso_resuelto}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
)}

        {!loading && calls.length === 0 && (
          <div className="bg-white  rounded-xl shadow-md flex-1 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <h1 className="text-center text-lg text-gray-500">No hay datos para mostrar</h1>
          </div>
          </div>

        )}
    </div>
  );
};

export default CallSearchTable;
