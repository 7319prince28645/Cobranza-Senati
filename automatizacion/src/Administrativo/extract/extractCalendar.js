// extract/extractCalendar.js
const cheerio = require("cheerio");
const {
  calcularHorasPedagogicas,
  obtenerFechaCompleta,
} = require("../helpers/utils");

async function extraerCalendario(page, fechaReferencia) {
  // Asegurar que el calendario esté presente
  await page.waitForSelector("table.t12StandardCalendar", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);

  const tablas = await page.$$eval("table.t12StandardCalendar", (els) =>
    els.map((el) => el.innerHTML)
  ).catch(err => {
    console.warn("⚠️ Error en $$eval de calendario, reintentando una vez...", err.message);
    return page.$$eval("table.t12StandardCalendar", (els) => els.map((el) => el.innerHTML));
  });
  const calendario = [];

  tablas.forEach((html) => {
    const $ = cheerio.load(html);
    $("tr.formRegionHeader td[class*='formRegionBody']").each((j, celda) => {
      const diaTexto = $(celda).text().trim().split("\n")[0];
      const diaNumerico = parseInt(diaTexto);
      if (isNaN(diaNumerico)) return; // salta celdas no válidas
      const dia = obtenerFechaCompleta(diaNumerico, fechaReferencia);

      $(celda)
        .find("a font.descripcion")
        .each((i, el) => {
          const contenido = $(el).html().split("<br>");
          const cursoRaw = (contenido[1] || "").trim();
          const horarioYsalon = (contenido[2] || "").trim();
          const [horario, aula] =
            horarioYsalon?.split("&gt;")?.map((s) => s.trim()) || [];
          const [horarioInicio, horarioFin] =
            horario?.split("-").map((h) => h.trim()) || [];

          calendario.push({
            dia,
            curso: cursoRaw,
            aula,
            horarioInicio: horarioInicio || null,
            horarioFin: horarioFin || null,
            horasPedagogicas: calcularHorasPedagogicas(
              horarioInicio,
              horarioFin
            ),
          });
        });
    });
  });

  return calendario;
}

module.exports = {
  extraerCalendario,
};
