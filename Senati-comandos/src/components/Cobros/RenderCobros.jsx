import { useState } from "react";
import html2canvas from "html2canvas";

function RenderCobros({ logs }) {
  const [incluirMatricula, setIncluirMatricula] = useState({}); // ✅ control de checks
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
    Array.from(clone.querySelectorAll("tbody tr")).forEach(
      (tr, index, filas) => {
        const texto = tr.innerText.toLowerCase();
        const esVacio =
          !texto || /(^\s*$|no hay datos|sin datos|—|n\/a)/.test(texto);

        if (esVacio) {
          consecutivosVacios++;
        } else {
          consecutivosVacios = 0;
        }

        // Si ya tenemos 2 consecutivos vacíos, eliminar esta y todas las que siguen
        if (consecutivosVacios >= 1) {
          // borrar desde la fila actual hasta el final
          for (let i = index; i < filas.length; i++) {
            filas[i].remove();
          }
          return; // cortar ejecución del forEach
        }
      }
    );
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
    <div className="min-h-screen p-3">
      {/* Título */}
      <h1 className="text-xl font-semibold mb-2 text-center text-gray-800 tracking-tight">
        📡 Reporte de Cobros por Hoja
      </h1>

      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {logs.map((hoja, i) => {
          const tablaId = `tabla-${i}`;
          const nrcEsperado = hoja?.msg?.hoja?.split("-")[0]?.trim() ?? "";

          let alumnosCancelados = [];
          console.log("Alumnos cancelados:", alumnosCancelados);
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
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition p-4"
            >
              {/* Encabezado */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-medium text-gray-800 text-sm">
                    📘 Hoja:{" "}
                    <span className="font-semibold text-blue-600">
                      {hoja?.msg?.hoja}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {hoja?.msg?.resultados?.length ?? 0} registros
                    {tieneMatricula && (
                      <span className="ml-2 px-1.5 py-0.5 text-[11px] rounded-full bg-emerald-100 text-emerald-700">
                        Matrícula
                      </span>
                    )}
                  </p>

                  {tieneMatricula && (
                    <label className="mt-2 flex items-center text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={!!incluirMatricula[i]}
                        onChange={(e) =>
                          setIncluirMatricula((prev) => ({
                            ...prev,
                            [i]: e.target.checked,
                          }))
                        }
                        className="mr-1.5 h-3 w-3 rounded border-gray-300"
                      />
                      Incluir matrícula en copia
                    </label>
                  )}
                </div>

                <button
                  onClick={() => copiarTabla(tablaId, i)}
                  className="px-2.5 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  📋 Copiar
                </button>
              </div>

              {/* Tabla */}
              <div
                id={tablaId}
                className="overflow-x-auto rounded-lg border border-gray-200"
              >
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr className="[&>th]:px-2 [&>th]:py-1.5  [&>th]:font-medium text-center">
                      <th>N°</th>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th className="text-center">NRC</th>
                      {tieneMatricula && (
                        <th className="text-center">Matrícula</th>
                      )}
                      <th className="text-center">Codigo de Pago</th>
                      <th className="text-center">Vencimiento</th>
                      <th className="text-center">Estado</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {(hoja?.msg?.resultados ?? []).map((res, j) => {
                      const datosValidos = (res?.datos ?? []).filter(
                        (x) => x && (x.nrc || x.concepto || x.monto || x.estado)
                      );

                      // 📌 Buscar matrícula y cuotas
                      const matricula = datosValidos.find((x) =>
                        (x?.concepto ?? "").toLowerCase().includes("matricula")
                      );

                      // 📌 Buscar NRC más alto
                      const d =
                        datosValidos.length > 0
                          ? datosValidos.reduce((max, x) => {
                              const nrcNum = parseInt(x.nrc, 10) || 0; // si no tiene número → 0
                              const maxNum = parseInt(max.nrc, 10) || 0;
                              return nrcNum > maxNum ? x : max;
                            })
                          : null;

                      const estadoEsPendiente =
                        (d?.estado ?? "").toLowerCase() ===
                          "pendiente de pago" ||
                        (d?.estado ?? "").toLowerCase().includes("adeuda");

                      if (estadoEsPendiente) {
                        alumnosCancelados.push(res?.nombreAlumno);
                      }

                      const estadoClass = estadoEsPendiente
                        ? "text-red-600 font-semibold"
                        : "";

                      const nrcDistinto =
                        d?.nrc && nrcEsperado && d.nrc !== nrcEsperado;

                      if (!d) {
                        return (
                          <tr key={j} className="bg-red-50/60">
                            <td className="px-2 py-1 text-center text-gray-500">
                              {res?.id ?? "-"}
                            </td>
                            <td className="px-2 py-1">
                              {res?.nombreAlumno ?? "-"}
                            </td>
                            <td className="px-2 py-1 text-center">-</td>
                            {tieneMatricula && (
                              <td className="px-2 py-1 text-center text-red-500 italic">
                                ❌
                              </td>
                            )}
                            <td className="px-2 py-1 text-center text-red-600 italic">
                              Sin datos
                            </td>
                            <td className="px-2 py-1 text-center">—</td>
                            <td className="px-2 py-1 text-center">—</td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={j} className="hover:bg-gray-50">
                          <td
                            className={`px-2 py-1 text-center ${estadoClass}`}
                          >
                            {j + 1}
                          </td>
                          <td
                            className={`px-2 py-1 text-center ${estadoClass}`}
                          >
                            {d?.id ?? res?.id ?? "-"}
                          </td>
                          <td className={`px-2 py-1 ${estadoClass}`}>
                            {res?.nombreAlumno ?? "-"}
                          </td>
                          <td
                            className={`px-2 py-1 text-center ${
                              nrcDistinto ? "text-red-600 font-semibold" : ""
                            }`}
                          >
                            {d?.nrc ?? "-"}
                            {nrcDistinto && <span className="ml-1">❌</span>}
                          </td>
                          {tieneMatricula && (
                            <td className="px-2 py-1 text-center">
                              {matricula
                                ? matricula.estado === "BECADO"
                                  ? "Cancelada"
                                  : matricula.estado
                                : "❌"}
                            </td>
                          )}
                          <td className="px-2 py-1 text-center">
                            {res?.codigoPago ?? "-"}
                          </td>
                          <td className="px-2 py-1 text-center">
                            {d?.fechaVencimiento ?? "-"}
                          </td>
                          <td
                            className={`px-2 py-1 text-center ${estadoClass}`}
                          >
                            {d?.estado === "BECADO" ||
                            d?.estado.includes("Adeuda")
                              ? "Cancelada"
                              : d?.estado ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 text-[12px] text-gray-600 bg-gray-50 rounded-lg border border-gray-200">
                <p className="flex items-center gap-1 mb-2">
                  ⚠️{" "}
                  <span>
                    Es indispensable que el pago se realice al inicio de cada
                    ciclo.
                  </span>
                </p>

                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-amber-600">
                    Pendiente de pago:{" "}
                    {alumnosCancelados.length > 0
                      ? `(${alumnosCancelados.length})`
                      : "0"}{" "}
                    alumnos
                  </span>

                  <span className="text-emerald-600">
                    Cancelados:{" "}
                    {hoja?.msg?.resultados.length - alumnosCancelados.length}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default RenderCobros;
