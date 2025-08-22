// src/components/CobroViewer.jsx
import { ImportDataStream } from "@/services/ObtenerData";
import { useEffect, useState } from "react";
import html2canvas from "html2canvas";

const CobroViewer = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const es = ImportDataStream(
      (data) => {
        if (data.msg.hoja) {
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
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        alert("✅ Copiado como imagen. Ahora pégalo en WhatsApp.");
      } catch (err) {
        console.error("❌ Error al copiar: ", err);
      }
    });
  };

  console.log("🔍 Logs de progreso:", logs);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">📡 Progreso por hoja</h1>
      <ul>
        {logs.map((hoja, i) => {
          const nrcEsperado = hoja.msg.hoja.split("-")[0].trim();
          const tablaId = `tabla-${i}`;

          return (
            <li key={i} className="p-4 border rounded-lg mb-3 bg-gray-50">
              <p className="font-semibold">
                📘 Hoja: {hoja.msg.hoja} ({hoja.msg.registros} registros)
              </p>

              <div className="mt-2 ml-4 space-y-2">
                {hoja?.msg?.resultados && hoja.msg.resultados.length > 0 && (
                  <>
                    <table
                      id={tablaId}
                      className="w-full text-sm border mt-2 bg-white"
                    >
                      <thead className="bg-gray-200">
                        <tr>
                          <th className="border p-1">ID</th>
                          <th className="border p-1">NRC</th>
                          <th className="border p-1">Concepto</th>
                          <th className="border p-1">Monto</th>
                          <th className="border p-1">Vencimiento</th>
                          <th className="border p-1">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hoja.msg.resultados.map(
                          (res, j) =>
                            res.datos &&
                            res.datos.length > 2 &&
                            (() => {
                              const d = res.datos[2];
                              const estadoClass =
                                d.estado === "Pendiente de pago"
                                  ? "text-red-500 font-bold"
                                  : "";
                              const nrcClass =
                                d.nrc !== nrcEsperado
                                  ? "text-red-500 font-bold"
                                  : "";

                              return (
                                <tr key={j}>
                                  <td className="border p-1">{d.id}</td>
                                  <td className={`border p-1 ${nrcClass}`}>
                                    {d.nrc}
                                    {d.nrc !== nrcEsperado && (
                                      <span className="ml-2 text-red-500">
                                        ❌ NRC distinto
                                      </span>
                                    )}
                                  </td>
                                  <td className="border p-1">{d.concepto}</td>
                                  <td className="border p-1">{d.monto}</td>
                                  <td className="border p-1">
                                    {d.fechaVencimiento}
                                  </td>
                                  <td className={`border p-1 ${estadoClass}`}>
                                    {d.estado}
                                  </td>
                                </tr>
                              );
                            })()
                        )}
                      </tbody>
                    </table>

                    <button
                      onClick={() => copiarTabla(tablaId)}
                      className="mt-2 bg-blue-500 text-white px-3 py-1 rounded"
                    >
                      📋 Copiar como Imagen
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CobroViewer;
