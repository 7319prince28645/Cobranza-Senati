// RenderFechas.jsx
import React, { useState, useRef } from "react";
import GetAdministrativo from "@/services/GetAdministrativo";
import html2pdf from "html2pdf.js";
import LogoSenait from "../../assets/Senati.png";
import "/public/print.css"; // Asegúrate de que esta ruta sea válida

function RenderFechas() {
  const [id, setId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState([]);
  const pdfRef = useRef();

  const handleConsultar = async () => {
    if (!id || !fechaInicio || !fechaFin) {
      alert("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);
    setResultados([]);

    try {
      const response = await GetAdministrativo(id, fechaInicio, fechaFin);
      setResultados(response || []);
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Ocurrió un error al obtener los datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = () => {
    window.print();
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

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-md p-8 space-y-6">
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
              onClick={handleImprimir}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium"
            >
              🖨️ Imprimir
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
            <div className="text-center mb-6">
              <img
                src={LogoSenait}
                alt="Logo Senati"
                width={120}
                className="mx-auto mb-2"
              />
              <h1 className="text-xl font-bold uppercase">
                Registro de Control de Asistencia del Personal JP
              </h1>
              <p className="text-xs text-gray-600">
                Centro de Formación Profesional - CFP Pucallpa
              </p>
              <hr className="my-4 border-gray-400" />
            </div>

            <div className="grid grid-cols-2 gap-y-2 gap-x-6 mb-6 text-sm">
              <div>
                <span className="font-semibold">RUC:</span> 20131376503
              </div>
               <div>
                <span className="font-semibold">ID:</span>{" "}
                {resultados?.data?.id}
              </div>
              <div>
                <span className="font-semibold">Dirección:</span> Av. Centenario
                Km. 4.500
              </div>
              <div>
                <span className="font-semibold">Trabajador:</span>{" "}
                {resultados?.data?.nombre}
              </div>
              <div>
                <span className="font-semibold">Gerencia:</span> CFP PUCALLPA
              </div>
             
              <div>
                <span className="font-semibold">Puesto:</span> INSTRUCTOR JP
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
                    Total Firmas
                  </th>
                  <th className="border p-1 font-semibold align-middle">
                    Observaciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {resultados?.data?.calendarioCompacto?.map((diaObj, i) => (
                  <tr key={i} className="text-center">
                    <td className="border p-1 text-[11px] font-medium text-left break-words max-w-[220px] whitespace-pre-wrap align-middle">
                      {diaObj?.cursos}
                    </td>
                    <td className="border p-1 align-middle">{diaObj?.dia}</td>
                    <td className="border p-1 align-middle">
                      {diaObj?.inicio}
                    </td>
                    <td className="border p-1 align-middle"></td>
                    <td className="border p-1 align-middle">{diaObj?.fin}</td>
                    <td className="border p-1 align-middle"></td>
                    <td className="border p-1 align-middle">
                      {diaObj?.totalHoras || "-"}
                    </td>
                    <td className="border p-1 align-middle"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between mt-12 px-6 text-center text-sm">
              <div>
                <p className="mb-1">______________________________</p>
                <p>Instructor</p>
              </div>
              <div>
                <p className="mb-1">______________________________</p>
                <p>Jefe del Centro</p>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-6 text-right">
              Generado el {new Date().toLocaleDateString()} a las{" "}
              {new Date().toLocaleTimeString()}
            </p>
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
