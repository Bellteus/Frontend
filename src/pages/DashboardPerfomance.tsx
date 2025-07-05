// src/pages/PerformanceSelector.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClientePerformanceService } from "../services/ClientePerformanceService";
import { AgentePerformanceService } from "../services/AgentePerformanceService";
import { ClienteResponsePerformance } from "../types/ClientesPerformance";
import { AgenteResponsePerformance } from "../types/AgentePerformance";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiService from '../services/DataService';

// ======= Helpers de formato y exportación PDF =======

const formatDateToDMY = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export function exportarClientePDF(data: ClienteResponsePerformance) {
  const doc = new jsPDF();
  const now = new Date().toLocaleString();
  doc.setFontSize(16);
  doc.text('Reporte de Análisis de Área', 14, 15);
  doc.setFontSize(10);
  doc.text(`Fecha de generación: ${now}`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [['Campo', 'Valor']],
    body: [
      ['Cliente', data.cliente],
      ['Fecha análisis', new Date(data.DateTime_realizado).toLocaleString()],
      ['Rango analizado', `${data.fecha_inicio_busqueda} a ${data.fecha_fin_busqueda}`],
      ['N° de llamadas', data.numero_llamadas],
      ['Score de performance promedio', data.performance_score_promedio?.toFixed(2)],
      ['Satisfacción cliente promedio', data.satisfaccion_cliente_promedio?.toFixed(2)],
      ['Sentimiento global', data.sentimiento_global],
      ['% Resueltos', `${data.porcentaje_resueltos}%`],
      ['% Escalados', `${data.porcentaje_escalados}%`],
      ['% Follow-up', `${data.porcentaje_followup}%`],
      ['% Alertas de calidad', `${data.porcentaje_alertas_calidad}%`],
    ],
  });
  const simpleList = (title: string, items: string[] | undefined, yStart: number) => {
    if (!items?.length) return;
    doc.setFontSize(12);
    doc.text(title, 14, yStart);
    doc.setFontSize(10);
    autoTable(doc, {
      startY: yStart + 2,
      head: [['Items']],
      body: items.map((item) => [item]),
    });
  };
  let lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? 80;
  simpleList('Fortalezas', data.fortalezas_recurrentes, lastY + 5);
  lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  simpleList('Oportunidades de Mejora', data.oportunidades_mejora_recurrentes, lastY + 5);
  lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  simpleList('Recomendaciones', data.recomendaciones, lastY + 5);
  lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  simpleList('Agentes Destacados', data.agentes_destacados, lastY + 5);
  lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  simpleList('Agentes con Bajo Rendimiento', data.agentes_con_bajo_performance, lastY + 5);
  lastY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? lastY;
  simpleList('Temas Principales', data.temas_principales, lastY + 5);
  lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  simpleList('Palabras Clave Frecuentes', data.palabras_clave_frecuentes, lastY + 5);
  lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  simpleList('Alertas de Calidad', data.alertas_calidad_recurrentes, lastY + 5);
  doc.setFontSize(12);
  doc.text('Resumen Ejecutivo:', 14, ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80) + 10);
  doc.setFontSize(10);
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;
  doc.text(doc.splitTextToSize(data.resumen_ejecutivo, 180), 14, finalY + 16);
  doc.save(`Analisis_${data.cliente}_${new Date(data.DateTime_realizado).toISOString()}.pdf`);
}

