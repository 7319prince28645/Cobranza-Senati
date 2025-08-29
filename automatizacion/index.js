const express = require("express");
const cors = require("cors");
const main = require("./src/CobrosCIS/main");

const app = express();
const port = 3000;


app.use(cors({
  origin: "http://localhost:5173",   // 👈 tu frontend
  methods: ["GET", "POST"],
  credentials: false
}));

// Endpoint con streaming SSE
app.get("/automatizacion-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");

  res.flushHeaders(); // 👈 asegura que se manden los headers de inmediato

  const keepAlive = setInterval(() => {
    res.write(`: keep-alive\n\n`);
  }, 15000);

  try {
    await main((msg) => {
      res.write(`data: ${JSON.stringify({ msg })}\n\n`);
    });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  } finally {
    clearInterval(keepAlive);
  }
});

app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});
