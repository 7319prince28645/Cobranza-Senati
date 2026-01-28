const path = require("path");
const { exec } = require("child_process");

// Determinar si estamos en un ejecutable empaquetado
const isPkg = typeof process.pkg !== 'undefined';

// Rutas base
const baseDir = isPkg ? path.dirname(process.execPath) : __dirname;
const backendDir = path.join(baseDir, 'automatizacion');
const frontendDir = path.join(baseDir, 'Senati-comandos', 'dist');

// Cargar módulos desde automatizacion
const express = require(path.join(backendDir, 'node_modules', 'express'));
const cors = require(path.join(backendDir, 'node_modules', 'cors'));

// Importar módulos del backend
let main, FetchReportesAdministrativo;

try {
  if (isPkg) {
    // En modo empaquetado, los módulos están en el snapshot
    main = require(path.join(backendDir, "src", "CobrosCIS", "main"));
    FetchReportesAdministrativo = require(path.join(backendDir, "src", "Administrativo"));
  } else {
    main = require(path.join(backendDir, "src", "CobrosCIS", "main"));
    FetchReportesAdministrativo = require(path.join(backendDir, "src", "Administrativo"));
  }
} catch (err) {
  console.error("⚠️ Error cargando módulos:", err.message);
  main = async (callback) => { callback("Módulo de automatización no disponible"); };
  FetchReportesAdministrativo = express.Router();
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  credentials: false
}));

// ✅ Servir frontend estático
app.use(express.static(frontendDir));

// ✅ Montar endpoints API
app.use("/administrativo", FetchReportesAdministrativo);

// ✅ Endpoint con streaming SSE
app.get("/automatizacion-stream", async (req, res) => {
  console.log("📡 Nueva solicitud de stream recibida");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.flushHeaders();

  const keepAlive = setInterval(() => {
    res.write(`: keep-alive\n\n`);
  }, 15000);

  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    
    await main((msg) => {
      res.write(`data: ${JSON.stringify({ msg })}\n\n`);
    }, year);
    
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error("❌ Error en stream:", error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  } finally {
    clearInterval(keepAlive);
  }
});

// ✅ Ruta catch-all para SPA (React Router) - Compatible con Express 5
app.get("/{*path}", (req, res) => {
  const reqPath = req.params.path || '';
  // Si es una petición de API, devolver 404
  if (reqPath.startsWith("api") || reqPath.startsWith("administrativo")) {
    return res.status(404).json({ error: "Not found" });
  }
  // Para cualquier otra ruta, servir el index.html (SPA)
  res.sendFile(path.join(frontendDir, "index.html"));
});

// Función para abrir el navegador
function openBrowser(url) {
  const start = process.platform === 'win32' ? 'start' : 
                process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${start} ${url}`);
}

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log("");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           COBRANZA SENATI - SERVIDOR INICIADO              ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`✅ Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`📁 Frontend desde: ${frontendDir}`);
  console.log("");
  console.log("┌────────────────────────────────────────────────────────────┐");
  console.log("│  Abriendo navegador automáticamente...                     │");
  console.log("│  Si no se abre, visita: http://localhost:3000              │");
  console.log("│                                                            │");
  console.log("│  Para cerrar: Presiona Ctrl+C o cierra esta ventana        │");
  console.log("└────────────────────────────────────────────────────────────┘");
  console.log("");
  
  // Abrir navegador después de 1 segundo
  setTimeout(() => {
    openBrowser(`http://localhost:${PORT}`);
  }, 1000);
});

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log("\n👋 Cerrando servidor...");
  server.close(() => {
    console.log("✅ Servidor cerrado correctamente");
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
