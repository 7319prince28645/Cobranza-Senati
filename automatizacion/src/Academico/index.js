const router = require('express').Router();
const verificarNota = require('./main');

// Endpoint SSE: envía resultados en tiempo real
router.get('/verificar-nota/stream', async (req, res) => {
  const ids = req.query.ids ? req.query.ids.split(',') : [];
  const username = req.query.username || "000196942";
  const password = req.query.password || "040766";

  console.log('📦 SSE - IDs recibidos:', ids);

  // Configurar SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  try {
    // Callback que se llama cada vez que un alumno es procesado
    const onProgress = (studentData, processed, total) => {
      const payload = JSON.stringify({ type: 'progress', student: studentData, processed, total });
      res.write(`data: ${payload}\n\n`);
    };

    const result = await verificarNota(ids, username, password, onProgress);

    // Enviar resultado final
    res.write(`data: ${JSON.stringify({ type: 'done', results: result.results })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error en SSE:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

// Mantener el POST como fallback
router.post('/verificar-nota', async (req, res) => {
  try {
    const { ids, username, password } = req.body;
    const result = await verificarNota(ids, username || "000196942", password || "040766");
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
