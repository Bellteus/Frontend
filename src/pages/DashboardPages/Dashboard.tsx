import React, { useEffect, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
} from 'chart.js';
import { useNavigate, useLocation } from 'react-router-dom';

import { AudioWithAnalysis } from '../../types/AnalysisAudio';
import { ClienteReporte } from '../../types/ClientReport';
import { EmpleadoReporte } from '../../types/AgentReport';
import apiService from '../../services/DataService';

ChartJS.register(
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

const coloresClientes = [
  "#3f51b5", "#0ea5e9", "#9d174d", "#eab308", "#16a34a",
  "#ea580c", "#be185d", "#6366f1", "#e11d48", "#10b981"
];

function toPercent(val: number | null | undefined) {
  if (val == null || isNaN(val)) return null;
  if (val <= 5) return +(val * 20).toFixed(1);
  if (val <= 100) return +(+val).toFixed(1);
  return 0;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

const DEFAULT_START_DATE = "2025-05-01";
const DEFAULT_END_DATE = "2025-05-31";

const Dashboard: React.FC = () => {
  const [audios, setAudios] = useState<AudioWithAnalysis[]>([]);
  const [clientes, setClientes] = useState<ClienteReporte[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoReporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAllAgents, setShowAllAgents] = useState(false);
  const [showAllTMO, setShowAllTMO] = useState(false);

  const [startDate, setStartDate] = useState<string>(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState<string>(DEFAULT_END_DATE);

  // Usar router para navegación entre dashboards
  const navigate = useNavigate();
  const location = useLocation();

  // Detecta qué vista mostrar según la ruta
  const currentOption = location.pathname.includes('/agente')
    ? 'agente'
    : location.pathname.includes('/area')
    ? 'area'
    : 'general';

  // Maneja el cambio del select
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'general') {
      navigate('/dashboard');
    } else if (value === 'area') {
      navigate('/dashboard/area');
    } else if (value === 'agente') {
      navigate('/dashboard/agente');
    }
  };

  function apiDate(str: string) {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    return `${d}-${m}-${y}`;
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const sDate = apiDate(startDate);
        const eDate = apiDate(endDate);
        const [audiosRes, clientesRes, empleadosRes] = await Promise.all([
          apiService.buscarAudios({ FechaHoraInicio: sDate, fechafin: eDate }),
          apiService.getReporteriaAudios({ FechaHoraInicio: sDate, fechafin: eDate }),
          apiService.getReporteAnalisisAgente({ Agente: '', fecha_inicio: sDate, fecha_fin: eDate }),
        ]);
        setAudios(Array.isArray(audiosRes) ? audiosRes : []);
        setClientes(Array.isArray(clientesRes) ? clientesRes : []);
        setEmpleados(Array.isArray(empleadosRes) ? empleadosRes : []);
      } catch (err: any) {
        setError(err.message || 'No se pudieron cargar los datos.');
      }
      setLoading(false);
    }
    fetchData();
  }, [startDate, endDate, currentOption]);

  // ------ Dashboard Data Logic (igual que antes) ------
  const llamadasPorEmpleado: Record<string, AudioWithAnalysis[]> = {};
  audios.forEach(a => {
    if (!llamadasPorEmpleado[a.IdEmpleado]) llamadasPorEmpleado[a.IdEmpleado] = [];
    llamadasPorEmpleado[a.IdEmpleado].push(a);
  });

  const llamadasPorCliente: Record<string, AudioWithAnalysis[]> = {};
  audios.forEach(a => {
    const cliente = a.Cliente || 'Otros';
    if (!llamadasPorCliente[cliente]) llamadasPorCliente[cliente] = [];
    llamadasPorCliente[cliente].push(a);
  });

  const satisfactionVals = audios
    .map(a => toPercent(a.ANALISIS_LLM.satisfaccion_cliente))
    .filter(v => v !== null) as number[];
  const promSatisfaccion = satisfactionVals.length
    ? Math.round(satisfactionVals.reduce((a, b) => a + b, 0) / satisfactionVals.length)
    : 0;
  const promPerformance = audios.length
    ? Math.round(audios.reduce((a, b) => a + (b.ANALISIS_LLM?.performance_score || 0), 0) / audios.length)
    : 0;

  let resueltos = 0, escalados = 0, followup = 0;
  audios.forEach(a => {
    if (a.ANALISIS_LLM.caso_resuelto?.toLowerCase() === 'sí' || a.ANALISIS_LLM.caso_resuelto?.toLowerCase() === 'si' || a.ANALISIS_LLM.caso_resuelto === '1') resueltos++;
    else if (a.ANALISIS_LLM.escalado?.toLowerCase() === 'sí' || a.ANALISIS_LLM.escalado?.toLowerCase() === 'si' || a.ANALISIS_LLM.escalado === '1') escalados++;
    else if (a.ANALISIS_LLM.necesita_followup?.toLowerCase() === 'sí' || a.ANALISIS_LLM.necesita_followup?.toLowerCase() === 'si' || a.ANALISIS_LLM.necesita_followup === '1') followup++;
  });
  const totalCasos = resueltos + escalados + followup || 1;

  const fechasUnicas = Array.from(new Set(audios.map(a => a.FechaHoraInicio.slice(0, 10)))).sort();

  const datasetsClientes = Object.entries(llamadasPorCliente).map(([cliente, registros], idx) => {
    const satisfPorFecha = fechasUnicas.map(fecha => {
      const enFecha = registros.filter(a => a.FechaHoraInicio.startsWith(fecha));
      const valores = enFecha.map(a => toPercent(a.ANALISIS_LLM.satisfaccion_cliente));
      const soloValidos = valores.filter(v => v !== null) as number[];
      if (!soloValidos.length) return null;
      return +(soloValidos.reduce((a, b) => a + b, 0) / soloValidos.length).toFixed(1);
    });
    return {
      label: cliente,
      data: satisfPorFecha,
      borderColor: coloresClientes[idx % coloresClientes.length],
      backgroundColor: coloresClientes[idx % coloresClientes.length] + '22',
      borderWidth: 2.5,
      tension: 0.45,
      spanGaps: true,
      pointRadius: 5,
      pointHoverRadius: 8,
    };
  });

  const empleadosRows = Object.entries(llamadasPorEmpleado).map(([id, llamadas]) => ({
    id,
    nombre: llamadas[0]?.NombreEmpleado || 'N/A',
    satisfaccion: (() => {
      const vals = llamadas
        .map(l => toPercent(l.ANALISIS_LLM.satisfaccion_cliente))
        .filter(v => v !== null) as number[];
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    })(),
    llamadas: llamadas.length,
  }));

  function calcularTMOEmpleado(llamadas: AudioWithAnalysis[]) {
    if (!llamadas.length) return 0;
    let totalSegundos = 0;
    llamadas.forEach(a => {
      const inicio = new Date(a.FechaHoraInicio);
      const fin = new Date(a.FechaHoraFin);
      totalSegundos += (fin.getTime() - inicio.getTime()) / 1000;
    });
    const tmoMinutos = totalSegundos / 60 / llamadas.length;
    return +tmoMinutos.toFixed(2);
  }
  const tmoPorEmpleadoRows = Object.entries(llamadasPorEmpleado)
    .map(([id, llamadas]) => ({
      id,
      nombre: llamadas[0]?.NombreEmpleado || 'N/A',
      tmo: calcularTMOEmpleado(llamadas),
      llamadas: llamadas.length,
    }))
    .sort((a, b) => a.tmo - b.tmo);

  const agentesVisibles = showAllAgents ? empleadosRows : empleadosRows.slice(0, 7);
  const tmoVisibles = showAllTMO ? tmoPorEmpleadoRows : tmoPorEmpleadoRows.slice(0, 7);

  const barTMOData = {
    labels: tmoPorEmpleadoRows.map(e => e.nombre),
    datasets: [{
      label: "TMO (min)",
      data: tmoPorEmpleadoRows.map(e => e.tmo),
      backgroundColor: "#3f51b5cc",
      borderRadius: 6,
      barThickness: 25,
    }]
  };

  const llamadasPorFranja: Record<string, number> = { Mañana: 0, Tarde: 0, Noche: 0 };
  audios.forEach(a => {
    const hora = new Date(a.FechaHoraInicio).getHours();
    if (hora >= 6 && hora <= 13) llamadasPorFranja.Mañana++;
    else if (hora >= 14 && hora <= 20) llamadasPorFranja.Tarde++;
    else llamadasPorFranja.Noche++;
  });
  const labelsHorarios = ['Mañana', 'Tarde', 'Noche'];
  const dataHorarios = labelsHorarios.map(label => llamadasPorFranja[label]);
  const colorsHorarios = ['#60a5fa', '#a78bfa', '#fbbf24'];
  const donutHorariosData = {
    labels: labelsHorarios,
    datasets: [{
      data: dataHorarios,
      backgroundColor: colorsHorarios,
      borderWidth: 1,
    }]
  };

  const pieResColors = ['#34d399', '#f59e42', '#6366f1'];
  const pieResLabels = ['Resueltos', 'Escalados', 'Follow Up'];
  const pieResValues = [resueltos, escalados, followup];
  const donutResData = {
    labels: pieResLabels,
    datasets: [{
      data: pieResValues,
      backgroundColor: pieResColors,
      borderWidth: 1,
    }]
  };

  // ------- Barra de filtro (select y fechas) -------
  const FilterBar = (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 mt-6">
      <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow border border-[#e7eaf7]">
        <label className="text-[#415088] font-semibold mr-2 text-sm">Vista:</label>
        <select
          value={currentOption}
          onChange={handleSelectChange}
          className="border border-blue-400 rounded px-2 py-1 bg-white text-[#294097] focus:outline-none"
        >
          <option value="general">General</option>
          <option value="area">Área</option>
          <option value="agente">Agente</option>
        </select>
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
  );

  // --- Loading/error con filtro siempre visible ---
  if (loading) return (
    <div className="min-h-screen w-full bg-[#f8f9ff] font-inter px-2 sm:px-4 md:px-8 lg:px-12 xl:px-16 2xl:px-24 py-3 flex flex-col min-h-screen">
      {FilterBar}
      <div className="flex-1 flex items-center justify-center mt-8">
        <div className="p-16 text-center text-lg font-medium">Cargando datos...</div>
      </div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen w-full bg-[#f8f9ff] font-inter px-2 sm:px-4 md:px-8 lg:px-12 xl:px-16 2xl:px-24 py-3 flex flex-col min-h-screen">
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
        max-w-[1800px]
        px-2
        sm:px-4
        md:px-8
        lg:px-12
        xl:px-16
        2xl:px-24
        py-3
        flex flex-col
        min-h-screen
      ">
        {FilterBar}

        {/* HEADER */}
        <header className="text-left mb-10 pb-4">
        <h1 className="text-[#2c3e8f] text-[2.1rem] font-extrabold mb-6 tracking-tight text-center">
          Analítica de Llamadas
        </h1>

          <div className="
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-4
            gap-4
            md:gap-6
            xl:gap-8
            mb-2
          ">
            {/* Stat cards */}
            <div className="bg-white p-7 rounded-[14px] shadow-md border border-[#edf0fa] text-left min-w-[120px] min-h-[90px] flex flex-col justify-start transition hover:shadow-lg">
              <div className="text-[2.25rem] font-bold text-[#3f51b5] mb-2 leading-tight">{audios.length}</div>
              <div className="text-[#6c757d] text-[1.06rem] uppercase tracking-wider font-semibold leading-none">LLAMADAS TOTALES</div>
            </div>
            <div className="bg-white p-7 rounded-[14px] shadow-md border border-[#edf0fa] text-left min-w-[120px] min-h-[90px] flex flex-col justify-start transition hover:shadow-lg">
              <div className="text-[2.25rem] font-bold text-[#3f51b5] mb-2 leading-tight">{promSatisfaccion}%</div>
              <div className="text-[#6c757d] text-[1.06rem] uppercase tracking-wider font-semibold leading-none">SATISFACCIÓN PROMEDIO</div>
            </div>
            <div className="bg-white p-7 rounded-[14px] shadow-md border border-[#edf0fa] text-left min-w-[120px] min-h-[90px] flex flex-col justify-start transition hover:shadow-lg">
              <div className="text-[2.25rem] font-bold text-[#3f51b5] mb-2 leading-tight">{promPerformance}</div>
              <div className="text-[#6c757d] text-[1.06rem] uppercase tracking-wider font-semibold leading-none">PERFORMANCE PROMEDIO</div>
            </div>
            <div className="bg-white p-7 rounded-[14px] shadow-md border border-[#edf0fa] text-left min-w-[120px] min-h-[90px] flex flex-col justify-start transition hover:shadow-lg">
              <div className="text-[2.25rem] font-bold text-[#3f51b5] mb-2 leading-tight">{clientes.length}</div>
              <div className="text-[#6c757d] text-[1.06rem] uppercase tracking-wider font-semibold leading-none">CLIENTES EN REPORTE</div>
            </div>
          </div>
        </header>
        {/* GRID */}
        <div className="
          flex
          flex-col
          xl:flex-row
          gap-4
          xl:gap-10
          items-start
          w-full
          mt-2
        ">
          {/* LEFT: Gráficos y línea */}
          <div className="flex-[1.8] flex flex-col gap-4 min-w-[300px] w-full">
            {/* Circulares */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full justify-between">
              {/* Circular 1 */}
              <div className="bg-white rounded-xl shadow-md flex flex-col justify-start items-start mb-0 pb-2 px-7 pt-6 max-w-[430px] min-w-[230px] w-full flex-1">
                <h2 className="text-[1.05rem] font-bold text-[#2c3e8f] mb-4">Distribución de llamadas por franja horaria</h2>
                <div className="flex gap-5 items-start w-full">
                  <div className="w-[110px] md:w-[130px] min-w-[110px] h-[110px] md:h-[130px]">
                    <Doughnut data={donutHorariosData} options={{
                      responsive: true,
                      cutout: '68%',
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const label = context.label || '';
                              const value = context.parsed;
                              const total = dataHorarios.reduce((a, b) => a + b, 0);
                              const pct = total ? ((value / total) * 100).toFixed(1) : 0;
                              return `${label}: ${value} llamadas (${pct}%)`;
                            }
                          }
                        }
                      }
                    }} />
                  </div>
                  <div className="flex-1 min-w-[80px] md:min-w-[110px] ml-2">
                    {labelsHorarios.map((l, idx) => (
                      <div key={l} className="flex items-center mb-3 py-2 px-4 rounded-md bg-[#f1f2fd] min-w-[78px] md:min-w-[108px] hover:translate-x-1 hover:shadow-md transition">
                        <span className="w-5 h-5 rounded bg-[#f1f2fd] mr-3" style={{ background: colorsHorarios[idx] }}></span>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#2c3e50]">{l}</span>
                          <span className="text-[0.91rem] text-[#69729a] font-medium">{dataHorarios[idx]} llamadas</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Circular 2 */}
              <div className="bg-white rounded-xl shadow-md flex flex-col justify-start items-start mb-0 pb-2 px-7 pt-6 max-w-[430px] min-w-[230px] w-full flex-1">
                <h2 className="text-[1.05rem] font-bold text-[#2c3e8f] mb-4">Resolución de casos por cliente</h2>
                <div className="flex gap-5 items-start w-full">
                  <div className="w-[110px] md:w-[130px] min-w-[110px] h-[110px] md:h-[130px]">
                    <Doughnut data={donutResData} options={{
                      responsive: true,
                      cutout: '68%',
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const label = context.label || '';
                              const value = context.parsed;
                              const total = pieResValues.reduce((a, b) => a + b, 0);
                              const pct = total ? ((value / total) * 100).toFixed(1) : 0;
                              return `${label}: ${value} (${pct}%)`;
                            }
                          }
                        }
                      }
                    }} />
                  </div>
                  <div className="flex-1 min-w-[80px] md:min-w-[110px] ml-2">
                    {pieResLabels.map((l, idx) => (
                      <div key={l} className="flex items-center mb-3 py-2 px-4 rounded-md bg-[#f1f2fd] min-w-[78px] md:min-w-[108px] hover:translate-x-1 hover:shadow-md transition">
                        <span className="w-5 h-5 rounded bg-[#f1f2fd] mr-3" style={{ background: pieResColors[idx] }}></span>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#2c3e50]">{l}</span>
                          <span className="text-[0.91rem] text-[#69729a] font-medium">{((pieResValues[idx] / (pieResValues.reduce((a, b) => a + b, 0) || 1)) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Línea satisfacción */}
            <div className="bg-white rounded-xl shadow-md p-5 md:p-8 w-full min-w-0 mb-0">
              <h2 className="text-[#2c3e8f] text-[1.13rem] font-bold mb-5">Tendencia diaria de satisfacción por cliente</h2>
              <div className="relative" style={{ height: 410, minHeight: 360 }}>
                <Line
                  data={{
                    labels: fechasUnicas,
                    datasets: datasetsClientes,
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: true, position: "top" },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const val = context.parsed.y;
                            return (val != null ? `${val}%` : "Sin dato");
                          }
                        }
                      }
                    },
                    layout: { padding: { left: 25, right: 25, top: 25, bottom: 25 } },
                    scales: {
                      y: {
                        min: 0,
                        max: 100,
                        ticks: {
                          stepSize: 25,
                          callback: (tickValue: string | number) => `${tickValue}%`,
                          font: { size: 15 },
                          color: "#868fa6"
                        },
                        grid: {
                          color: "#e5e7eb",
                          drawTicks: false
                        },
                        title: { display: true, text: "%", font: { size: 14, weight: "bold" } }
                      },
                      x: {
                        grid: { display: false },
                        ticks: {
                          maxRotation: 0,
                          minRotation: 0,
                          font: { size: 14 },
                          color: "#6875bd"
                        },
                        title: { display: true, text: "Fecha", font: { size: 14, weight: "bold" } }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
          {/* RIGHT: tabla agentes */}
          <div className="flex-[1.3] flex flex-col gap-4 w-full max-w-full">
            <div className="bg-white rounded-xl shadow-md p-5 md:p-8 mb-0">
              <h2 className="text-[#2c3e8f] text-[1.13rem] font-bold mb-5">Desempeño por Agente</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2 bg-white mt-4 min-w-[340px]">
                  <thead>
                    <tr>
                      <th className="bg-[#f8f9ff] text-[#2c3e8f] font-semibold text-[1.07rem] px-4 py-3 text-left">Agente</th>
                      <th className="bg-[#f8f9ff] text-[#2c3e8f] font-semibold text-[1.07rem] px-4 py-3 text-left">Satisfacción</th>
                      <th className="bg-[#f8f9ff] text-[#2c3e8f] font-semibold text-[1.07rem] px-4 py-3 text-left">Llamadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentesVisibles.map((ag, i) => (
                      <tr key={ag.id} className="bg-white hover:bg-[#eaf1fb] cursor-pointer transition">
                        <td className="relative px-4 py-3">{ag.nombre}
                          <span className="absolute right-4 opacity-0 group-hover:opacity-100 text-[#3f51b5] transition">→</span>
                        </td>
                        <td className="px-4 py-3">{ag.satisfaccion}%</td>
                        <td className="px-4 py-3">{ag.llamadas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {empleadosRows.length > 7 && (
                <div className="flex justify-end mt-2">
                  <button
                    className="px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition"
                    onClick={() => setShowAllAgents(v => !v)}
                  >
                    {showAllAgents ? "Ver menos" : "Ver más"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* TMO Table/Chart */}
        <div className="mt-8 flex flex-col">
          <div className="bg-white rounded-xl shadow-md p-5 md:p-8 w-full min-w-0 mb-0">
            <h2 className="text-[#2c3e8f] text-[1.13rem] font-bold mb-5">Tiempo Medio de Operación (TMO) por Agente</h2>
            <div className="w-full min-h-[340px]">
              <Bar
                data={barTMOData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: ctx => `TMO: ${ctx.parsed.y} min`
                      }
                    }
                  },
                  layout: { padding: { left: 10, right: 10, top: 20, bottom: 30 } },
                  indexAxis: "x" as const,
                  scales: {
                    x: {
                      ticks: {
                        color: "#273470",
                        font: { size: 12, weight: "bold" },
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 30
                      },
                      grid: { display: false }
                    },
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 5,
                        color: "#a3a6b9",
                        font: { size: 13 },
                      },
                      grid: { color: "#e7e9f1" },
                      title: { display: true, text: "min", font: { size: 12, weight: "bold" } }
                    }
                  }
                }}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2 bg-white mt-5 min-w-[340px]">
                <thead>
                  <tr>
                    <th className="bg-[#f8f9ff] text-[#2c3e8f] font-semibold text-[1.07rem] px-4 py-3 text-left">Agente</th>
                    <th className="bg-[#f8f9ff] text-[#2c3e8f] font-semibold text-[1.07rem] px-4 py-3 text-left">TMO (min)</th>
                    <th className="bg-[#f8f9ff] text-[#2c3e8f] font-semibold text-[1.07rem] px-4 py-3 text-left">Llamadas</th>
                  </tr>
                </thead>
                <tbody>
                  {tmoVisibles.map((ag, i) => (
                    <tr key={ag.id + "tmo"} className="bg-white hover:bg-[#eaf1fb] cursor-pointer transition">
                      <td className="px-4 py-3">{ag.nombre}</td>
                      <td className="px-4 py-3">{ag.tmo}</td>
                      <td className="px-4 py-3">{ag.llamadas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tmoPorEmpleadoRows.length > 7 && (
              <div className="flex justify-end mt-2">
                <button
                  className="px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition"
                  onClick={() => setShowAllTMO(v => !v)}
                >
                  {showAllTMO ? "Ver menos" : "Ver más"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
