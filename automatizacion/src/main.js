const puppeteer = require("puppeteer");
const login = require("./login");
const LeerTodasLasHojas = require("./leerIdsDeColumnaD");
const { navigateToOtherPage } = require("./NavigateOtherPage");
const { RecorrerAlumnos } = require("./RecorrerAlumnos");

async function main(onProgress = () => {}) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await login(page, "000196942", "040766");

  const hojasConIds = await LeerTodasLasHojas();
 

  await navigateToOtherPage(page, hojasConIds);

 for (const [nombreHoja, ids] of Object.entries(hojasConIds)) {
  // Procesa la hoja
  const resultados = await RecorrerAlumnos(page, ids, nombreHoja);

  // 🚀 Solo envío al front cuando termine la hoja completa
  onProgress({
    hoja: nombreHoja,
    registros: resultados.length,
    resultados
  });
}


  await browser.close();
  onProgress("✅ Proceso finalizado");
}

module.exports = main;
