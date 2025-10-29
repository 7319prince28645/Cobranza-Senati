const { chromium } = require("playwright");
const login = require("../CobrosCIS/login");
const { generateRandomDigits } = require("../CobrosCIS/GeneratoRandomDigits");
const cheerio = require("cheerio");

async function FetchReportes(id, fechaInicio, fechaFin) {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await login(page, "000196942", "040766");

  const dynamicId = generateRandomDigits(14);
  const url = `https://apex.senati.edu.pe/apex/f?p=999:1:${dynamicId}:::::`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

  // 🔁 Intentos para encontrar el enlace
  const retries = 3;
  for (let intento = 1; intento <= retries; intento++) {
    try {
      await page.waitForSelector("td.t12Header", { timeout: 8000 });
      const enlaces = await page.$$eval("a", (anchors) =>
        anchors
          .filter((a) => a.textContent?.includes("Horarios Academicos"))
          .map((a) => a.href)
      );

      if (enlaces.length > 0) {
        console.log("✅ Enlace encontrado, navegando...");
        await page.goto(enlaces[0], { waitUntil: "domcontentloaded" });
        break;
      } else throw new Error("No encontró el link esperado");
    } catch (err) {
      console.warn(`⚠️ Intento ${intento}: ${err.message}`);
      if (intento === retries) {
        console.error("❌ No se pudo cargar la página tras varios intentos");
        await browser.close();
        return;
      }
      console.log("🔄 Reintentando con F5...");
      await page.reload({ waitUntil: "domcontentloaded" });
    }
  }

  console.log("🟢 Página de parámetros de reporte cargada.");
  await page.waitForSelector("text=Parametros de reporte", { timeout: 4000 });

  // Rellenar formulario
  await page.click('input[type="radio"][value="Instructor"]').catch(() => {});
  await page.fill('input[name="P9_IDS"]', id).catch(() => {});
  await page.fill('input[name="P9_FECHA_INI"]', fechaInicio).catch(() => {});
  await page.fill('input[name="P9_FECHA_FIN"]', fechaFin).catch(() => {});

  // Ver calendario
  await page.waitForSelector('a.t12Button:has-text("ver calendario")', {
    timeout: 10000,
  });
  await page.click('a.t12Button:has-text("ver calendario")').catch(() => {});
  console.log("✅ Formulario enviado correctamente.");

  await page.waitForSelector("#dvContainer", { timeout: 4000 });

  // 🔍 Extraer nombre e ID del instructor
  const headerText = await page
    .$eval("#R11762331375378722 td.t12Header", (el) => el.innerText.trim())
    .catch(() => null);

  let nombreInstructor = null;
  let idInstructor = null;

  if (headerText) {
    const regexNombre = /-\s*(.*?)\s*desde/;
    const regexCodigo = /Instructor\s+(\d+)/;
    nombreInstructor = headerText.match(regexNombre)?.[1]?.trim() || null;
    idInstructor = headerText.match(regexCodigo)?.[1]?.trim() || null;
  }

  // 🗓️ Extraer mes actual
  let calendario = await extraerCalendario(page, fechaFin);

  // 📅 Si el rango abarca dos meses, tomar también el anterior
  const mesInicio = new Date(fechaInicio).getMonth();
  const mesFin = new Date(fechaFin).getMonth();

  if (mesInicio !== mesFin) {
    console.log("📅 Rango con dos meses, obteniendo mes anterior...");
    const botonAnterior = await page.$('a.t12Button:has-text("Anterior")');
    if (botonAnterior) {
      await botonAnterior.click();
      await page.waitForSelector("#dvContainer", { timeout: 4000 });
      console.log("⏪ Mes anterior cargado.");
      const calendarioAnterior = await extraerCalendario(page, fechaInicio);
      calendario = [...calendarioAnterior, ...calendario];
    }
  }

  await browser.close();

  // 📆 Filtrar solo fechas dentro del rango exacto
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  const calendarioFiltrado = calendario.filter((s) => {
    const [d, m, y] = s.dia.split("/").map(Number);
    const fecha = new Date(y, m - 1, d);
    return fecha >= inicio && fecha <= fin;
  });

  // 🧩 Agrupar sesiones por día solo del rango permitido
  const calendarioCompacto = agruparPorDia(calendarioFiltrado);

  console.log("📋 Resultado final agrupado:");
  console.log(JSON.stringify(calendarioCompacto, null, 2));

  // ✅ Retornar todo junto
  return {
    id: idInstructor,
    nombre: nombreInstructor,
    calendarioCompacto,
  };
}

