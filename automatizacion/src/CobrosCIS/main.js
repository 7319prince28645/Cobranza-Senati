const { chromium } = require("playwright");
const login = require("./login");
const LeerTodasLasHojas = require("./leerIdsDeColumnaD");
const { navigateToOtherPage } = require("./NavigateOtherPage");
const { RecorrerAlumnos } = require("./RecorrerAlumnos");

async function main(onProgress = () => {}) {
  // 🚀 Lanzamos Playwright en modo headless
  const browser = await chromium.launch({
    headless: false, // 👈 muestra la ventana
    slowMo: 30, // 👈 retrasa cada acción (100ms) para que veas qué hace
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await login(page, "000196942", "040766");

  const hojasConIds = await LeerTodasLasHojas();

  await navigateToOtherPage(page, hojasConIds);

  for (const [nombreHoja, ids] of Object.entries(hojasConIds)) {
    const resultados = [];
    for (const id of ids) {
      const [resultado] = await RecorrerAlumnos(page, id, nombreHoja);
      resultados.push({ id, ...resultado });

      // 🚀 Mandamos resultado inmediato al front
    } 
    onProgress({ hoja: nombreHoja, resultados });
  }

  await browser.close();
  onProgress("✅ Proceso finalizado");
}

module.exports = main;
