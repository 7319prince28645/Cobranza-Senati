// helpers/navigation.js
const NAV_RETRIES = 3;

async function openReportPage(page, dynamicId) {
  const url = `https://apex.senati.edu.pe/apex/f?p=999:1:${dynamicId}:::::`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

  for (let intento = 1; intento <= NAV_RETRIES; intento++) {
    try {
      // Esperar a que cargue la cabecera del portal APEX
      await page.waitForSelector("td.t12Header, .t12Logo", { timeout: 15000 });
      await page.waitForTimeout(1000); 
      
      const enlaces = await page.$$eval("a", (anchors) =>
        anchors
          .filter((a) => {
            const txt = a.textContent?.toLowerCase() || "";
            // Buscamos "horarios" y "acad" (sin importar el acento en la é)
            return txt.includes("horarios") && /acad.micos/.test(txt);
          })
          .map((a) => a.href)
      );
      if (enlaces.length > 0) {
        await page.goto(enlaces[0], { waitUntil: "networkidle" });
        return;
      }
      throw new Error("link not found");
    } catch (err) {
      console.warn(`⚠️ Intento ${intento} fallido en openReportPage:`, err.message);
      if (intento === NAV_RETRIES) throw err;
      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: "networkidle" });
    }
  }
}

async function submitFormAndShowCalendar(page, id, fechaInicio, fechaFin) {
  // Esperar a que los campos principales estén listos y dar un respiro para que carguen los radios
  await page.waitForSelector('input[name="P9_IDS"]', { timeout: 20000 });
  await page.waitForTimeout(1000); 
  
  // Rellenar campos - usando trial & error para mayor robustez
  try {
    const radioInstructor = page.locator('input[type="radio"][value="Instructor"], input#P9_TIPO_1, label:has-text("Instructor")');
    await radioInstructor.first().click({ timeout: 5000 }).catch(() => {});
  } catch (e) {
    console.warn("⚠️ No se pudo seleccionar 'Instructor', se asume valor por defecto.");
  }

  await page.fill('input[name="P9_IDS"]', id).catch(() => {});
  
  // Limpiar y llenar fechas (a veces APEX tiene comportamientos extraños con .fill)
  const formatToApex = (isoDate) => {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  };

  const fInicioApex = formatToApex(fechaInicio);
  const fFinApex = formatToApex(fechaFin);

  await page.fill('input[name="P9_FECHA_INI"]', "").catch(() => {});
  await page.fill('input[name="P9_FECHA_INI"]', fInicioApex).catch(() => {});
  
  await page.fill('input[name="P9_FECHA_FIN"]', "").catch(() => {});
  await page.fill('input[name="P9_FECHA_FIN"]', fFinApex).catch(() => {});
  
  // Clic en enviar y esperar navegación
  console.log("🚀 Enviando formulario...");
  try {
    const btnVer = page.locator('a.t12Button:has-text("ver calendario")');
    await btnVer.waitFor({ state: 'visible', timeout: 8000 });
    
    // Usamos Promise.all para capturar la navegación si ocurre
    await Promise.all([
      page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {}),
      btnVer.click()
    ]);
  } catch (e) {
    console.warn("⚠️ No se pudo clicar el botón 'ver calendario', es posible que ya esté procesando.");
  }

  // Asegurar que el contenedor de resultados esté presente y estable
  try {
    await page.waitForSelector("#dvContainer", { timeout: 20000 });
    await page.waitForTimeout(1500); 
  } catch (e) {
    console.warn("⚠️ El contenedor #dvContainer no apareció a tiempo, intentando continuar...");
  }
}

module.exports = {
  openReportPage,
  submitFormAndShowCalendar,
};
