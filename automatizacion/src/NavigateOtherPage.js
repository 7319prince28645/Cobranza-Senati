const { generateRandomDigits } = require("./GeneratoRandomDigits");

async function navigateToOtherPage(page, nombreHoja, retries = 3) {
  const dynamicId = generateRandomDigits(14);
  const url = `https://apex.senati.edu.pe/apex/f?p=999:1:${dynamicId}:::::`;

  console.log(`🌐 Navegando a: ${url} (Hoja: ${nombreHoja})`);

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

  for (let intento = 1; intento <= retries; intento++) {
    try {
      await page.waitForSelector("td.t12Header", { timeout: 8000 });

      // ✅ Si encontró el header, buscamos los enlaces
      const enlaces = await page.$$eval("a", (anchors) =>
        anchors
          .filter((a) =>
            a.textContent?.includes("Visualización de cronogramas de pagos")
          )
          .map((a) => a.href)
      );

      if (enlaces.length > 0) {
        console.log("✅ Enlace encontrado, navegando...");
        await page.goto(enlaces[0], { waitUntil: "domcontentloaded" });
        return;
      } else {
        throw new Error("No encontró el link esperado");
      }
    } catch (err) {
      console.warn(`⚠️ Intento ${intento}: ${err.message}`);
      if (intento === retries) {
        console.error("❌ No se pudo cargar la página tras varios F5");
        return;
      }
      console.log("🔄 Forzando F5 (reload)...");
      await page.reload({ waitUntil: "domcontentloaded" });
    }
  }
}

exports.navigateToOtherPage = navigateToOtherPage;
