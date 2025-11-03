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

function calcularHorasPedagogicas(inicio, fin) {
  const minutos = calcularMinutos(inicio, fin);
  const horas = minutos > 0 ? minutos / 45 : 0;
  return Math.round(horas * 10000) / 10000; // redondea a 4 decimales sin convertir a string
}

function obtenerFechaCompleta(dia, fechaReferencia) {
  const ref = new Date(fechaReferencia);
  const año = ref.getFullYear();
  const mes = ref.getMonth();
  const fecha = new Date(año, mes, parseInt(dia));
  const diaF = String(fecha.getDate()).padStart(2, "0");
  const mesF = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${diaF}/${mesF}/${año}`;
}

module.exports = {
  normalizeText,
  GeneralizarCursos,
  calcularMinutos,
  calcularHorasPedagogicas,
  obtenerFechaCompleta,
};
