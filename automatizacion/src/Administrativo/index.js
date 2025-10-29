const router = require('express').Router();
const FetchReportes = require('./main');

router.post('/reportes', async (req, res) => {
 try {
    const { id, fechaInicio, fechaFin } = req.body;

    const reportes = await FetchReportes(id, fechaInicio, fechaFin);
    console.log('✅ Reportes fetched:', reportes);
    res.json(reportes);
  } catch (error) {
    console.error('Error fetching reportes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
