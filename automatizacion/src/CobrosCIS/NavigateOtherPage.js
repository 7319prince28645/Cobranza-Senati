const { generateRandomDigits } = require("./GeneratoRandomDigits");

async function navigateToOtherPage(page, nombreHoja, retries = 3) {
  const dynamicId = generateRandomDigits(14);
  const url = `https://apex.senati.edu.pe/apex/f?p=999:1:${dynamicId}:::::`;

  console.log(`🌐 Navegando a: ${url} (Hoja: ${nombreHoja})`);

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

  for (let intento = 1; intento <= retries; intento++) {
    try {
      console.log(`⏳ Esperando selector td.t12Header (Intento ${intento})...`);
      await page.waitForSelector("td.t12Header", { timeout: 15000 });

      // ✅ Si encontró el header, buscamos los enlaces
      console.log("🔍 Buscando enlace 'Visualización de cronogramas de pagos'...");
      const enlaces = await page.$$eval("a", (anchors) =>
        anchors
          .filter((a) =>
            a.textContent?.toLowerCase().includes("visualización de cronogramas de pagos")
          )
          .map((a) => a.href)
      );

      if (enlaces.length > 0) {
        console.log("✅ Enlace encontrado, navegando...");
        await page.goto(enlaces[0], { waitUntil: "domcontentloaded", timeout: 30000 });
        
        // Esperar a que cargue el formulario de búsqueda
        await page.waitForSelector("input#P3_IDS", { timeout: 15000 });
        console.log("✅ Página de búsqueda cargada correctamente.");
        return;
      } else {
        throw new Error("No encontró el link esperado en la página");
      }
    } catch (err) {
      console.warn(`⚠️ Intento ${intento} fallido: ${err.message}`);
      if (intento === retries) {
        console.error("❌ No se pudo cargar la página tras varios intentos");
        throw new Error("Error de navegación persistente en APEX");
      }
      console.log("🔄 Reintentando navegación...");
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    }
  }
}

exports.navigateToOtherPage = navigateToOtherPage;
