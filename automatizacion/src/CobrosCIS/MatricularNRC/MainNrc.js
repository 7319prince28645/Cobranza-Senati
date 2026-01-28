const { chromium } = require("playwright");

async function main(onProgress = () => {}) {
  // 🚀 Lanzamos Playwright en modo headless
  const browser = await chromium.launchPersistentContext(
    "./carpetaPerfil2", // 👈 aquí se guarda el perfil del navegador
    {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    }
  );

  const page = await browser.newPage();
  await page.goto("https://example.com");
  console.log("Segundo proceso navegando en otra carpeta");

  return browser;
}

module.exports = main;
