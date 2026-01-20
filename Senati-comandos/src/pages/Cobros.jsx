// src/components/CobroViewer.jsx
import { useState } from "react";
import { ImportDataStream } from "@/services/ObtenerData";
import RenderCobros from "@/components/Cobros/RenderCobros";
import RenderFechas from "@/components/Fechas/RenderFechas";
import '../../public/print.css';

const CobroViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vistaActiva, setVistaActiva] = useState(null); // 👈 cuál componente mostrar
  const [showYearModal, setShowYearModal] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const handleProceso = (tipo) => {
    if (tipo === "cobros") {
      // Mostrar modal para solicitar el año
      setShowYearModal(true);
    } else {
      setVistaActiva(tipo);
      setLogs([]);
    }
  };

  const iniciarProcesoCobros = () => {
    // Validar año
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      alert("⚠️ Por favor ingresa un año válido (ej: 2026)");
      return;
    }

    setShowYearModal(false);
    setVistaActiva("cobros");
    setLogs([]);
    setLoading(true);

    const es = ImportDataStream(
      (data) => {
        if (data?.msg?.hoja) {
          setLogs((prev) => [...prev, data]);
        } else {
          console.log("🔹 Mensaje suelto:", data);
        }
      },
      () => {
        console.log("✅ Proceso completado");
        setLoading(false);
      },
      yearNum // 👈 Enviar el año al backend
    );

    return () => es.close();
  };

  return (
    <div className="p-6 space-y-6">
      {/* 🎯 Modal para ingresar año */}
      {showYearModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              📅 Seleccionar Año de Análisis
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Ingresa el año para analizar los periodos correspondientes
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año:
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Ej: 2026"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg font-semibold text-center"
                min="2000"
                max="2100"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Se analizarán los periodos: {year}02 y {year}12
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowYearModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={iniciarProcesoCobros}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/30"
              >
                Iniciar Análisis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧭 Título */}
      <h1 className="text-3xl font-bold text-center text-gray-800">
        ⚡ Herramientas APEX
      </h1>

      {/* 🧩 Botones de acción */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => handleProceso("fechas")}
          disabled={loading}
          className={`px-4 py-2 rounded-xl border border-gray-300 shadow-sm font-medium transition ${
            vistaActiva === "fechas"
              ? "bg-blue-600 text-white"
              : "bg-white hover:bg-gray-100 text-gray-700"
          }`}
        >
          📅 Fechas de Instrucción
        </button>

        <button
          onClick={() => handleProceso("cobros")}
          disabled={loading}
          className={`px-4 py-2 rounded-xl shadow-sm font-medium transition text-white ${
            vistaActiva === "cobros"
              ? "bg-blue-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading && vistaActiva === "cobros"
            ? "⏳ Procesando..."
            : "💰 Gestionar Cobros"}
        </button>
      </div>

      {/* 🧾 Contenido dinámico */}
      <div className="min-h-[300px] mt-4">
        {vistaActiva === "fechas" && <RenderFechas/>} {/* 👈 componente de fechas */}
        {vistaActiva === "cobros" && (
          <RenderCobros logs={logs} loading={loading} />
        )}

        {!vistaActiva && (
          <p className="text-gray-500 text-center py-6">
            Selecciona una herramienta para comenzar.
          </p>
        )}
      </div>
    </div>
  );
};

export default CobroViewer;
