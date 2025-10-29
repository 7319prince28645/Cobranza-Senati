import React, { useState, useRef } from "react";
import GetAdministrativo from "@/services/GetAdministrativo";
import html2pdf from "html2pdf.js";
import LogoSenait from "../../assets/Senati.png";

function RenderFechas() {
  const [id, setId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState([]);
  const pdfRef = useRef(); // 👈 referencia al contenedor que exportaremos

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
      margin: 0.5,
      filename: `asistencia_${id}_${fechaInicio}_${fechaFin}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(element).save();
  };

  console.log("Resultados:", resultados);

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-md p-8 space-y-6">
      <h2 className="text-2xl font-semibold text-center text-gray-800">
        📋 Registro de Control de Asistencia del Personal por Curso
      </h2>

      {/* Formulario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
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
      <div className="flex justify-center gap-4 print:hidden">
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
      <div ref={pdfRef}>
        {resultados?.data?.calendarioCompacto?.length > 0 && (
          <>
            {/* Cabecera del reporte */}
            <div className="mb-6 space-y-4">
              <h2 className="text-xl font-bold text-center">
                Registro de Control de Asistencia del Personal JP
              </h2>
              <div className="flex">
                <img src={LogoSenait} alt="Logo Senati" width={140} />
              </div>

              <div className="grid grid-cols-2 gap-x-4 text-sm">
                <div className="font-semibold uppercase">RUC:</div>
                <div>20131376503</div>

                <div className="font-semibold">C.F.P / GERENCIA:</div>
                <div>CFP PUCALLPA</div>

                <div className="font-semibold">Dirección:</div>
                <div>AV. CENTENARIO KM. 4.500</div>

                <div className="font-semibold">TRABAJADOR:</div>
                <div>{resultados?.data?.nombre}</div>

                <div className="font-semibold">ID:</div>
                <div>{resultados?.data?.id}</div>

                <div className="font-semibold">PUESTO:</div>
                <div>INSTRUCTOR JP</div>
              </div>
              <hr className="my-4" />
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto border rounded-xl mt-6">
              <table className="w-full border-collapse text-sm text-gray-800">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-2 border">Curso</th>
                    <th className="p-2 border">Día</th>
                    <th className="p-2 border">Hora inicio</th>
                    <th className="p-2 border">Firma</th>
                    <th className="p-2 border">Hora término</th>
                    <th className="p-2 border">Firma</th>
                    <th className="p-2 border">Total (horas pedagógicas)</th>
                    <th className="p-2 border">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados?.data?.calendarioCompacto?.map((diaObj, i) => (
                    <tr key={`${i}`} className="text-center">
                      <td className="border p-2">{diaObj?.cursos}</td>
                      <td className="border p-2">{diaObj?.dia}</td>
                      <td className="border p-2">{diaObj?.inicio}</td>
                      <td className="border p-2"></td>
                      <td className="border p-2">{diaObj?.fin}</td>
                      <td className="border p-2"></td>
                      <td className="border p-2">
                        {diaObj?.totalHoras ? `${diaObj?.totalHoras}` : "-"}
                      </td>
                      <td className="border p-2"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Firmas finales */}
            <div className="mt-10 flex justify-between px-10 text-center text-sm">
              <div>
                <p>______________________________</p>
                <p>Instructor</p>
              </div>
              <div>
                <p>______________________________</p>
                <p>Jefe del Centro</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 my-4">
                Generado el {new Date().toLocaleDateString()} a las{" "}
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Estado de carga */}
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
