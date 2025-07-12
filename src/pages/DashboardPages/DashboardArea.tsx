import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
} from 'chart.js';
import apiService from '../../services/DataService';
import { AudioWithAnalysis } from '../../types/AnalysisAudio';

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

const DEFAULT_START_DATE = "2025-05-01";
const DEFAULT_END_DATE = "2025-05-31";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
function apiDate(str: string) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}-${m}-${y}`;
}

function resumenPorCliente(audios: AudioWithAnalysis[]) {
  const clientes: Record<string, AudioWithAnalysis[]> = {};
  audios.forEach(a => {
    const cliente = a.Cliente || 'Sin Cliente';
    if (!clientes[cliente]) clientes[cliente] = [];
    clientes[cliente].push(a);
  });

  return Object.entries(clientes).map(([cliente, registros]) => {
    const totalLlamadas = registros.length;
    const satisfaccionVals = registros
      .map(r => r.ANALISIS_LLM?.satisfaccion_cliente)
      .filter(v => typeof v === 'number');
    // Multiplica por 20 para ir de 0-5 a 0-100%
    const satisfaccionPromedio = satisfaccionVals.length
      ? Math.round((satisfaccionVals.reduce((a, b) => a + b, 0) / satisfaccionVals.length) * 20)
      : 0;
    const totalSegundos = registros.reduce((acc, r) => {
      const inicio = new Date(r.FechaHoraInicio);
      const fin = new Date(r.FechaHoraFin);
      return acc + (fin.getTime() - inicio.getTime()) / 1000;
    }, 0);
    const tmo = totalLlamadas ? +(totalSegundos / 60 / totalLlamadas).toFixed(2) : 0;
    const agentesUnicos = new Set(registros.map(r => r.IdEmpleado)).size;
    return {
      cliente,
      totalLlamadas,
      satisfaccionPromedio,
      tmo,
      agentes: agentesUnicos,
      registros
    };
  });
}

const coloresClientes = [
  "#3b82f6", "#ef4444", "#eab308", "#10b981", "#a21caf",
  "#f59e42", "#6366f1", "#34d399", "#f43f5e", "#0ea5e9"
];

const DashboardCliente: React.FC = () => {
  const [startDate, setStartDate] = useState<string>(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState<string>(DEFAULT_END_DATE);
  const [audios, setAudios] = useState<AudioWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const FilterBar = (
    <div className="w-full flex flex-col md:flex-row md:items-end md:justify-between mb-7 mt-4">
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl shadow border border-[#e7eaf7] w-full sm:w-auto">
        <div className="flex flex-row items-center w-full sm:w-auto">
          <label className="text-[#415088] font-semibold mr-2 text-sm">Vista:</label>
          <select
            value="cliente"
            onChange={e => {
              if (e.target.value === "general") navigate("/dashboard");
              if (e.target.value === "area") navigate("/dashboard/area");
              if (e.target.value === "agente") navigate("/dashboard/agente");
            }}
            className="border border-blue-400 rounded px-2 py-1 bg-white text-[#294097] focus:outline-none"
          >
            <option value="general">General</option>
            <option value="area">Área</option>
            <option value="agente">Agente</option>
          </select>
        </div>
        <div className="flex flex-row items-center w-full sm:w-auto">
          <label className="text-[#415088] font-semibold ml-4 mr-1 text-sm">Desde:</label>
          <input
            type="date"
            className="border border-blue-400 rounded px-2 py-1 bg-white text-[#294097] focus:outline-none"
            value={startDate}
            max={endDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <label className="text-[#415088] font-semibold mx-1 text-sm">Hasta:</label>
          <input
            type="date"
            className="border border-blue-400 rounded px-2 py-1 bg-white text-[#294097] focus:outline-none"
            value={endDate}
            min={startDate}
            max={formatDate(new Date())}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    async function fetchAudios() {
      try {
        const sDate = apiDate(startDate);
        const eDate = apiDate(endDate);
        const audiosRes = await apiService.buscarAudios({ FechaHoraInicio: sDate, fechafin: eDate });
        setAudios(Array.isArray(audiosRes) ? audiosRes : []);
      } catch (err: any) {
        setError("No se pudieron cargar los datos de llamadas.");
      }
      setLoading(false);
    }
    fetchAudios();
  }, [startDate, endDate]);

  const clientesResumen = resumenPorCliente(audios);

  // Pie Chart - Distribución de llamadas por cliente
  const pieDataClientes = {
    labels: clientesResumen.map(c => c.cliente),
    datasets: [{
      data: clientesResumen.map(c => c.totalLlamadas),
      backgroundColor: coloresClientes,
    }]
  };

  // BAR HORIZONTAL - Satisfacción promedio por cliente
  const barDataSatisfaccionPorCliente = {
    labels: clientesResumen.map(c => c.cliente),
    datasets: [{
      label: "Satisfacción promedio (%)",
      data: clientesResumen.map(c => c.satisfaccionPromedio),
      backgroundColor: coloresClientes,
      borderRadius: 8,
      barThickness: 28,
      borderWidth: 1,
    }]
  };

  // Línea - Evolución diaria de llamadas por cliente (arrancando desde 0)
  let fechasUnicas = Array.from(new Set(audios.map(a => a.FechaHoraInicio.slice(0, 10)))).sort();
  if (fechasUnicas.length > 0) {
    const fechaInicial = new Date(fechasUnicas[0]);
    fechaInicial.setDate(fechaInicial.getDate() - 1);
    const fechaCero = fechaInicial.toISOString().slice(0, 10);
    fechasUnicas = [fechaCero, ...fechasUnicas];
  }

  const lineDataClientes = {
    labels: fechasUnicas,
    datasets: clientesResumen.map((cliente, idx) => {
      const llamadasPorDia = fechasUnicas.map((fecha, i) => {
        if (i === 0) return 0; // Primer punto siempre en cero
        return audios.filter(a =>
          (a.Cliente || 'Sin Cliente') === cliente.cliente && a.FechaHoraInicio.startsWith(fecha)
        ).length;
      });
      return {
        label: cliente.cliente,
        data: llamadasPorDia,
        borderColor: coloresClientes[idx % coloresClientes.length],
        backgroundColor: coloresClientes[idx % coloresClientes.length] + "22",
        tension: 0.55,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 4,
      }
    })
  };

  if (loading) return (
    <div className="min-h-screen w-full bg-[#f8f9ff] font-inter px-2 sm:px-4 md:px-8 lg:px-12 xl:px-20 2xl:px-32 py-3 flex flex-col min-h-screen">
      {FilterBar}
      <div className="flex-1 flex items-center justify-center mt-8">
        <div className="p-16 text-center text-lg font-medium">Cargando datos de clientes...</div>
      </div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen w-full bg-[#f8f9ff] font-inter px-2 sm:px-4 md:px-8 lg:px-12 xl:px-20 2xl:px-32 py-3 flex flex-col min-h-screen">
      {FilterBar}
      <div className="flex-1 flex items-center justify-center mt-8">
        <div className="p-8 text-red-700 text-lg font-semibold">{error}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#f8f9ff] font-inter">
      <div className="
        w-full
        mx-auto
        max-w-screen-2xl
        px-2
        sm:px-4
        md:px-8
        lg:px-12
        xl:px-20
        2xl:px-32
        py-3
        flex flex-col
        min-h-screen
      ">
        {FilterBar}

        <header className="text-left mb-8 pb-4">
          <h1 className="text-[#2c3e8f] text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6 tracking-tight">
            Analítica por Cliente
          </h1>
        </header>

        {/* --- Gráficos --- */}
        <div className="flex flex-col xl:flex-row gap-7 mb-10 w-full">
          <div className="bg-white rounded-xl shadow-md p-6 flex-1 flex flex-col items-center min-w-[260px]">
            <h3 className="text-[#3341a5] font-bold text-base sm:text-lg mb-3 text-center">Distribución de llamadas por cliente</h3>
            <div className="w-full h-64 max-w-[420px]">
              <Pie data={pieDataClientes} options={{
                plugins: {
                  legend: { display: true, position: "right" }
                },
                maintainAspectRatio: false,
                responsive: true
              }} />
            </div>
          </div>
          {/* Bar horizontal de satisfacción promedio */}
          <div className="bg-white rounded-xl shadow-md p-6 flex-[2] flex flex-col items-center min-w-[260px]">
            <h3 className="text-[#3341a5] font-bold text-base sm:text-lg mb-3 text-center">
              Satisfacción promedio por cliente
            </h3>
            <div className="w-full h-72">
              <Bar data={barDataSatisfaccionPorCliente} options={{
                indexAxis: 'y' as const,
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: { display: false }
                },
                scales: {
                  x: { min: 0, max: 100, ticks: { stepSize: 10 } },
                  y: { beginAtZero: true }
                },
                maintainAspectRatio: false
              }} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 mb-10">
          <h3 className="text-[#3341a5] font-bold text-base sm:text-lg mb-5 text-center">Evolución diaria de llamadas por cliente</h3>
          <div style={{ minHeight: 320, maxHeight: 500 }}>
            <Line data={lineDataClientes} options={{
              responsive: true,
              plugins: {
                legend: { display: true, position: "top", labels: { boxWidth: 22, font: { size: 15 } } }
              },
              elements: {
                line: {
                  borderWidth: 4,
                  tension: 0.55
                },
                point: {
                  radius: 3,
                  hoverRadius: 6,
                  borderWidth: 2,
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 2,
                    color: "#3b466b",
                    font: { size: 14 }
                  },
                  grid: {
                    color: "#e5e7eb"
                  }
                },
                x: {
                  grid: { display: false },
                  ticks: {
                    color: "#3b466b",
                    font: { size: 14 }
                  }
                }
              },
              maintainAspectRatio: false
            }} />
          </div>
        </div>
        {/* --- Tabla resumen --- */}
        <div className="bg-white rounded-xl shadow-md p-6 w-full min-w-0 mb-0">
          <h2 className="text-[#2c3e8f] text-lg sm:text-xl font-bold mb-5">Resumen de desempeño por cliente</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 bg-white mt-4 min-w-[480px]">
              <thead>
                <tr>
                  <th className="bg-[#f8f9ff] text-[#2c3e8f] font-semibold text-sm sm:text-base px-4 py-3 text-left">Cliente</th>
                  <th className="bg-[#f8f9ff] text-[#2c3e8f] font-semibold text-sm sm:text-base px-4 py-3 text-left">Llamadas</th>
                  <th className="bg-[#f8f9ff] text-[#2c3e8f] font-semibold text-sm sm:text-base px-4 py-3 text-left">Satisfacción Promedio</th>
                  <th className="bg-[#f8f9ff] text-[#2c3e8f] font-semibold text-sm sm:text-base px-4 py-3 text-left">TMO</th>
                  <th className="bg-[#f8f9ff] text-[#2c3e8f] font-semibold text-sm sm:text-base px-4 py-3 text-left">Agentes</th>
                </tr>
              </thead>
              <tbody>
                {clientesResumen.map((cliente) => (
                  <tr key={cliente.cliente} className="bg-white hover:bg-[#eaf1fb] cursor-pointer transition">
                    <td className="px-4 py-3 font-semibold">{cliente.cliente}</td>
                    <td className="px-4 py-3">{cliente.totalLlamadas}</td>
                    <td className="px-4 py-3">{cliente.satisfaccionPromedio}%</td>
                    <td className="px-4 py-3">{cliente.tmo} min</td>
                    <td className="px-4 py-3">{cliente.agentes}</td>
                  </tr>
                ))}
                {clientesResumen.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center text-gray-500">No hay registros para este rango.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCliente;
