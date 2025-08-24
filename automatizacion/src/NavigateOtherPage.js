const { generateRandomDigits } = require("./GeneratoRandomDigits");

async function navigateToOtherPage(page, nombreHoja) {
  const dynamicId = generateRandomDigits(14);
  const url = `https://apex.senati.edu.pe/apex/f?p=999:1:${dynamicId}:::::`;

  console.log(`🌐 Navegando a: ${url} (Hoja: ${nombreHoja})`);
  await page.goto(url);
  await page.waitForSelector("td.t12Header");

  const enlaces = await page.$$eval("a", (anchors) =>
    anchors
      .filter((a) =>
        a.textContent?.includes("Visualización de cronogramas de pagos")
      )
      .map((a) => a.href)
  );

  if (enlaces.length > 0) {
    await page.goto(enlaces[0]);
  } else {
    console.warn("❌ No encontró el link esperado");
    return;
  }

  await page.waitForSelector("input#P3_TERM_CODE");
  await page.type("input#P3_TERM_CODE", "202502");
}

exports.navigateToOtherPage = navigateToOtherPage;
