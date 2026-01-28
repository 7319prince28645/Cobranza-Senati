const router = require('express').Router();
const FetchReportes = require('./main');
const { procesarYValidarEstudiantes } = require('../utils/verificacion-trazabilidad');

router.post('/reportes', async (req, res) => {
 try {
    const { id, fechaInicio, fechaFin } = req.body;

    const reportes = await FetchReportes(id, fechaInicio, fechaFin);
    
    // Aplicar verificación de trazabilidad al calendario
    if (reportes.calendario && Array.isArray(reportes.calendario)) {
      console.log('🔍 Aplicando verificación de trazabilidad a calendario...');
      const resultado = procesarYValidarEstudiantes(
        reportes.calendario,
        { aplicarCorrecciones: true, verbose: true }
      );
      reportes.calendario = resultado.estudiantes;
      reportes._trazabilidad = resultado.reporte;
    }
    
    console.log('✅ Reportes procesados con verificación de trazabilidad');
    res.json(reportes);

    
  } catch (error) {
    console.error('Error fetching reportes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
