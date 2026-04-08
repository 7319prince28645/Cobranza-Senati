// helpers/utils.js
function normalizeText(str = "") {
  return str
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function GeneralizarCursos(cursos) {
  if (!cursos || typeof cursos !== "string") return "SIN_CURSO";
  let s = cursos
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/\s*\([^)]*\)\s*/g, " ");
  s = s
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s*-\s*/g, " / ")
    .replace(/\s*\|\s*/g, " / ");
  s = s
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" / ")
    .toUpperCase();
  return s || "SIN_CURSO";
}

function calcularMinutos(inicio, fin) {
  if (!inicio || !fin) return 0;
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  return hf * 60 + mf - (hi * 60 + mi);
}

function calcularHorasPedagogicas(inicio, fin, curso = "") {
  const minutos = calcularMinutos(inicio, fin);
  const cursoNorm = normalizeText(curso);
  
  // Regla especial: Cursos donde 1 hora cronológica = 1 hora pedagógica (Divisor 60)
  const esEspecial = 
    cursoNorm.includes("ASESORIA") || 
    cursoNorm.includes("ASESORÍA") || 
    cursoNorm.includes("PROYECTO") || 
    cursoNorm.includes("INNOVACIÓN") || 
    cursoNorm.includes("INNOVACION") || 
    cursoNorm.includes("CREATIVIDAD") || 
    cursoNorm.includes("PREPARACIÓN") || 
    cursoNorm.includes("PREPARACION") || 
    cursoNorm.includes("FORMULACIÓN Y EVALUACIÓN DE PROYECTOS") || 
    (cursoNorm.includes("REV") && cursoNorm.includes("CUADERNO")) ||
    (cursoNorm.includes("REVISIÓN") && cursoNorm.includes("CUADERNO"));
  
  const horas = minutos > 0 ? minutos / (esEspecial ? 60 : 45) : 0;
  return Math.round(horas * 10000) / 10000;
}

function obtenerFechaCompleta(dia, fechaReferencia) {
  // Asegurar formato ISO para el constructor de Date
  const refStr = fechaReferencia.includes("T") ? fechaReferencia : `${fechaReferencia}T00:00:00`;
  const ref = new Date(refStr);
  const año = ref.getFullYear();
  const mes = ref.getMonth();
  
  // Crear la fecha base para el día solicitado
  const fecha = new Date(año, mes, parseInt(dia));
  
  const diaF = String(fecha.getDate()).padStart(2, "0");
  const mesF = String(fecha.getMonth() + 1).padStart(2, "0");
  const añoF = fecha.getFullYear();
  return `${diaF}/${mesF}/${añoF}`;
}

module.exports = {
  normalizeText,
  GeneralizarCursos,
  calcularMinutos,
  calcularHorasPedagogicas,
  obtenerFechaCompleta,
};
