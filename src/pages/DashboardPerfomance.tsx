// src/pages/PerformanceSelector.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DashboardPerfomance= ()=> {
  const [modo, setModo] = useState<"area" | "agente" | null>(null);
  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const navigate = useNavigate();

  const handleBuscar = () => {
    if (!nombre || !fechaInicio || !fechaFin) return;
    navigate(`/resultado?modo=${modo}&nombre=${nombre}&inicio=${fechaInicio}&fin=${fechaFin}`);
  };

  return (
    <div className="w-full min-h-screen p-4">
      <h1 className="text-xl font-bold mb-4">🔍 Seleccione qué desea analizar</h1>

      <div className="flex gap-4 mb-6">
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

      {modo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6">
          <div className="col-span-1">
            <label className="block text-sm font-medium">
              {modo === "area" ? "Nombre del Área" : "Nombre del Agente"}
            </label>
            <input placeholder={modo === "area" ? "Nombre del Área" : "Nombre del Agente"}
                          className="w-full border px-2 py-1 rounded"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
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
          >
            Buscar
          </button>
        </div>
      )}

      {/* Aquí puedes mostrar registros anteriores si tienes una lista */}
      <div className="bg-gray-100 rounded p-4">
        <h2 className="text-lg font-semibold mb-2">📋 Registros anteriores</h2>
        {/* Lista o tabla de registros */}
      </div>
    </div>
  );
}
export default DashboardPerfomance;