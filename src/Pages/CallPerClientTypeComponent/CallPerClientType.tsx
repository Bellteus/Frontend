import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './CallPerClientType.css';

interface SampleData {
  id: number;
  agent: string;
  agentId: string;
  clientType: 'corporate' | 'individual' | 'potential';
  date: string;
}

interface CallMetric {
  agent: string;
  agentId: string;
  totalCalls: number;
  clientTypes: {
    corporate: number;
    individual: number;
    potential: number;
  };
}

const sampleData: SampleData[] = [
  { id: 1, agent: 'Laura Gómez', agentId: 'laura_gomez', clientType: 'corporate', date: '2024-03-15 09:30' },
  { id: 2, agent: 'Carlos Mendoza', agentId: 'carlos_mendoza', clientType: 'individual', date: '2024-03-15 11:15' },
  { id: 3, agent: 'Ana Torres', agentId: 'ana_torres', clientType: 'potential', date: '2024-03-15 14:00' },
];

const CallPerClientType: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [filteredData, setFilteredData] = useState<CallMetric[]>([]);

  const applyFilters = () => {
    const filtered = sampleData.filter(entry => {
      const date = new Date(entry.date);
      return (!startDate || date >= startDate) && (!endDate || date <= endDate);
    });

    const agentMap = new Map<string, CallMetric>();
    filtered.forEach(entry => {
      if (!agentMap.has(entry.agentId)) {
        agentMap.set(entry.agentId, {
          agent: entry.agent,
          agentId: entry.agentId,
          totalCalls: 0,
          clientTypes: { corporate: 0, individual: 0, potential: 0 }
        });
      }

      const metric = agentMap.get(entry.agentId)!;
      metric.totalCalls++;
      metric.clientTypes[entry.clientType]++;
    });

    setFilteredData(Array.from(agentMap.values()));
  };

  useEffect(() => {
    applyFilters();
  }, []);

  const getTotal = (type: keyof CallMetric['clientTypes']) => {
    return filteredData.reduce((sum, item) => sum + item.clientTypes[type], 0);
  };

  return (
    <div className="cd-container">
      <h2>Distribución de Llamadas por Tipo de Cliente</h2>

      <div className="cd-filter-section">
        <div>
          <label>Fecha inicial</label>
          <DatePicker
            selected={startDate}
            onChange={date => setStartDate(date)}
            dateFormat="dd/MM/yyyy"
            placeholderText="Inicio"
            className="cd-datepicker"
            maxDate={endDate || undefined}
          />
        </div>
        <div>
          <label>Fecha final</label>
          <DatePicker
            selected={endDate}
            onChange={date => setEndDate(date)}
            dateFormat="dd/MM/yyyy"
            placeholderText="Fin"
            className="cd-datepicker"
            minDate={startDate || undefined}
          />
        </div>
        <button className="cd-btn" onClick={applyFilters}>Actualizar</button>
      </div>

      <div className="cd-table-container">
        <table className="cd-table">
          <thead>
            <tr>
              <th>Agente</th>
              <th>Corporativo</th>
              <th>Individual</th>
              <th>Potencial</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(agent => (
              <tr key={agent.agentId}>
                <td>{agent.agent}</td>
                <td>{agent.clientTypes.corporate}</td>
                <td>{agent.clientTypes.individual}</td>
                <td>{agent.clientTypes.potential}</td>
                <td>{agent.totalCalls}</td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={5} className="cd-no-data">No hay datos para este rango.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="cd-totals-section">
        {(['corporate', 'individual', 'potential'] as const).map(type => (
          <div key={type} className="cd-total-card">
            <h3>{type.charAt(0).toUpperCase() + type.slice(1)}</h3>
            <div className="cd-total-value">{getTotal(type)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CallPerClientType;
