import { useState, useEffect, useMemo } from "react";
import html2canvas from "html2canvas";

function RenderCobros({ logs, loading }) {
  const [incluirMatricula, setIncluirMatricula] = useState({});
  const [incluirRetiro, setIncluirRetiro] = useState({});
  const [mensajesPersonalizados, setMensajesPersonalizados] = useState({});
  const [mostrarEditorMensaje, setMostrarEditorMensaje] = useState({});
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [problemasTrazabilidad, setProblemasTrazabilidad] = useState([]);
  const [mostrarAlertaTrazabilidad, setMostrarAlertaTrazabilidad] = useState(true);
  
  // Estado para el mensaje global
  const [mensajeGlobal, setMensajeGlobal] = useState(() => {
    return localStorage.getItem("mensajeGlobal") || "";
  });
  const [mostrarConfigGlobal, setMostrarConfigGlobal] = useState(false);
  const [mostrarModalRetiro, setMostrarModalRetiro] = useState(false);
  const [mostrarModalDeuda, setMostrarModalDeuda] = useState(false);
  const [mostrarModalMatriculaPendiente, setMostrarModalMatriculaPendiente] = useState(false);
  const [mostrarModalBecados, setMostrarModalBecados] = useState(false);

  // Guardar mensaje global en localStorage
  useEffect(() => {
    if (mensajeGlobal) {
      localStorage.setItem("mensajeGlobal", mensajeGlobal);
    } else {
      localStorage.removeItem("mensajeGlobal");
    }
  }, [mensajeGlobal]);
  
  // Detectar problemas de trazabilidad en los logs
  useEffect(() => {
    if (!logs || logs.length === 0) return;
    
    const problemasDetectados = [];
    
    logs.forEach((hoja, hojaIndex) => {
      const resultados = hoja?.msg?.resultados || [];
      
      resultados.forEach((alumno, alumnoIndex) => {
        const datos = alumno?.datos || [];
        const id = alumno?.id || 'N/A';
        
        // Detectar inconsistencias
        const tienePagos = datos.some(d => d?.estado?.toLowerCase() === 'cancelado');
        const tieneNRC = datos.some(d => d?.nrc);
        const esRetiro = alumno?.estado?.toLowerCase()?.includes('retiro');
        
        if (esRetiro && (tienePagos || tieneNRC)) {
          problemasDetectados.push({
            id,
            hojaIndex,
            alumnoIndex,
            tipo: 'INCONSISTENCIA_RETIRO',
            mensaje: `ID ${id} marcado como retiro pero tiene ${tienePagos ? 'pagos' : 'NRC asignado'}`,
            severidad: 'alta'
          });
        }
      });
    });
    
    setProblemasTrazabilidad(problemasDetectados);
    
    if (problemasDetectados.length > 0) {
      console.warn(`⚠️ [TRAZABILIDAD] Detectados ${problemasDetectados.length} problemas de coherencia`);
      problemasDetectados.forEach(p => console.warn(`   - ${p.mensaje}`));
    }
  }, [logs]);

  const getMensajeDefault = () => {
    if (mensajeGlobal) return mensajeGlobal;
    const horaActual = new Date().getHours();
    return `${horaActual > 12 ? "Buenas tardes" : "Buenos días"},
🔹 Les recordamos que el pago de la mensualidad debe realizarse al inicio de cada ciclo.
✅ Alumnos en verde: Cancelaron.
⚠️ Alumnos en rojo: Aún deben el presente mes.
🚨 Alumnos en amarillo: Para retiro del sistema.`;
  };

  // Cálculos Globales
  const stats = useMemo(() => {
    let total = 0;
    let cancelados = 0;
    let pendientes = 0;
    let retiro = 0;
    let matriculaPendiente = 0;
    let becados = 0;
    const listaRetiro = [];
    const listaDeuda = [];
    const listaMatriculaPendiente = [];
    const listaBecados = [];

    logs.forEach(hoja => {
      const resultados = hoja?.msg?.resultados || [];
      const nrcEsperado = hoja?.msg?.hoja?.split("-")[0]?.trim() ?? "";
      const nombreHoja = hoja?.msg?.hoja || "Sin nombre";
      
      resultados.forEach(res => {
        total++;
        const datosValidos = (res?.datos ?? []).filter(x => x && (x.nrc || x.concepto || x.monto || x.estado));
        
        // Filtrar por NRC esperado
        const filasConNrcEsperado = datosValidos.filter(x => parseInt(x.nrc, 10) === parseInt(nrcEsperado, 10));
        const datosAUsar = filasConNrcEsperado.length > 0 ? filasConNrcEsperado : datosValidos;
        
        // Verificar si es becado
        const esBecado = datosAUsar.some(x => 
          x?.concepto?.toLowerCase()?.includes('becado') || 
          x?.estado?.toLowerCase()?.includes('becado')
        );
        
        // Si es becado, agregarlo a la lista
        if (esBecado) {
          becados++;
          listaBecados.push({ nombre: res?.nombreAlumno, id: res?.id, hoja: nombreHoja });
        }
        
        // Buscar matrícula
        const matricula = datosAUsar.find(x => 
          x?.concepto?.toLowerCase()?.includes('matrícula') || 
          x?.concepto?.toLowerCase()?.includes('matricula')
        );
        
        // Verificar estado de matrícula (pendiente si existe y no está cancelada, y no es becado)
        if (!esBecado && matricula) {
          const estadoMatricula = (matricula?.estado ?? "").toLowerCase();
          if (estadoMatricula === "pendiente de pago" || estadoMatricula.includes("pendiente")) {
            matriculaPendiente++;
            listaMatriculaPendiente.push({ nombre: res?.nombreAlumno, id: res?.id, hoja: nombreHoja });
          }
        }
        
        // Buscar mensualidad (excluyendo matrícula)
        const mensualidad = datosAUsar.find(x => 
          !x?.concepto?.toLowerCase()?.includes('matrícula') && 
          !x?.concepto?.toLowerCase()?.includes('matricula')
        ) || datosAUsar.find(x => x); // fallback al primer dato disponible

        if (!mensualidad) {
          retiro++;
          listaRetiro.push({ nombre: res?.nombreAlumno, id: res?.id, hoja: nombreHoja });
        } else {
          const estadoTexto = (mensualidad?.estado ?? "").toLowerCase();
          if (estadoTexto === "pendiente de pago" || estadoTexto.includes("pendiente")) {
            pendientes++;
            listaDeuda.push({ nombre: res?.nombreAlumno, id: res?.id, hoja: nombreHoja });
          } else {
            cancelados++;
          }
        }
      });
    });

    return { total, cancelados, pendientes, retiro, matriculaPendiente, becados, listaRetiro, listaDeuda, listaMatriculaPendiente, listaBecados };
  }, [logs]);

  // Función helper para procesar datos del alumno (mensualidad y matrícula)
  const procesarDatosAlumno = (res, nrcEsperado) => {
    const datosValidos = (res?.datos ?? []).filter(x => x && (x.nrc || x.concepto || x.monto || x.estado));
    
    // Filtrar por NRC esperado
    const filasConNrcEsperado = datosValidos.filter(x => parseInt(x.nrc, 10) === parseInt(nrcEsperado, 10));
    const datosAUsar = filasConNrcEsperado.length > 0 ? filasConNrcEsperado : datosValidos;
    
    // Separar mensualidad y matrícula
    const matricula = datosAUsar.find(x => 
      x?.concepto?.toLowerCase()?.includes('matrícula') || 
      x?.concepto?.toLowerCase()?.includes('matricula')
    );
    
    const mensualidad = datosAUsar.find(x => 
      !x?.concepto?.toLowerCase()?.includes('matrícula') && 
      !x?.concepto?.toLowerCase()?.includes('matricula')
    ) || datosAUsar[datosAUsar.length - 1];
    
    // Verificar si es becado (en concepto o estado de cualquier registro)
    const esBecado = datosAUsar.some(x => 
      x?.concepto?.toLowerCase()?.includes('becado') || 
      x?.estado?.toLowerCase()?.includes('becado')
    );
    
    // Determinar estados
    const getEstado = (dato, forzarCancelado = false) => {
      // Si es becado, forzar cancelado
      if (forzarCancelado) {
        return { tipo: 'cancelado', texto: 'Becado' };
      }
      if (!dato) return { tipo: 'retiro', texto: 'Sin datos' };
      const estadoTexto = (dato?.estado ?? "").toLowerCase();
      const conceptoTexto = (dato?.concepto ?? "").toLowerCase();
      
      // Si el concepto o estado indica becado, está cancelado
      if (conceptoTexto.includes('becado') || estadoTexto.includes('becado')) {
        return { tipo: 'cancelado', texto: 'Becado' };
      }
      if (estadoTexto === "pendiente de pago" || estadoTexto.includes("pendiente")) {
        return { tipo: 'pendiente', texto: 'Pendiente' };
      }
      if (estadoTexto.includes("cancelad") || estadoTexto.includes("adeuda") || estadoTexto === "inscrito") {
        return { tipo: 'cancelado', texto: 'Cancelado' };
      }
      return { tipo: 'otro', texto: dato?.estado || 'Desconocido' };
    };
    
    // Si es becado y no tiene matrícula explícita, la matrícula también está cancelada
    const estadoMatricula = matricula 
      ? getEstado(matricula) 
      : (esBecado ? { tipo: 'cancelado', texto: 'Becado' } : { tipo: 'retiro', texto: 'Sin datos' });
    
    return {
      mensualidad: mensualidad || null,
      matricula: matricula || null,
      estadoMensualidad: getEstado(mensualidad),
      estadoMatricula: estadoMatricula,
      tieneMatricula: !!matricula || esBecado, // Mostrar matrícula si es becado
      esBecado: esBecado,
      nrc: mensualidad?.nrc || matricula?.nrc || null
    };
  };

  const copiarSoloTexto = async (i) => {
    const texto = mensajesPersonalizados[i] || getMensajeDefault();
    try {
      await navigator.clipboard.writeText(texto);
      alert("✅ Texto copiado");
    } catch (err) {
      alert("❌ Error al copiar");
    }
  };

  const copiarTabla = async (id, i) => {
    const tabla = document.getElementById(id);
    if (!tabla) return;

    const hoja = logs[i];
    const nombreHoja = hoja?.msg?.hoja || "Reporte";
    const fechaActual = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });

    const clone = tabla.cloneNode(true);
    
    // Si NO se incluye matrícula, eliminar esa columna del clone
    if (!incluirMatricula[i]) {
      const headers = Array.from(clone.querySelectorAll("th"));
      const thIndex = headers.findIndex(th => th.innerText.toLowerCase().includes("matrícula"));
      if (thIndex >= 0) {
        clone.querySelectorAll("tr").forEach(tr => { 
          if (tr.children[thIndex]) tr.removeChild(tr.children[thIndex]); 
        });
      }
    }

    // Eliminar filas de retiro si no está marcado incluir retiros
    if (!incluirRetiro[i]) {
      const filas = Array.from(clone.querySelectorAll("tbody tr"));
      filas.forEach((tr) => {
        const txt = tr.innerText.toLowerCase();
        const esRetiro = txt.includes("retiro");
        if (esRetiro) {
          tr.remove();
        }
      });
    }

    // Resumen para la foto - contar estados de mensualidad (columna 5)
    let c = 0, p = 0;
    clone.querySelectorAll("tbody tr").forEach(tr => {
      const celdas = tr.querySelectorAll("td");
      // La columna de mensualidad es la 5ta (índice 4)
      const celdaMensualidad = celdas[4];
      if (celdaMensualidad) {
        const txt = celdaMensualidad.innerText.toLowerCase();
        if (txt.includes("cancelado") || txt.includes("cancelada")) c++;
        else if (txt.includes("pendiente")) p++;
        // Los retiros ya fueron eliminados si no se incluyeron
      }
    });

    const totalAlumnos = c + p;
    const anchoBase = incluirMatricula[i] ? 900 : 780;

    const wrapper = document.createElement("div");
    wrapper.className = "font-sans";
    wrapper.style.cssText = `
      padding: 16px 20px;
      background: #ffffff;
      width: ${anchoBase}px;
      border-radius: 12px;
      position: fixed;
      top: -9999px;
      left: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      border: 1px solid #e5e7eb;
    `;
    
    wrapper.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;">
        <div>
          <h2 style="font-size: 18px; font-weight: 700; color: #1f2937; margin: 0;">${nombreHoja}</h2>
          <p style="font-size: 11px; color: #6b7280; font-weight: 500; margin: 3px 0 0 0;">SENATI • ${fechaActual}</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 5px; background: #ecfdf5; padding: 5px 12px; border-radius: 6px;">
            <span style="font-size: 11px;">✅</span>
            <span style="font-size: 12px; font-weight: 600; color: #059669;">Pagados: <strong style="font-size: 15px;">${c}</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 5px; background: #fef2f2; padding: 5px 12px; border-radius: 6px;">
            <span style="font-size: 11px;">⚠️</span>
            <span style="font-size: 12px; font-weight: 600; color: #dc2626;">Pendientes: <strong style="font-size: 15px;">${p}</strong></span>
          </div>
        </div>
      </div>
    `;

    // Aplicar estilos compactos a la tabla
    clone.style.cssText = "width: 100%; border-collapse: collapse;";
    
    clone.querySelectorAll("th").forEach((th, thIdx) => {
      const isNombreHeader = thIdx === 1;
      th.style.cssText = `
        text-align: ${isNombreHeader ? 'left' : 'center'};
        padding: 8px 6px;
        color: #374151;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        background: #f9fafb;
        border-bottom: 2px solid #e5e7eb;
      `;
    });
    
    clone.querySelectorAll("tbody tr").forEach((tr, idx) => {
      const isEven = idx % 2 === 0;
      tr.querySelectorAll("td").forEach((td, tdIdx) => {
        // tdIdx 1 es la columna del nombre del alumno
        const isNombreColumn = tdIdx === 1;
        td.style.cssText = `
          padding: ${totalAlumnos > 20 ? '5px 6px' : '7px 8px'};
          font-size: ${totalAlumnos > 20 ? '14px' : '15px'};
          font-weight: 500;
          background: ${isEven ? '#ffffff' : '#f9fafb'};
          color: #1f2937;
          border-bottom: 1px solid #f3f4f6;
          text-align: ${isNombreColumn ? 'left' : 'center'};
        `;
        
        // Colores de estado
        const txt = td.innerText.toLowerCase();
        if (txt.includes("pagado") || txt.includes("cancelada") || txt.includes("inscrito")) {
          td.style.color = "#059669";
          td.style.fontWeight = "600";
        }
        if (txt.includes("pendiente")) {
          td.style.color = "#dc2626";
          td.style.fontWeight = "600";
        }
      });
    });

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      // Escala adaptativa según cantidad de alumnos
      const escala = totalAlumnos > 25 ? 3 : 4;
      const canvas = await html2canvas(wrapper, { 
        scale: escala, 
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        imageTimeout: 0,
        allowTaint: true
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          document.body.removeChild(wrapper);
          alert("❌ Error al generar imagen");
          return;
        }
        
        const texto = mensajesPersonalizados[i] || getMensajeDefault();
        
        try {
          // Copiar imagen + texto juntos usando ClipboardItem
          await navigator.clipboard.write([
            new ClipboardItem({ 
              "image/png": blob,
              "text/plain": new Blob([texto], { type: "text/plain" })
            })
          ]);
          alert("✅ Imagen + Texto copiados al portapapeles\n\n💡 Tip: En WhatsApp pega primero la imagen, luego el texto se pegará después.");
        } catch (clipErr) {
          console.log("Error copiando imagen+texto juntos:", clipErr);
          // Fallback: intentar copiar solo la imagen y luego copiar texto
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            // Guardar el texto en localStorage para pegarlo después
            localStorage.setItem("textoReportePendiente", texto);
            alert("✅ Imagen copiada\n\n📝 El texto se guardó. Haz clic en '📝 Texto' para copiarlo después de pegar la imagen.");
          } catch {
            alert("❌ Error al copiar al portapapeles");
          }
        }
        
        document.body.removeChild(wrapper);
      }, "image/png", 1.0);
    } catch (e) {
      document.body.removeChild(wrapper);
      console.error("Error html2canvas:", e);
      alert("❌ Error al generar imagen");
    }
  };

  if (logs.length === 0) return null;

  return (
    <>
      {/* Alerta de Problemas de Trazabilidad */}
      {problemasTrazabilidad.length > 0 && mostrarAlertaTrazabilidad && (
        <div className="mx-4 mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-bold text-yellow-800">
                  ⚠️ Problemas de Trazabilidad Detectados ({problemasTrazabilidad.length})
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p className="mb-2">Se detectaron inconsistencias que afectan la trazabilidad:</p>
                  <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                    {problemasTrazabilidad.slice(0, 10).map((problema, idx) => (
                      <li key={idx} className={problema.severidad === 'alta' ? 'font-semibold' : ''}>
                        <strong>Hoja {problema.hojaIndex + 1}:</strong> {problema.mensaje}
                      </li>
                    ))}
                    {problemasTrazabilidad.length > 10 && (
                      <li className="italic">... y {problemasTrazabilidad.length - 10} más</li>
                    )}
                  </ul>
                  <p className="mt-3 text-xs">
                    💡 <strong>Recomendación:</strong> Verificar y corregir estados inconsistentes en el sistema.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setMostrarAlertaTrazabilidad(false)}
              className="ml-4 text-yellow-600 hover:text-yellow-800"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
    <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-120px)]">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-80 flex flex-col gap-6">
        {/* Global Stats Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Resumen General</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-bold text-slate-600">Total Alumnos</span>
              </div>
              <span className="text-lg font-black text-slate-900">{stats.total}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Cancelados</p>
                <p className="text-xl font-black text-emerald-700">{stats.cancelados}</p>
              </div>
              <button 
                onClick={() => setMostrarModalDeuda(true)}
                className="p-4 bg-rose-50 rounded-2xl border border-rose-100 hover:bg-rose-100 transition-colors text-left cursor-pointer"
              >
                <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Deuda</p>
                <p className="text-xl font-black text-rose-700">{stats.pendientes}</p>
                <p className="text-[9px] text-rose-400 mt-1">Click para ver lista</p>
              </button>
            </div>
            <button 
              onClick={() => setMostrarModalRetiro(true)}
              className="w-full p-4 bg-amber-50 rounded-2xl border border-amber-100 hover:bg-amber-100 transition-colors text-left cursor-pointer"
            >
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Para Retiro</p>
                  <p className="text-xl font-black text-amber-700">{stats.retiro}</p>
                  <p className="text-[9px] text-amber-400 mt-1">Click para ver lista</p>
                </div>
                <span className="text-2xl">🚨</span>
              </div>
            </button>
            {stats.matriculaPendiente > 0 && (
              <button 
                onClick={() => setMostrarModalMatriculaPendiente(true)}
                className="w-full p-4 bg-purple-50 rounded-2xl border border-purple-100 hover:bg-purple-100 transition-colors text-left cursor-pointer"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-purple-600 uppercase mb-1">Matrícula Pendiente</p>
                    <p className="text-xl font-black text-purple-700">{stats.matriculaPendiente}</p>
                    <p className="text-[9px] text-purple-400 mt-1">Click para ver lista</p>
                  </div>
                  <span className="text-2xl">📝</span>
                </div>
              </button>
            )}
            {stats.becados > 0 && (
              <button 
                onClick={() => setMostrarModalBecados(true)}
                className="w-full p-4 bg-cyan-50 rounded-2xl border border-cyan-100 hover:bg-cyan-100 transition-colors text-left cursor-pointer"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-cyan-600 uppercase mb-1">Becados</p>
                    <p className="text-xl font-black text-cyan-700">{stats.becados}</p>
                    <p className="text-[9px] text-cyan-400 mt-1">Click para ver lista</p>
                  </div>
                  <span className="text-2xl">🎓</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Sheet Selector */}
        <div className="bg-white rounded-[32px] p-4 shadow-xl shadow-slate-200/50 border border-slate-100 flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-4 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Hojas ({logs.length})</h3>
            <button onClick={() => setMostrarConfigGlobal(true)} className="text-lg hover:rotate-90 transition-transform duration-500">⚙️</button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-2">
            {logs.map((hoja, idx) => {
              // Calcular stats por hoja
              const resultados = hoja?.msg?.resultados || [];
              const nrcEsperado = hoja?.msg?.hoja?.split("-")[0]?.trim() ?? "";
              let pagados = 0, pendientesHoja = 0, becadosHoja = 0;
              
              resultados.forEach(res => {
                const datosValidos = (res?.datos ?? []).filter(x => x && (x.nrc || x.concepto || x.monto || x.estado));
                const filasConNrcEsperado = datosValidos.filter(x => parseInt(x.nrc, 10) === parseInt(nrcEsperado, 10));
                const datosAUsar = filasConNrcEsperado.length > 0 ? filasConNrcEsperado : datosValidos;
                
                const esBecado = datosAUsar.some(x => 
                  x?.concepto?.toLowerCase()?.includes('becado') || 
                  x?.estado?.toLowerCase()?.includes('becado')
                );
                
                if (esBecado) {
                  becadosHoja++;
                  pagados++; // Becados cuentan como pagados
                } else {
                  const mensualidad = datosAUsar.find(x => 
                    !x?.concepto?.toLowerCase()?.includes('matrícula') && 
                    !x?.concepto?.toLowerCase()?.includes('matricula')
                  ) || datosAUsar[0];
                  
                  if (mensualidad) {
                    const estadoTexto = (mensualidad?.estado ?? "").toLowerCase();
                    if (estadoTexto === "pendiente de pago" || estadoTexto.includes("pendiente")) {
                      pendientesHoja++;
                    } else {
                      pagados++;
                    }
                  }
                }
              });
              
              return (
              <button
                key={idx}
                onClick={() => setActiveSheetIndex(idx)}
                className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-300 flex items-center justify-between group ${
                  activeSheetIndex === idx 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 -translate-y-0.5" 
                  : "hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="flex flex-col">
                  <span className={`text-sm font-bold truncate max-w-[120px] ${activeSheetIndex === idx ? "text-white" : "text-slate-800"}`}>
                    {hoja?.msg?.hoja}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${activeSheetIndex === idx ? "text-blue-100" : "text-slate-400"}`}>
                    {hoja?.msg?.resultados?.length || 0} alumnos
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeSheetIndex === idx ? "bg-emerald-400/30 text-emerald-100" : "bg-emerald-100 text-emerald-600"}`}>
                    ✓{pagados}
                  </span>
                  {pendientesHoja > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeSheetIndex === idx ? "bg-rose-400/30 text-rose-100" : "bg-rose-100 text-rose-600"}`}>
                      !{pendientesHoja}
                    </span>
                  )}
                  {becadosHoja > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeSheetIndex === idx ? "bg-cyan-400/30 text-cyan-100" : "bg-cyan-100 text-cyan-600"}`}>
                      🎓{becadosHoja}
                    </span>
                  )}
                </div>
              </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Search & Actions Bar */}
        <div className="bg-white rounded-[32px] p-4 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar alumno por nombre o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => copiarSoloTexto(activeSheetIndex)}
              className="flex-1 md:flex-none px-6 py-4 bg-indigo-50 text-indigo-700 font-bold rounded-2xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
            >
              📝 Texto
            </button>
            <button 
              onClick={() => copiarTabla(`tabla-${activeSheetIndex}`, activeSheetIndex)}
              className="flex-1 md:flex-none px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              📋 Copiar Reporte
            </button>
          </div>
        </div>

        {/* Active Sheet Content */}
        <div className="bg-white rounded-[40px] p-8 shadow-2xl shadow-slate-200/60 border border-slate-100 relative overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 blur-3xl rounded-full -mr-32 -mt-32 -z-10"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-2">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                {logs[activeSheetIndex]?.msg?.hoja}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                  NRC {logs[activeSheetIndex]?.msg?.hoja?.split("-")[0]}
                </span>
                <button 
                  onClick={() => setMostrarEditorMensaje(prev => ({...prev, [activeSheetIndex]: !prev[activeSheetIndex]}))}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  ✏️ Editar mensaje personalizado
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={!!incluirMatricula[activeSheetIndex]}
                  onChange={(e) => setIncluirMatricula(prev => ({...prev, [activeSheetIndex]: e.target.checked}))}
                  className="w-4 h-4 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-600">Incluir Matrícula</span>
              </label>

              <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={!!incluirRetiro[activeSheetIndex]}
                  onChange={(e) => setIncluirRetiro(prev => ({...prev, [activeSheetIndex]: e.target.checked}))}
                  className="w-4 h-4 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-600">Incluir Retiros</span>
              </label>
            </div>
          </div>

          {mostrarEditorMensaje[activeSheetIndex] && (
            <div className="mb-8 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 animate-in slide-in-from-top-4 duration-300">
              <textarea 
                value={mensajesPersonalizados[activeSheetIndex] || getMensajeDefault()}
                onChange={(e) => setMensajesPersonalizados(prev => ({...prev, [activeSheetIndex]: e.target.value}))}
                className="w-full p-4 bg-white border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none font-medium text-slate-700 shadow-sm"
                rows="4"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setMensajesPersonalizados(prev => ({...prev, [activeSheetIndex]: getMensajeDefault()}))} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800">Restaurar</button>
                <button onClick={() => setMostrarEditorMensaje(prev => ({...prev, [activeSheetIndex]: false}))} className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl">Guardar</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table id={`tabla-${activeSheetIndex}`} className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">N°</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Alumno</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">NRC</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Código</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mensualidad</th>
                  {incluirMatricula[activeSheetIndex] && (
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matrícula</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(logs[activeSheetIndex]?.msg?.resultados || [])
                  .filter(res => 
                    res?.nombreAlumno?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    res?.id?.includes(searchTerm)
                  )
                  .map((res, j) => {
                    const nrcEsperado = logs[activeSheetIndex]?.msg?.hoja?.split("-")[0]?.trim() ?? "";
                    const datos = procesarDatosAlumno(res, nrcEsperado);
                    
                    // Configuración de estado para mensualidad
                    const getStatusConfig = (estadoInfo) => {
                      if (estadoInfo.tipo === 'pendiente') {
                        return { label: "⚠️ Pendiente", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" };
                      } else if (estadoInfo.tipo === 'cancelado') {
                        return { label: "✅ Cancelado", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" };
                      } else if (estadoInfo.tipo === 'retiro') {
                        return { label: "🚨 Retiro", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" };
                      }
                      return { label: estadoInfo.texto, bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-100" };
                    };
                    
                    const statusMensualidad = getStatusConfig(datos.estadoMensualidad);
                    const statusMatricula = datos.tieneMatricula ? getStatusConfig(datos.estadoMatricula) : null;
                    
                    // Fondo especial para becados
                    const bgBase = datos.esBecado ? 'bg-cyan-50' : 'bg-slate-50';
                    const bgHover = datos.esBecado ? 'group-hover:bg-cyan-100' : 'group-hover:bg-slate-100';

                    return (
                      <tr key={j} className={`group transition-all duration-300 ${datos.esBecado ? 'ring-2 ring-cyan-200 ring-inset rounded-2xl' : ''}`}>
                        <td className={`px-6 py-2 ${bgBase} rounded-l-2xl text-xs font-black ${datos.esBecado ? 'text-cyan-600' : 'text-slate-400'} ${bgHover} transition-colors`}>
                          {j + 1}
                          {datos.esBecado && <span className="ml-1">🎓</span>}
                        </td>
                        <td className={`px-6 py-2 ${bgBase} ${bgHover} transition-colors`}>
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold ${datos.esBecado ? 'text-cyan-800' : 'text-slate-800'}`}>{res?.nombreAlumno}</span>
                            <span className="text-[14px] font-bold text-slate-400 font-mono">{res?.id}</span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${bgBase} text-center ${bgHover} transition-colors`}>
                          <span className={`text-xs font-black ${datos.nrc && parseInt(datos.nrc) !== parseInt(nrcEsperado) ? "text-orange-500" : "text-slate-600"}`}>
                            {datos.nrc || "-"}
                          </span>
                        </td>
                        <td className={`px-6 py-4 ${bgBase} text-center ${bgHover} transition-colors`}>
                          <span className="text-[15px] font-bold text-blue-700 font-mono bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 tracking-wider">
                            {res?.codigoPago || "-"}
                          </span>
                        </td>
                        <td className={`px-6 py-4 ${bgBase} text-center ${bgHover} transition-colors ${!incluirMatricula[activeSheetIndex] ? 'rounded-r-2xl' : ''}`}>
                          <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border ${statusMensualidad.bg} ${statusMensualidad.text} ${statusMensualidad.border}`}>
                            <span className="text-[12px] font-black uppercase tracking-wider">{statusMensualidad.label}</span>
                          </div>
                        </td>
                        {incluirMatricula[activeSheetIndex] && (
                          <td className={`px-6 py-4 ${bgBase} rounded-r-2xl text-center ${bgHover} transition-colors`}>
                            {statusMatricula ? (
                              <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border ${statusMatricula.bg} ${statusMatricula.text} ${statusMatricula.border}`}>
                                <span className="text-[12px] font-black uppercase tracking-wider">{statusMatricula.label}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Global Config Modal */}
      {mostrarConfigGlobal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-2xl shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900">Configuración Global</h3>
              <button onClick={() => setMostrarConfigGlobal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">✕</button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Mensaje por Defecto</label>
                <textarea 
                  value={mensajeGlobal}
                  onChange={(e) => setMensajeGlobal(e.target.value)}
                  className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[32px] focus:bg-white focus:border-blue-500 outline-none font-medium text-slate-700 transition-all shadow-inner"
                  rows="6"
                  placeholder="Escribe el mensaje que verán todos los alumnos..."
                />
              </div>
              
              <div className="flex gap-4">
                <button onClick={() => setMensajeGlobal("")} className="flex-1 py-4 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors">Restaurar Original</button>
                <button onClick={() => setMostrarConfigGlobal(false)} className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all">Guardar Cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lista de Retiros */}
      {mostrarModalRetiro && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🚨</span>
                <div>
                  <h3 className="text-xl font-black text-amber-700">Alumnos para Retiro</h3>
                  <p className="text-sm text-slate-500">{stats.listaRetiro.length} alumnos en total</p>
                </div>
              </div>
              <button onClick={() => setMostrarModalRetiro(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {stats.listaRetiro.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <span className="text-4xl">✅</span>
                  <p className="mt-2 font-medium">No hay alumnos para retiro</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.listaRetiro.map((alumno, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{alumno.nombre}</p>
                        <p className="text-xs text-slate-500 font-mono">{alumno.id}</p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-lg">{alumno.hoja}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Lista de Deudores */}
      {mostrarModalDeuda && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h3 className="text-xl font-black text-rose-700">Alumnos con Deuda</h3>
                  <p className="text-sm text-slate-500">{stats.listaDeuda.length} alumnos en total</p>
                </div>
              </div>
              <button onClick={() => setMostrarModalDeuda(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {stats.listaDeuda.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <span className="text-4xl">✅</span>
                  <p className="mt-2 font-medium">No hay alumnos con deuda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.listaDeuda.map((alumno, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{alumno.nombre}</p>
                        <p className="text-xs text-slate-500 font-mono">{alumno.id}</p>
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-lg">{alumno.hoja}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Lista de Matrícula Pendiente */}
      {mostrarModalMatriculaPendiente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📝</span>
                <div>
                  <h3 className="text-xl font-black text-purple-700">Matrícula Pendiente</h3>
                  <p className="text-sm text-slate-500">{stats.listaMatriculaPendiente.length} alumnos en total</p>
                </div>
              </div>
              <button onClick={() => setMostrarModalMatriculaPendiente(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {stats.listaMatriculaPendiente.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <span className="text-4xl">✅</span>
                  <p className="mt-2 font-medium">No hay alumnos con matrícula pendiente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.listaMatriculaPendiente.map((alumno, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{alumno.nombre}</p>
                        <p className="text-xs text-slate-500 font-mono">{alumno.id}</p>
                      </div>
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-lg">{alumno.hoja}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Lista de Becados */}
      {mostrarModalBecados && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎓</span>
                <div>
                  <h3 className="text-xl font-black text-cyan-700">Alumnos Becados</h3>
                  <p className="text-sm text-slate-500">{stats.listaBecados.length} alumnos en total</p>
                </div>
              </div>
              <button onClick={() => setMostrarModalBecados(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {stats.listaBecados.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <span className="text-4xl">📋</span>
                  <p className="mt-2 font-medium">No hay alumnos becados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.listaBecados.map((alumno, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-cyan-50 rounded-xl border border-cyan-100">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{alumno.nombre}</p>
                        <p className="text-xs text-slate-500 font-mono">{alumno.id}</p>
                      </div>
                      <span className="text-[10px] font-bold text-cyan-600 bg-cyan-100 px-2 py-1 rounded-lg">{alumno.hoja}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>    </>  );
}

export default RenderCobros;
