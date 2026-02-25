import axios from "axios";
import { getApiUrl } from "./apiConfig";

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

    const urlBase = getApiUrl();

    const response = await axios.post(`${urlBase}/administrativo/reportes`, {
        id,
        fechaInicio,
        fechaFin
    }, {
        timeout: 600000 // 10 minutos para captcha manual
    });
    
    // Logging simple de éxito
    if (response.data) {
      console.log('✅ [GetAdministrativo] Datos recibidos con éxito');
    }

    return response;

}
export default GetAdministrativo;