export function exportarAgentePDF(data: AgenteResponsePerformance): void {
  const doc = new jsPDF();
  const now = new Date().toLocaleString();
  doc.setFontSize(16);
  doc.text('Reporte de Análisis de Agente', 14, 15);
  doc.setFontSize(10);
  doc.text(`Fecha de generación: ${now}`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [['Campo', 'Valor']],
    body: [
      ['ID Empleado', data.id_empleado],
      ['Nombre', data.nombre_empleado],
      ['Fecha análisis', new Date(data.DateTime_realizado).toLocaleString()],
      ['Rango analizado', `${data.fecha_inicio_busqueda} a ${data.fecha_fin_busqueda}`],
      ['N° de llamadas', data.numero_llamadas],
      ['Score de performance promedio', data.performance_score_promedio.toFixed(2)],
      ['Satisfacción cliente promedio', data.satisfaccion_cliente_promedio.toFixed(2)],
      ['Dispersión performance', data.dispersión_performance_score?.toFixed(2) ?? 'N/A'],
      ['Dispersión satisfacción', data.dispersión_satisfaccion_cliente?.toFixed(2) ?? 'N/A'],
      ['Sentimiento predominante', data.sentimiento_predominante],
      ['% Resueltos', `${data.porcentaje_resueltos}%`],
      ['% Escalados', `${data.porcentaje_escalados}%`],
      ['% Follow-up', `${data.porcentaje_followup}%`],
      ['% Alertas calidad', `${data.porcentaje_alertas_calidad}%`],
    ],
  });
  let lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? 80;
  autoTable(doc, {
    startY: lastY + 5,
    head: [['Protocolo Cumplido', 'Cantidad']],
    body: [
      ['Sí', data.protocolo_cumplido.sí],
      ['Parcial', data.protocolo_cumplido.parcial],
      ['No', data.protocolo_cumplido.no],
    ],
  });
  const simpleList = (title: string, items: string[] | undefined, yStart: number) => {
    if (!items?.length) return;
    doc.setFontSize(12);
    doc.text(title, 14, yStart);
    doc.setFontSize(10);
    autoTable(doc, {
      startY: yStart + 2,
      head: [['Items']],
      body: items.map((item) => [item]),
    });
  };
  lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? 80;
  simpleList('Fortalezas', data.fortalezas_recurrentes, lastY + 5);
  lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  simpleList('Oportunidades de Mejora', data.oportunidades_mejora_recurrentes, lastY + 5);
  lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  simpleList('Temas Principales', data.temas_principales, lastY + 5);
  lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  simpleList('Palabras Clave Frecuentes', data.palabras_clave_frecuentes, lastY + 5);
  lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  simpleList('Alertas de Calidad Recurrentes', data.alertas_calidad_recurrentes, lastY + 5);
  lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  simpleList('Recomendaciones', data.recomendaciones, lastY + 15);
  lastY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? lastY;
  doc.setFontSize(12);
  doc.text('Resumen Ejecutivo:', 14, lastY + 16);
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(data.resumen_ejecutivo, 180), 14, lastY + 20);
  doc.save(`Analisis_${data.nombre_empleado}_${new Date(data.DateTime_realizado).toISOString()}.pdf`);
}

// ======== Componente principal ========

