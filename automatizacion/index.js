const express = require("express");
const cors = require("cors");
const main = require("./src/CobrosCIS/main");
const FetchReportesAdministrativo = require("./src/Administrativo");
const AcademicoModule = require("./src/Academico");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: false
}));

// ✅ Montar endpoints
app.use("/administrativo", FetchReportesAdministrativo);
app.use("/academico", AcademicoModule);

// ✅ Endpoint con streaming SSE
app.get("/automatizacion-stream", async (req, res) => {
  console.log("📡 Nueva solicitud de stream recibida (CÓDIGO ACTUALIZADO V2)");
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

// Si se ejecuta directamente (no desde Electron)
if (require.main === module) {
  const server = app.listen(PORT, HOST, () => {
    console.log(`✅ Server running at http://${HOST}:${PORT}`);
    console.log(`🚀 Servidor listo y actualizado: ${new Date().toLocaleString()}`);
  });
  // Aumentar timeout a 10 minutos para dar tiempo al captcha manual
  server.timeout = 600000;
}

// Exportar para uso en Electron
module.exports = app;