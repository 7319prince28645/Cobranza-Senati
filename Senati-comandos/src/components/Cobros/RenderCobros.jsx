import { useState, useEffect, useMemo } from "react";
import html2canvas from "html2canvas";

function RenderCobros({ logs, loading }) {
  const [incluirMatricula, setIncluirMatricula] = useState({});
  const [incluirRetiro, setIncluirRetiro] = useState({});
  const [mensajesPersonalizados, setMensajesPersonalizados] = useState({});
  const [mostrarEditorMensaje, setMostrarEditorMensaje] = useState({});
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estado para el mensaje global
  const [mensajeGlobal, setMensajeGlobal] = useState(() => {
    return localStorage.getItem("mensajeGlobal") || "";
  });
  const [mostrarConfigGlobal, setMostrarConfigGlobal] = useState(false);

  // Guardar mensaje global en localStorage
  useEffect(() => {
    if (mensajeGlobal) {
      localStorage.setItem("mensajeGlobal", mensajeGlobal);
    } else {
      localStorage.removeItem("mensajeGlobal");
    }
  }, [mensajeGlobal]);

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

    logs.forEach(hoja => {
      const resultados = hoja?.msg?.resultados || [];
      const nrcEsperado = hoja?.msg?.hoja?.split("-")[0]?.trim() ?? "";
      
      resultados.forEach(res => {
        total++;
        const datosValidos = (res?.datos ?? []).filter(x => x && (x.nrc || x.concepto || x.monto || x.estado));
        let d = null;
        if (datosValidos.length > 0) {
          const filasConNrcEsperado = datosValidos.filter(x => parseInt(x.nrc, 10) === parseInt(nrcEsperado, 10));
          d = filasConNrcEsperado.length > 0 ? filasConNrcEsperado[filasConNrcEsperado.length - 1] : datosValidos[datosValidos.length - 1];
        }

        if (!d) retiro++;
        else {
          const estadoTexto = (d?.estado ?? "").toLowerCase();
          if (estadoTexto === "pendiente de pago" || estadoTexto.includes("pendiente")) pendientes++;
          else cancelados++;
        }
      });
    });

    return { total, cancelados, pendientes, retiro };
  }, [logs]);

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
    if (!incluirMatricula[i]) {
      const thIndex = Array.from(clone.querySelectorAll("th")).findIndex(th => th.innerText.toLowerCase().includes("matrícula"));
      if (thIndex >= 0) {
        clone.querySelectorAll("tr").forEach(tr => { if (tr.children[thIndex]) tr.removeChild(tr.children[thIndex]); });
      }
    }

    // Limpieza de filas vacías y filtrado de retiros
    const filas = Array.from(clone.querySelectorAll("tbody tr"));
    let ultimaFilaConDatos = -1;
    
    filas.forEach((tr, idx) => {
      const txt = tr.innerText.toLowerCase();
      const esRetiro = txt.includes("retiro");
      
      // Si el usuario NO quiere incluir retiros, eliminamos la fila del clon
      if (!incluirRetiro[i] && esRetiro) {
        tr.remove();
        return;
      }

      const tieneNRC = tr.querySelector("td:nth-child(4)")?.innerText.trim();
      if (tieneNRC && tieneNRC !== "-") ultimaFilaConDatos = idx;
    });

    // Resumen para la foto (basado en lo que quedó en el clon)
    let c = 0, p = 0, r = 0;
    clone.querySelectorAll("tbody tr").forEach(tr => {
      const txt = tr.innerText.toLowerCase();
      if (txt.includes("retiro")) r++;
      else if (txt.includes("cancelada") || txt.includes("inscrito")) c++;
      else p++;
    });

    const wrapper = document.createElement("div");
    wrapper.className = "p-12 bg-white w-[1200px] rounded-[48px] font-sans fixed -top-[9999px]";
    wrapper.style.background = "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)";
    
    wrapper.innerHTML = `
      <div style="margin-bottom: 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #f1f5f9; padding-bottom: 32px;">
        <div>
          <h2 style="font-size: 54px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.03em;">${nombreHoja}</h2>
          <p style="font-size: 24px; color: #64748b; font-weight: 700; margin-top: 8px;">Reporte de Gestión Académica • SENATI</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 24px; font-weight: 800; color: #3b82f6; background: #eff6ff; padding: 12px 24px; border-radius: 20px; display: inline-block;">${fechaActual}</p>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-bottom: 48px;">
        <div style="background: #ecfdf5; padding: 32px; border-radius: 32px; border: 3px solid #10b98130;">
          <p style="font-size: 18px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.12em;">✅ Pagados</p>
          <p style="font-size: 72px; font-weight: 900; color: #065f46; margin-top: 10px; line-height: 1;">${c}</p>
        </div>
        <div style="background: #fff1f2; padding: 32px; border-radius: 32px; border: 3px solid #f43f5e30;">
          <p style="font-size: 18px; font-weight: 800; color: #e11d48; text-transform: uppercase; letter-spacing: 0.12em;">⚠️ Pendientes</p>
          <p style="font-size: 72px; font-weight: 900; color: #9f1239; margin-top: 10px; line-height: 1;">${p}</p>
        </div>
        <div style="background: #fffbeb; padding: 32px; border-radius: 32px; border: 3px solid #f59e0b30; ${r === 0 ? 'opacity: 0.3;' : ''}">
          <p style="font-size: 18px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 0.12em;">🚨 Retiro</p>
          <p style="font-size: 72px; font-weight: 900; color: #92400e; margin-top: 10px; line-height: 1;">${r}</p>
        </div>
      </div>
    `;

    clone.style.width = "100%";
    clone.style.borderCollapse = "separate";
    clone.style.borderSpacing = "0 16px";
    clone.querySelectorAll("th").forEach(th => {
      th.style.textAlign = "left";
      th.style.padding = "20px 24px";
      th.style.color = "#475569";
      th.style.fontSize = "18px";
      th.style.fontWeight = "900";
      th.style.textTransform = "uppercase";
      th.style.letterSpacing = "0.06em";
    });
    clone.querySelectorAll("td").forEach(td => {
      td.style.padding = "24px";
      td.style.fontSize = "24px";
      td.style.fontWeight = "700";
      td.style.background = "#fff";
      td.style.borderTop = "3px solid #f1f5f9";
      td.style.borderBottom = "3px solid #f1f5f9";
      
      // Ajustar colores de estado para que resalten más en la foto
      const txt = td.innerText.toLowerCase();
      if (txt.includes("pagado") || txt.includes("cancelada")) td.style.color = "#059669";
      if (txt.includes("pendiente")) td.style.color = "#e11d48";
      if (txt.includes("retiro")) td.style.color = "#d97706";
    });
    clone.querySelectorAll("tr").forEach(tr => {
      tr.querySelectorAll("td:first-child").forEach(td => {
        td.style.borderLeft = "3px solid #f1f5f9";
        td.style.borderRadius = "20px 0 0 20px";
      });
      tr.querySelectorAll("td:last-child").forEach(td => {
        td.style.borderRight = "3px solid #f1f5f9";
        td.style.borderRadius = "0 20px 20px 0";
      });
    });

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      const canvas = await html2canvas(wrapper, { scale: 3, backgroundColor: null, useCORS: true });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const texto = mensajesPersonalizados[i] || getMensajeDefault();
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob, "text/plain": new Blob([texto], { type: "text/plain" }) })]);
        alert("✅ Reporte Premium copiado");
        document.body.removeChild(wrapper);
      });
    } catch (e) {
      document.body.removeChild(wrapper);
      alert("❌ Error al generar imagen");
    }
  };

  if (logs.length === 0) return null;

  return (
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
                <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Pagados</p>
                <p className="text-xl font-black text-emerald-700">{stats.cancelados}</p>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Deuda</p>
                <p className="text-xl font-black text-rose-700">{stats.pendientes}</p>
              </div>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Para Retiro</p>
                  <p className="text-xl font-black text-amber-700">{stats.retiro}</p>
                </div>
                <span className="text-2xl">🚨</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sheet Selector */}
        <div className="bg-white rounded-[32px] p-4 shadow-xl shadow-slate-200/50 border border-slate-100 flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-4 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Hojas ({logs.length})</h3>
            <button onClick={() => setMostrarConfigGlobal(true)} className="text-lg hover:rotate-90 transition-transform duration-500">⚙️</button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-2">
            {logs.map((hoja, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSheetIndex(idx)}
                className={`w-full text-left px-5 py-4 rounded-2xl transition-all duration-300 flex items-center justify-between group ${
                  activeSheetIndex === idx 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 -translate-y-0.5" 
                  : "hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="flex flex-col">
                  <span className={`text-sm font-bold truncate max-w-[160px] ${activeSheetIndex === idx ? "text-white" : "text-slate-800"}`}>
                    {hoja?.msg?.hoja}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${activeSheetIndex === idx ? "text-blue-100" : "text-slate-400"}`}>
                    {hoja?.msg?.resultados?.length || 0} alumnos
                  </span>
                </div>
                <span className={`text-xs opacity-0 group-hover:opacity-100 transition-opacity ${activeSheetIndex === idx ? "text-white" : "text-blue-600"}`}>→</span>
              </button>
            ))}
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
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
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
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
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
                    const datosValidos = (res?.datos ?? []).filter(x => x && (x.nrc || x.concepto || x.monto || x.estado));
                    let d = null;
                    if (datosValidos.length > 0) {
                      const filasConNrcEsperado = datosValidos.filter(x => parseInt(x.nrc, 10) === parseInt(nrcEsperado, 10));
                      d = filasConNrcEsperado.length > 0 ? filasConNrcEsperado[filasConNrcEsperado.length - 1] : datosValidos[datosValidos.length - 1];
                    }

                    const estadoTexto = (d?.estado ?? "").toLowerCase();
                    const esPendiente = estadoTexto === "pendiente de pago" || estadoTexto.includes("pendiente");
                    const esCancelado = estadoTexto === "becado" || estadoTexto.includes("cancelad") || estadoTexto.includes("adeuda") || estadoTexto === "inscrito";
                    
                    let statusConfig = {
                      label: "🚨 Para Retiro",
                      bg: "bg-amber-50",
                      text: "text-amber-700",
                      border: "border-amber-100",
                      dot: "bg-amber-500"
                    };

                    if (d) {
                      if (esPendiente) {
                        statusConfig = { label: "⚠️ Pendiente", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100", dot: "bg-rose-500" };
                      } else if (esCancelado) {
                        statusConfig = { label: "✅ Pagado", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", dot: "bg-emerald-500" };
                      }
                    }

                    return (
                      <tr key={j} className="group transition-all duration-300">
                        <td className="px-6 py-4 bg-slate-50 rounded-l-2xl text-xs font-black text-slate-400 group-hover:bg-slate-100 transition-colors">{j + 1}</td>
                        <td className="px-6 py-4 bg-slate-50 group-hover:bg-slate-100 transition-colors">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">{res?.nombreAlumno}</span>
                            <span className="text-[10px] font-bold text-slate-400 font-mono">{res?.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 bg-slate-50 text-center group-hover:bg-slate-100 transition-colors">
                          <span className={`text-xs font-black ${d?.nrc && parseInt(d.nrc) !== parseInt(nrcEsperado) ? "text-orange-500" : "text-slate-600"}`}>
                            {d?.nrc || "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 bg-slate-50 text-center group-hover:bg-slate-100 transition-colors">
                          <span className="text-[10px] font-black text-slate-500 font-mono bg-white px-2 py-1 rounded-lg border border-slate-200">
                            {res?.codigoPago || "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 bg-slate-50 rounded-r-2xl group-hover:bg-slate-100 transition-colors">
                          <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} animate-pulse`}></span>
                            <span className="text-[10px] font-black uppercase tracking-wider">{statusConfig.label}</span>
                          </div>
                        </td>
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

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
}

export default RenderCobros;
