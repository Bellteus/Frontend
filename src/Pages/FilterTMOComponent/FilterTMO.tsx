import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './FilterTMO.css';

interface CallData {
  id: number;
  agent: string;
  agentId: string;
  duration: string; // "hh:mm:ss"
  date: string;     // "YYYY-MM-DD HH:mm"
}

interface TMOMetric {
  agent: string;
  agentId: string;
  totalDuration: number;
  callCount: number;
  average: string;
  lastDate: string;
}

const sampleData: CallData[] = [
  { id: 1, agent: 'Laura Gómez', agentId: 'laura_gomez', duration: '00:12:45', date: '2024-03-15 09:30' },
  { id: 2, agent: 'Carlos Mendoza', agentId: 'carlos_mendoza', duration: '00:08:22', date: '2024-03-15 11:15' },
  { id: 3, agent: 'Ana Torres', agentId: 'ana_torres', duration: '00:23:18', date: '2024-03-15 14:00' },
];

const FilterTMO: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [filteredData, setFilteredData] = useState<TMOMetric[]>([]);
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  const durationToSeconds = (duration: string) => {
    const [h, m, s] = duration.split(':').map(Number);
    return h * 3600 + m * 60 + s;
  };

  const secondsToTime = (seconds: number) => {
    if (!isFinite(seconds)) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timeToSeconds = (time: string) => {
    const [h, m, s] = time.split(':').map(Number);
    return h * 3600 + m * 60 + s;
  };

  const processData = () => {
    let filtered = sampleData;
    if (startDate) filtered = filtered.filter(d => new Date(d.date) >= startDate);
    if (endDate) filtered = filtered.filter(d => new Date(d.date) <= endDate);

    const agentMap = new Map<string, TMOMetric>();

    filtered.forEach(entry => {
      if (!agentMap.has(entry.agentId)) {
        agentMap.set(entry.agentId, {
          agent: entry.agent,
          agentId: entry.agentId,
          totalDuration: 0,
          callCount: 0,
          average: '00:00:00',
          lastDate: entry.date,
        });
      }

      const metric = agentMap.get(entry.agentId)!;
      metric.callCount++;
      metric.totalDuration += durationToSeconds(entry.duration);

      // Registrar la última fecha más reciente
      if (new Date(entry.date) > new Date(metric.lastDate)) {
        metric.lastDate = entry.date;
      }
    });

    const tmoData = Array.from(agentMap.values()).map(metric => ({
      ...metric,
      average: secondsToTime(metric.totalDuration / metric.callCount)
    }));

    setFilteredData(tmoData);
  };

  useEffect(() => { processData(); }, [startDate, endDate]);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    chartInstance.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: filteredData.map(d => d.agent),
        datasets: [{
          label: 'TMO (hh:mm:ss)',
          data: filteredData.map(d => timeToSeconds(d.average)),
          backgroundColor: ['#2196F3', '#00bcd4', '#43c769'],
          borderRadius: 7,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => 'TMO: ' + secondsToTime(ctx.parsed.y),
            }
          }
        },
        scales: {
          y: {
            ticks: { callback: value => secondsToTime(value as number) },
            title: { display: true, text: 'Duración (hh:mm:ss)' },
            grid: { color: '#e3eaf5' }
          },
          x: { grid: { display: false } }
        }
      }
    });

    return () => { chartInstance.current?.destroy(); };
  }, [filteredData]);

  const globalAverage = (() => {
    const total = filteredData.reduce((acc, curr) => acc + timeToSeconds(curr.average), 0);
    return secondsToTime(total / (filteredData.length || 1));
  })();

  return (
    <div className="tmo-container">
      <h2>Promedio de Duración de Llamadas <span className="tmo-badge">(TMO)</span></h2>

      <div className="tmo-filter-section">
        <div>
          <label>Fecha inicial</label>
          <DatePicker
            selected={startDate}
            onChange={date => setStartDate(date)}
            dateFormat="dd/MM/yyyy"
            placeholderText="Inicio"
            className="tmo-datepicker"
            maxDate={endDate || undefined}
            isClearable
          />
        </div>
        <div>
          <label>Fecha final</label>
          <DatePicker
            selected={endDate}
            onChange={date => setEndDate(date)}
            dateFormat="dd/MM/yyyy"
            placeholderText="Fin"
            className="tmo-datepicker"
            minDate={startDate || undefined}
            isClearable
          />
        </div>
        <button className="tmo-btn" onClick={() => { setStartDate(null); setEndDate(null); }}>
          ⟳ Limpiar
        </button>
      </div>

      <div className="tmo-summary-card">
        <div className="tmo-average-container">
          <div className="tmo-average-value">{globalAverage}</div>
          <div className="tmo-average-label">Promedio Global</div>
        </div>
      </div>

      <div className="tmo-chart-container">
        <canvas ref={chartRef} height={120}></canvas>
      </div>

      <div className="tmo-table-container">
        <table className="tmo-table">
          <thead>
            <tr>
              <th>Agente</th>
              <th>Llamadas</th>
              <th>TMO</th>
              <th>Duración Total</th>
              <th>Última Llamada</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(item => (
              <tr key={item.agentId}>
                <td>
                  <div className="tmo-agent-info">
                    <span className="tmo-person-icon">👤</span>
                    {item.agent}
                  </div>
                </td>
                <td>{item.callCount}</td>
                <td><span className="tmo-tmo-badge">{item.average}</span></td>
                <td>{secondsToTime(item.totalDuration)}</td>
                <td>{new Date(item.lastDate).toLocaleString('es-PE')}</td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={5} className="tmo-no-data">No hay datos en el rango seleccionado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FilterTMO;
