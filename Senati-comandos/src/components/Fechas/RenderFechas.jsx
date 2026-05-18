// RenderFechas.jsx
import React, { useState, useRef } from "react";
import GetAdministrativo from "@/services/GetAdministrativo";
import { getApiUrl } from "@/services/apiConfig";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";
import LogoSenati from "../../assets/Senati.png";

function RenderFechas() {
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [searchId, setSearchId] = useState(() => urlParams.get("id") || localStorage.getItem("lastAdminInstructorId") || "");
  const [fechaInicio, setFechaInicio] = useState(() => {
    const fromUrl = urlParams.get("inicio");
    if (fromUrl) return fromUrl;
    const saved = localStorage.getItem("lastAdminFechaInicio");
    if (saved) return saved;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const fromUrl = urlParams.get("fin");
    if (fromUrl) return fromUrl;
    const saved = localStorage.getItem("lastAdminFechaFin");
    if (saved) return saved;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Helper para formatear fechas de manera estable (dd/mm/yyyy) para llaves de agrupamiento
  const formatDatePE = (d) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  const [tipoInstructor, setTipoInstructor] = useState(() => urlParams.get("tipo") || "parcial");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [resultados, setResultados] = useState([]);
  const [indexResultadoActivo, setIndexResultadoActivo] = useState(0);
  const [filtroCarga, setFiltroCarga] = useState(false);
  const [vistaSupervision, setVistaSupervision] = useState(false);
  const pdfRef = useRef();
  const supervisionRef = useRef();

  const handleConsultar = async () => {
    // Asegurar IDs únicos para evitar duplicar peticiones en un mismo proceso
    const rawIds = [...new Set(searchId.split(/[\s,]+/).filter(id => id.trim().length > 0))];
    if (rawIds.length === 0) {
      alert("Por favor ingrese al menos un IDaa");
      return;
    }

    localStorage.setItem("lastAdminInstructorId", searchId);
    localStorage.setItem("lastAdminFechaInicio", fechaInicio);
    localStorage.setItem("lastAdminFechaFin", fechaFin);

    const newParams = new URLSearchParams(window.location.search);
    newParams.set("id", searchId);
    newParams.set("inicio", fechaInicio);
    newParams.set("fin", fechaFin);
    newParams.set("tipo", tipoInstructor);
    window.history.replaceState({}, '', `${window.location.pathname}?${newParams.toString()}`);
    
    setResultados([]);
    setLoading(true);
    setProgress({ pct: 0, text: 'Estableciendo conexión...' });
    
    // Usar EventSource para recibir el porcentaje en vivo del API
    const urlBase = getApiUrl();
    const url = `${urlBase}/administrativo/reportes/stream?ids=${rawIds.join(',')}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'progress') {
        setProgress({ pct: data.pct, text: data.text });
      } else if (data.type === 'result') {
        setResultados(prev => [...prev, data.data]);
      } else if (data.type === 'done') {
        setLoading(false);
        eventSource.close();
      } else if (data.type === 'error') {
        console.error("Error del servidor en streaming:", data.message);
        setLoading(false);
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error("Error en conexión SSE:", error);
      setLoading(false);
      eventSource.close();
    };
  };

  const handleLimpiar = () => {
    setSearchId("");
    setResultados([]);
    setIndexResultadoActivo(0);
    localStorage.removeItem("lastAdminInstructorId");
    localStorage.removeItem("lastAdminFechaInicio");
    localStorage.removeItem("lastAdminFechaFin");
    alert("✨ Memoria y resultados limpiados");
  };

  const handleExportarExcel = (resData) => {
    const calendario = resData?.calendarioCompacto;
    if (!calendario || calendario.length === 0) return;

    // Encabezado institucional
    const encabezado = [
      ["REGISTRO DE CONTROL DE ASISTENCIA DEL PERSONAL POR HORAS"],
      [],
      ["RUC:", "20131376503"],
      ["C.F.P./ GERENCIA:", "CFP PUCALLPA"],
      ["Dirección:", "Av. Centenario Km. 4.500"],
      ["MES:", ""],
      ["TRABAJADOR(A):", resData?.nombre || ""],
      ["DNI:", ""],
      ["PUESTO:", `INSTRUCTOR ${tipoInstructor.toUpperCase()}`],
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
      dia?.dia, 
      dia?.inicio,
      "", // firma vacía
      dia?.totalHoras || "0",
      "", // firma vacía
      "" // observaciones vacías
    ]);

    const hoja = XLSX.utils.aoa_to_sheet([...encabezado, ...filas]);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Asistencia");

    const nombreArchivo = `asistencia_${resData?.id || 'reporte'}_${fechaInicio}_${fechaFin}.xlsx`;
    XLSX.writeFile(libro, nombreArchivo);
  };

  const handleDescargarPDF = () => {
    const element = pdfRef.current;
    const opt = {
      margin: 0.2,
      filename: `asistencia_${resActal?.id || 'reporte'}_${fechaInicio}_${fechaFin}.pdf`,
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

  const handleExportarExcelSupervision = () => {
    const dataToExport = (filtroCarga ? resultados.filter(r => dashboardData.find(d => d.id === r.id)?.tieneCarga) : resultados);
    if (dataToExport.length === 0) return;

    const rows = [
      ["CONTROL DE SUPERVISIÓN GENERAL"],
      [`PERIODO: ${fechaInicio} AL ${fechaFin}`],
      [],
      ["INSTRUCTOR", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"]
    ];

    dataToExport.forEach(res => {
      if (!res.data) return;
      const instructorData = res.data;
      const row = [instructorData.nombre];
      
      ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'].forEach(dayName => {
        const sessionsForDay = (instructorData.calendario || []).filter(s => {
          const [d, m, y] = s.dia.split("/").map(Number);
          const date = new Date(y, m - 1, d);
          const dayIdx = date.getDay();
          const targetIdx = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"].indexOf(dayName);
          return dayIdx === targetIdx;
        });

        const patterns = sessionsForDay.reduce((acc, s) => {
          const cleanTime = (t) => t?.replace(/:/g, '') || '';
          const patternKey = `${cleanTime(s.horarioInicio)}-${cleanTime(s.horarioFin)} < ${s.aula || 'S/A'}`;
          if (!acc.includes(patternKey)) acc.push(patternKey);
          return acc;
        }, []);

        row.push(patterns.join("\n"));
      });
      rows.push(row);
    });

    const hoja = XLSX.utils.aoa_to_sheet(rows);
    
    // Auto-width adjustment simple logic
    const wscols = [{wch: 30}, {wch: 25}, {wch: 25}, {wch: 25}, {wch: 25}, {wch: 25}, {wch: 25}];
    hoja['!cols'] = wscols;

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Supervision");
    XLSX.writeFile(libro, `supervision_general_${fechaInicio}_${fechaFin}.xlsx`);
  };

  const handleDescargarPDFSupervision = () => {
    const element = supervisionRef.current;
    if (!element) return;
    
    const opt = {
      margin: [0.3, 0.3],
      filename: `supervision_general_${fechaInicio}_${fechaFin}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "a3", orientation: "landscape" },
    };
    html2pdf().set(opt).from(element).save();
  };

  const resActal = resultados[indexResultadoActivo]?.data;

  const calendarioOrdenadoDesc = (resActal?.calendarioCompacto || [])
    .slice() 
    .sort((a, b) => {
      const parse = (d) => {
        if (!d) return new Date(0);
        const [dd, mm, yyyy] = d.split("/").map(Number);
        return new Date(yyyy, mm - 1, dd, 12, 0, 0);
      };
      return parse(a.dia) - parse(b.dia);
    });

  // Generar datos para el Dashboard
  const dashboardData = resultados.map(res => {
    if (!res.data) return { id: res.id, error: res.error };
    
    const calCompacto = res.data.calendarioCompacto || [];
    const rawSessions = res.data.calendario || [];
    
    let totalHPDictadoOnly = 0;
    let totalHPFinalConExtras = 0;
    let semanasAnalizadas = 0;
    let prepFaltantes = 0;
    let asyncFaltantes = 0;

    // Agrupar por semanas para validar extras y promedios
    const semanas = {};
    
    // 1. Identificar semanas y presencia de extras (Prep/Async) en el portal
    calCompacto.forEach(dia => {
      const [dd, mm, yyyy] = dia.dia.split("/").map(Number);
      const fecha = new Date(yyyy, mm - 1, dd, 12, 0, 0);
      const day = fecha.getDay() || 7;
      const lunes = new Date(fecha);
      lunes.setDate(fecha.getDate() - day + 1);
      const weekId = formatDatePE(lunes);
      
      if (!semanas[weekId]) {
        semanas[weekId] = { dictadoHP: 0, hasPrep: false, hasAsync: false, timestamp: lunes.getTime() };
      }
      
      const textNorm = dia.cursos?.toUpperCase() || "";
      if (textNorm.includes("PREPARACIÓN") || textNorm.includes("PREPARACION")) semanas[weekId].hasPrep = true;
      if (textNorm.includes("ASÍNCRONA") || textNorm.includes("ASINCRONA")) semanas[weekId].hasAsync = true;
    });

    // 2. Calcular dictadoHP real sumando SOLO sesiones que NO son extras de la data RAW
    rawSessions.forEach(s => {
      const [dd, mm, yyyy] = s.dia.split("/").map(Number);
      const fecha = new Date(yyyy, mm - 1, dd, 12, 0, 0);
      const day = fecha.getDay() || 7;
      const lunes = new Date(fecha);
      lunes.setDate(fecha.getDate() - day + 1);
      const weekId = formatDatePE(lunes);
      
      if (semanas[weekId]) {
        const cursoNorm = (s.curso || "").toUpperCase();
        const esAsincrona = cursoNorm.includes("ASÍNCRONA") || cursoNorm.includes("ASINCRONA");
        const esPreparacion = cursoNorm.includes("PREPARACIÓN") || cursoNorm.includes("PREPARACION");
        
        if (esPreparacion) {
          // Excluir preparación totalmente según pedido del usuario
          return;
        }

        if (esAsincrona) {
          const parts = cursoNorm.split(/[\/\-|]+/).map(p => p.trim()).filter(p => p && !p.includes("ASÍNCRONA") && !p.includes("ASINCRONA"));
          if (parts.length > 0) {
            // Es mixta: Probablemente 2h cronológicas son asíncronas (2.6667 HP)
            const neto = Math.max(0, Number(s.horasPedagogicas || 0) - 2.6667);
            semanas[weekId].dictadoHP += neto;
          } else {
            // Es asíncrona pura: No contar
          }
        } else {
          // Es curso normal: Contar todo
          semanas[weekId].dictadoHP += Number(s.horasPedagogicas || 0);
        }
      }
    });

    Object.values(semanas).forEach(s => {
      if (s.dictadoHP >= 1) {
        semanasAnalizadas++;
        if (!s.hasPrep) prepFaltantes++;
        if (!s.hasAsync) asyncFaltantes++;
        
        if (tipoInstructor === "completo") {
          totalHPDictadoOnly += s.dictadoHP;
          totalHPFinalConExtras += (s.dictadoHP + 9.2 + 9.2);
        } else {
          totalHPDictadoOnly += s.dictadoHP;
          totalHPFinalConExtras += s.dictadoHP;
        }
      }
    });

    const promedioDirecto = semanasAnalizadas > 0 ? totalHPDictadoOnly / semanasAnalizadas : 0;
    const promedioTotal = semanasAnalizadas > 0 ? totalHPFinalConExtras / semanasAnalizadas : 0;
    
    let status = "OK";
    let statusColor = "bg-emerald-100 text-emerald-700";

    if (tipoInstructor === "completo") {
      if (promedioTotal >= 52 && promedioTotal <= 56) {
        status = "CARGA ÓPTIMA";
        statusColor = "bg-blue-100 text-blue-700";
      } else if (promedioTotal > 56) {
        status = "EXCESO";
        statusColor = "bg-rose-100 text-rose-700";
      } else {
        status = "INSUFICIENTE";
        statusColor = "bg-amber-100 text-amber-700";
      }
    } else {
      status = promedioDirecto > 19 ? "EXCESO" : "PARCIAL OK";
      statusColor = promedioDirecto > 19 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700";
    }

    return {
      id: res.id,
      nombre: res.data?.nombre || res.data?.nombreInstructor || res.id || "---",
      promedioDirecto: Number(promedioDirecto.toFixed(2)),
      promedioTotal: Number(promedioTotal.toFixed(2)),
      prepFaltantes,
      asyncFaltantes,
      semanasAnalizadas,
      status,
      statusColor,
      semanas: Object.entries(semanas).sort((a,b) => a[1].timestamp - b[1].timestamp),
      tieneCarga: totalHPDictadoOnly > 0,
      turnos: (() => {
        const turnosSet = new Set();
        rawSessions.forEach(s => {
          const hora = parseInt(s.horarioInicio?.split(':')[0]);
          if (hora < 13) turnosSet.add("MAÑANA");
          else if (hora < 18) turnosSet.add("TARDE");
          else turnosSet.add("NOCHE");
        });
        return Array.from(turnosSet);
      })()
    };
  });

  // Calcular las semanas del calendario global para mostrar en la matriz
  const globalWeeks = (() => {
    if (!fechaInicio || !fechaFin) return Array.from({ length: 18 }).map((_, i) => `S${i+1}`);
    const weeks = [];
    const [yI, mI, dI] = fechaInicio.split("-").map(Number);
    let curr = new Date(yI, mI - 1, dI, 12, 0, 0);
    const [yF, mF, dF] = fechaFin.split("-").map(Number);
    const end = new Date(yF, mF - 1, dF, 23, 59, 59);
    
    // Alisamos al lunes anterior si no es lunes
    const day = curr.getDay() || 7;
    curr.setDate(curr.getDate() - day + 1);
    
    while (curr <= end) {
      weeks.push(formatDatePE(curr));
      curr.setDate(curr.getDate() + 7);
    }
    return weeks;
  })();

  const dashboardFiltrado = filtroCarga ? dashboardData.filter(d => d.tieneCarga) : dashboardData;

  return (
    <div className="w-full bg-white space-y-6 px-0">
      <h2 className="text-2xl font-semibold text-center text-gray-800">
        📋 Registro de Control de Asistencia del Personal por Curso
      </h2>

      {/* Formulario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print-hidden w-full">
        <textarea
          placeholder="IDs de Instructores (separados por espacio o coma)"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 w-full md:col-span-1 h-10 resize-none"
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
        <select
          value={tipoInstructor}
          onChange={(e) => setTipoInstructor(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 font-bold text-blue-800"
        >
          <option value="parcial">Instructor Parcial</option>
          <option value="completo">Instructor Completo</option>
        </select>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2">
          <input 
            type="checkbox" 
            id="filtroCarga" 
            checked={filtroCarga} 
            onChange={(e) => setFiltroCarga(e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <label htmlFor="filtroCarga" className="text-sm font-semibold text-gray-700 cursor-pointer select-none">Ocultar sin carga</label>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <input 
            type="checkbox" 
            id="vistaSupervision" 
            checked={vistaSupervision} 
            onChange={(e) => setVistaSupervision(e.target.checked)}
            className="w-4 h-4 cursor-pointer accent-blue-600"
          />
          <label htmlFor="vistaSupervision" className="text-sm font-semibold text-blue-800 cursor-pointer select-none">Vista Supervisión</label>
        </div>
      </div>

      {/* Dashboard Summary */}
      {resultados.length > 0 && (
        <div className="bg-white p-4 md:p-8 rounded-3xl border border-gray-200 shadow-2xl overflow-hidden relative w-full">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <h1 className="text-8xl font-black text-gray-800 italic">CIS</h1>
          </div>
          
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="bg-blue-600 p-2 rounded-lg shadow-lg">📊</span>
            Panel de Supervisión Administrativa
          </h3>

          <div className="grid grid-cols-1 gap-6">
            {/* Tabla de Promedios */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden w-full">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 uppercase text-[10px] font-black tracking-widest">
                    <th className="p-4 border-b border-gray-200">Instructor</th>
                    <th className="p-4 border-b border-gray-200 text-center">Prom. Directo</th>
                    <th className="p-4 border-b border-gray-200 text-center">Prom. Total</th>
                    <th className="p-4 border-b border-gray-200 text-center">Banderas</th>
                    <th className="p-4 border-b border-gray-200 text-center">Estado</th>
                    <th className="p-4 border-b border-gray-200 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {dashboardFiltrado.map((d, i) => (
                    <tr key={i} className={`hover:bg-blue-50/50 transition-colors ${indexResultadoActivo === i ? 'bg-blue-50' : ''}`}>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800">{d.nombre}</span>
                          <div className="flex gap-1 mt-1">
                             <span className="text-[9px] text-gray-400 font-mono italic">{d.id}</span>
                             {d.turnos?.map(t => (
                               <span key={t} className={`text-[8px] px-1.5 py-0.5 rounded font-black ${t === 'MAÑANA' ? 'bg-amber-100 text-amber-600' : t === 'TARDE' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>{t}</span>
                             ))}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-500 font-bold">{d.promedioDirecto}h</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-blue-50 px-3 py-1 rounded-full text-blue-600 font-black text-lg">{d.promedioTotal}h</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <span title="Falta Preparación" className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold ${d.prepFaltantes > 0 ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}>
                            {d.prepFaltantes > 0 ? 'P' : '✓'}
                          </span>
                          <span title="Falta Asíncrona" className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold ${d.asyncFaltantes > 0 ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}>
                            {d.asyncFaltantes > 0 ? 'A' : '✓'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${d.statusColor}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => setIndexResultadoActivo(i)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition shadow-sm ${indexResultadoActivo === i ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'}`}
                        >
                          {indexResultadoActivo === i ? 'Viendo' : 'Detalle'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Matriz Semanal Profesional */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-2 md:p-6 w-full">
              <h4 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Matriz de Carga Semanal - Horas Pedagogicas (S1 - S18)
              </h4>
              <div className="overflow-x-auto pb-4 custom-scrollbar">
                <table className="w-full border-separate border-spacing-1">
                  <thead>
                    <tr>
                      <th className="min-w-[200px] sticky left-0 bg-gray-50 z-10 text-left p-2 text-[9px] text-gray-400 uppercase font-black">Instructor</th>
                      {globalWeeks.map((week, idx) => (
                        <th key={idx} className="min-w-[55px] p-2 text-[8px] text-gray-500 font-black bg-gray-100/80 rounded-t-lg border-x border-t border-gray-200 text-center leading-[1]">
                          <div className="text-[10px] text-blue-600 mb-0.5">S{idx+1}</div>
                          <div className="text-[7px] text-gray-400 font-mono tracking-tighter opacity-70">
                            {week.split('/').slice(0, 2).join('/')}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardFiltrado.map((d, i) => (
                      <tr key={i} className="group">
                        <td className="sticky left-0 bg-gray-50 z-10 p-2 text-[10px] font-black text-gray-800 border-r border-gray-200 shadow-sm group-hover:bg-white transition whitespace-nowrap">
                          <div className="flex flex-col">
                            <span>{d.nombre}</span>
                            <div className="flex gap-1">
                              {d.turnos?.map(t => (
                                <span key={t} className="text-[7px] text-gray-400 font-bold tracking-tighter">{t[0]}</span>
                              ))}
                            </div>
                          </div>
                        </td>
                        {globalWeeks.map((weekLabel, weekIdx) => {
                          // Buscar los datos de la semana por su label (fecha del lunes)
                          const weekDataEntry = d.semanas?.find(s => s[0] === weekLabel);
                          const weekData = weekDataEntry?.[1];
                          const hp = weekData ? weekData.dictadoHP : 0;
                          const totalSemana = tipoInstructor === "completo" ? hp + 18.4 : hp;
                          
                          let cellColor = "bg-white text-gray-300 border-gray-100"; // Empty
                          if (hp > 0) {
                            if (tipoInstructor === "completo") {
                              if (totalSemana >= 54 && totalSemana <= 56) cellColor = "bg-blue-100 text-blue-700 border-blue-200";
                              else if (totalSemana > 56) cellColor = "bg-red-100 text-red-700 border-red-200";
                              else cellColor = "bg-amber-100 text-amber-700 border-amber-200";
                            } else {
                              cellColor = hp > 19 ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200";
                            }
                          }

                          return (
                            <td key={weekIdx} className={`p-2 text-center rounded-lg border transition hover:shadow-md cursor-help ${cellColor}`} title={weekData ? `${weekLabel}: ${hp} HP Dictado` : `Semana ${weekLabel} sin datos`}>
                              <div className="text-[10px] font-black">{hp > 0 ? hp.toFixed(1) : '-'}</div>
                              {weekData && (
                                <div className="flex justify-center gap-0.5 mt-0.5">
                                  <div className={`w-1 h-1 rounded-full ${weekData.hasPrep ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                  <div className={`w-1 h-1 rounded-full ${weekData.hasAsync ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4 mt-2">
                 <div className="flex items-center gap-1.5 text-[8px] text-gray-400 uppercase font-black"><span className="w-2 h-2 rounded bg-blue-100 border border-blue-200"></span> Carga Óptima</div>
                 <div className="flex items-center gap-1.5 text-[8px] text-gray-400 uppercase font-black"><span className="w-2 h-2 rounded bg-red-100 border border-red-200"></span> Exceso</div>
                 <div className="flex items-center gap-1.5 text-[8px] text-gray-400 uppercase font-black"><span className="w-2 h-2 rounded bg-amber-100 border border-amber-200"></span> Insuficiente</div>
                 <div className="flex items-center gap-1.5 text-[8px] text-gray-400 uppercase font-black"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Prep/Async OK</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista de Supervisión Consolidated (Formato Maestro para Impresión) */}
      {vistaSupervision && resultados.length > 0 && (
        <div className="space-y-4">
          <div 
            ref={supervisionRef}
            className="bg-white p-4 md:p-8 rounded-xl border-2 border-gray-800 shadow-sm mt-6 w-full overflow-x-auto print:p-0 print:border-0"
          >
            <div className="min-w-[1200px]">
              <div className="relative text-center mb-8">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t-2 border-gray-800"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-8 text-lg font-black text-gray-900 tracking-[0.3em] uppercase text-center">Control de Supervisión General</span>
                </div>
              </div>

              {/* Info de Periodo */}
              <div className="flex justify-between items-center mb-4 px-2">
                <div className="text-[10px] font-black text-gray-400 uppercase">SENATI - CFP PUCALLPA</div>
                <div className="text-[10px] font-black text-gray-800 uppercase tracking-widest">
                  Periodo: {fechaInicio.split('-').reverse().join('/')} AL {fechaFin.split('-').reverse().join('/')}
                </div>
              </div>

              {/* Header de Tabla */}
              <div className="grid grid-cols-7 bg-gray-900 text-white rounded-t-lg">
                <div className="p-3 text-[10px] font-black uppercase border-r border-gray-700">Instructor</div>
                {['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'].map((day) => (
                  <div key={day} className="p-3 text-[10px] font-black uppercase border-r border-gray-700 last:border-r-0 text-center">
                    {day}
                  </div>
                ))}
              </div>

              {/* Filas de Instructores */}
              <div className="border-x border-b border-gray-300 rounded-b-lg divide-y divide-gray-200">
                {resultados
                  .filter(res => {
                    if (!filtroCarga) return true;
                    const dData = dashboardData.find(d => d.id === res.id);
                    return dData?.tieneCarga;
                  })
                  .map((res, resIdx) => {
                  if (!res.data) return null;
                  const instructorData = res.data;
                  
                  return (
                    <div key={resIdx} className="grid grid-cols-7 hover:bg-gray-50 transition-colors group break-inside-avoid">
                      {/* Nombre del Instructor */}
                      <div className="p-3 border-r border-gray-200 bg-gray-50/50 group-hover:bg-blue-50/30 flex flex-col justify-center">
                        <span className="text-[10px] font-black text-gray-800 leading-tight uppercase">{instructorData.nombre}</span>
                        <span className="text-[9px] text-gray-400 font-mono mt-1 tracking-tighter">{instructorData.id}</span>
                      </div>

                      {/* Días de la semana */}
                      {['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'].map((dayName) => {
                        const sessionsForDay = (instructorData.calendario || []).filter(s => {
                          const [d, m, y] = s.dia.split("/").map(Number);
                          const date = new Date(y, m - 1, d);
                          const dayIdx = date.getDay();
                          const targetIdx = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"].indexOf(dayName);
                          return dayIdx === targetIdx;
                        });

                        // Agrupar por patrones únicos
                        const patterns = sessionsForDay.reduce((acc, s) => {
                          const cleanTime = (t) => t?.replace(/:/g, '') || '';
                          const patternKey = `${cleanTime(s.horarioInicio)}-${cleanTime(s.horarioFin)} < ${s.aula || 'S/A'}`;
                          if (!acc[patternKey]) acc[patternKey] = { display: patternKey, link: s.aula };
                          return acc;
                        }, {});

                        const uniquePatterns = Object.values(patterns);

                        return (
                          <div key={dayName} className="p-2 border-r border-gray-200 last:border-r-0 flex flex-col gap-1.5 min-h-[60px]">
                            {uniquePatterns.length > 0 ? uniquePatterns.map((p, pIdx) => (
                              <div key={pIdx} className="flex items-center justify-between group/item">
                                <span className="font-mono text-[10px] text-gray-700 leading-none tracking-tighter">
                                  {p.display}
                                </span>
                                {p.link && (p.link.toLowerCase().includes("http") || p.link.toLowerCase().includes("www")) && (
                                  <a 
                                    href={p.link.startsWith("http") ? p.link : `https://${p.link}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="ml-1 opacity-0 group-hover/item:opacity-100 p-0.5 bg-blue-600 text-white rounded text-[8px] print:hidden"
                                  >
                                    🚀
                                  </a>
                                )}
                              </div>
                            )) : (
                              <div className="text-gray-300 text-[10px] font-mono text-center mt-2">-</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Botones de Exportación Supervisión */}
          <div className="flex justify-end gap-3 print:hidden">
            <button 
              onClick={handleExportarExcelSupervision}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg shadow-emerald-100"
            >
              <span>📊</span> Exportar Excel Consolidado
            </button>
            <button 
              onClick={handleDescargarPDFSupervision}
              className="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-rose-700 transition flex items-center gap-2 shadow-lg shadow-rose-100"
            >
              <span>📄</span> Descargar PDF Bonito
            </button>
            <button 
              onClick={() => window.print()}
              className="bg-gray-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-900 transition flex items-center gap-2 shadow-lg shadow-gray-200"
            >
              <span>🖨️</span> Imprimir Todo
            </button>
          </div>
        </div>
      )}

      {/* Botones Globales/Individuales */}
      <div className="flex flex-col items-center gap-4 print-hidden w-full">
        {loading && progress.pct !== undefined && (
          <div className="w-full max-w-md space-y-1 mb-2">
            <div className="flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-wider">
              <span className="animate-pulse">{progress.text || "Procesando..."}</span>
              <span className="text-blue-600">{progress.pct}%</span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out shadow-sm relative overflow-hidden"
                style={{ width: `${progress.pct}%` }}
              >
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-center gap-4">
        <button
          onClick={handleConsultar}
          disabled={loading}
          className={`px-6 py-2 rounded-xl text-white font-medium transition flex items-center gap-2 ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span> Procesando...
            </>
          ) : (
            "🔍 Consultar Todos"
          )}
        </button>

        <button
          onClick={handleLimpiar}
          disabled={loading}
          className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition"
        >
          🧹 Limpiar Todo
        </button>

        {resActal?.calendarioCompacto?.length > 0 && (
          <>
            <button
              onClick={() => handleExportarExcel(resActal)}
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
      </div>

      {/* Contenido exportable */}
      <div
        ref={pdfRef}
        id="pdf-content"
        className="bg-white p-8 text-gray-900 text-sm leading-relaxed"
      >
        {resActal?.calendarioCompacto?.length > 0 ? (
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
                  {resActal?.nombre || resActal?.nombreInstructor || "INSTRUCTOR SENATI"}
                </div>
                <div>
                  <span className="font-semibold">ID:</span>{" "}
                  {resActal?.id || resActal?.idInstructor || searchId || "------------------"}
                </div>

                <div>
                  <span className="font-semibold">PUESTO:</span> INSTRUCTOR {tipoInstructor.toUpperCase()}
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-2">
                <div className="flex gap-2">
                  <span className="font-semibold">PERIODO:</span>
                  <span className="uppercase">{fechaInicio.split('-').reverse().join('/')} AL {fechaFin.split('-').reverse().join('/')}</span>
                </div>
                <div>
                  <span className="font-semibold">HORARIO:</span>
                  <span className="ml-2 italic text-gray-500 text-[10px]">VER DETALLE EN TABLA</span>
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
                  let currentColorFlag = true;
                  
                  // Banderas para detectar extras en el portal
                  let foundPrepInWeek = false;
                  let foundAsyncInWeek = false;

                  calendarioOrdenadoDesc.forEach((diaObj, i) => {
                    const [dd, mm, yyyy] = diaObj.dia.split("/").map(Number);
                    const fecha = new Date(yyyy, mm - 1, dd, 12, 0, 0);
                    const day = fecha.getDay() || 7;
                    const lunes = new Date(fecha);
                    lunes.setDate(fecha.getDate() - day + 1);
                    const weekId = formatDatePE(lunes);

                    // Si cambia la semana y no es el primero, insertar fila de total
                    if (currentWeekId && currentWeekId !== weekId) {
                      const limitSemanal = tipoInstructor === "completo" ? 36.8 : 19;
                      const esExcesoSemanal = weekTotal > limitSemanal;
                      const esCompleto = tipoInstructor === "completo";
                      
                      rows.push(
                        <tr key={`week-total-${currentWeekId}`} className={`${esExcesoSemanal ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'} font-bold border-y-2`}>
                          <td colSpan="6" className={`border border-gray-300 p-2 text-right ${esExcesoSemanal ? 'text-orange-800' : 'text-blue-800'} uppercase text-[10px] tracking-wider`}>
                            Total Semanal ({currentWeekId})
                            {esExcesoSemanal && (
                              <span className="ml-2 text-[9px] bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full animate-pulse">
                                🚨 REVISAR: SEMANA &gt; {limitSemanal}H
                              </span>
                            )}
                          </td>
                          <td className={`border border-gray-300 p-2 text-center ${esExcesoSemanal ? 'text-orange-900' : 'text-blue-900'} text-[11px]`}>
                            {Number(weekTotal.toFixed(2))}h
                          </td>
                          <td className={`border border-gray-300 p-1 align-middle text-[9px] italic ${esExcesoSemanal ? 'text-orange-600' : 'text-gray-400'}`}>
                            {esExcesoSemanal ? `Supera límite semanal (${limitSemanal}h)` : ""}
                          </td>
                        </tr>
                      );

                      if (esCompleto) {
                        const totalFinalHP = weekTotal + 9.2 + 9.2;
                        rows.push(
                          <tr key={`week-extra-prep-${currentWeekId}`} className="bg-slate-50/50 text-slate-600 italic">
                            <td colSpan="6" className="border border-gray-300 p-1 text-right text-[9px] font-bold">
                              PREPARACIÓN DE CLASES (9.2H)
                              {!foundPrepInWeek && (
                                <span className="ml-2 text-[8px] bg-red-100 text-red-600 px-1 rounded border border-red-200">⚠️ No registrado en portal</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-1 text-center text-[10px]">9.2</td>
                            <td className="border border-gray-300 p-1"></td>
                          </tr>,
                          <tr key={`week-extra-async-${currentWeekId}`} className="bg-slate-50/50 text-slate-600 italic">
                            <td colSpan="6" className="border border-gray-300 p-1 text-right text-[9px] font-bold">
                              HORAS ASÍNCRONAS (9.2H)
                              {!foundAsyncInWeek && (
                                <span className="ml-2 text-[8px] bg-red-100 text-red-600 px-1 rounded border border-red-200">⚠️ No registrado en portal</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-1 text-center text-[10px]">9.2</td>
                            <td className="border border-gray-300 p-1"></td>
                          </tr>,
                          <tr key={`week-total-final-${currentWeekId}`} className="bg-blue-600 text-white font-black">
                            <td colSpan="6" className="border border-slate-700 p-2 text-right uppercase text-[10px] tracking-widest">TOTAL ACUMULADO IDEAL (55.2H HP)</td>
                            <td className="border border-slate-700 p-1 text-center text-sm">{Number(totalFinalHP.toFixed(2))}h</td>
                            <td className="border border-slate-700 p-1 text-[10px] text-blue-100 italic">
                              {totalFinalHP < 54.5 ? "Bajo el ideal" : totalFinalHP > 56 ? "Excede el ideal" : "Ideal alcanzado"}
                            </td>
                          </tr>
                        );
                      }
                      weekTotal = 0;
                      foundPrepInWeek = false;
                      foundAsyncInWeek = false;
                    }

                    currentWeekId = weekId;
                    
                    // Calcular el dictado total de la semana usando la data raw para mayor precisión
                    const rawSessions = resActal?.calendario || [];
                    const weekTotalCalculated = rawSessions.reduce((acc, s) => {
                      const [sdd, smm, syyyy] = s.dia.split("/").map(Number);
                      const sfecha = new Date(syyyy, smm - 1, sdd, 12, 0, 0);
                      const sday = sfecha.getDay() || 7;
                      const slunes = new Date(sfecha);
                      slunes.setDate(sfecha.getDate() - sday + 1);
                      const sweekId = formatDatePE(slunes);
                      
                      if (sweekId === currentWeekId) {
                        const snorm = (s.curso || "").toUpperCase();
                        const esAsinc = snorm.includes("ASÍNCRONA") || snorm.includes("ASINCRONA");
                        const esP = snorm.includes("PREPARACIÓN") || snorm.includes("PREPARACION");
                        
                        if (esP) return acc;

                        if (esAsinc) {
                          const parts = snorm.split(/[\/\-|]+/).map(p => p.trim()).filter(p => p && !p.includes("ASÍNCRONA") && !p.includes("ASINCRONA"));
                          if (parts.length > 0) {
                            return acc + Math.max(0, Number(s.horasPedagogicas || 0) - 2.6667);
                          }
                          return acc;
                        }
                        
                        return acc + Number(s.horasPedagogicas || 0);
                      }
                      return acc;
                    }, 0);
                    
                    weekTotal = weekTotalCalculated;
                    
                    const textNorm = diaObj.cursos?.toUpperCase() || "";
                    if (textNorm.includes("PREPARACIÓN") || textNorm.includes("PREPARACION")) foundPrepInWeek = true;
                    if (textNorm.includes("ASÍNCRONA") || textNorm.includes("ASINCRONA")) foundAsyncInWeek = true;

                    const limitSemanal = tipoInstructor === "completo" ? 36.8 : 19;
                    const esCompleto = tipoInstructor === "completo";

                    const diaAnterior = calendarioOrdenadoDesc[i - 1]?.dia;
                    const esNuevoDia = diaObj.dia !== diaAnterior;

                    if (esNuevoDia && i !== 0) {
                      currentColorFlag = !currentColorFlag;
                    }

                    const colorFondo = currentColorFlag ? "bg-slate-50" : "bg-white";
                    
                    const textNormRow = diaObj.cursos?.toUpperCase() || "";
                    const esAsincronaRow = textNormRow.includes("ASÍNCRONA") || textNormRow.includes("ASINCRONA");
                    const esPreparacionRow = textNormRow.includes("PREPARACIÓN") || textNormRow.includes("PREPARACION");
                    
                    // En el reporte compacto, solo pintamos como extra si TODA la fila es extra
                    // Si es mixta, mostrará el total pero el cálculo de semana (arriba) será inteligente
                    const esExtraTotalRow = esAsincronaRow || esPreparacionRow;

                    // Para filas mixtas, calculamos cuanto es de dictado real
                    const toMin = (t) => {
                      if (!t) return 0;
                      const [h, m] = t.split(':').map(Number);
                      return h * 60 + m;
                    };
                    const rawSessionsDia = (resActal?.calendario || []).filter(s => 
                      s.dia === diaObj.dia && 
                      (s.horarioInicio === diaObj.inicio && s.horarioFin === diaObj.fin || 
                      (toMin(s.horarioInicio) >= toMin(diaObj.inicio) && toMin(s.horarioFin) <= toMin(diaObj.fin)))
                    );
                    const dictadoRealRow = rawSessionsDia.reduce((acc, s) => {
                      const snorm = (s.curso || "").toUpperCase();
                      const esP = snorm.includes("PREPARACIÓN") || snorm.includes("PREPARACION");
                      const esA = snorm.includes("ASÍNCRONA") || snorm.includes("ASINCRONA");
                      
                      if (esP) return acc;
                      if (esA) {
                        const parts = snorm.split(/[\/\-|]+/).map(p => p.trim()).filter(p => p && !p.includes("ASÍNCRONA") && !p.includes("ASINCRONA"));
                        if (parts.length > 0) {
                          return acc + Math.max(0, Number(s.horasPedagogicas || 0) - 2.6667);
                        }
                        return acc;
                      }
                      return acc + Number(s.horasPedagogicas || 0);
                    }, 0);

                    const esExceso = diaObj.totalHoras > 7;

                    rows.push(
                      <tr key={`row-${i}`} className={`text-center ${colorFondo} ${esExceso ? 'bg-red-50/50' : ''} ${esExtraTotalRow ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                        <td className="border border-gray-300 p-1 text-[11px] font-medium text-left break-words max-w-[220px] whitespace-pre-wrap align-middle">
                          {diaObj?.cursos}
                          {esExtraTotalRow && <span className="block text-[8px] text-gray-500 italic mt-1">(Excluido de suma semanal)</span>}
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
                        <td className={`border border-gray-300 p-2 text-center text-[11px] align-middle ${esExtraTotalRow && dictadoRealRow === 0 ? 'text-gray-400 italic' : 'font-bold font-mono'}`}>
                           {esExtraTotalRow && dictadoRealRow === 0 ? '--' : Number(dictadoRealRow.toFixed(2))}
                        </td>
                        <td className={`border border-gray-300 p-1 align-middle text-[9px] italic ${esExceso && !esExtraTotalRow ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                          {esExceso && !esExtraTotalRow ? "Supera límite diario (7h)" : ""}
                        </td>
                      </tr>
                    );
                    // Si es el último, insertar el último total de semana
                    if (i === calendarioOrdenadoDesc.length - 1) {
                      const limitSemanal = tipoInstructor === "completo" ? 36.8 : 19;
                      const esExcesoSemanal = weekTotal > limitSemanal;
                      const esCompleto = tipoInstructor === "completo";

                      rows.push(
                        <tr key={`week-total-final`} className={`${esExcesoSemanal ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'} font-bold border-y-2`}>
                          <td colSpan="6" className={`border border-gray-300 p-2 text-right ${esExcesoSemanal ? 'text-orange-800' : 'text-blue-800'} uppercase text-[10px] tracking-wider`}>
                            Total Semanal ({currentWeekId})
                            {esExcesoSemanal && (
                              <span className="ml-2 text-[9px] bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full animate-pulse">
                                🚨 REVISAR: SEMANA &gt; {limitSemanal}H
                              </span>
                            )}
                          </td>
                          <td className={`border border-gray-300 p-2 text-center ${esExcesoSemanal ? 'text-orange-900' : 'text-blue-900'} text-[11px]`}>
                            {Number(weekTotal.toFixed(2))}h
                          </td>
                          <td className={`border border-gray-300 p-1 align-middle text-[9px] italic ${esExcesoSemanal ? 'text-orange-600' : 'text-gray-400'}`}>
                            {esExcesoSemanal ? `Supera límite semanal (${limitSemanal}h)` : ""}
                          </td>
                        </tr>
                      );

                      if (esCompleto) {
                        const totalFinalHP = weekTotal + 9.2 + 9.2;
                        rows.push(
                          <tr key="week-extra-prep-final" className="bg-slate-50/50 text-slate-600 italic">
                            <td colSpan="6" className="border border-gray-300 p-1 text-right text-[9px] font-bold">
                              PREPARACIÓN DE CLASES (9.2H)
                              {!foundPrepInWeek && (
                                <span className="ml-2 text-[8px] bg-red-100 text-red-600 px-1 rounded border border-red-200">⚠️ No registrado en portal</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-1 text-center text-[10px]">9.2</td>
                            <td className="border border-gray-300 p-1"></td>
                          </tr>,
                          <tr key="week-extra-async-final" className="bg-slate-50/50 text-slate-600 italic">
                            <td colSpan="6" className="border border-gray-300 p-1 text-right text-[9px] font-bold">
                              HORAS ASÍNCRONAS (9.2H)
                              {!foundAsyncInWeek && (
                                <span className="ml-2 text-[8px] bg-red-100 text-red-600 px-1 rounded border border-red-200">⚠️ No registrado en portal</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-1 text-center text-[10px]">9.2</td>
                            <td className="border border-gray-300 p-1"></td>
                          </tr>,
                          <tr key="week-total-final-final" className="bg-blue-600 text-white font-black">
                            <td colSpan="6" className="border border-slate-700 p-2 text-right uppercase text-[10px] tracking-widest">TOTAL ACUMULADO IDEAL (55.2H HP)</td>
                            <td className="border border-slate-700 p-1 text-center text-sm">{Number(totalFinalHP.toFixed(2))}h</td>
                            <td className="border border-slate-700 p-1 text-[10px] text-blue-100 italic">
                              {totalFinalHP < 54.5 ? "Bajo el ideal" : totalFinalHP > 56 ? "Excede el ideal" : "Ideal alcanzado"}
                            </td>
                          </tr>
                        );
                      }
                    }
                  });
                  return rows;
                })()}
              </tbody>
            </table>
          </>
        ) : null}
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
