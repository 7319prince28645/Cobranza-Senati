import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const VerificarNota = () => {
  const [ids, setIds] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [filter, setFilter] = useState("all");

  const handleStart = async () => {
    if (!ids.trim()) {
      alert("Por favor, ingrese al menos un ID.");
      return;
    }

    const idList = ids.split(/[\n, ]+/).filter(id => id.trim() !== "");
    
    setLoading(true);
    setResult({ results: [] });
    setProgress({ processed: 0, total: idList.length });

    // Usar SSE para recibir resultados en tiempo real
    const url = `http://localhost:3000/academico/verificar-nota/stream?ids=${idList.join(',')}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'progress') {
        setProgress({ processed: data.processed, total: data.total });
        setResult(prev => ({
          results: [...(prev?.results || []), data.student]
        }));
      }

      if (data.type === 'done') {
        setResult({ results: data.results });
        setLoading(false);
        eventSource.close();
      }

      if (data.type === 'error') {
        console.error("Error SSE:", data.message);
        setLoading(false);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setLoading(false);
      eventSource.close();
    };
  };

  console.log(result);

  // Helper: ¿La nota es aprobatoria?
  const isApproved = (nota) => {
    const n = parseFloat(nota);
    return !isNaN(n) && n >= 10.5;
  };

  const filteredResults = result?.results?.filter(student => {
    if (filter === "registered") return student.status === "Completado";
    if (filter === "approved") return student.status === "Completado" && student.careers.some(c => isApproved(c.nota));
    if (filter === "failed") return student.status === "Completado" && student.careers.some(c => !isApproved(c.nota));
    if (filter === "not_registered") return student.status === "No registrado" || student.status === "Sin notas de sustentación";
    if (filter === "errors") return student.status === "Error" || student.status === "Pendiente";
    return true;
  }) || [];

  const stats = result?.results?.reduce((acc, student) => {
    acc.total += 1;
    if (student.status === "No registrado" || student.status === "Sin notas de sustentación") {
      acc.missing += 1;
    } else if (student.status === "Error" || student.status === "Pendiente") {
      acc.errors += 1;
    } else {
      student.careers.forEach(c => {
        acc.totalCareers += 1;
        if (isApproved(c.nota)) acc.approved += 1;
        else acc.failed += 1; // Incluye DE, NP, y notas < 10.5
      });
    }
    return acc;
  }, { total: 0, missing: 0, approved: 0, failed: 0, errors: 0, totalCareers: 0 }) || { total: 0, missing: 0, approved: 0, failed: 0, errors: 0, totalCareers: 0 };

  const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  // ═══════════════════════════════════════
  // FUNCIONES DE EXPORTACIÓN
  // ═══════════════════════════════════════
  const buildExportRows = () => {
    const rows = [];
    filteredResults.forEach(student => {
      if (student.status === "Error" || student.status === "Pendiente") {
        rows.push({ id: student.id, nombre: student.nombre || "---", carrera: student.error || "Error", nota: "---", estado: student.status });
      } else if (student.status === "No registrado" || student.status === "Sin notas de sustentación") {
        rows.push({ id: student.id, nombre: student.nombre || "Sin registro", carrera: "---", nota: "---", estado: student.status });
      } else {
        student.careers.forEach(c => {
          rows.push({ id: student.id, nombre: student.nombre, carrera: c.carrera, nota: c.nota, estado: "Verificado" });
        });
      }
    });
    return rows;
  };

  const exportExcel = () => {
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
      "ID SINFO": r.id,
      "ALUMNO": r.nombre,
      "PROGRAMA / CARRERA": r.carrera,
      "NOTA": r.nota,
      "ESTADO": r.estado,
    })));

    // Auto-width columns
    const colWidths = [
      { wch: 14 }, { wch: 35 }, { wch: 40 }, { wch: 8 }, { wch: 18 }
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Verificación Académica");

    // Hoja de resumen
    const summaryData = [
      { "Métrica": "Total Alumnos", "Valor": stats.total },
      { "Métrica": "Aprobados", "Valor": stats.approved },
      { "Métrica": "Desaprobados", "Valor": stats.failed },
      { "Métrica": "Sin Registro", "Valor": stats.missing },
      { "Métrica": "Con Error", "Valor": stats.errors },
      { "Métrica": "Fecha de Reporte", "Valor": new Date().toLocaleString("es-PE") },
    ];
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    ws2['!cols'] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Resumen");

    XLSX.writeFile(wb, `Verificacion_Academica_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportPDF = () => {
    const rows = buildExportRows();
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Header
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, 297, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE VERIFICACIÓN ACADÉMICA", 14, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`SENATI • Fecha: ${new Date().toLocaleString("es-PE")} • Filtro: ${filter === "all" ? "Todos" : filter === "registered" ? "Con Nota" : filter === "not_registered" ? "No Registrados" : "Con Error"}`, 14, 20);
    doc.text(`Total: ${stats.total} | Aprobados: ${stats.approved} | Desaprobados: ${stats.failed} | Sin Registro: ${stats.missing} | Errores: ${stats.errors}`, 14, 25);

    // Table
    autoTable(doc, {
      startY: 32,   
      head: [["ID SINFO", "ALUMNO", "PROGRAMA / CARRERA", "NOTA", "ESTADO"]],
      body: rows.map(r => [r.id, r.nombre, r.carrera, r.nota, r.estado]),
      theme: "grid",
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: "bold" },
        1: { cellWidth: 55 },
        2: { cellWidth: 75 },
        3: { cellWidth: 15, halign: "center", fontStyle: "bold" },
        4: { cellWidth: 25, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const val = data.cell.raw;
          if (val === "Verificado") { data.cell.styles.textColor = [22, 163, 74]; data.cell.styles.fontStyle = "bold"; }
          else if (val === "No registrado" || val === "Sin notas de sustentación") { data.cell.styles.textColor = [220, 38, 38]; }
          else if (val === "Error" || val === "Pendiente") { data.cell.styles.textColor = [234, 88, 12]; data.cell.styles.fontStyle = "bold"; }
        }
        if (data.section === "body" && data.column.index === 3) {
          const nota = parseFloat(data.cell.raw);
          if (!isNaN(nota)) {
            data.cell.styles.textColor = nota >= 10.5 ? [22, 163, 74] : [217, 119, 6];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount} • SINFO Academic Engine v2.0`, 14, doc.internal.pageSize.height - 5);
    }

    doc.save(`Verificacion_Academica_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className="p-4 h-[calc(100vh-80px)] overflow-auto">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-3 h-full flex flex-col">
          <Card className="flex-1 flex flex-col border shadow-sm overflow-hidden bg-white dark:bg-gray-900 border-primary/10">
            <CardHeader className="py-2.5 bg-primary/5">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-primary uppercase tracking-tighter">
                📂 Configuración de Carga
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-3 overflow-y-auto pt-3 pb-4">
              <div className="space-y-1 flex-grow">
                <Label htmlFor="ids" className="text-[10px] font-black uppercase text-gray-400">Listado de IDs</Label>
                <textarea
                  id="ids"
                  className="w-full h-full min-h-[150px] p-3 text-xs font-mono rounded-lg border border-primary/10 bg-gray-50/50 dark:bg-gray-800 focus:ring-1 focus:ring-primary outline-none transition-all resize-none shadow-inner"
                  placeholder="Pegue aquí los IDs..."
                  value={ids}
                  onChange={(e) => setIds(e.target.value)}
                />
              </div>

              <div className="pt-2 border-t space-y-3">
                <Button 
                  onClick={handleStart} 
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-white shadow-md font-black uppercase text-xs h-10"
                >
                  {loading ? "⚡ Procesando..." : "🚀 Iniciar Verificación"}
                </Button>

                {/* Barra de Progreso */}
                {loading && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500">
                      <span>{progress.processed} / {progress.total} alumnos</span>
                      <span className="text-primary">{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="col-span-12 lg:col-span-9 h-full flex flex-col space-y-4">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Alumnos", value: stats.total, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Aprobados", value: stats.approved, color: "text-green-600", bg: "bg-green-50" },
              { label: "Desaprobados", value: stats.failed, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Sin Registro", value: stats.missing, color: "text-red-600", bg: "bg-red-50" },
              { label: "Con Error", value: stats.errors, color: "text-orange-600", bg: "bg-orange-50" }
            ].map((stat, i) => (
              <Card key={i} className={`p-4 border shadow-sm ${stat.bg} flex flex-col items-center justify-center transition-transform hover:scale-[1.02]`}>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{stat.label}</span>
                <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
              </Card>
            ))}
          </div>

          <Card className="flex-1 flex flex-col border shadow-lg overflow-hidden bg-white dark:bg-gray-900">
            <div className="bg-gray-50 dark:bg-gray-800 border-b p-3 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
          <div className="flex bg-gray-200 dark:bg-gray-700 p-0.5 rounded text-[10px] font-bold uppercase flex-wrap gap-0.5">
                  <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded transition-all ${filter === "all" ? "bg-white text-primary shadow" : "text-gray-500"}`}>Todos</button>
                  <button onClick={() => setFilter("registered")} className={`px-3 py-1.5 rounded transition-all ${filter === "registered" ? "bg-white text-blue-600 shadow" : "text-gray-500"}`}>Con Nota</button>
                  <button onClick={() => setFilter("approved")} className={`px-3 py-1.5 rounded transition-all ${filter === "approved" ? "bg-white text-green-600 shadow" : "text-gray-500"}`}>Aprobados</button>
                  <button onClick={() => setFilter("failed")} className={`px-3 py-1.5 rounded transition-all ${filter === "failed" ? "bg-white text-amber-600 shadow" : "text-gray-500"}`}>Desaprobados</button>
                  <button onClick={() => setFilter("not_registered")} className={`px-3 py-1.5 rounded transition-all ${filter === "not_registered" ? "bg-white text-red-600 shadow" : "text-gray-500"}`}>No registrados</button>
                  <button onClick={() => setFilter("errors")} className={`px-3 py-1.5 rounded transition-all ${filter === "errors" ? "bg-white text-orange-600 shadow" : "text-gray-500"}`}>Con Error</button>
                </div>
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-[10px] text-primary font-bold animate-pulse">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
                  EN VIVO — Procesando...
                </div>
              )}
              {!loading && filteredResults.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportExcel}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold uppercase shadow-sm transition-all hover:scale-105"
                  >
                    📄 Excel
                  </button>
                  <button
                    onClick={exportPDF}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold uppercase shadow-sm transition-all hover:scale-105"
                  >
                    📄 PDF
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
              {!result || result.results.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-20 select-none grayscale">
                  <div className="text-8xl mb-4 font-black">📊</div>
                  <p className="font-black text-xl tracking-tighter">AGUARDANDO DATOS...</p>
                </div>
              ) : (
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800 border-b-2 border-gray-100 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-left font-black border-r text-primary w-[120px]">ID SINFO</th>
                      <th className="px-4 py-3 text-left font-black border-r">ALUMNO</th>
                      <th className="px-4 py-3 text-left font-black border-r">PROGRAMA / CARRERA</th>
                      <th className="px-4 py-3 text-center font-black border-r w-[80px]">NOTA</th>
                      <th className="px-4 py-3 text-center font-black w-[100px]">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((student, idx) => (
                      <React.Fragment key={idx}>
                        {student.status === "Error" || student.status === "Pendiente" ? (
                          <tr className="border-b bg-orange-50/20 hover:bg-orange-50/40 transition-colors">
                            <td className="px-4 py-2 font-mono font-bold text-orange-500 border-r">{student.id}</td>
                            <td className="px-4 py-2 text-orange-400 font-bold border-r uppercase">{student.nombre || "---"}</td>
                            <td className="px-4 py-2 text-orange-300 border-r text-[9px] italic" colSpan="1">{student.error || "Error desconocido"}</td>
                            <td className="px-4 py-2 border-r text-center text-orange-300">---</td>
                            <td className="px-4 py-2 text-center">
                              <span className="text-[9px] font-black uppercase text-orange-600 bg-orange-100 px-2 py-0.5 rounded">{student.status}</span>
                            </td>
                          </tr>
                        ) : student.status === "No registrado" || student.status === "Sin notas de sustentación" ? (
                          <tr className="border-b bg-red-50/10 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 font-mono font-bold text-gray-400 border-r">{student.id}</td>
                            <td className="px-4 py-2 text-red-400 font-bold border-r uppercase italic">{student.nombre || "ID SIN REGISTRO"}</td>
                            <td className="px-4 py-2 text-gray-300 border-r text-center">---</td>
                            <td className="px-4 py-2 border-r text-center text-gray-300">---</td>
                            <td className="px-4 py-2 text-center">
                              <span className="text-[9px] font-black uppercase text-red-600">{student.status}</span>
                            </td>
                          </tr>
                        ) : (
                          student.careers.map((career, cIdx) => (
                            <tr key={`${idx}-${cIdx}`} className="border-b hover:bg-primary/5 transition-colors group">
                              <td className="px-4 py-2 font-mono font-black text-primary border-r">{student.id}</td>
                              <td className="px-4 py-2 font-black border-r uppercase text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">{student.nombre}</td>
                              <td className="px-4 py-2 text-gray-500 border-r font-medium italic">{career.carrera}</td>
                              <td className={`px-4 py-2 border-r text-center font-black text-sm ${
                                !isNaN(career.nota) && parseInt(career.nota) >= 10.5 ? "text-green-600 bg-green-50/30" : "text-amber-600 bg-amber-50/30"
                              }`}>
                                {career.nota}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className="bg-green-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase shadow-sm">VERIFICADO</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </React.Fragment>
                    ))}
                    {filteredResults.length === 0 && (
                      <tr>
                        <td colSpan="5" className="h-[200px] text-center text-gray-400 font-black tracking-widest uppercase opacity-20">No hay coincidencias</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VerificarNota;
