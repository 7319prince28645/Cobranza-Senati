const { chromium } = require("playwright");
const login = require("../CobrosCIS/login");
const { generateRandomDigits } = require("../CobrosCIS/GeneratoRandomDigits");
const beautify = require("js-beautify").html;

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
      } else {
        throw new Error("No encontró el link esperado");
      }
    } catch (err) {
      console.warn(`⚠️ Intento ${intento}: ${err.message}`);
      if (intento === retries) {
        console.error("❌ No se pudo cargar la página tras varios F5");
        await browser.close();
        return;
      }
      console.log("🔄 Forzando F5 (reload)...");
      await page.reload({ waitUntil: "domcontentloaded" });
    }
  }

  // ⬇️ Desde aquí rellenas el formulario (ya dentro del reporte)
  console.log("🟢 Página de parámetros de reporte cargada.");

  // Esperar que aparezca el formulario
  await page.waitForSelector("text=Parametros de reporte", { timeout: 10000 });

  // Seleccionar la opción "Instructor"
  await page
    .click('input[type="radio"][value="Instructor"]', { timeout: 5000 })
    .catch(() => {});

  // Ingresar el ID
  await page.fill('input[name="P9_IDS"]', id).catch(() => {});

  // Rellenar las fechas
  await page.fill('input[name="P9_FECHA_INI"]', fechaInicio).catch(() => {});
  await page.fill('input[name="P9_FECHA_FIN"]', fechaFin).catch(() => {});

  // Clic en el botón "ver calendario"
  await page.waitForSelector('a.t12Button:has-text("ver calendario")', {
    timeout: 10000,
  });
  await page.click('a.t12Button:has-text("ver calendario")').catch(() => {});

  console.log("✅ Formulario rellenado correctamente.");

  // Si deseas, puedes esperar que cargue el resultado:

  await page.waitForSelector("#dvContainer", { timeout: 20000 });

  // 🔍 Procesar directamente dentro del DOM
  const data = await page.$$eval(
    "#dvContainer table.t12StandardCalendar td.formRegionBody, #dvContainer table.t12StandardCalendar td.formRegionBodyWE",
    (tds) => {
      const result = [];

      tds.forEach((td) => {
        const dayText = td.childNodes[0]?.textContent?.trim();
        if (!dayText || isNaN(dayText)) return; // Ignorar celdas vacías o texto no numérico

        const courseLinks = td.querySelectorAll("a font.descripcion");
        const courses = [];

        courseLinks.forEach((font) => {
          const text = font.textContent.trim();

          // Ejemplo de formato del texto:
          // 26940 (NSID-312) 202520
          // SALUD E HIGIENE OCUPACIONAL
          // 07:00-11:30 > 31-A8-203

          const lines = text
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l);
          if (lines.length >= 3) {
            const [header, nombre, horarioAula] = lines;
            const [codigo, resto] = header.split(" ");
            const [seccion, ciclo] = resto.replace(/[()]/g, "").split(" ");
            const [horario, aula] = horarioAula.split(">").map((s) => s.trim());

            courses.push({
              codigo,
              seccion,
              ciclo,
              nombre,
              horario,
              aula,
            });
          }
        });

        if (courses.length > 0) {
          result.push({ dia: dayText, cursos: courses });
        }
      });

      return result;
    }
  );

  console.log("✅ Datos estructurados:");
  console.log(JSON.stringify(data, null, 2));


  return data;

};

module.exports = FetchReportes;
