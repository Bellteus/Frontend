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

import './DashboardStyle/Dashboard.css';
import { AudioWithAnalysis } from '../types/AnalysisAudio';
import { ClienteReporte } from '../types/ClientReport';
import { EmpleadoReporte } from '../types/AgentReport';
import apiService from '../services/DataService'; // <-- Add this import, adjust the path if needed

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

const Dashboard: React.FC = () => {
  const [audios, setAudios] = useState<AudioWithAnalysis[]>([]);
  const [clientes, setClientes] = useState<ClienteReporte[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoReporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAllAgents, setShowAllAgents] = useState(false);
  const [showAllTMO, setShowAllTMO] = useState(false);

  const startDate = "01-05-2025";
  const endDate = "27-06-2025";

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [audiosRes, clientesRes, empleadosRes] = await Promise.all([
          apiService.buscarAudios({ FechaHoraInicio: startDate, fechafin: endDate }),
          apiService.getReporteriaAudios({ FechaHoraInicio: startDate, fechafin: endDate }),
          apiService.getReporteAnalisisAgente({ Agente: '', fecha_inicio: startDate, fecha_fin: endDate }),
        ]);
        setAudios(Array.isArray(audiosRes) ? audiosRes : []);
        setClientes(Array.isArray(clientesRes) ? clientesRes : []);
        setEmpleados(Array.isArray(empleadosRes) ? empleadosRes : []);
        console.log("Audios cargados:", audiosRes);
      } catch (err: any) {
        setError(err.message || 'No se pudieron cargar los datos.');
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // Agrupación de datos por empleado
  const llamadasPorEmpleado: Record<string, AudioWithAnalysis[]> = {};
  audios.forEach(a => {
    if (!llamadasPorEmpleado[a.IdEmpleado]) llamadasPorEmpleado[a.IdEmpleado] = [];
    llamadasPorEmpleado[a.IdEmpleado].push(a);
  });

  // Agrupa por cliente para la tendencia
  const llamadasPorCliente: Record<string, AudioWithAnalysis[]> = {};
  audios.forEach(a => {
    const cliente = a.Cliente || 'Otros';
    if (!llamadasPorCliente[cliente]) llamadasPorCliente[cliente] = [];
    llamadasPorCliente[cliente].push(a);
  });

  // KPIs principales usando escala porcentual
  const satisfactionVals = audios
    .map(a => toPercent(a.ANALISIS_LLM.satisfaccion_cliente))
    .filter(v => v !== null) as number[];
  const promSatisfaccion = satisfactionVals.length
    ? Math.round(satisfactionVals.reduce((a, b) => a + b, 0) / satisfactionVals.length)
    : 0;
  const promPerformance = audios.length
    ? Math.round(audios.reduce((a, b) => a + (b.ANALISIS_LLM?.performance_score || 0), 0) / audios.length)
    : 0;

  // Pie de resolución de casos
  let resueltos = 0, escalados = 0, followup = 0;
  audios.forEach(a => {
    if (a.ANALISIS_LLM.caso_resuelto?.toLowerCase() === 'sí' || a.ANALISIS_LLM.caso_resuelto?.toLowerCase() === 'si' || a.ANALISIS_LLM.caso_resuelto === '1') resueltos++;
    else if (a.ANALISIS_LLM.escalado?.toLowerCase() === 'sí' || a.ANALISIS_LLM.escalado?.toLowerCase() === 'si' || a.ANALISIS_LLM.escalado === '1') escalados++;
    else if (a.ANALISIS_LLM.necesita_followup?.toLowerCase() === 'sí' || a.ANALISIS_LLM.necesita_followup?.toLowerCase() === 'si' || a.ANALISIS_LLM.necesita_followup === '1') followup++;
  });
  const totalCasos = resueltos + escalados + followup || 1;

  // Fechas únicas para el gráfico de tendencia
  const fechasUnicas = Array.from(new Set(audios.map(a => a.FechaHoraInicio.slice(0, 10)))).sort();

  // Tendencia de satisfacción por cliente (en % robusto)
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

  // Tabla de desempeño de agentes
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

  // TMO por agente (ORDENADO DE MENOR A MAYOR)
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
    .sort((a, b) => a.tmo - b.tmo); // Orden menor a mayor

  const agentesVisibles = showAllAgents ? empleadosRows : empleadosRows.slice(0, 7);
  const tmoVisibles = showAllTMO ? tmoPorEmpleadoRows : tmoPorEmpleadoRows.slice(0, 7);

  // Gráfico de barras TMO
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

  // === LLAMADAS POR FRANJA HORARIA (nuevo gráfico circular) ===
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

  // Pie data para resolución de casos
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

  // --- Renderizado ---
  if (loading) return (
    <div className="dashboard-container">
      <div style={{ padding: '4rem', textAlign: 'center' }}>Cargando datos...</div>
    </div>
  );
  if (error) return (
    <div className="dashboard-container">
      <div style={{ color: 'crimson', padding: '2rem' }}>Error: {error}</div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">

        <header className="dashboard-header">
          <h1>Analítica de Llamadas en Tiempo Real</h1>
          <div className="main-stats">
            <div className="stat-card">
              <div className="stat-value">{audios.length}</div>
              <div className="stat-label">LLAMADAS TOTALES</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{promSatisfaccion}%</div>
              <div className="stat-label">SATISFACCIÓN PROMEDIO</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{promPerformance}</div>
              <div className="stat-label">PERFORMANCE PROMEDIO</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{clientes.length}</div>
              <div className="stat-label">CLIENTES EN REPORTE</div>
            </div>
          </div>
        </header>

        {/* Nueva distribución */}
        <div className="dashboard-2col">
          <div className="dashboard-left-group">
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2.1rem',
              width: '100%',
              alignItems: 'stretch'
            }}>
              {/* Circulares */}
              <div style={{
                display: 'flex',
                gap: '2.1rem',
                flexWrap: 'nowrap',
                width: '100%',
                justifyContent: 'space-between'
              }}>
                {/* Circular 1 */}
                <div
                  className="chart-card chart-card-small"
                  style={{
                    width: 370,
                    minWidth: 260,
                    maxWidth: 430,
                    flex: "1 1 0",
                    display: "flex"
                  }}
                >
                  <h2 style={{ fontSize: "1.05rem" }}>Distribución de llamadas por franja horaria</h2>
                  <div className="chart-container" style={{ gap: "1.2rem" }}>
                    <div style={{ width: 130, minWidth: 130, height: 130 }}>
                      <Doughnut
                        data={donutHorariosData}
                        options={{
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
                        }}
                      />
                    </div>
                    <div className="chart-legend" style={{ marginLeft: 10 }}>
                      {labelsHorarios.map((l, idx) => (
                        <div className="legend-item" key={l}>
                          <span className="color-badge" style={{ background: colorsHorarios[idx] }}></span>
                          <div className="legend-text">
                            <span className="segment-label">{l}</span>
                            <span className="segment-value">{dataHorarios[idx]} llamadas</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Circular 2 */}
                <div
                  className="chart-card chart-card-small"
                  style={{
                    width: 370,
                    minWidth: 260,
                    maxWidth: 430,
                    flex: "1 1 0",
                    display: "flex"
                  }}
                >
                  <h2 style={{ fontSize: "1.05rem" }}>Resolución de casos por cliente</h2>
                  <div className="chart-container" style={{ gap: "1.2rem" }}>
                    <div style={{ width: 130, minWidth: 130, height: 130 }}>
                      <Doughnut
                        data={donutResData}
                        options={{
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
                        }}
                      />
                    </div>
                    <div className="chart-legend" style={{ marginLeft: 10 }}>
                      {pieResLabels.map((l, idx) => (
                        <div className="legend-item" key={l}>
                          <span className="color-badge" style={{ background: pieResColors[idx] }}></span>
                          <div className="legend-text">
                            <span className="segment-label">{l}</span>
                            <span className="segment-value">{((pieResValues[idx] / (pieResValues.reduce((a, b) => a + b, 0) || 1)) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Línea satisfacción */}
              <div className="chart-card line-satisfaccion"
                style={{
                  width: "100%",
                  minWidth: 0,
                  margin: 0,
                  padding: "2rem 2.2rem"
                }}
              >
                <h2>Tendencia diaria de satisfacción por cliente</h2>
                <div className="line-chart-container" style={{ height: 410, minHeight: 360 }}>
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
          </div>
          {/* Columna derecha: desempeño */}
          <div className="right-charts">
            <div className="chart-card">
              <h2>Desempeño por Agente</h2>
              <table className="interactive-table">
                <thead>
                  <tr>
                    <th>Agente</th>
                    <th>Satisfacción</th>
                    <th>Llamadas</th>
                  </tr>
                </thead>
                <tbody>
                  {agentesVisibles.map((ag, i) => (
                    <tr className="table-row" key={ag.id}>
                      <td>{ag.nombre}</td>
                      <td>{ag.satisfaccion}%</td>
                      <td>{ag.llamadas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

        {/* TMO al fondo */}
        <div className="tmo-row">
          <div className="chart-card" style={{ width: "100%" }}>
            <h2>Tiempo Medio de Operación (TMO) por Agente</h2>
            <div style={{ width: "100%", minHeight: 340 }}>
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
            <table className="interactive-table" style={{ marginTop: 20 }}>
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>TMO (min)</th>
                  <th>Llamadas</th>
                </tr>
              </thead>
              <tbody>
                {tmoVisibles.map((ag, i) => (
                  <tr className="table-row" key={ag.id + "tmo"}>
                    <td>{ag.nombre}</td>
                    <td>{ag.tmo}</td>
                    <td>{ag.llamadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
