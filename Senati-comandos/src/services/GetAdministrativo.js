import axios from "axios";

/**
 * Valida la coherencia de datos del calendario recibido
 */
const validarCoherenciaCalendario = (calendario) => {
  if (!calendario || !Array.isArray(calendario)) return [];
  
  const problemas = [];
  
  calendario.forEach((registro, index) => {
    // Validar registros con estado "retiro" que tienen evidencia de actividad
    if (registro.estado && registro.estado.toLowerCase().includes('retiro')) {
      
      // Detectar: retiro con datos activos
      if (registro.ultimoPago || registro.nrc || registro.matriculaActiva) {
        problemas.push({
          tipo: 'INCONSISTENCIA',
          index,
          id: registro.id,
          mensaje: 'Registro marcado como retiro con evidencia de actividad',
          estado: registro.estado,
          evidencia: {
            ultimoPago: registro.ultimoPago,
            nrc: registro.nrc,
            matriculaActiva: registro.matriculaActiva
          }
        });
      }
    }
    
    // Validar coherencia de fechas
    if (registro.ultimoPago) {
      const diasDesdeUltimoPago = (Date.now() - new Date(registro.ultimoPago)) / (1000 * 60 * 60 * 24);
      if (registro.estado === 'retiro' && diasDesdeUltimoPago < 90) {
        problemas.push({
          tipo: 'INCOHERENCIA_TEMPORAL',
          index,
          id: registro.id,
          mensaje: `Retiro con pago reciente (${Math.floor(diasDesdeUltimoPago)} días)`,
          diasDesdeUltimoPago: Math.floor(diasDesdeUltimoPago)
        });
      }
    }
  });
  
  return problemas;
};

async function GetAdministrativo(id, fechaInicio, fechaFin) {

    const urlBase = import.meta.env.VITE_URL_API_LOCAL;

    const response = await axios.post(`${urlBase}/administrativo/reportes`, {
        id,
        fechaInicio,
        fechaFin
    });
    
    // Validar trazabilidad de los datos recibidos
    if (response.data) {
      console.log('🔍 [GetAdministrativo] Verificando trazabilidad de datos...');
      
      // Verificar calendario
      if (response.data.calendario) {
        const problemas = validarCoherenciaCalendario(response.data.calendario);
        
        if (problemas.length > 0) {
          console.warn(`⚠️ [TRAZABILIDAD] Se detectaron ${problemas.length} inconsistencias:`);
          problemas.slice(0, 5).forEach(p => {
            console.warn(`   - ID ${p.id || 'N/A'}: ${p.mensaje}`);
          });
          
          // Agregar problemas al response para mostrar en UI
          response.data._problemasTrazabilidad = problemas;
        } else {
          console.log('✅ [TRAZABILIDAD] Datos validados correctamente');
        }
      }
      
      // Mostrar información del reporte de trazabilidad del backend si existe
      if (response.data._trazabilidad) {
        const t = response.data._trazabilidad;
        console.log(`📊 [TRAZABILIDAD BACKEND] Válidos: ${t.validos}, Errores: ${t.conErrores}, Corregidos: ${t.corregidosAutomaticamente}`);
      }
    }

    return response;

}
export default GetAdministrativo;