const DashboardPerfomance = () => {
  const [modo, setModo] = useState<"area" | "agente" | null>("area");
  const [nombre, setNombre] = useState("");
  const [ClientePerformance, setClientePerformance] = useState<ClienteResponsePerformance | null>(null);
  const [AgentePerformance, setAgentePerformance] = useState<AgenteResponsePerformance | null>(null);
  const [ErrorMessage, setErrorMessage] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Pega aquí TODOS tus agentes y empleados relevantes
  const agentes = [
    'NATURA ARGENTINA', 'NATURA PERÚ', 'NATURA COLOMBIA', 'NATURA COLOMBIA CND', 'NATURA PERÚ CND', 'NATURA MEXICO'
  ];
  const empleados = [
    '#N/D', 'CUADRADO NAVARRO ROXANA CINTHIA', 'AGURTO YATACO', 'CORDOVA OJEDA VALERIA MICOL', 'CARRANZA FLORES DIANA CINTHYA',
    'SEGURA TUMEZ JAQUELINE ESMELID', 'RODRIGUEZ TAIPE ENRIQUE DIEGO', 'RAMOS GARCIA KEILA LIZETH', 'VELAZCO YAMUNAQUE ALEJANDRA NICOLL',
    'ACOSTA MILAGROS DUMELIS', 'CASTAÑEDA RODAS JUAN EMMANUEL', 'RODRIGUEZ PRADO FERNANDO JESUS', 'QUINTANA GARCIA ALESSANDRA GABRIELA',
    'CABELLO COTERA ELIM MANUELA', 'MURAYARI JABA JIN KEVIN', 'ROIG CALLIRGOS FIORELLA', 'SALAZAR PACHERRES VICTOR JESUS',
    'YZACOPE VEGA PATRICIA INES', 'RAMOS CURASMA JESSICA ALICIA', 'MEZA ACHO MELVILEY', 'MORAN PALOMINO DIANA HELEN', 'QUISPE RODRIGUEZ CARLOS JESUS ENRIQUE'
  ];

  // === LOGS DE BOTONES: PDF y Visualizar registros ===

  // Visualizar registros anteriores (redirige y loguea)
  const handleVerRegistros = async () => {
    const user_id = localStorage.getItem("id");
    const user_email = localStorage.getItem("email");
    let action = "";
    if (modo === "area") {
      action = `Visualizó historial de análisis por área`;
    } else if (modo === "agente") {
      action = `Visualizó historial de análisis por agente`;
    }
    try {
      if (user_id && user_email) {
        await apiService.postSupervisorLog({
          user_id,
          user_email,
          action
        });
      }
    } finally {
      if (modo === "area") {
        navigate("/dashboard/Performance/HistorialCliente");
      } else {
        navigate("/dashboard/Performance/HistorialAgente");
      }
    }
  };

  // Descargar PDF (loguea y exporta)
  const handleDescargarPDF = async () => {
    const user_id = localStorage.getItem("id");
    const user_email = localStorage.getItem("email");
    let action = "";
    if (modo === "area" && ClientePerformance) {
      action = `Descargó análisis de área "${ClientePerformance.cliente}" en PDF`;
      exportarClientePDF(ClientePerformance);
    } else if (modo === "agente" && AgentePerformance) {
      action = `Descargó análisis del agente "${AgentePerformance.nombre_empleado}" en PDF`;
      exportarAgentePDF(AgentePerformance);
    }
    try {
      if (user_id && user_email && action) {
        await apiService.postSupervisorLog({
          user_id,
          user_email,
          action
        });
      }
    } catch {}
  };

  // Buscar análisis (NO loguea, solo análisis)
  const handleBuscar = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      if (modo === 'area') {
        const fi = fechaInicio ? formatDateToDMY(fechaInicio) : '';
        const ff = fechaFin ? formatDateToDMY(fechaFin) : '';
        const data = await ClientePerformanceService.postAnalisisClientePerformanceService(
          nombre, fi, ff
        );
        setClientePerformance(data);
        setAgentePerformance(null);
      }
      if (modo === 'agente') {
        const fi = fechaInicio ? formatDateToDMY(fechaInicio) : '';
        const ff = fechaFin ? formatDateToDMY(fechaFin) : '';
        const data = await AgentePerformanceService.PostAgentePerformance(
          nombre, fi, ff
        );
        setAgentePerformance(data);
        setClientePerformance(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al buscar el análisis");
    } finally {
      setLoading(false);
    }
  };

  // ====== RENDER ======
  return (
    <div className="w-full min-h-screen p-4">
      <div className="bg-white p-4 rounded shadow ">
        <h1 className="text-xl font-bold mb-4">🔍 Seleccione qué desea analizar</h1>
        <div className="flex flex-wrap items-center justify-between mb-3">
          <div className="flex gap-4">
            <button
              className={`px-4 py-2 rounded ${modo === "area" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              onClick={() => setModo("area")}
            >
              Por Área
            </button>
            <button
              className={`px-4 py-2 rounded ${modo === "agente" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              onClick={() => setModo("agente")}
            >
              Por Agente
            </button>
          </div>
          <div className="flex gap-4">
            {modo && (
              <button
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                onClick={handleVerRegistros}
              >
                Visualizar registros anteriores por {modo === "area" ? "área" : "agente"}
              </button>
            )}
            {(ClientePerformance && modo === 'area') && (
              <button
                onClick={handleDescargarPDF}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                📄 Exportar análisis a PDF
              </button>
            )}
            {(AgentePerformance && modo === 'agente') && (
              <button
                onClick={handleDescargarPDF}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                📄 Exportar análisis a PDF
              </button>
            )}
          </div>
        </div>
        {modo && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6">
            <div className="col-span-1">
              <label className="block text-sm font-medium">
                {modo === "area" ? "Nombre del Área" : "Nombre del Agente"}
              </label>
              {modo === "area" ? (
                <div>
                  <label className="font-medium text-sm">Área</label>
                  <select
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2"
                  >
                    <option value="">Todas</option>
                    {agentes.map((agencia, idx) => (
                      <option key={idx} value={agencia}>{agencia}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-medium text-sm">Empleado</label>
                  <select
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2"
                  >
                    <option value="">Todos</option>
                    {empleados.map((empleado, idx) => (
                      <option key={idx} value={empleado}>{empleado}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium">Fecha Inicio</label>
              <input placeholder="fecha inicio"
                className="w-full border px-2 py-1 rounded"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Fecha Fin</label>
              <input placeholder="fecha fin"
                className="w-full border px-2 py-1 rounded"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <button
              onClick={handleBuscar}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              disabled={loading}
            >
              Buscar
            </button>
          </div>
        )}
      </div>
      {/* Resultados */}
      {!loading && modo === 'area' && ClientePerformance && (
        <div className="mt-6 p-4 bg-white shadow rounded">
          <h2 className="text-xl font-bold mb-2">📊 Resultado del análisis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Cliente:</strong> {ClientePerformance.cliente}</p>
              <p><strong>Número de llamadas:</strong> {ClientePerformance.numero_llamadas}</p>
              <p><strong>Performance promedio:</strong> {ClientePerformance.performance_score_promedio?.toFixed(2)}</p>
              <p><strong>Satisfacción promedio:</strong> {ClientePerformance.satisfaccion_cliente_promedio?.toFixed(2)}</p>
              <p><strong>Sentimiento global:</strong> {ClientePerformance.sentimiento_global}</p>
            </div>
            <div>
              <p><strong>Porcentaje resueltos:</strong> {ClientePerformance.porcentaje_resueltos}%</p>
              <p><strong>Follow-up:</strong> {ClientePerformance.porcentaje_followup}%</p>
              <p><strong>Alertas calidad:</strong> {ClientePerformance.porcentaje_alertas_calidad}%</p>
              <p><strong>Escalados:</strong> {ClientePerformance.porcentaje_escalados}%</p>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-semibold">📝 Resumen ejecutivo</h3>
            <p>{ClientePerformance.resumen_ejecutivo}</p>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold">⭐ Fortalezas</h4>
              <ul className="list-disc ml-5">
                {ClientePerformance.fortalezas_recurrentes?.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">🔧 Oportunidades de mejora</h4>
              <ul className="list-disc ml-5">
                {ClientePerformance.oportunidades_mejora_recurrentes?.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">📣 Recomendaciones</h4>
              <ul className="list-disc ml-5">
                {ClientePerformance.recomendaciones?.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">🏆 Agentes destacados</h4>
              <ul className="list-disc ml-5">
                {ClientePerformance.agentes_destacados?.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">⚠️ Agentes con bajo rendimiento</h4>
              <ul className="list-disc ml-5">
                {ClientePerformance.agentes_con_bajo_performance?.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold">🔍 Temas principales</h4>
            <ul className="list-disc ml-5">
              {ClientePerformance.temas_principales?.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {!loading && modo === 'agente' && AgentePerformance && (
        <div className="mt-6 p-4 bg-white shadow rounded">
          <h2 className="text-xl font-bold mb-2">📈 Resultado del análisis del agente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Nombre:</strong> {AgentePerformance.nombre_empleado}</p>
              <p><strong>ID:</strong> {AgentePerformance.id_empleado}</p>
              <p><strong>Llamadas:</strong> {AgentePerformance.numero_llamadas}</p>
              <p><strong>Performance promedio:</strong> {AgentePerformance.performance_score_promedio}</p>
              <p><strong>Satisfacción promedio:</strong> {AgentePerformance.satisfaccion_cliente_promedio}</p>
              <p><strong>Sentimiento:</strong> {AgentePerformance.sentimiento_predominante}</p>
            </div>
            <div>
              <p><strong>% Resueltos:</strong> {AgentePerformance.porcentaje_resueltos}%</p>
              <p><strong>% Escalados:</strong> {AgentePerformance.porcentaje_escalados}%</p>
              <p><strong>% Follow-up:</strong> {AgentePerformance.porcentaje_followup}%</p>
              <p><strong>% Alertas calidad:</strong> {AgentePerformance.porcentaje_alertas_calidad}%</p>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-semibold">📝 Resumen ejecutivo</h3>
            <p>{AgentePerformance.resumen_ejecutivo}</p>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold">⭐ Fortalezas</h4>
              <ul className="list-disc ml-5">
                {AgentePerformance.fortalezas_recurrentes?.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">🔧 Oportunidades de mejora</h4>
              <ul className="list-disc ml-5">
                {AgentePerformance.oportunidades_mejora_recurrentes?.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">📣 Recomendaciones</h4>
              <ul className="list-disc ml-5">
                {AgentePerformance.recomendaciones?.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold">📌 Temas principales</h4>
            <ul className="list-disc ml-5">
              {AgentePerformance.temas_principales?.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {loading && (
        <div className="flex justify-center items-center mt-6">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-blue-600 font-semibold">Cargando datos...</p>
          </div>
        </div>
      )}
      {ErrorMessage !== '' && (
        <p>{ErrorMessage}</p>
      )}
    </div>
  );
};

export default DashboardPerfomance;
