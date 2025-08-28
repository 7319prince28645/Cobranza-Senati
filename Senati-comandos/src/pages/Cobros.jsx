// src/components/CobroViewer.jsx
import { ImportDataStream } from "@/services/ObtenerData";
import { useEffect, useState } from "react";
import html2canvas from "html2canvas";

const CobroViewer = () => {
  const [logs, setLogs] = useState([]);
  const [incluirMatricula, setIncluirMatricula] = useState({}); // ✅ control de checks

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

  const copiarTabla = async (id, i) => {
    const tabla = document.getElementById(id);
    if (!tabla) return;

    // ✅ clonar tabla para aplicar filtros antes de tomar screenshot
    const clone = tabla.cloneNode(true);

    // 1. quitar columna matrícula si no está marcada
    if (!incluirMatricula[i]) {
      const thIndex = Array.from(clone.querySelectorAll("th")).findIndex((th) =>
        th.innerText.toLowerCase().includes("matrícula")
      );
      if (thIndex >= 0) {
        clone.querySelectorAll("tr").forEach((tr) => {
          if (tr.children[thIndex]) tr.removeChild(tr.children[thIndex]);
        });
      }
    }

    // 2. cortar filas con más de 2 seguidas sin datos
    let consecutivosVacios = 0;
    Array.from(clone.querySelectorAll("tbody tr")).forEach((tr) => {
      const texto = tr.innerText.toLowerCase();
      const esVacio =
        texto.includes("sin datos") || texto.includes("sin matrícula");
      if (esVacio) {
        consecutivosVacios++;
      } else {
        consecutivosVacios = 0;
      }
      if (consecutivosVacios > 0) tr.remove(); // ❌ borra lo que sobra
    });

    // usar canvas sobre el clon (temporal oculto)
    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.top = "-9999px";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const canvas = await html2canvas(clone);
    document.body.removeChild(wrapper);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const horaActual = new Date().getHours();
        const texto = `${horaActual > 12 ? "Buenas tardes" : "Buenos días"},
🔹 Les recordamos que el pago de la mensualidad debe realizarse al inicio de cada ciclo.
✅ Alumnos en negro: Cancelaron.
⚠ Alumnos en rojo: Aún deben el presente mes.
🚨 Alumnos con NRC ❌: Deben el mes anterior y corren riesgo de ser retirados del sistema.`;

        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
            "text/plain": new Blob([texto], { type: "text/plain" }),
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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
        📡 Reporte de Cobros por Hoja
      </h1>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {logs.map((hoja, i) => {
          const tablaId = `tabla-${i}`;
          const nrcEsperado = hoja?.msg?.hoja?.split("-")[0]?.trim() ?? "";

          // ✅ calcular si esta hoja usa columna “Matrícula”
          const tieneMatricula = Array.isArray(hoja?.msg?.resultados)
            ? hoja.msg.resultados.some((res) =>
                (res?.datos ?? []).some((item) =>
                  (item?.concepto ?? "").toLowerCase().includes("matricula")
                )
              )
            : false;

          return (
            <li
              key={i}
              className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold text-lg text-gray-800">
                    📘 Hoja:{" "}
                    <span className="text-blue-600">{hoja?.msg?.hoja}</span>
                  </h2>
                  <p className="text-sm text-gray-500">
                    {hoja?.msg?.resultados?.length ?? 0} registros
                    {tieneMatricula && (
                      <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 align-middle">
                        Contiene Matrícula
                      </span>
                    )}
                  </p>
                  {tieneMatricula && (
                    <label className="mt-2 flex items-center text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={!!incluirMatricula[i]}
                        onChange={(e) =>
                          setIncluirMatricula((prev) => ({
                            ...prev,
                            [i]: e.target.checked,
                          }))
                        }
                        className="mr-2"
                      />
                      Incluir matrícula en copia
                    </label>
                  )}
                </div>

                <button
                  onClick={() => copiarTabla(tablaId, i)}
                  className="px-3 py-1.5 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                >
                  📋 Copiar tabla
                </button>
              </div>

              {/* tabla visible */}
              <div className="overflow-x-auto rounded-lg border">
                <table id={tablaId} className="w-full text-sm bg-white">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr className="[&>th]:p-2 [&>th]:border-b [&>th]:border-gray-200 text-left">
                      <th>ID</th>
                      <th>Nombre</th>
                      <th className="text-center">NRC</th>
                      {tieneMatricula && (
                        <th className="text-center">Matrícula</th>
                      )}
                      <th className="text-center">Concepto</th>
                      <th className="text-center">Vencimiento</th>
                      <th className="text-center">Estado</th>
                    </tr>
                  </thead>

                  <tbody className="text-gray-800">
                    {(hoja?.msg?.resultados ?? []).map((res, j) => {
                      const datosValidos = (res?.datos ?? []).filter(
                        (x) => x && (x.nrc || x.concepto || x.monto || x.estado)
                      );

                      const matricula = datosValidos.find((x) =>
                        (x?.concepto ?? "").toLowerCase().includes("matricula")
                      );
                      const cuota = datosValidos.find((x) =>
                        /cuota/i.test(x?.concepto ?? "")
                      );
                      const d = cuota || datosValidos[0] || null;

                      const estadoEsPendiente =
                        (d?.estado ?? "").toLowerCase() === "pendiente de pago";
                      const estadoClass = estadoEsPendiente
                        ? "text-red-600 font-semibold"
                        : "";
                      const nrcDistinto =
                        d?.nrc && nrcEsperado && d.nrc !== nrcEsperado;

                      if (!d) {
                        return (
                          <tr key={j} className="bg-red-50/60 hover:bg-red-50">
                            <td className="p-2 border-t text-center text-gray-600">
                              {res?.id ?? "-"}
                            </td>
                            <td className="p-2 border-t">
                              {res?.nombreAlumno ?? "-"}
                            </td>
                            <td className="p-2 border-t text-center">-</td>
                            {tieneMatricula && (
                              <td className="p-2 border-t text-center text-red-500 italic">
                                ❌ Sin matrícula
                              </td>
                            )}
                            <td className="p-2 border-t text-center text-red-600 italic">
                              Sin datos
                            </td>
                            <td className="p-2 border-t text-center">—</td>
                            <td className="p-2 border-t text-center">—</td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={j} className="hover:bg-gray-50">
                          <td
                            className={`p-2 border-t text-center ${estadoClass}`}
                          >
                            {d?.id ?? res?.id ?? "-"}
                          </td>
                          <td className={`p-2 border-t ${estadoClass}`}>
                            {res?.nombreAlumno ?? "-"}
                          </td>
                          <td
                            className={`p-2 border-t text-center ${
                              nrcDistinto ? "text-red-600 font-semibold" : ""
                            }`}
                          >
                            {d?.nrc ?? "-"}
                            {nrcDistinto && <span className="ml-1">❌</span>}
                          </td>
                          {tieneMatricula && (
                            <td className="p-2 border-t text-center">
                              {matricula
                                ? matricula.estado === "BECADO"
                                  ? "Cancelada"
                                  : matricula.estado
                                : "❌ Sin matrícula"}
                            </td>
                          )}
                          <td className="p-2 border-t text-center">
                            {d?.concepto ?? "-"}
                          </td>
                          <td className="p-2 border-t text-center">
                            {d?.fechaVencimiento ?? "-"}
                          </td>
                          <td
                            className={`p-2 border-t text-center ${estadoClass}`}
                          >
                            {d?.estado === "BECADO"
                              ? "Cancelada"
                              : d?.estado ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* leyenda compacta */}
              <div className="mt-3 text-xs text-gray-500">
                <span className="inline-block mr-3">
                  Es indispensable que el pago se realice al inicio de cada
                  ciclo
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CobroViewer;
