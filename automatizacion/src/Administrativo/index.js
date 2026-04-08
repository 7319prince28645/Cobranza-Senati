const router = require('express').Router();
const FetchReportes = require('./main');
const { procesarYValidarEstudiantes } = require('../utils/verificacion-trazabilidad');

router.post('/reportes', async (req, res) => {
  try {
     const { id, fechaInicio, fechaFin } = req.body;
     const reportes = await FetchReportes(id, fechaInicio, fechaFin);
     console.log('✅ Reportes procesados con éxito');
     res.json(reportes);
   } catch (error) {
     console.error('Error fetching reportes:', error);
     res.status(500).json({ error: 'Internal Server Error' });
   }
});

router.get('/reportes/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const { ids, fechaInicio, fechaFin } = req.query;
  const idArray = ids ? ids.split(',').map(i => i.trim()).filter(Boolean) : [];

  const safeSend = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    for (let i = 0; i < idArray.length; i++) {
      const id = idArray[i];
      const basePct = (i / idArray.length) * 100;
      const stepPct = 100 / idArray.length;

      const onProgress = (localPct, text) => {
        const globalPct = Math.round(basePct + (localPct * stepPct / 100));
        safeSend({ type: 'progress', pct: globalPct, text: `[${id}] ${text}` });
      };

      try {
        const result = await FetchReportes(id, fechaInicio, fechaFin, onProgress);
        safeSend({ type: 'result', data: { id, data: result, error: null } });
      } catch (err) {
        safeSend({ type: 'result', data: { id, data: null, error: err.message } });
      }
    }
    safeSend({ type: 'done' });
  } catch (error) {
    safeSend({ type: 'error', message: error.message });
  } finally {
    res.end();
  }
});

module.exports = router;