// 🧠 Función auxiliar para procesar el calendario
async function extraerCalendario(page, fechaReferencia) {
  const tablas = await page.$$eval("table.t12StandardCalendar", (els) =>
    els.map((el) => el.innerHTML)
  );

  const calendario = [];

  tablas.forEach((html) => {
    const $ = cheerio.load(html);

    $(
      "tr.formRegionHeader td.formRegionBody, tr.formRegionHeader td.formRegionBodyWE"
    ).each((j, celda) => {
      const diaTexto = $(celda).text().trim().split("\n")[0];
      const dia = obtenerFechaCompleta(diaTexto, fechaReferencia);
      const sesiones = [];

      $(celda)
        .find("a font.descripcion")
        .each((i, el) => {
          const contenido = $(el).html().split("<br>");
          const curso = contenido[1]?.trim();
          const horarioYsalon = contenido[2]?.trim();
          const [horario, aula] =
            horarioYsalon?.split("&gt;")?.map((s) => s.trim()) || [];
          const [horarioInicio, horarioFin] =
            horario?.split("-").map((h) => h.trim()) || [];

          sesiones.push({
            dia,
            curso,
            aula,
            horarioInicio,
            horarioFin,
            horasPedagogicas: calcularHorasPedagogicas(
              horarioInicio,
              horarioFin
            ),
          });
        });

      if (sesiones.length > 0) calendario.push(...sesiones);
    });
  });

  return calendario;
}

// 🧮 Agrupar por día, compactando cursos
function agruparPorDia(sesiones) {
  const agrupado = {};

  sesiones.forEach((s) => {
    const dia = s.dia;
    if (!agrupado[dia]) {
      agrupado[dia] = {
        cursos: new Set(),
        inicio: s.horarioInicio,
        fin: s.horarioFin,
        totalHoras: 0,
      };
    }

    agrupado[dia].cursos.add(s.curso);

    // actualiza el rango horario
    if (s.horarioInicio < agrupado[dia].inicio)
      agrupado[dia].inicio = s.horarioInicio;
    if (s.horarioFin > agrupado[dia].fin) agrupado[dia].fin = s.horarioFin;

    agrupado[dia].totalHoras += s.horasPedagogicas;
  });

  return Object.entries(agrupado).map(([dia, data]) => ({
    dia,
    cursos: Array.from(data.cursos).join(" / "),
    inicio: data.inicio,
    fin: data.fin,
    totalHoras: data.totalHoras,
  }));
}

// 📅 Convierte número de día a fecha completa
function obtenerFechaCompleta(dia, fechaReferencia) {
  const ref = new Date(fechaReferencia);
  const año = ref.getFullYear();
  const mes = ref.getMonth();
  const fecha = new Date(año, mes, parseInt(dia));
  const diaF = String(fecha.getDate()).padStart(2, "0");
  const mesF = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${diaF}/${mesF}/${año}`;
}

// 🧮 Cálculos de tiempo
function calcularMinutos(inicio, fin) {
  if (!inicio || !fin) return 0;
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  return hf * 60 + mf - (hi * 60 + mi);
}

function calcularHorasPedagogicas(inicio, fin) {
  const minutos = calcularMinutos(inicio, fin);
  return minutos > 0 ? Math.floor(minutos / 45) : 0;
}

module.exports = FetchReportes;
