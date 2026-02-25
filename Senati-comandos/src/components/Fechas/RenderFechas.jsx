// RenderFechas.jsx
import React, { useState, useRef } from "react";
import GetAdministrativo from "@/services/GetAdministrativo";
import html2pdf from "html2pdf.js";
import "/public/print.css"; // Asegúrate de que esta ruta sea válida
import * as XLSX from "xlsx";
import LogoSenati from "../../assets/Senati.png";

function RenderFechas() {
  const [id, setId] = useState(() => localStorage.getItem("lastAdminInstructorId") || "");
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    // Primer día del mes actual en formato YYYY-MM-DD
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState([]);
  const pdfRef = useRef();

  const handleConsultar = async () => {
    const cleanId = id.trim();
    if (!cleanId || !fechaInicio || !fechaFin) {
      alert("Por favor completa todos los campos.");
      return;
    }

    // Guardar el ID para conveniencia del usuario
    localStorage.setItem("lastAdminInstructorId", cleanId);
    
    setLoading(true);
    setResultados([]);

    try {
      const response = await GetAdministrativo(cleanId, fechaInicio, fechaFin);
      setResultados(response || []);
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Ocurrió un error al obtener los datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportarExcel = () => {
    const calendario = resultados?.data?.calendarioCompacto;
    if (!calendario || calendario.length === 0) return;

    // Encabezado institucional
    const encabezado = [
      ["REGISTRO DE CONTROL DE ASISTENCIA DEL PERSONAL POR HORAS"],
      [],
      ["RUC:", "20131376503"],
      ["C.F.P./ GERENCIA:", "CFP PUCALLPA"],
      ["Dirección:", "Av. Centenario Km. 4.500"],
      ["MES:", ""],
      ["TRABAJADOR(A):", resultados?.data?.nombre || ""],
      ["DNI:", ""],
      ["PUESTO:", "INSTRUCTOR JP"],
      [],
      [
        "CURSO",
        "FECHA",
        "HORA INICIO",
        "FIRMA",
        "TOTAL HORAS",
        "FIRMA",
        "OBSERVACIONES",
      ],
    ];

    // Datos del calendario
    const filas = calendario.map((dia) => [
      dia?.cursos,
      dia?.diaFin || dia?.dia, // si tienes fecha fin separada
      "", // firma vacía
      dia?.totalHoras || "0",
    ]);

    const hoja = XLSX.utils.aoa_to_sheet([...encabezado, ...filas]);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Asistencia");

    const nombreArchivo = `asistencia_formato_institucional_${id}_${fechaInicio}_${fechaFin}.xlsx`;
    XLSX.writeFile(libro, nombreArchivo);
  };

  const handleDescargarPDF = () => {
    const element = pdfRef.current;
    const opt = {
      margin: 0.2,
      filename: `asistencia_${id}_${fechaInicio}_${fechaFin}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: {
        scale: 3,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: {
        unit: "in",
        format: "a4",
        orientation: "portrait",
      },
      pagebreak: {
        mode: ["avoid-all", "css", "legacy"],
        before: "#no-split",
        after: ".page-break",
      },
    };
    html2pdf().set(opt).from(element).save();
  };

  const calendarioOrdenadoDesc = (resultados?.data?.calendarioCompacto || [])
    .slice() // copia para no mutar el original
    .sort((a, b) => {
      const parse = (d) => {
        if (!d) return new Date(0);
        const [dd, mm, yyyy] = d.split("/").map(Number);
        return new Date(yyyy, mm - 1, dd);
      };
      return parse(a.dia) - parse(b.dia); // b - a => mayor a menor
    });

  console.log("🚀 Resultados:", resultados);
  console.log("Calendario", calendarioOrdenadoDesc);

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl space-y-6">
      <h2 className="text-2xl font-semibold text-center text-gray-800">
        📋 Registro de Control de Asistencia del Personal por Curso
      </h2>

      {/* Formulario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print-hidden">
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2"
          placeholder="ID del Instructor"
        />
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2"
        />
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>

      {/* Botones */}
      <div className="flex justify-center gap-4 print-hidden">
        <button
          onClick={handleConsultar}
          disabled={loading}
          className={`px-6 py-2 rounded-xl text-white font-medium transition ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "⏳ Consultando..." : "🔍 Consultar"}
        </button>

        {resultados?.data?.calendarioCompacto?.length > 0 && (
          <>
            <button
              onClick={handleExportarExcel}
              className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-medium"
            >
              📊 Exportar Excel
            </button>

            <button
              onClick={handleDescargarPDF}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium"
            >
              📄 Descargar PDF
            </button>
          </>
        )}
      </div>

      {/* Contenido exportable */}
      <div
        ref={pdfRef}
        id="pdf-content"
        className="bg-white p-8 text-gray-900 text-sm leading-relaxed"
      >
        {resultados?.data?.calendarioCompacto?.length > 0 && (
          <>
            <div className="relative flex items-center">
              <img
                src={LogoSenati}
                alt="Logo Senati"
                width={200}
                className="mr-4"
              />
              <h1 className="text-xl font-bold uppercase">
                Registro de Control de Asistencia del Personal Por HORAS
              </h1>
            </div>
            <div className="grid grid-cols-2 mb-6 text-sm">
              <div className="pt-4">
                <div>
                  <span className="font-semibold">RUC:</span> 20131376503
                </div>
                <div>
                  <span className="font-semibold">C.F.P./ GERENCIA:</span> CFP
                  PUCALLPA
                </div>

                <div>
                  <span className="font-semibold">Dirección:</span> Av.
                  Centenario Km. 4.500
                </div>
                <div className="my-4" />
                <div>
                  <span className="font-semibold">TRABAJADOR:</span>{" "}
                  {resultados?.data?.nombre}
                </div>
                <div>
                  <span className="font-semibold">ID:</span>{" "}
                  {resultados?.data?.id || "------------------"}
                </div>

                <div>
                  <span className="font-semibold">PUESTO:</span> INSTRUCTOR JP
                </div>
              </div>
              <div className="flex flex-col justify-around">
                <p>MES:</p>
                <div>
                  {" "}
                  <span>HORARIO:</span>
                </div>
              </div>
            </div>

            <table className="w-full border border-gray-300 border-collapse text-xs">
              <thead className="bg-gray-100 text-gray-800">
                <tr>
                  <th className="border p-1 font-semibold align-middle">
                    Curso
                  </th>
                  <th className="border p-1 font-semibold align-middle">Día</th>
                  <th className="border p-1 font-semibold align-middle">
                    Hora inicio
                  </th>
                  <th className="border p-1 font-semibold align-middle">
                    Firma
                  </th>
                  <th className="border p-1 font-semibold align-middle">
                    Hora término
                  </th>
                  <th className="border p-1 font-semibold align-middle">
                    Firma
                  </th>
                  <th className="border p-1 font-semibold align-middle">
                    Total
                  </th>
                  <th className="border p-1 font-semibold align-middle">
                    Observaciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = [];
                  let currentWeekId = null;
                  let weekTotal = 0;

                  calendarioOrdenadoDesc.forEach((diaObj, i) => {
                    const [dd, mm, yyyy] = diaObj.dia.split("/").map(Number);
                    const fecha = new Date(yyyy, mm - 1, dd);
                    const day = fecha.getDay() || 7;
                    const lunes = new Date(fecha);
                    lunes.setDate(fecha.getDate() - day + 1);
                    const weekId = lunes.toLocaleDateString('es-PE');

                    // Si cambia la semana y no es el primero, insertar fila de total
                    if (currentWeekId && currentWeekId !== weekId) {
                      const esExcesoSemanal = weekTotal > 19;
                      rows.push(
                        <tr key={`week-total-${currentWeekId}`} className={`${esExcesoSemanal ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'} font-bold border-y-2`}>
                          <td colSpan="6" className={`border border-gray-300 p-2 text-right ${esExcesoSemanal ? 'text-orange-800' : 'text-blue-800'} uppercase text-[10px] tracking-wider`}>
                            Total Semanal ({currentWeekId})
                            {esExcesoSemanal && (
                              <span className="ml-2 text-[9px] bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full animate-pulse">
                                🚨 REVISAR: SEMANA &gt; 19H
                              </span>
                            )}
                          </td>
                          <td className={`border border-gray-300 p-2 text-center ${esExcesoSemanal ? 'text-orange-900' : 'text-blue-900'} text-[11px]`}>
                            {Number(weekTotal.toFixed(2))}h
                          </td>
                          <td className={`border border-gray-300 p-1 align-middle text-[9px] italic ${esExcesoSemanal ? 'text-orange-600' : 'text-gray-400'}`}>
                            {esExcesoSemanal ? "Debe tener clases de Lunes a Sábado" : ""}
                          </td>
                        </tr>
                      );
                      weekTotal = 0;
                    }

                    currentWeekId = weekId;
                    weekTotal += diaObj.totalHoras || 0;

                    const diaAnterior = calendarioOrdenadoDesc[i - 1]?.dia;
                    const esNuevoDia = diaObj.dia !== diaAnterior;

                    if (i === 0) {
                      window.__colorFlag = true;
                    } else if (esNuevoDia) {
                      window.__colorFlag = !window.__colorFlag;
                    }

                    const colorFondo = window.__colorFlag ? "bg-slate-50" : "bg-white";
                    const esExceso = diaObj.totalHoras > 7;

                    rows.push(
                      <tr key={`row-${i}`} className={`text-center ${colorFondo} ${esExceso ? 'bg-red-50/50' : ''}`}>
                        <td className="border border-gray-300 p-1 text-[11px] font-medium text-left break-words max-w-[220px] whitespace-pre-wrap align-middle">
                          {diaObj?.cursos}
                        </td>
                        <td className="border border-gray-300 p-1 align-middle">
                          {diaObj?.dia}
                        </td>
                        <td className="border border-gray-300 p-1 align-middle">
                          {diaObj?.inicio}
                        </td>
                        <td className="border border-gray-300 p-1 align-middle"></td>
                        <td className="border border-gray-300 p-1 align-middle">
                          {diaObj?.fin}
                        </td>
                        <td className="border border-gray-300 p-1 align-middle"></td>
                        <td className={`border border-gray-300 p-1 align-middle ${esExceso ? 'text-red-600 font-black' : ''}`}>
                          {diaObj?.totalHoras ? Number(diaObj.totalHoras.toFixed(4)) : "-"}
                          {esExceso && (
                            <div className="text-[9px] text-red-500 font-black leading-none mt-1 animate-pulse">
                              ⚠️ &gt; 7H
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-300 p-1 align-middle text-[10px] italic text-red-500 font-medium">
                          {esExceso ? "Supera límite diario (7h)" : ""}
                        </td>
                      </tr>
                    );

                    // Si es el último, insertar el último total de semana
                    if (i === calendarioOrdenadoDesc.length - 1) {
                      const esExcesoSemanal = weekTotal > 19;
                      rows.push(
                        <tr key={`week-total-final`} className={`${esExcesoSemanal ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'} font-bold border-y-2`}>
                          <td colSpan="6" className={`border border-gray-300 p-2 text-right ${esExcesoSemanal ? 'text-orange-800' : 'text-blue-800'} uppercase text-[10px] tracking-wider`}>
                            Total Semanal ({currentWeekId})
                            {esExcesoSemanal && (
                              <span className="ml-2 text-[9px] bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full animate-pulse">
                                🚨 REVISAR: SEMANA &gt; 19H
                              </span>
                            )}
                          </td>
                          <td className={`border border-gray-300 p-2 text-center ${esExcesoSemanal ? 'text-orange-900' : 'text-blue-900'} text-[11px]`}>
                            {Number(weekTotal.toFixed(2))}h
                          </td>
                          <td className={`border border-gray-300 p-1 align-middle text-[9px] italic ${esExcesoSemanal ? 'text-orange-600' : 'text-gray-400'}`}>
                            {esExcesoSemanal ? "Debe tener clases de Lunes a Sábado" : ""}
                          </td>
                        </tr>
                      );
                    }
                  });
                  return rows;
                })()}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Estado */}
      {loading && (
        <p className="text-center text-gray-500">Cargando datos...</p>
      )}
      {!loading && resultados.length === 0 && (
        <p className="text-center text-gray-500">No hay datos para mostrar.</p>
      )}
    </div>
  );
}

export default RenderFechas;
