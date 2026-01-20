import { useState } from "react";
import html2canvas from "html2canvas";

function RenderCobros({ logs }) {
  const [incluirMatricula, setIncluirMatricula] = useState({});
  const [mensajesPersonalizados, setMensajesPersonalizados] = useState({});
  const [mostrarEditorMensaje, setMostrarEditorMensaje] = useState({});

  const getMensajeDefault = () => {
    const horaActual = new Date().getHours();
    return `${horaActual > 12 ? "Buenas tardes" : "Buenos días"},
🔹 Les recordamos que el pago de la mensualidad debe realizarse al inicio de cada ciclo.
✅ Alumnos en verde: Cancelaron.
⚠️ Alumnos en rojo: Aún deben el presente mes.
🚨 Alumnos en amarillo: Para retiro del sistema.`;
  };

  const copiarTabla = async (id, i) => {
    const tabla = document.getElementById(id);
    if (!tabla) return;

    const clone = tabla.cloneNode(true);

    // 1. Quitar columna matrícula si no está marcada
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

    // 2. Eliminar solo filas sin datos al final
    const filas = Array.from(clone.querySelectorAll("tbody tr"));
    let ultimaFilaConDatos = -1;

    for (let index = filas.length - 1; index >= 0; index--) {
      const tr = filas[index];
      const tieneNRC = tr.querySelector("td:nth-child(4)")?.innerText.trim();
      const tieneEstado = tr.querySelector("td:last-child")?.innerText.trim();
      
      const tieneDatos = tieneNRC && tieneNRC !== "-" && tieneEstado && tieneEstado !== "—";
      
      if (tieneDatos) {
        ultimaFilaConDatos = index;
        break;
      }
    }

    if (ultimaFilaConDatos >= 0) {
      for (let i = ultimaFilaConDatos + 1; i < filas.length; i++) {
        filas[i].remove();
      }
    }

    // 3. 🎨 Mejorar estilos para la captura
    clone.style.fontFamily = "'Inter', 'Segoe UI', system-ui, sans-serif";
    clone.style.borderRadius = "12px";
    clone.style.overflow = "hidden";
    clone.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.top = "-9999px";
    wrapper.style.padding = "20px";
    wrapper.style.background = "white";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const canvas = await html2canvas(clone, {
      scale: 2, // 🎨 Mayor calidad
      backgroundColor: "#ffffff",
      logging: false,
    });
    document.body.removeChild(wrapper);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const texto = mensajesPersonalizados[i] || getMensajeDefault();

        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
            "text/plain": new Blob([texto], { type: "text/plain" }),
          }),
        ]);
        alert("✅ Imagen + texto copiados al portapapeles");
      } catch (err) {
        console.error("❌ Error al copiar: ", err);
        alert("❌ Error al copiar. Intenta de nuevo.");
      }
    });
  };

  return (
    <div className="min-h-screen p-3 bg-gradient-to-br from-gray-50 to-blue-50">
      <h1 className="text-2xl font-bold mb-4 text-center text-gray-800 tracking-tight">
        📊 Reporte de Cobros por Hoja
      </h1>

      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {logs.map((hoja, i) => {
          const tablaId = `tabla-${i}`;
          const nrcEsperado = hoja?.msg?.hoja?.split("-")[0]?.trim() ?? "";

          let alumnosPendientes = [];
          let alumnosCancelados = [];
          let alumnosParaRetiro = [];

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
              className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 p-5"
            >
              {/* Encabezado */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">
                    <span className="text-blue-600">📘</span>
                    {hoja?.msg?.hoja}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                      {hoja?.msg?.resultados?.length ?? 0} registros
                    </span>
                    {tieneMatricula && (
                      <span className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        ✓ Matrícula
                      </span>
                    )}
                  </p>

                  {tieneMatricula && (
                    <label className="mt-2 flex items-center text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                      <input
                        type="checkbox"
                        checked={!!incluirMatricula[i]}
                        onChange={(e) =>
                          setIncluirMatricula((prev) => ({
                            ...prev,
                            [i]: e.target.checked,
                          }))
                        }
                        className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Incluir matrícula en copia
                    </label>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setMostrarEditorMensaje((prev) => ({
                        ...prev,
                        [i]: !prev[i],
                      }))
                    }
                    className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 shadow-sm transition-colors"
                    title="Editar mensaje"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => copiarTabla(tablaId, i)}
                    className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    📋 Copiar
                  </button>
                </div>
              </div>

              {/* Editor de mensaje */}
              {mostrarEditorMensaje[i] && (
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📝 Mensaje personalizado
                  </label>
                  <textarea
                    value={mensajesPersonalizados[i] || getMensajeDefault()}
                    onChange={(e) =>
                      setMensajesPersonalizados((prev) => ({
                        ...prev,
                        [i]: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm"
                    rows="4"
                    placeholder="Escribe tu mensaje aquí..."
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() =>
                        setMensajesPersonalizados((prev) => ({
                          ...prev,
                          [i]: getMensajeDefault(),
                        }))
                      }
                      className="text-sm px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                    >
                      🔄 Restaurar
                    </button>
                    <button
                      onClick={() =>
                        setMostrarEditorMensaje((prev) => ({
                          ...prev,
                          [i]: false,
                        }))
                      }
                      className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      ✓ Cerrar
                    </button>
                  </div>
                </div>
              )}

              {/* Tabla */}
              <div
                id={tablaId}
                className="overflow-hidden rounded-xl border-2 border-gray-200 shadow-sm"
              >
                <table className="w-full text-xs">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr className="[&>th]:px-3 [&>th]:py-3 [&>th]:font-semibold [&>th]:text-gray-700 text-center border-b-2 border-gray-200">
                      <th className="w-12">N°</th>
                      <th>ID</th>
                      <th className="text-left">Nombre</th>
                      <th>NRC</th>
                      {tieneMatricula && <th>Matrícula</th>}
                      <th>Código Pago</th>
                      <th>Vencimiento</th>
                      <th>Estado</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {(hoja?.msg?.resultados ?? []).map((res, j) => {
                      const datosValidos = (res?.datos ?? []).filter(
                        (x) => x && (x.nrc || x.concepto || x.monto || x.estado)
                      );

                      const matricula = datosValidos.find((x) =>
                        (x?.concepto ?? "").toLowerCase().includes("matricula")
                      );

                      // 🎯 SIMPLIFICADO: Solo buscar el NRC esperado, nada más
                      let d = null;
                      
                      if (datosValidos.length > 0) {
                        // Buscar SOLO el NRC esperado
                        const filasConNrcEsperado = datosValidos.filter(
                          (x) => {
                            const nrcNum = parseInt(x.nrc, 10);
                            const esperado = parseInt(nrcEsperado, 10);
                            return !isNaN(nrcNum) && nrcNum === esperado;
                          }
                        );
                        
                        // Si encontramos el NRC esperado, usar la última fila (más reciente)
                        if (filasConNrcEsperado.length > 0) {
                          d = filasConNrcEsperado[filasConNrcEsperado.length - 1];
                        }
                        // Si NO encontramos el NRC esperado, d queda null → Para retiro
                      }

                      const estadoTexto = (d?.estado ?? "").toLowerCase();
                      const estadoEsPendiente =
                        estadoTexto === "pendiente de pago" ||
                        estadoTexto.includes("pendiente");
                      
                      const estadoEsCancelado =
                        estadoTexto === "becado" ||
                        estadoTexto.includes("cancelad") ||
                        estadoTexto.includes("adeuda") ||
                        estadoTexto === "inscrito";

                      const nrcDistinto =
                        d?.nrc && nrcEsperado && parseInt(d.nrc, 10) !== parseInt(nrcEsperado, 10);

                      // Clasificar alumno
                      if (!d) {
                        alumnosParaRetiro.push(res?.nombreAlumno);
                      } else if (estadoEsPendiente) {
                        alumnosPendientes.push(res?.nombreAlumno);
                      } else if (estadoEsCancelado) {
                        alumnosCancelados.push(res?.nombreAlumno);
                      }

                      // Estilos mejorados
                      let estadoClass = "";
                      let rowClass = "hover:bg-gray-50 transition-colors";
                      
                      if (!d) {
                        rowClass = "bg-yellow-50/60 hover:bg-yellow-50/80";
                        estadoClass = "text-gray-400 italic";
                      } else if (estadoEsPendiente) {
                        rowClass = "bg-red-50/50 hover:bg-red-50/70";
                        estadoClass = "text-red-700 font-bold";
                      } else if (estadoEsCancelado) {
                        rowClass = "bg-green-50/40 hover:bg-green-50/60";
                        estadoClass = "text-green-700 font-semibold";
                      }

                      if (!d) {
                        return (
                          <tr key={j} className={rowClass}>
                            <td className="px-3 py-2.5 text-center text-gray-400 font-medium">
                              {j + 1}
                            </td>
                            <td className="px-3 py-2.5 text-center text-gray-400">
                              {res?.id ?? "-"}
                            </td>
                            <td className="px-3 py-2.5 text-gray-400 italic">
                              {res?.nombreAlumno ?? "-"}
                            </td>
                            <td className="px-3 py-2.5 text-center text-gray-400">-</td>
                            {tieneMatricula && (
                              <td className="px-3 py-2.5 text-center text-gray-400">❌</td>
                            )}
                            <td className="px-3 py-2.5 text-center text-gray-400">
                              {res?.codigoPago ?? "-"}
                            </td>
                            <td className="px-3 py-2.5 text-center text-gray-400">—</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-block px-2 py-1 text-[10px] font-medium bg-yellow-200 text-yellow-800 rounded-full">
                                🚨 Para retiro
                              </span>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={j} className={rowClass}>
                          <td className={`px-3 py-2.5 text-center font-medium ${estadoClass}`}>
                            {j + 1}
                          </td>
                          <td className={`px-3 py-2.5 text-center ${estadoClass}`}>
                            {d?.id ?? res?.id ?? "-"}
                          </td>
                          <td className={`px-3 py-2.5 ${estadoClass}`}>
                            {res?.nombreAlumno ?? "-"}
                          </td>
                          <td
                            className={`px-3 py-2.5 text-center font-bold ${
                              nrcDistinto ? "text-orange-600" : estadoClass
                            }`}
                          >
                            {d?.nrc ?? "-"}
                            {nrcDistinto && (
                              <span className="ml-1 text-red-600" title="NRC no coincide con el esperado">
                                ⚠️
                              </span>
                            )}
                          </td>
                          {tieneMatricula && (
                            <td className={`px-3 py-2.5 text-center ${estadoClass}`}>
                              {matricula
                                ? matricula.estado === "BECADO"
                                  ? "✓ Cancelada"
                                  : matricula.estado
                                : "❌"}
                            </td>
                          )}
                          <td className={`px-3 py-2.5 text-center font-mono text-[11px] ${estadoClass}`}>
                            {res?.codigoPago ?? "-"}
                          </td>
                          <td className={`px-3 py-2.5 text-center ${estadoClass}`}>
                            {d?.fechaVencimiento ?? "-"}
                          </td>
                          <td className={`px-3 py-2.5 text-center font-medium ${estadoClass}`}>
                            {d?.estado === "BECADO" || d?.estado.includes("Adeuda")
                              ? "✓ Cancelada"
                              : d?.estado === "INSCRITO"
                              ? "✓ Inscrito"
                              : d?.estado ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumen mejorado */}
              <div className="mt-5 p-4 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 rounded-xl border-2 border-gray-200 shadow-sm">
                <p className="flex items-center gap-2 mb-3 text-sm text-gray-700 font-bold">
                  📊 Resumen de Estados
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {/* Cancelados */}
                  <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-3 rounded-xl border-2 border-green-300 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-lg">✅</span>
                      <span className="text-green-900 font-bold text-xs">Cancelados</span>
                    </div>
                    <p className="text-green-900 font-black text-2xl">
                      {alumnosCancelados.length}
                    </p>
                    <p className="text-green-700 text-[10px] mt-0.5">
                      {((alumnosCancelados.length / (hoja?.msg?.resultados?.length || 1)) * 100).toFixed(0)}%
                    </p>
                  </div>

                  {/* Pendientes */}
                  <div className="bg-gradient-to-br from-red-100 to-rose-100 p-3 rounded-xl border-2 border-red-300 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-lg">⚠️</span>
                      <span className="text-red-900 font-bold text-xs">Pendientes</span>
                    </div>
                    <p className="text-red-900 font-black text-2xl">
                      {alumnosPendientes.length}
                    </p>
                    <p className="text-red-700 text-[10px] mt-0.5">
                      {((alumnosPendientes.length / (hoja?.msg?.resultados?.length || 1)) * 100).toFixed(0)}%
                    </p>
                  </div>

                  {/* Para retiro */}
                  <div className="bg-gradient-to-br from-yellow-100 to-amber-100 p-3 rounded-xl border-2 border-yellow-300 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-lg">🚨</span>
                      <span className="text-yellow-900 font-bold text-xs">Retiro</span>
                    </div>
                    <p className="text-yellow-900 font-black text-2xl">
                      {alumnosParaRetiro.length}
                    </p>
                    <p className="text-yellow-700 text-[10px] mt-0.5">
                      {((alumnosParaRetiro.length / (hoja?.msg?.resultados?.length || 1)) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-gray-600 italic flex items-start gap-1">
                  <span>💡</span>
                  <span>Los alumnos en amarillo están marcados para retiro del sistema</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default RenderCobros;
