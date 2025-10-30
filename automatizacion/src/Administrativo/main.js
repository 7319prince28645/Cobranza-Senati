// FetchReportes.js
const { chromium } = require("playwright");
const login = require("../CobrosCIS/login");
const { generateRandomDigits } = require("../CobrosCIS/GeneratoRandomDigits");
const { extraerCalendario } = require("./extract/extractCalendar");
const { agruparPorDia, generarResumenPorCursoConHorarioFrecuente } = require("./summarize/summarize");
const { openReportPage, submitFormAndShowCalendar } = require("./helpers/navigation");

async function FetchReportes(id, fechaInicio, fechaFin) {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await login(page, "000196942", "040766");

  const dynamicId = generateRandomDigits(14);
  await openReportPage(page, dynamicId);
  await submitFormAndShowCalendar(page, id, fechaInicio, fechaFin);

  const headerText = await page
    .$eval("#R11762331375378722 td.t12Header", (el) => el.innerText.trim())
    .catch(() => null);

  const nombreInstructor = headerText?.match(/-\s*(.*?)\s*desde/)?.[1]?.trim() || null;
  const idInstructor = headerText?.match(/Instructor\s+(\d+)/)?.[1]?.trim() || null;

  let calendario = await extraerCalendario(page, fechaFin);

  // si cubre meses anteriores
  const mesInicio = new Date(fechaInicio);
  const mesFin = new Date(fechaFin);
  let diffMeses =
    (mesFin.getFullYear() - mesInicio.getFullYear()) * 12 +
    (mesFin.getMonth() - mesInicio.getMonth());

  for (let i = 0; i < diffMeses; i++) {
    const botonAnterior = await page.$('a.t12Button:has-text("Anterior")');
    if (!botonAnterior) break;
    await botonAnterior.click();
    await page.waitForSelector("#dvContainer", { timeout: 4000 });
    const mesReferencia = new Date(mesFin);
    mesReferencia.setMonth(mesFin.getMonth() - (i + 1));
    const calendarioMes = await extraerCalendario(page, mesReferencia.toISOString().split("T")[0]);
    calendario = [...calendarioMes, ...calendario];
  }

  await browser.close();

  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const calendarioFiltrado = calendario.filter((s) => {
    const [d, m, y] = s.dia.split("/").map(Number);
    const fecha = new Date(y, m - 1, d);
    return fecha >= inicio && fecha <= fin;
  });

  const calendarioCompacto = agruparPorDia(calendarioFiltrado);
  const resumenPorCurso = generarResumenPorCursoConHorarioFrecuente(calendarioFiltrado);

  return {
    id: idInstructor,
    nombre: nombreInstructor,
    calendarioCompacto,
    resumenPorCurso,
  };
}

module.exports = FetchReportes;
