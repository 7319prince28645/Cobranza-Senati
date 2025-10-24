const { chromium } = require("playwright");
const login = require("../CobrosCIS/login");
const { generateRandomDigits } = require("../CobrosCIS/GeneratoRandomDigits");

async function FetchReportes() {
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
  await page.waitForSelector('text=Parametros de reporte', { timeout: 10000 });

  // Seleccionar la opción "Instructor"
  await page.click('input[type="radio"][value="Instructor"]', { timeout: 5000 }).catch(() => {});

  // Ingresar el ID
  await page.fill('input[name="P9_IDS"]', '000196942').catch(() => {});

  // Rellenar las fechas
  await page.fill('input[name="P9_FECHA_INI"]', '01/10/2025').catch(() => {});
  await page.fill('input[name="P9_FECHA_FIN"]', '30/10/2025').catch(() => {});

  // Clic en el botón "ver calendario"
  await page.click('input[value="ver calendario"]').catch(() => {});

  console.log("✅ Formulario rellenado correctamente.");

  // Si deseas, puedes esperar que cargue el resultado:
  await page.waitForTimeout(5000);

  // await browser.close(); // <- Cierra si no necesitas inspeccionar
}

module.exports = FetchReportes;
