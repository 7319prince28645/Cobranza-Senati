const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
const login = require("./login");
const LeerTodasLasHojas = require("./leerIdsDeColumnaD");
const { navigateToOtherPage } = require("./NavigateOtherPage");
const { RecorrerAlumnos } = require("./RecorrerAlumnos");

// Aplicar el plugin de sigilo
chromium.use(stealth);

async function main(onProgress = () => {}, year = new Date().getFullYear()) {
  // 🚀 Lanzamos Playwright con sigilo
  const browser = await chromium.launch({
    headless: false, 
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await login(page, "000196942", "040766");

  const hojasConIds = await LeerTodasLasHojas();
  
  if (Object.keys(hojasConIds).length === 0) {
    console.warn("⚠️ No se encontraron hojas o IDs para procesar.");
    onProgress("⚠️ No se encontraron datos para procesar.");
    await browser.close();
    return;
  }

  // Navegar a la página de búsqueda una sola vez
  await navigateToOtherPage(page, "Inicio del Proceso");

  for (const [nombreHoja, ids] of Object.entries(hojasConIds)) {
    const resultados = [];
    for (const id of ids) {
      const [resultado] = await RecorrerAlumnos(page, id, nombreHoja, year); // 👈 Pasar el año
      resultados.push({ id, ...resultado });

      // 🚀 Mandamos resultado inmediato al front
    } 
    onProgress({ hoja: nombreHoja, resultados });
  }

  await browser.close();
  onProgress("✅ Proceso finalizado");
}

module.exports = main;
