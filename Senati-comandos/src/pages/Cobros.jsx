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

  const handleProceso = (tipo) => {
    setVistaActiva(tipo);
    setLogs([]); // limpia logs anteriores

    if (tipo === "cobros") {
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
        }
      );

      return () => es.close();
    }
    
  };

  return (
    <div className="p-6 space-y-6">
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
