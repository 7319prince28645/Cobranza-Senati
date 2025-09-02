// src/components/CobroViewer.jsx
import { useState } from "react";
import RenderCobros from "@/components/Cobros/RenderCobros";
import { ImportDataStream } from "@/services/ObtenerData";

const CobroViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleCobros = () => {
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
  };

  console.log("Logs actuales:", logs);

  return (
    <div className="p-4  space-y-6">
      {/* Título */}
      <h1 className="text-3xl font-bold text-center text-gray-800">
        ⚡ Herramientas APEX
      </h1>

      {/* Botones de acción */}
      <div className="flex justify-center gap-4">
        <button className="px-4 py-2 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-100 transition text-gray-700 font-medium">
          ✅ Aceptar Workflow
        </button>

        <button
          onClick={handleCobros}
          disabled={loading}
          className={`px-4 py-2 rounded-xl shadow-sm font-medium transition text-white ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "⏳ Procesando..." : "💰 Gestionar Cobros"}
        </button>
      </div>


      {logs.length > 0 ? (
        <RenderCobros logs={logs} />
      ) : (
        <p className="text-gray-500 text-center py-6">
          No hay datos para mostrar.
        </p>
      )}
    </div>
  );
};

export default CobroViewer;
