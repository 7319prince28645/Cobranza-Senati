// summarize/summarize.js
const { GeneralizarCursos } = require("../helpers/utils");

/**
 * Agrupa sesiones por día pero no fusiona bloques separados por más de gapMinutes (por defecto 30).
 * Devuelve un array con posibles múltiples bloques por día:
 * { dia, cursos, inicio, fin, totalHoras, sesiones }
 */
function agruparPorDia(sesiones, gapMinutes = 30) {
  // Normalizar y ordenar por día + hora inicio
  const sesionesOrdenadas = sesiones
    .map((s) => ({
      ...s,
      horarioInicio: s.horarioInicio || null,
      horarioFin: s.horarioFin || null,
    }))
    .sort((a, b) => {
      if (a.dia < b.dia) return -1;
      if (a.dia > b.dia) return 1;
      if (!a.horarioInicio && !b.horarioInicio) return 0;
      if (!a.horarioInicio) return 1;
      if (!b.horarioInicio) return -1;
      return a.horarioInicio.localeCompare(b.horarioInicio);
    });

  const gruposPorDia = {};

  sesionesOrdenadas.forEach((s) => {
    const dia = s.dia;
    if (!gruposPorDia[dia]) gruposPorDia[dia] = [];

    const bloques = gruposPorDia[dia];
    const ultimoBloque = bloques[bloques.length - 1];

    // Intentar fusionar con último bloque si la separación es <= gapMinutes
    if (ultimoBloque && ultimoBloque.fin && s.horarioInicio) {
      const diff = minutosEntre(ultimoBloque.fin, s.horarioInicio);
      if (diff <= gapMinutes) {
        // Fusionar
        if (s.horarioFin && (!ultimoBloque.fin || s.horarioFin > ultimoBloque.fin)) {
          ultimoBloque.fin = s.horarioFin;
        }
        if (s.curso) ultimoBloque.cursos.add(s.curso);
        ultimoBloque.totalHoras += Number(s.horasPedagogicas || 0);
        ultimoBloque.sesionesCount += 1;
        return;
      }
    }

    // Crear nuevo bloque
    const nuevosCursos = new Set();
    if (s.curso) nuevosCursos.add(s.curso);

    bloques.push({
      inicio: s.horarioInicio || "",
      fin: s.horarioFin || "",
      cursos: nuevosCursos,
      totalHoras: Number(s.horasPedagogicas || 0),
      sesionesCount: 1,
    });
  });

  // Convertir a array resultado
  const resultado = [];
  Object.entries(gruposPorDia).forEach(([dia, bloques]) => {
    bloques.forEach((b) => {
      resultado.push({
        dia,
        cursos: Array.from(b.cursos).join(" / "),
        inicio: b.inicio || "",
        fin: b.fin || "",
        totalHoras: b.totalHoras,
        sesiones: b.sesionesCount,
      });
    });
  });

  // Orden final por fecha y hora
  resultado.sort((a, b) => {
    if (a.dia < b.dia) return -1;
    if (a.dia > b.dia) return 1;
    if (!a.inicio && !b.inicio) return 0;
    if (!a.inicio) return 1;
    if (!b.inicio) return -1;
    return a.inicio.localeCompare(b.inicio);
  });

  return resultado;
}

// Helper: diferencia en minutos entre dos HH:MM (asume mismo día)
function minutosEntre(h1, h2) {
  if (!h1 || !h2) return Infinity;
  const [hi, mi] = h1.split(":").map(Number);
  const [hf, mf] = h2.split(":").map(Number);
  return hf * 60 + mf - (hi * 60 + mi);
}

function generarResumenPorCursoConHorarioFrecuente(sesiones) {
  const acc = sesiones.reduce((acc, sesion) => {
    const cursoGen = GeneralizarCursos(sesion.curso || "");
    if (!acc[cursoGen]) {
      acc[cursoGen] = { horas: 0, sesiones: 0, _horariosCount: {}, horarioFrecuente: "" };
    }
    const entry = acc[cursoGen];
    entry.horas += Number(sesion.horasPedagogicas || 0);
    entry.sesiones += 1;
    if (sesion.horarioInicio && sesion.horarioFin) {
      const hk = `${sesion.horarioInicio} - ${sesion.horarioFin}`;
      entry._horariosCount[hk] = (entry._horariosCount[hk] || 0) + 1;
    }
    return acc;
  }, {});

  Object.keys(acc).forEach((curso) => {
    const entry = acc[curso];
    let elegido = "";
    let max = 0;
    for (const [hk, cnt] of Object.entries(entry._horariosCount)) {
      if (cnt > max) {
        max = cnt;
        elegido = hk;
      }
    }
    entry.horarioFrecuente = elegido || "";
    delete entry._horariosCount;
  });

  return acc;
}

module.exports = {
  agruparPorDia,
  generarResumenPorCursoConHorarioFrecuente,
};
