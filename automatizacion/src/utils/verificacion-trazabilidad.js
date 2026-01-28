/**
 * SISTEMA DE VERIFICACIÓN DE TRAZABILIDAD DE DATOS
 * 
 * Este módulo valida la coherencia de TODOS los registros de estudiantes,
 * no solo IDs específicos. Detecta inconsistencias basándose en reglas de negocio.
 * 
 * Ejemplo del problema: ID 001658982 aparecía como "retiro" cuando no debería serlo.
 * Solución: Validar todos los IDs con reglas de coherencia automática.
 */

/**
 * Reglas de negocio para determinar si un estado es coherente
 */
const REGLAS_VALIDACION = {
  // Días máximos desde último pago para considerar como activo
  DIAS_PAGO_RECIENTE: 90,
  
  // Días mínimos sin actividad para considerar retiro válido
  DIAS_INACTIVIDAD_RETIRO: 180,
  
  // Formato válido de ID (9 dígitos)
  PATRON_ID_VALIDO: /^\d{9}$/,
};

/**
 * Verifica la coherencia de datos de un estudiante
 * @param {Object} estudiante - Objeto con datos del estudiante
 * @returns {Object} - Resultado de la verificación con errores y advertencias
 */
const verificarCoherenciaEstudiante = (estudiante) => {
  const errores = [];
  const advertencias = [];
  const correcciones = [];
  
  // ========== VALIDACIÓN 1: Integridad básica del ID ==========
  if (!estudiante.id || estudiante.id.trim() === '') {
    errores.push({
      tipo: 'ERROR_CRITICO',
      campo: 'id',
      mensaje: 'Registro sin ID válido',
      valor: estudiante.id
    });
  } else if (!REGLAS_VALIDACION.PATRON_ID_VALIDO.test(estudiante.id)) {
    advertencias.push({
      tipo: 'FORMATO_INVALIDO',
      campo: 'id',
      mensaje: `ID con formato inválido: ${estudiante.id} (debe ser 9 dígitos)`,
      valor: estudiante.id
    });
  }
  
  // ========== VALIDACIÓN 2: Coherencia estado "retiro" ==========
  if (estudiante.estado && (
    estudiante.estado.toLowerCase() === 'retiro' ||
    estudiante.estado.toLowerCase().includes('retiro')
  )) {
    
    // 2.1: Retiro con pagos recientes
    if (estudiante.ultimoPago) {
      const fechaUltimoPago = new Date(estudiante.ultimoPago);
      const diasDesdeUltimoPago = (Date.now() - fechaUltimoPago) / (1000 * 60 * 60 * 24);
      
      if (diasDesdeUltimoPago < REGLAS_VALIDACION.DIAS_PAGO_RECIENTE) {
        errores.push({
          tipo: 'INCONSISTENCIA_CRITICA',
          campo: 'estado',
          mensaje: `Estado "retiro" con pago reciente (hace ${Math.floor(diasDesdeUltimoPago)} días)`,
          id: estudiante.id,
          valorActual: estudiante.estado,
          evidencia: { ultimoPago: estudiante.ultimoPago, diasDesdeUltimoPago: Math.floor(diasDesdeUltimoPago) }
        });
        
        correcciones.push({
          campo: 'estado',
          valorAnterior: estudiante.estado,
          valorNuevo: 'activo',
          razon: `Pago reciente detectado (${Math.floor(diasDesdeUltimoPago)} días atrás)`
        });
      }
    }
    
    // 2.2: Retiro con matrícula activa
    if (estudiante.matriculaActiva === true || estudiante.tieneMatricula === true) {
      errores.push({
        tipo: 'INCONSISTENCIA_CRITICA',
        campo: 'estado',
        mensaje: 'Estado "retiro" con matrícula activa',
        id: estudiante.id,
        valorActual: estudiante.estado
      });
      
      correcciones.push({
        campo: 'estado',
        valorAnterior: estudiante.estado,
        valorNuevo: 'activo',
        razon: 'Matrícula activa detectada'
      });
    }
    
    // 2.3: Retiro con NRC asignado
    if (estudiante.nrc || (estudiante.nrcs && estudiante.nrcs.length > 0)) {
      errores.push({
        tipo: 'INCONSISTENCIA_CRITICA',
        campo: 'estado',
        mensaje: 'Estado "retiro" con NRC asignado',
        id: estudiante.id,
        valorActual: estudiante.estado,
        evidencia: { nrc: estudiante.nrc || estudiante.nrcs }
      });
      
      correcciones.push({
        campo: 'estado',
        valorAnterior: estudiante.estado,
        valorNuevo: 'activo',
        razon: 'NRC asignado detectado'
      });
    }
    
    // 2.4: Retiro con asistencias recientes
    if (estudiante.ultimaAsistencia) {
      const fechaAsistencia = new Date(estudiante.ultimaAsistencia);
      const diasDesdeAsistencia = (Date.now() - fechaAsistencia) / (1000 * 60 * 60 * 24);
      
      if (diasDesdeAsistencia < REGLAS_VALIDACION.DIAS_PAGO_RECIENTE) {
        errores.push({
          tipo: 'INCONSISTENCIA_CRITICA',
          campo: 'estado',
          mensaje: `Estado "retiro" con asistencia reciente (hace ${Math.floor(diasDesdeAsistencia)} días)`,
          id: estudiante.id,
          evidencia: { ultimaAsistencia: estudiante.ultimaAsistencia }
        });
        
        correcciones.push({
          campo: 'estado',
          valorAnterior: estudiante.estado,
          valorNuevo: 'activo',
          razon: `Asistencia reciente detectada (${Math.floor(diasDesdeAsistencia)} días atrás)`
        });
      }
    }
  }
  
  // ========== VALIDACIÓN 3: Coherencia estado "activo" ==========
  if (estudiante.estado && estudiante.estado.toLowerCase() === 'activo') {
    
    // 3.1: Activo sin pagos recientes ni matrícula
    const sinPagosRecientes = !estudiante.ultimoPago || 
      (Date.now() - new Date(estudiante.ultimoPago)) / (1000 * 60 * 60 * 24) > REGLAS_VALIDACION.DIAS_INACTIVIDAD_RETIRO;
    
    const sinMatricula = !estudiante.matriculaActiva && !estudiante.tieneMatricula;
    const sinNRC = !estudiante.nrc && (!estudiante.nrcs || estudiante.nrcs.length === 0);
    
    if (sinPagosRecientes && sinMatricula && sinNRC) {
      advertencias.push({
        tipo: 'POSIBLE_RETIRO',
        campo: 'estado',
        mensaje: 'Estado "activo" sin evidencia de actividad reciente',
        id: estudiante.id,
        sugerencia: 'Verificar si debe ser marcado como retiro'
      });
    }
  }
  
  // ========== VALIDACIÓN 4: Datos faltantes críticos ==========
  if (!estudiante.nombre || estudiante.nombre.trim() === '') {
    advertencias.push({
      tipo: 'DATO_FALTANTE',
      campo: 'nombre',
      mensaje: 'Registro sin nombre de estudiante',
      id: estudiante.id
    });
  }
  
  return {
    id: estudiante.id,
    esValido: errores.length === 0,
    requiereCorreccion: errores.some(e => e.tipo === 'INCONSISTENCIA_CRITICA'),
    errores,
    advertencias,
    correcciones
  };
};

