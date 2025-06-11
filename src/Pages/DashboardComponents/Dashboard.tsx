import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useNavigate } from 'react-router-dom';

import './Dashboard.css';
import type { Calls } from '../../Model/Calls';
import type { Employee } from '../../Model/Employee';
import type { Supervisor } from '../../Model/Supervisor';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const API_URL = 'http://localhost:3000'; // Cambia si tu json-server corre en otro puerto

interface AgentMetric {
  employee: Employee;
  satisfaction: number;
  tmo: number; // minutos
  calls: number;
  resolution: string;
}

const Dashboard: React.FC = () => {
  const [calls, setCalls] = useState<Calls[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  const navigate = useNavigate();

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const [callsRes, empRes, supRes] = await Promise.all([
          fetch(`${API_URL}/llamadas`),
          fetch(`${API_URL}/empleados`),
          fetch(`${API_URL}/supervisor`),
        ]);
        if (!callsRes.ok || !empRes.ok || !supRes.ok) {
          throw new Error('No se pudo cargar la información del servidor.');
        }
        const [callsJson, empJson, supJson] = await Promise.all([
          callsRes.json(),
          empRes.json(),
          supRes.json(),
        ]);
        setCalls(Array.isArray(callsJson) ? callsJson : []);
        setEmployees(Array.isArray(empJson) ? empJson : []);
        setSupervisors(Array.isArray(supJson) ? supJson : []);
      } catch (err: any) {
        setFetchError(err.message || 'Error desconocido');
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- AGENT METRICS ---
  useEffect(() => {
    if (!calls.length || !employees.length) {
      setAgentMetrics([]);
      return;
    }

    const empMap = new Map<number, Employee>();
    employees.forEach(emp => empMap.set(emp.IDEmpleado, emp));

    // Agrupación y cálculo de métricas por agente
    const agentMetricsTemp: Record<number, { totalDur: number; calls: number }> = {};
    calls.forEach(call => {
      if (!agentMetricsTemp[call.IDEmpleado]) {
        agentMetricsTemp[call.IDEmpleado] = { totalDur: 0, calls: 0 };
      }
      agentMetricsTemp[call.IDEmpleado].calls++;
      agentMetricsTemp[call.IDEmpleado].totalDur += parseDuration(call.Duracion);
    });

    const newMetrics: AgentMetric[] = Object.entries(agentMetricsTemp)
      .map(([idStr, metric]) => {
        const emp = empMap.get(Number(idStr));
        if (!emp) return null;
        return {
          employee: emp,
          satisfaction: Math.round(70 + Math.random() * 25), // Valor mock (ajusta si tienes data)
          tmo: Number((metric.totalDur / metric.calls / 60).toFixed(2)),
          calls: metric.calls,
          resolution: ['Completa', 'Escalada', 'Pendiente'][Math.floor(Math.random() * 3)]
        };
      })
      .filter((x): x is AgentMetric => !!x);
    setAgentMetrics(newMetrics);
  }, [calls, employees]);

  // --- GENERAL METRICS ---
  const totalCalls = calls.length;
  const avgTMO = agentMetrics.length
    ? (agentMetrics.reduce((acc, curr) => acc + curr.tmo, 0) / agentMetrics.length).toFixed(2)
    : '0.00';
  const avgSatisfaction = agentMetrics.length
    ? (agentMetrics.reduce((acc, curr) => acc + curr.satisfaction, 0) / agentMetrics.length).toFixed(1)
    : '0.0';

  // --- PIE CHARTS ---
  function getTopCategories(arr: (string | null | undefined)[], top = 3) {
    const counts: Record<string, number> = {};
    arr.forEach(val => {
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = arr.length;
    return sorted.slice(0, top).map(([label, value]) => ({
      label,
      value: Math.round((value / total) * 100),
    }));
  }
  const pieCharts = [
    {
      title: 'Distribución por Programa',
      segments: getTopCategories(calls.map(c => c.Programa)),
      colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726'],
    },
    {
      title: 'Distribución por Servicio',
      segments: getTopCategories(calls.map(c => c.NombreServicio)),
      colors: ['#A8DADC', '#457B9D', '#1D3557', '#FFE082'],
    },
  ];

  // --- LINE CHART: Mocked trends (puedes cambiar a métricas reales si hay) ---
  const weekdays = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const trendsByDay = Array(7).fill(0).map((_, i) => {
    // Lógica real: cuenta llamadas por día de la semana
    const callsOfDay = calls.filter(c => {
      const d = new Date(c.FechaHoraInicio);
      return d.getDay() === i;
    });
    // Mock positivos/negativos
    const positive = Math.round(65 + Math.random() * 30 - (5 * Math.abs(3 - i)));
    const negative = 100 - positive;
    return { day: weekdays[i], positive, negative };
  });
  const lineChartData = {
    labels: trendsByDay.map(s => s.day),
    datasets: [
      {
        label: 'Sentimiento Positivo',
        data: trendsByDay.map(s => s.positive),
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        fill: true,
      },
      {
        label: 'Sentimiento Negativo',
        data: trendsByDay.map(s => s.negative),
        borderColor: '#F44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        fill: true,
      },
    ],
  };
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (tickValue: string | number) => `${tickValue}%` },
      },
    },
  };

  // --- HELPERS ---
  function parseDuration(d: string): number {
    if (!d) return 0;
    const [h, m, s] = d.split(':').map(Number);
    return h * 3600 + m * 60 + s;
  }

  function renderPieSegments(segments: { value: number }[], colors: string[]) {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return segments.map((seg, idx) => {
      const dashArray = (seg.value / 100) * circumference;
      const el = (
        <circle
          key={idx}
          cx="80"
          cy="80"
          r="70"
          strokeDasharray={`${dashArray} ${circumference}`}
          strokeDashoffset={-offset}
          stroke={colors[idx % colors.length]}
          strokeWidth={14}
          fill="none"
        />
      );
      offset += dashArray;
      return el;
    });
  }

  const maxTMO = agentMetrics.length
    ? Math.max(...agentMetrics.map(a => a.tmo))
    : 1;

  // Última llamada (más reciente)
  const lastCall = calls.reduce((latest, curr) => {
    if (!latest) return curr;
    return new Date(curr.FechaHoraInicio) > new Date(latest.FechaHoraInicio) ? curr : latest;
  }, calls[0] as Calls | undefined);

  // --- RENDER ---
  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Cargando datos...</div>;
  if (fetchError) return <div style={{ color: 'crimson', padding: '2rem' }}>Error: {fetchError}</div>;
  if (!calls.length || !employees.length) return <div style={{ padding: '3rem', textAlign: 'center' }}>No hay datos para mostrar.</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        {/* HEADER */}
        <header className="dashboard-header">
          <h1>Analítica de Llamadas en Tiempo Real</h1>
          <div className="main-stats">
            <div className="stat-card">
              <div className="stat-value">{totalCalls}</div>
              <div className="stat-label">LLAMADAS TOTALES</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{avgTMO}m</div>
              <div className="stat-label">DURACIÓN PROMEDIO</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{avgSatisfaction}%</div>
              <div className="stat-label">SATISFACCIÓN</div>
            </div>
          </div>
        </header>

        {/* PIE CHARTS */}
        <div className="pie-grid">
          {pieCharts.map((chart, i) => (
            <div className="chart-card" key={i}>
              <h2>{chart.title}</h2>
              <div className="chart-container">
                <svg width="160" height="160">
                  {renderPieSegments(chart.segments, chart.colors)}
                </svg>
                <div className="chart-legend">
                  {chart.segments.map((seg, index) => (
                    <div className="legend-item" key={index}>
                      <span
                        className="color-badge"
                        style={{ background: chart.colors[index % chart.colors.length] }}
                      ></span>
                      <div className="legend-text">
                        <span className="segment-label">{seg.label}</span>
                        <span className="segment-value">{seg.value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* LINE CHART */}
        <div className="chart-card">
          <h2>Tendencia de Sentimiento</h2>
          <div className="line-chart-container">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* AGENT PERFORMANCE TABLE */}
        <div className="chart-card">
          <h2>Desempeño por Agente</h2>
          <table className="interactive-table">
            <thead>
              <tr>
                <th>Agente</th>
                <th>Satisfacción</th>
                <th>TMO</th>
                <th>Llamadas</th>
                <th>Resolución</th>
              </tr>
            </thead>
            <tbody>
              {agentMetrics.map((agent) => (
                <tr
                  key={agent.employee.IDEmpleado}
                  className="table-row"
                  onClick={() =>
                    navigate(`/detalle-agente/${agent.employee.IDEmpleado}`)
                  }
                  onMouseEnter={() => setHoverRow(agent.employee.IDEmpleado)}
                  onMouseLeave={() => setHoverRow(null)}
                  style={{
                    background: hoverRow === agent.employee.IDEmpleado ? '#f0f5ff' : undefined,
                  }}
                >
                  <td>{agent.employee.NombreEmpleado}</td>
                  <td>{agent.satisfaction}%</td>
                  <td>{agent.tmo}m</td>
                  <td>{agent.calls}</td>
                  <td>
                    <span className={`status-tag ${agent.resolution.toLowerCase()}`}>
                      {agent.resolution}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TMO BARS */}
        <div className="chart-card">
          <h2>Rendimiento TMO por Agente</h2>
          <div className="tmo-bars">
            {agentMetrics.map((agent, i) => (
              <div className="tmo-bar" key={i}>
                <div className="agent-info">
                  <span className="agent-name">{agent.employee.NombreEmpleado}</span>
                  <span className="satisfaction">{agent.satisfaction}%</span>
                </div>
                <div className="bar-container">
                  <div
                    className="tmo-fill"
                    style={{
                      width: `${(agent.tmo / (maxTMO || 1)) * 100}%`,
                      background: '#3f51b5'
                    }}
                  ></div>
                  <span className="tmo-value">{agent.tmo}m</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LAST CALL */}
        <div className="chart-card last-call">
          <h2>Última Llamada Registrada</h2>
          {lastCall ? (
            <div className="call-details">
              <div className="detail-item">
                <span className="detail-label">Duración:</span>
                <span className="detail-value">{lastCall.Duracion}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Agente:</span>
                <span className="detail-value">
                  {
                    employees.find(e => e.IDEmpleado === lastCall.IDEmpleado)
                      ?.NombreEmpleado || 'Desconocido'
                  }
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Programa:</span>
                <span className="detail-value">{lastCall.Programa}</span>
              </div>
            </div>
          ) : (
            <div className="call-details">No hay llamadas registradas.</div>
          )}
        </div>
      </div>
    </div>
  );
};


export default Dashboard;
