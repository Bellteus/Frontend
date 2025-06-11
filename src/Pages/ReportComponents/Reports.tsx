import React, { useState } from 'react';
import './Reports.css';

// Mock de reportes
const initialReports = [
  {
    id: 1,
    titulo: 'Monitoreo Operacional',
    icono: 'track_changes',
    color: '#00bcd4',
    estado: 'ACTIVO',
    tags: ['operacional', 'rendimiento'],
    metricas: [
      { nombre: 'Uso CPU', valor: 87 },
      { nombre: 'Tiempo Respuesta', valor: '120ms' },
      { nombre: 'Incidentes', valor: 3 },
    ],
  },
  {
    id: 2,
    titulo: 'Seguridad de Llamadas',
    icono: 'security',
    color: '#e91e63',
    estado: 'EN REVISIÓN',
    tags: ['seguridad'],
    metricas: [
      { nombre: 'Alertas', valor: 12 },
      { nombre: 'Tasa Falsos Positivos', valor: '2%' },
      { nombre: 'Revisión Manual', valor: 'Pendiente' },
    ],
  },
  {
    id: 3,
    titulo: 'Rendimiento LLM',
    icono: 'speed',
    color: '#ff9800',
    estado: 'ACTIVO',
    tags: ['rendimiento'],
    metricas: [
      { nombre: 'Latencia', valor: '80ms' },
      { nombre: 'Precisión', valor: '94%' },
      { nombre: 'Disponibilidad', valor: '99.8%' },
    ],
  },
];

const filtrosDisponibles = [
  { key: 'todos', label: 'Todos' },
  { key: 'operacional', label: 'Operacional' },
  { key: 'seguridad', label: 'Seguridad' },
  { key: 'rendimiento', label: 'Rendimiento' },
];

const Reports: React.FC = () => {
  const [filtro, setFiltro] = useState('todos');

  const reportesFiltrados =
    filtro === 'todos'
      ? initialReports
      : initialReports.filter((r) => r.tags.includes(filtro));

  // Demo: solo alerta el nombre
  const verDetalle = (reporte: typeof initialReports[0]) => {
    alert('Detalle de reporte: ' + reporte.titulo);
  };

  return (
    <div className="reportes-bg">
      <div className="reportes-container">
        <div className="header">
          <h1 className="titulo-principal">Panel de Análisis Generativo - LLM</h1>
          <div className="filtros">
            {filtrosDisponibles.map((f) => (
              <div
                className={`filtro${filtro === f.key ? ' activo' : ''}`}
                key={f.key}
                onClick={() => setFiltro(f.key)}
              >
                {f.label}
              </div>
            ))}
          </div>
        </div>

        <div className="grid-reportes">
          {reportesFiltrados.map((reporte) => (
            <div
              className="tarjeta-reporte"
              key={reporte.id}
              style={{ ['--color-reporte' as any]: reporte.color }}
              onClick={() => verDetalle(reporte)}
            >
              <div className="cabecera">
                <span className="material-icons icono">{reporte.icono}</span>
                <h2>{reporte.titulo}</h2>
                <div
                  className="estado"
                  style={{
                    background: reporte.color + '18',
                    color: reporte.color,
                    border: `1.5px solid ${reporte.color}44`,
                  }}
                >
                  {reporte.estado}
                </div>
              </div>

              <div className="contenido-adicional">
                <div
                  className="progress-chart"
                  style={{
                    background: `conic-gradient(${reporte.color} ${reporte.metricas[0].valor}% , #eee ${reporte.metricas[0].valor}% 100%)`,
                  }}
                >
                  <span className="progress-value">{reporte.metricas[0].valor}</span>
                </div>
                <div className="tags">
                  {reporte.tags.map((tag, i) => (
                    <span className="tag" key={i}>
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="metricas">
                {reporte.metricas.slice(1).map((metrica, idx) => (
                  <div className="metrica" key={idx}>
                    <span className="nombre">{metrica.nombre}</span>
                    <span className="valor">{metrica.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </div>
    </div>
  );
};

export default Reports;
