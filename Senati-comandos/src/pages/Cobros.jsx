// src/components/CobroViewer.jsx
import { ImportDataStream } from "@/services/ObtenerData";
import { useEffect, useState } from "react";
import html2canvas from "html2canvas";

const CobroViewer = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
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
      }
    );
   
    return () => es.close();
  }, []);
  const copiarTabla = async (id) => {
    const tabla = document.getElementById(id);
    if (!tabla) return;

    const canvas = await html2canvas(tabla);
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        const horaActual = new Date().getHours();

        const texto = `${horaActual > 12 ? "Buenas tardes" : "Buenos días"},
🔹 Les recordamos que el pago de la mensualidad debe realizarse al inicio de cada ciclo.  
✅ Alumnos en negro: Cancelaron.  
⚠ Alumnos en rojo: Aún deben el presente mes.  
🚨 Alumnos con nrc ❌: Deben el mes anterior y corren riesgo de ser retirados del sistema.`;

        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob, // Imagen del canvas
            "text/plain": new Blob([texto], { type: "text/plain" }), // Texto adicional
          }),
        ]);

        alert(
          "✅ Imagen + texto copiados. Según la app, puede aparecer ambos o solo uno."
        );
      } catch (err) {
        console.error("❌ Error al copiar: ", err);
      }
    });
  };

  console.log("🔍 Logs de progreso:", logs);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-700">
        📡 Reporte de Cobros por Hoja
      </h1>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {logs.map((hoja, i) => {
          const nrcEsperado = hoja.msg.hoja.split("-")[0].trim();
          const tablaId = `tabla-${i}`;

          return (
            <li
              key={i}
              className="p-5 shadow-md border rounded-2xl bg-white hover:shadow-lg transition"
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-lg text-gray-700">
                  📘 Hoja:{" "}
                  <span className="text-blue-600">{hoja.msg.hoja}</span>{" "}
                  <span className="ml-2 text-sm text-gray-500">
                    ({hoja.msg.resultados.length} registros)
                  </span>
                </h2>
                <button
                  onClick={() => copiarTabla(tablaId)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  📋 Copiar tabla
                </button>
              </div>

              <div className="overflow-x-auto">
                <table
                  id={tablaId}
                  className="w-full text-sm border border-gray-300 rounded-lg"
                >
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2">ID</th>
                      <th className="border p-2">Nombre</th>
                      <th className="border p-2">NRC</th>
                      <th className="border p-2">Concepto</th>
                      <th className="border p-2">Vencimiento</th>
                      <th className="border p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hoja.msg.resultados.map((res, j) => {
                      const d = res?.datos?.find(
                        (item) =>
                          item.nrc || item.concepto || item.monto || item.estado
                      );

                      if (!d) {
                        return (
                          <tr key={j} className="bg-red-50">
                            <td className="border p-2 text-center text-gray-600">
                              {res?.id ?? "-"}
                            </td>
                            <td className="border p-2 text-center text-gray-600">
                              {res?.nombreAlumno ?? "-"}
                            </td>
                            <td
                              colSpan={5}
                              className="border p-2 text-center text-red-500 italic"
                            >
                              ❌ Sin datos disponibles
                            </td>
                          </tr>
                        );
                      }

                      const estadoClass =
                        d.estado === "Pendiente de pago"
                          ? "text-red-500 font-semibold"
                          : "";

                      return (
                        <tr key={j} className="hover:bg-gray-50">
                          <td
                            className={`border p-2 text-center ${estadoClass}`}
                          >
                            {d?.id}
                          </td>
                          <td className={`border p-2 ${estadoClass}`}>
                            {res?.nombreAlumno ?? "-"}
                          </td>
                          <td
                            className={`border p-2 text-center ${estadoClass}`}
                          >
                            {d.nrc}
                            {d.nrc !== nrcEsperado && (
                              <span className="ml-1">❌</span>
                            )}
                          </td>
                          <td
                            className={`border p-2 text-center ${estadoClass}`}
                          >
                            {d.concepto}
                          </td>
                          <td
                            className={`border p-2 text-center ${estadoClass}`}
                          >
                            {d.fechaVencimiento}
                          </td>
                          <td
                            className={`border p-2 text-center ${estadoClass}`}
                          >
                            {d.estado === "BECADO" ? "Cancelada" : d.estado}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CobroViewer;
