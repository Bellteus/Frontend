import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import './DataTable.css';
import type { Inform } from '../../Model/Inform';
import type { AnalyticsLLM } from '../../Model/AnalyticsLLM';
import type { Calls } from '../../Model/Calls';
import type { Employee } from '../../Model/Employee';

declare global {
  interface Window {
    pieChartInstance?: Chart;
    barChartInstance?: Chart;
  }
}

const API_URL = 'http://localhost:3000';

const DataTable: React.FC = () => {
  const [calls, setCalls] = useState<Calls[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsLLM[]>([]);
  const [informes, setInformes] = useState<Inform[]>([]);
  const [lastInform, setLastInform] = useState<Inform | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ fecha: '', resultado: '', agente: '' });

  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);

  // Helpers
  function getNombreEmpleado(IDEmpleado: number) {
    return (
      employees.find(emp => emp.IDEmpleado === IDEmpleado)?.NombreEmpleado ||
      `Agente ${IDEmpleado}`
    );
  }

  // Cargar datos
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/llamadas`).then(r => r.json()),
      fetch(`${API_URL}/empleados`).then(r => r.json()),
      fetch(`${API_URL}/analyticsLLM`).then(r => r.json()),
      fetch(`${API_URL}/informes`).then(r => r.json()),
    ]).then(([calls, employees, analytics, informes]) => {
      setCalls(calls);
      setEmployees(employees);
      setAnalytics(analytics);
      setInformes(informes);
      if (informes.length > 0) {
        const sorted = [...informes].sort((a, b) => b.id - a.id);
        setLastInform(sorted[0]);
      } else {
        setLastInform(null);
      }
      setLoading(false);
    });
  }, []);

  // Filtro
  const filteredCalls = calls.filter(call => {
    return (
      (!filters.fecha || call.FechaHoraInicio.includes(filters.fecha)) &&
      (!filters.agente || call.IDEmpleado.toString().includes(filters.agente))
    );
  });

  // PIE CHART MEJORADO
  useEffect(() => {
    if (!pieChartRef.current) return;
    const ctx = pieChartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = ['Alta', 'Media', 'Baja'];
    const data = [
      analytics.filter(a => a.priority === 'high').length,
      analytics.filter(a => a.priority === 'medium').length,
      analytics.filter(a => a.priority === 'low').length,
    ];
    if (window.pieChartInstance) window.pieChartInstance.destroy();
    window.pieChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data, backgroundColor: ['#EF4444', '#FACC15', '#22C55E'] }],
      },
      options: {
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#222',
            formatter: (value: number, context: any) => {
              const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
              if (!total) return '';
              return `${((value / total) * 100).toFixed(1)}%`;
            },
            font: { weight: 'bold', size: 13 }
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => `${ctx.label}: ${ctx.parsed} llamadas`
            }
          }
        }
      },
      plugins: [ChartDataLabels],
    });
  }, [analytics]);

  // BARRAS DE SATISFACCIÓN
  useEffect(() => {
    if (!barChartRef.current) return;
    const ctx = barChartRef.current.getContext('2d');
    if (!ctx) return;
    // Satisfacción promedio por agente
    const byAgent: { [k: string]: number[] } = {};
    analytics.forEach(a => {
      if (!byAgent[a.callId]) byAgent[a.callId] = [];
      if (a.satisfaction != null) byAgent[a.callId].push(a.satisfaction);
    });
    const agentMap: { [agent: string]: number[] } = {};
    calls.forEach(call => {
      if (!byAgent[call.CallID]) return;
      const emp = call.IDEmpleado.toString();
      if (!agentMap[emp]) agentMap[emp] = [];
      agentMap[emp].push(...byAgent[call.CallID]);
    });
    const topAgents = Object.entries(agentMap)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    const labels = topAgents.map(([id]) => getNombreEmpleado(Number(id)));
    const data = topAgents.map(([, vals]) =>
      vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
    );

    if (window.barChartInstance) window.barChartInstance.destroy();
    window.barChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Satisfacción Promedio', data, backgroundColor: '#3B82F6' }
        ],
      },
      options: {
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          datalabels: {
            anchor: 'end',
            align: 'right',
            color: '#222',
            formatter: (value: number) => `${value}%`,
            font: { weight: 'bold', size: 12 }
          }
        },
        scales: {
          x: { beginAtZero: true, max: 100, title: { display: true, text: 'Satisfacción (%)' } },
          y: { title: { display: true, text: 'Agente' } }
        }
      },
      plugins: [ChartDataLabels],
    });
  }, [analytics, calls, employees]);

  // Recomendaciones por agente
  function getRecommendationsByAgent() {
    // Agrupa por agente
    const agentStats: { [k: string]: { sats: number[], prioridad: string[] } } = {};
    analytics.forEach(a => {
      const call = calls.find(c => c.CallID === a.callId);
      if (!call) return;
      const empId = call.IDEmpleado;
      if (!agentStats[empId]) agentStats[empId] = { sats: [], prioridad: [] };
      if (a.satisfaction != null) agentStats[empId].sats.push(a.satisfaction);
      agentStats[empId].prioridad.push(a.priority);
    });

    // Lista de recomendaciones por agente
    return Object.entries(agentStats).map(([id, stats]) => {
      const nombre = getNombreEmpleado(Number(id));
      const avgSatisf = stats.sats.length
        ? Math.round(stats.sats.reduce((a, b) => a + b, 0) / stats.sats.length)
        : 'N/A';
      const highCount = stats.prioridad.filter(p => p === 'high').length;
      let rec = '';
      if (avgSatisf !== 'N/A' && avgSatisf < 60) {
        rec += 'Satisfacción baja. Recomendar capacitación o acompañamiento.\n';
      }
      if (highCount > 3) {
        rec += 'Ha gestionado varias llamadas de prioridad alta. Revisar carga o procedimientos.\n';
      }
      if (!rec) rec = 'Desempeño dentro de lo esperado.';
      return { nombre, avgSatisf, highCount, rec };
    });
  }

  // ANALIZAR: recomendaciones inteligentes
  const handleAnalyze = async () => {
    const recomendacionesArr = getRecommendationsByAgent();
    let recTotal = recomendacionesArr
      .map(
        ag =>
          `• ${ag.nombre}: Satisfacción: ${ag.avgSatisf}, Prioridad alta: ${ag.highCount}\n${ag.rec}`
      )
      .join('\n');

    if (!recTotal) recTotal = 'Desempeño global aceptable. No se requieren acciones inmediatas.';

    const informe: Inform = {
      id: Date.now(),
      recomendation: recTotal,
      state: 'completed',
      priority: 'medium',
      type: 'daily',
      Keywords: ['satisfacción', 'auditoría', 'call center'],
    };

    await fetch(`${API_URL}/informes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(informe),
    });

    // Refresca los informes y actualiza el informe reciente
    const newInformes = await fetch(`${API_URL}/informes`).then(r => r.json());
    setInformes(newInformes);
    if (newInformes.length > 0) {
      const sorted = [...newInformes].sort((a, b) => b.id - a.id);
      setLastInform(sorted[0]);
    }
    alert('Informe generado y guardado en backend');
  };

  // DESCARGAR PDF: Informe + Gráficos
  const handleDownload = async () => {
    if (!lastInform) {
      alert('No hay informes generados. Analiza primero para crear un informe.');
      return;
    }
    const doc = new jsPDF();

    doc.setFontSize(18).setFont('helvetica', 'bold');
    doc.text('INFORME ANALÍTICO DE CALL CENTER', 14, 18);
    doc.setFontSize(11).setFont('helvetica', 'normal');
    doc.text(`Estado: ${lastInform.state}`, 14, 28);
    doc.text(`Prioridad: ${lastInform.priority}`, 80, 28);
    doc.text(`Tipo de informe: ${lastInform.type}`, 14, 34);
    doc.text('Palabras clave:', 14, 40);
    doc.text(lastInform.Keywords.join(', '), 40, 40);

    doc.setFontSize(13).setFont('helvetica', 'bold');
    doc.text('RECOMENDACIONES POR AGENTE:', 14, 52);
    doc.setFontSize(11).setFont('helvetica', 'normal');

    // Recom por agente en líneas separadas
    const recomendacionesArr = getRecommendationsByAgent();
    let y = 58;
    recomendacionesArr.forEach((ag, idx) => {
      doc.text(`${idx + 1}. ${ag.nombre}`, 16, y);
      doc.text(`Satisfacción: ${ag.avgSatisf} | Prioridad alta: ${ag.highCount}`, 25, y + 6);
      doc.text(ag.rec, 25, y + 12, { maxWidth: 170 });
      y += 22;
      if (y > 250) { doc.addPage(); y = 20; }
    });

    doc.setFont('helvetica', 'bold').setFontSize(13);
    doc.text('KPIs por Agente', 14, y + 8);
    doc.setFont('helvetica', 'normal').setFontSize(10);

    autoTable(doc, {
      startY: y + 12,
      head: [['Agente', 'Satisfacción', 'Llamadas de Prioridad Alta']],
      body: recomendacionesArr.map(a => [a.nombre, a.avgSatisf, a.highCount]),
      styles: { fontSize: 9 },
      theme: 'striped'
    });

    let graphY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 34;

    // Pie chart y leyenda
    if (pieChartRef.current) {
      const pieURL = pieChartRef.current.toDataURL('image/png', 1.0);
      doc.setFontSize(11).setFont('helvetica', 'bold');
      doc.text('Distribución de Prioridad de Llamadas:', 14, graphY);
      doc.addImage(pieURL, 'PNG', 14, graphY + 2, 50, 50);

      // Leyenda del pie
      const labels = ['Alta', 'Media', 'Baja'];
      const colors = ['#EF4444', '#FACC15', '#22C55E'];
      const data = [
        analytics.filter(a => a.priority === 'high').length,
        analytics.filter(a => a.priority === 'medium').length,
        analytics.filter(a => a.priority === 'low').length,
      ];
      const total = data.reduce((a, b) => a + b, 0);
      let legendY = graphY + 10;
      labels.forEach((label, idx) => {
        doc.setFillColor(colors[idx]);
        doc.rect(70, legendY - 3, 5, 5, 'F');
        doc.setTextColor(40, 40, 40);
        doc.text(
          `${label}: ${data[idx]} llamadas (${total ? ((data[idx] / total) * 100).toFixed(1) : 0}%)`,
          77,
          legendY
        );
        legendY += 7;
      });
      doc.setTextColor(0, 0, 0);
    }

    // Bar chart horizontal
    if (barChartRef.current) {
      const barURL = barChartRef.current.toDataURL('image/png', 1.0);
      doc.setFontSize(11).setFont('helvetica', 'bold');
      doc.text('Satisfacción Promedio por Agente:', 14, graphY + 55);
      doc.addImage(barURL, 'PNG', 14, graphY + 59, 160, 60);
    }

    doc.save('informe_llamadas.pdf');
  };

  if (loading)
    return <div style={{ padding: 50 }}>Cargando datos...</div>;

  return (
    <div className="dt-container">
      <h2 className="dt-header">Registro de Llamadas</h2>
      <div className="dt-controls">
        <button className="dt-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
          <i className="fas fa-filter"></i> Filtrar
        </button>
        <div className="dt-actions">
          <button className="dt-btn dt-download" onClick={handleDownload}>
            <i className="fas fa-download"></i> Descargar PDF
          </button>
          <button className="dt-btn dt-analyze" onClick={handleAnalyze}>
            <i className="fas fa-chart-bar"></i> Analizar
          </button>
        </div>
      </div>

      <div className={`dt-filters ${showFilters ? 'active' : ''}`}>
        <div className="dt-filter-group">
          <label>Fecha</label>
          <input
            type="date"
            value={filters.fecha}
            onChange={e => setFilters({ ...filters, fecha: e.target.value })}
          />
        </div>
        <div className="dt-filter-group">
          <label>ID Agente</label>
          <input
            type="text"
            placeholder="Buscar agente..."
            value={filters.agente}
            onChange={e => setFilters({ ...filters, agente: e.target.value })}
          />
        </div>
      </div>

      {/* Gráficos ocultos para usar las imágenes */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <canvas ref={pieChartRef} width={200} height={200}></canvas>
        <canvas ref={barChartRef} width={250} height={120}></canvas>
      </div>

      <div className="dt-table-wrapper">
        <table className="dt-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Duración</th>
              <th>Agente</th>
              <th>Programa</th>
              <th>Servicio</th>
            </tr>
          </thead>
          <tbody>
            {filteredCalls.map(call => (
              <tr key={call.CallID}>
                <td>{call.CallID}</td>
                <td>{call.FechaHoraInicio}</td>
                <td>{call.Duracion}</td>
                <td>{getNombreEmpleado(call.IDEmpleado)}</td>
                <td>{call.Programa}</td>
                <td>{call.NombreServicio}</td>
              </tr>
            ))}
            {filteredCalls.length === 0 && (
              <tr>
                <td colSpan={6} className="dt-no-data">
                  No hay registros coincidentes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Previsualización del informe reciente */}
      {lastInform && (
        <div
          className="last-inform-preview"
          style={{
            background: '#f5f7fa',
            margin: '2rem 0',
            borderRadius: 8,
            padding: 20
          }}>
          <b>Último Informe:</b>
          <div>Estado: {lastInform.state}</div>
          <div>Prioridad: {lastInform.priority}</div>
          <div>Tipo: {lastInform.type}</div>
          <div>Palabras clave: {lastInform.Keywords.join(', ')}</div>
          <div><b>Recomendación:</b> {lastInform.recomendation}</div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
