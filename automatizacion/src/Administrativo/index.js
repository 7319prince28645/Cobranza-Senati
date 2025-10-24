const router = require('express').Router();
const FetchReportes = require('./main');

router.get('/reportes', async (req, res) => {
  try {
    const reportes = await FetchReportes();
    console.log('Reportes fetched:', reportes);
    res.json(reportes);
  } catch (error) {
    console.error('Error fetching reportes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
