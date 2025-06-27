import { useParams } from 'react-router-dom';
import { JSX, useEffect, useState } from 'react';
import { CallAnalysis } from '../types/AudiosMetadata';
import { CallService } from '../services/AudioMetadataService';
import { Phone, User, Mic, AlertCircle, MessageCircle } from 'lucide-react';

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const calcularDuracion = (inicio: string, fin: string): string => {
  const start = new Date(inicio).getTime();
  const end = new Date(fin).getTime();
  const diffMs = end - start;

  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

interface ListSectionProps {
  title: string;
  icon?: JSX.Element;
  items?: string[] | null;
}

const ListSection = ({ title, icon, items }: ListSectionProps) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-600">
        {icon}
        {title}
      </h3>
      <ul className="list-disc list-inside text-xs text-gray-800 space-y-1">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

const ReporteriaID = () => {
  const { id } = useParams<{ id: string }>();
  const [call, setCall] = useState<CallAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const data = await CallService.getCallsById(id);
        setCall(data);
      } catch (error) {
        console.error('Error al obtener llamada:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!call) return <div className="p-6">No se encontró información.</div>;

  return (
<div className="w-full min-h-screen bg-gray-100 p-4">
  <h1 className="text-xl font-bold text-gray-800 mb-4">
    Detalle de Llamada #{call.CallId}
  </h1>

  {/* Resumen y Observaciones */}
  <div className="bg-white rounded-xl shadow p-4 mb-4 text-sm w-full">
    <h2 className="text-blue-700 font-semibold text-base mb-2">
      📝 Resumen y Observaciones
    </h2>
    <p className="mb-2"><strong>Resumen:</strong> {call.ANALISIS_LLM?.resumen}</p>
    <p><strong>Observaciones:</strong> {call.ANALISIS_LLM?.observaciones_llm}</p>
  </div>

{/* Transcripción */}
<div className="bg-white rounded-xl shadow p-3 mb-4 text-sm w-full">
  <h2 className="text-blue-700 font-medium text-sm mb-1">
    🎙️ Transcripción de la llamada
  </h2>
  <div className="bg-gray-50 border rounded p-2 overflow-y-auto max-h-[25vh] text-xs whitespace-pre-wrap leading-snug">
    {call.TRANSCRIPCION}
  </div>
</div>

  {/* Grid de 4 columnas para los bloques restantes */}
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm w-full">
    {/* Información General */}
    <div className="bg-white rounded shadow p-3">
      <h3 className="font-semibold text-gray-700 text-sm mb-1">🧾 General</h3>
      <p><strong>Cliente:</strong> {call.Cliente}</p>
      <p><strong>Dirección:</strong> {call.CallDirection}</p>
      <p><strong>Inicio:</strong> {new Date(call.FechaHoraInicio).toLocaleString()}</p>
      <p><strong>Fin:</strong> {new Date(call.FechaHoraFin).toLocaleString()}</p>
    </div>

    {/* Empleado */}
    <div className="bg-white rounded shadow p-3">
      <h3 className="font-semibold text-gray-700 text-sm mb-1">👤 Empleado</h3>
      <p><strong>Nombre:</strong> {call.NombreEmpleado}</p>
      <p><strong>Área:</strong> {call.NombreArea}</p>
      <p><strong>Id:</strong> {call.IdEmpleado}</p>
    </div>

    {/* Análisis */}
    <div className="bg-white rounded shadow p-3">
      <h3 className="font-semibold text-gray-700 text-sm mb-1">📊 Análisis</h3>
      <p><strong>Inicio:</strong> {call.ANALISIS_LLM?.sentimiento_inicio}</p>
      <p><strong>Fin:</strong> {call.ANALISIS_LLM?.sentimiento_fin}</p>
      <p><strong>Resuelto:</strong> {call.ANALISIS_LLM?.caso_resuelto}</p>
    </div>

    {/* Otros */}
    <div className="bg-white rounded shadow p-3">
      <h3 className="font-semibold text-gray-700 text-sm mb-1">🧠 Otros</h3>
      <p><strong>Escalado:</strong> {call.ANALISIS_LLM?.escalado}</p>
      <p><strong>Complejidad:</strong> {call.ANALISIS_LLM?.complejidad_caso}</p>
      <p><strong>Score:</strong> {call.ANALISIS_LLM?.performance_score}</p>
    </div>

    {/* Listas agrupadas */}
    <div className="bg-white rounded shadow p-3 col-span-full sm:col-span-2 md:col-span-1">
      <h3 className="font-semibold text-gray-700 text-sm mb-1">✅ Fortalezas</h3>
      <ul className="list-disc ml-4">
        {call.ANALISIS_LLM?.fortalezas?.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>

    <div className="bg-white rounded shadow p-3 col-span-full sm:col-span-2 md:col-span-1">
      <h3 className="font-semibold text-gray-700 text-sm mb-1">🛠️ Oportunidades</h3>
      <ul className="list-disc ml-4">
        {call.ANALISIS_LLM?.oportunidades_mejora?.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>

    <div className="bg-white rounded shadow p-3 col-span-full sm:col-span-2 md:col-span-1">
      <h3 className="font-semibold text-gray-700 text-sm mb-1">🚨 Alertas</h3>
      <ul className="list-disc ml-4">
        {call.ANALISIS_LLM?.alerta_calidad?.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>

    <div className="bg-white rounded shadow p-3 col-span-full sm:col-span-2 md:col-span-1">
      <h3 className="font-semibold text-gray-700 text-sm mb-1">📌 Acciones</h3>
      <ul className="list-disc ml-4">
        {call.ANALISIS_LLM?.acciones_acordadas?.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  </div>
</div>
  );
};

export default ReporteriaID;