/**
 * Aplica correcciones automáticas basándose en las reglas de negocio
 * @param {Object} estudiante - Objeto del estudiante
 * @param {Array} correcciones - Lista de correcciones sugeridas
 * @returns {Object} - Estudiante corregido con metadata
 */
const aplicarCorreccionesAutomaticas = (estudiante, correcciones) => {
  if (!correcciones || correcciones.length === 0) {
    return { estudiante, corregido: false };
  }
  
  const estudianteCorregido = { ...estudiante };
  const cambiosAplicados = [];
  
  correcciones.forEach(correccion => {
    if (correccion.campo === 'estado') {
      estudianteCorregido.estado = correccion.valorNuevo;
      cambiosAplicados.push(correccion);
    }
  });
  
  if (cambiosAplicados.length > 0) {
    estudianteCorregido._trazabilidad = {
      corregidoAutomaticamente: true,
      fechaCorreccion: new Date().toISOString(),
      cambios: cambiosAplicados
    };
  }
  
  return {
    estudiante: estudianteCorregido,
    corregido: cambiosAplicados.length > 0,
    cambios: cambiosAplicados
  };
};

/**
 * Procesa un array completo de estudiantes aplicando validaciones y correcciones
 * @param {Array} estudiantes - Array de objetos de estudiantes
 * @param {Object} opciones - Opciones de procesamiento
 * @returns {Object} - Resultado con estudiantes procesados y reporte
 */
