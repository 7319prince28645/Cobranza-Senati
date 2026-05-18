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
    const idProgressMap = {};

    const onProgress = (localPct, text, currentId) => {
      idProgressMap[currentId] = localPct;
      let totalPct = 0;
      for (const id of idArray) {
        totalPct += (idProgressMap[id] || 0);
      }
      const globalPct = Math.round(totalPct / idArray.length);
      safeSend({ type: 'progress', pct: globalPct, text: `[${currentId}] ${text}` });
    };

    const onResultMap = (id, resultData, errorStr) => {
      if (errorStr) {
        safeSend({ type: 'result', data: { id, data: null, error: errorStr } });
      } else {
        safeSend({ type: 'result', data: { id, data: resultData, error: null } });
      }
    };

    const chunkArray = (array, size) => {
      const result = [];
      for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
      }
      return result;
    };

    const idBatches = chunkArray(idArray, 5); // Procesar estrictamente de 5 en 5
    
    for (let index = 0; index < idBatches.length; index++) {
      const batch = idBatches[index];
      console.log(`[Batch ${index+1}/${idBatches.length}] Procesando simultáneamente ${batch.length} reporte(s): ${batch.join(', ')}`);
      
      await Promise.all(batch.map(async (idToProcess) => {
        try {
          // Cada uno lanza su propio Chrome independiente
          const result = await FetchReportes(idToProcess, fechaInicio, fechaFin, (pct, txt) => onProgress(pct, txt, idToProcess));
          onResultMap(idToProcess, result, null);
        } catch (error) {
          onResultMap(idToProcess, null, error.message);
        }
      }));
    }

    safeSend({ type: 'done' });
  } catch (error) {
    safeSend({ type: 'error', message: error.message });
  } finally {
    res.end();
  }
});

module.exports = router;

