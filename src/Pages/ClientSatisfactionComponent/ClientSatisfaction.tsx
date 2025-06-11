import React, { useEffect, useState, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './ClientSatisfaction.css';
import Chart from 'chart.js/auto';

interface AudioFile {
  id: number;
  fileName: string;
  date: string;
  duration: string;
  agent: string;
  agentId: string;
  fileSize: string;
  format: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  transcription?: string;
}

interface AgentSummary {
  agent: string;
  totalCalls: number;
  satisfied: number;
  dissatisfied: number;
  totalDuration: number;
  satisfactionPercentage: string;
  avgDuration: string;
  dates: string[];
}

const ClientSatisfaction: React.FC = () => {
  const originalData: AudioFile[] = [
    { id: 1, fileName: 'llamada_ventas_001.mp3', date: '2024-03-15 09:30', duration: '00:12:45', agent: 'Laura Gómez', agentId: 'laura_gomez', fileSize: '15.4 MB', format: 'MP3', sentiment: 'positive' },
    { id: 2, fileName: 'soporte_tecnico_045.mp3', date: '2024-03-15 11:15', duration: '00:08:22', agent: 'Carlos Mendoza', agentId: 'carlos_mendoza', fileSize: '8.7 MB', format: 'MP3' },
    { id: 3, fileName: 'reclamo_cliente_112.wav', date: '2024-03-15 14:00', duration: '00:23:18', agent: 'Ana Torres', agentId: 'ana_torres', fileSize: '42.1 MB', format: 'WAV', sentiment: 'negative' }
  ];

  const [filteredData, setFilteredData] = useState<AudioFile[]>([]);
  const [agentsSummary, setAgentsSummary] = useState<AgentSummary[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    applyFilters();
  }, [startDate, endDate]);

  const applyFilters = () => {
    const start = startDate || new Date('1970-01-01');
    const end = endDate || new Date('2100-12-31');
    const filtered = originalData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= start && itemDate <= end;
    });
    setFilteredData(filtered);
    generateSummary(filtered);
  };

  const generateSummary = (data: AudioFile[]) => {
    const summaryMap = new Map<string, AgentSummary>();

    data.forEach(file => {
      const agentKey = file.agentId;
      if (!summaryMap.has(agentKey)) {
        summaryMap.set(agentKey, {
          agent: file.agent,
          totalCalls: 0,
          satisfied: 0,
          dissatisfied: 0,
          totalDuration: 0,
          satisfactionPercentage: '0%',
          avgDuration: '00:00:00',
          dates: []
        });
      }

      const agent = summaryMap.get(agentKey)!;
      agent.totalCalls++;
      agent.totalDuration += parseDuration(file.duration);
      agent.dates.push(file.date);

      if (file.sentiment) {
        file.sentiment === 'positive' ? agent.satisfied++ : agent.dissatisfied++;
      }
    });

    const summaryArray = Array.from(summaryMap.values()).map(agent => ({
      ...agent,
      satisfactionPercentage: calculateSatisfaction(agent),
      avgDuration: formatDuration(agent.totalDuration / agent.totalCalls)
    }));

    setAgentsSummary(summaryArray);
    drawChart(summaryArray);
  };

  const drawChart = (summary: AgentSummary[]) => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const labels = summary.map(a => a.agent);
    const data = summary.map(a => parseFloat(a.satisfactionPercentage));

    chartInstance.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Satisfacción (%)',
          data,
          backgroundColor: '#60a5fa',
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.parsed.y}% satisfacción`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Satisfacción (%)' }
          },
          x: { grid: { display: false } }
        }
      }
    });
  };

  const parseDuration = (duration: string): number => {
    const [hours, minutes, seconds] = duration.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  const formatDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculateSatisfaction = (agent: AgentSummary): string => {
    const total = agent.satisfied + agent.dissatisfied;
    if (total === 0) return '0';
    const percent = (agent.satisfied / total) * 100;
    return percent.toFixed(1);
  };

  const getAverageSatisfaction = (): string => {
    const total = agentsSummary.reduce((acc, curr) => acc + parseFloat(curr.satisfactionPercentage), 0);
    return (total / (agentsSummary.length || 1)).toFixed(1);
  };

  return (
    <div className="cs-container">
      <h2>Análisis de Satisfacción del Cliente</h2>

      <div className="cs-filter-section">
        <div>
          <label>Fecha inicial</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            dateFormat="dd/MM/yyyy"
            placeholderText="Inicio"
            className="cs-datepicker cs-date-black"
            maxDate={endDate || undefined}
            isClearable
          />
        </div>
        <div>
          <label>Fecha final</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            dateFormat="dd/MM/yyyy"
            placeholderText="Fin"
            className="cs-datepicker cs-date-black"
            minDate={startDate || undefined}
            isClearable
          />
        </div>
        <button className="cs-btn" onClick={applyFilters}>Aplicar Filtros</button>
      </div>

      <div className="cs-summary">
        <div className="cs-summary-card">
          <div className="cs-icon">👥</div>
          <div className="cs-summary-value">{agentsSummary.length}</div>
          <div className="cs-summary-label">Agentes</div>
        </div>
        <div className="cs-summary-card">
          <div className="cs-icon">📞</div>
          <div className="cs-summary-value">{filteredData.length}</div>
          <div className="cs-summary-label">Llamadas</div>
        </div>
        <div className="cs-summary-card">
          <div className="cs-icon">😊</div>
          <div className="cs-summary-value">{getAverageSatisfaction()}%</div>
          <div className="cs-summary-label">Satisfacción</div>
        </div>
      </div>

      {filteredData.length > 0 && (
        <div className="cs-chart-container">
          <canvas ref={chartRef} height={200}></canvas>
        </div>
      )}

      <div className="cs-table-container">
        <table className="cs-table">
          <thead>
            <tr>
              <th>Agente</th>
              <th>Llamadas</th>
              <th>Satisfacción</th>
              <th>TMO</th>
            </tr>
          </thead>
          <tbody>
            {agentsSummary.map((a, idx) => (
              <tr key={idx}>
                <td>{a.agent}</td>
                <td>{a.totalCalls}</td>
                <td>{a.satisfactionPercentage}%</td>
                <td>{a.avgDuration}</td>
              </tr>
            ))}
            {agentsSummary.length === 0 && (
              <tr><td colSpan={4} className="cs-no-data">No hay datos en el rango seleccionado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientSatisfaction;
