// src/components/CobroViewer.jsx
import { useState } from "react";
import { ImportDataStream } from "@/services/ObtenerData";
import RenderCobros from "@/components/Cobros/RenderCobros";
import '../../public/print.css';

const CobroViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [started, setStarted] = useState(false);

  const iniciarProcesoCobros = () => {
    // Validar año
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      alert("⚠️ Por favor ingresa un año válido (ej: 2026)");
      return;
    }

    setShowYearModal(false);
    setStarted(true);
    setLogs([]);
    setLoading(true);

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
        setLoading(false);
      },
      yearNum // 👈 Enviar el año al backend
    );

    return () => es.close();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-700">
      {/* 🎯 Modal para ingresar año */}
      {showYearModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">
                📅
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  Configurar Análisis
                </h3>
                <p className="text-sm text-slate-500">
                  Define el periodo académico a procesar
                </p>
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                  Año de Análisis
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="Ej: 2026"
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-xl font-bold text-slate-700 transition-all text-center"
                    min="2000"
                    max="2100"
                    autoFocus
                  />
                </div>
                <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                  <p className="text-xs text-blue-700 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                    Se analizarán los periodos: <span className="font-bold">{year}02</span> y <span className="font-bold">{year}12</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowYearModal(false)}
                className="flex-1 px-6 py-4 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={iniciarProcesoCobros}
                className="flex-1 px-6 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
              >
                Comenzar 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧭 Encabezado Premium */}
      {!started && (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">
          {/* Decoración de fondo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 blur-[120px] rounded-full"></div>
          </div>

          <div className="max-w-3xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">Sistema de Cobranza v2.0</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Control de Pagos <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Inteligente
              </span>
            </h1>
            
            <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Optimiza tu flujo de trabajo con nuestro sistema automatizado de análisis de estados financieros y gestión de alumnos en tiempo real.
            </p>
            
            <div className="pt-8">
              <button
                onClick={() => setShowYearModal(true)}
                className="group relative px-10 py-5 rounded-3xl bg-slate-900 text-white font-bold text-xl hover:bg-blue-600 transition-all shadow-2xl shadow-slate-900/20 hover:shadow-blue-600/30 hover:-translate-y-1 transform duration-300 flex items-center gap-4 mx-auto overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10">Iniciar Nuevo Análisis</span>
                <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">→</span>
              </button>
            </div>

            <div className="pt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto opacity-50">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">100%</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Automatizado</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">Real-time</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Streaming</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">Premium</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reporting</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🧾 Dashboard View */}
      {started && (
        <div className="w-full min-h-screen flex flex-col animate-in fade-in duration-700">
          {/* Top Bar */}
          <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200 px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/20">
                S
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 leading-none">Panel de Control</h2>
                <p className="text-xs text-slate-400 font-medium mt-1">Análisis Periodo {year}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {loading && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Procesando...</span>
                </div>
              )}
              <button
                onClick={() => setShowYearModal(true)}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-bold rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center gap-2"
              >
                <span>⚙️</span> Configurar
              </button>
            </div>
          </header>

          <main className="flex-1 p-8">
            {loading && logs.length === 0 && (
              <div className="h-[60vh] flex flex-col items-center justify-center space-y-6">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-slate-800">Iniciando Motores</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">
                    Estamos conectando con los servidores de SENATI y preparando tus datos.
                  </p>
                </div>
              </div>
            )}

            <RenderCobros logs={logs} loading={loading} />
          </main>
        </div>
      )}
    </div>
  );
};

export default CobroViewer;