const procesarYValidarEstudiantes = (estudiantes, opciones = {}) => {
  const {
    aplicarCorrecciones = true,
    verbose = true
  } = opciones;
  
  if (verbose) {
    console.log('\n🔍 ============ VERIFICACIÓN DE TRAZABILIDAD ============');
    console.log(`📊 Total de registros a procesar: ${estudiantes.length}`);
  }
  
  const reporte = {
    totalProcesados: estudiantes.length,
    validos: 0,
    conErrores: 0,
    conAdvertencias: 0,
    corregidosAutomaticamente: 0,
    erroresCriticos: [],
    advertencias: [],
    correccionesAplicadas: []
  };
  
  const estudiantesProcesados = estudiantes.map((estudiante, index) => {
    // Verificar coherencia
    const verificacion = verificarCoherenciaEstudiante(estudiante);
    
    // Actualizar contadores
    if (verificacion.esValido) {
      reporte.validos++;
    } else {
      reporte.conErrores++;
      reporte.erroresCriticos.push(...verificacion.errores);
    }
    
    if (verificacion.advertencias.length > 0) {
      reporte.conAdvertencias++;
      reporte.advertencias.push(...verificacion.advertencias);
    }
    
    // Aplicar correcciones si está habilitado
    let estudianteActualizado = estudiante;
    if (aplicarCorrecciones && verificacion.requiereCorreccion) {
      const resultado = aplicarCorreccionesAutomaticas(estudiante, verificacion.correcciones);
      estudianteActualizado = resultado.estudiante;
      
      if (resultado.corregido) {
        reporte.corregidosAutomaticamente++;
        reporte.correccionesAplicadas.push({
          id: estudiante.id,
          index,
          cambios: resultado.cambios
        });
        
        if (verbose) {
          console.log(`🔧 [ID ${estudiante.id}] Corregido automáticamente:`);
          resultado.cambios.forEach(c => {
            console.log(`   ${c.campo}: "${c.valorAnterior}" → "${c.valorNuevo}"`);
            console.log(`   Razón: ${c.razon}`);
          });
        }
      }
    }
    
    return estudianteActualizado;
  });
  
  if (verbose) {
    console.log('\n📊 ============ RESUMEN DE VERIFICACIÓN ============');
    console.log(`✅ Registros válidos: ${reporte.validos} (${((reporte.validos/reporte.totalProcesados)*100).toFixed(1)}%)`);
    console.log(`❌ Registros con errores: ${reporte.conErrores}`);
    console.log(`⚠️  Registros con advertencias: ${reporte.conAdvertencias}`);
    console.log(`🔧 Registros corregidos: ${reporte.corregidosAutomaticamente}`);
    
    if (reporte.erroresCriticos.length > 0) {
      console.log(`\n❌ ERRORES CRÍTICOS (mostrando primeros 10 de ${reporte.erroresCriticos.length}):`);
      reporte.erroresCriticos.slice(0, 10).forEach((error, i) => {
        console.log(`\n   ${i + 1}. ID ${error.id || 'N/A'}:`);
        console.log(`      Campo: ${error.campo}`);
        console.log(`      Problema: ${error.mensaje}`);
        if (error.evidencia) {
          console.log(`      Evidencia:`, JSON.stringify(error.evidencia, null, 2));
        }
      });
    }
    
    if (reporte.advertencias.length > 0 && reporte.advertencias.length <= 10) {
      console.log(`\n⚠️  ADVERTENCIAS (${reporte.advertencias.length}):`);
      reporte.advertencias.forEach((adv, i) => {
        console.log(`   ${i + 1}. ID ${adv.id || 'N/A'}: ${adv.mensaje}`);
      });
    } else if (reporte.advertencias.length > 10) {
      console.log(`\n⚠️  ADVERTENCIAS: ${reporte.advertencias.length} (demasiadas para mostrar)`);
    }
    
    console.log('\n============ VERIFICACIÓN COMPLETADA ============\n');
  }
  
  return {
    estudiantes: estudiantesProcesados,
    reporte
  };
};

/**
 * Valida un solo estudiante (útil para validaciones en tiempo real)
 * @param {Object} estudiante - Objeto del estudiante
 * @returns {Object} - Resultado de validación
 */
const validarEstudianteIndividual = (estudiante) => {
  const verificacion = verificarCoherenciaEstudiante(estudiante);
  return {
    valido: verificacion.esValido,
    errores: verificacion.errores,
    advertencias: verificacion.advertencias,
    correcciones: verificacion.correcciones
  };
};

/**
 * Genera un reporte detallado en formato legible
 * @param {Object} reporte - Reporte generado por procesarYValidarEstudiantes
 * @returns {String} - Reporte formateado
 */
const generarReporteDetallado = (reporte) => {
  let texto = '\n📋 REPORTE DETALLADO DE TRAZABILIDAD\n';
  texto += '='.repeat(60) + '\n\n';
  
  texto += `Total procesados: ${reporte.totalProcesados}\n`;
  texto += `✅ Válidos: ${reporte.validos}\n`;
  texto += `❌ Con errores: ${reporte.conErrores}\n`;
  texto += `⚠️  Con advertencias: ${reporte.conAdvertencias}\n`;
  texto += `🔧 Corregidos: ${reporte.corregidosAutomaticamente}\n\n`;
  
  if (reporte.correccionesAplicadas.length > 0) {
    texto += 'CORRECCIONES APLICADAS:\n';
    texto += '-'.repeat(60) + '\n';
    reporte.correccionesAplicadas.forEach((corr, i) => {
      texto += `${i + 1}. ID ${corr.id}:\n`;
      corr.cambios.forEach(c => {
        texto += `   - ${c.campo}: "${c.valorAnterior}" → "${c.valorNuevo}"\n`;
        texto += `     Razón: ${c.razon}\n`;
      });
    });
  }
  
  return texto;
};

module.exports = {
  verificarCoherenciaEstudiante,
  aplicarCorreccionesAutomaticas,
  procesarYValidarEstudiantes,
  validarEstudianteIndividual,
  generarReporteDetallado,
  REGLAS_VALIDACION
};
