// helpers/navigation.js
const NAV_RETRIES = 3;

async function openReportPage(page, dynamicId) {
  const url = `https://apex.senati.edu.pe/apex/f?p=999:1:${dynamicId}:::::`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

  for (let intento = 1; intento <= NAV_RETRIES; intento++) {
    try {
      await page.waitForSelector("td.t12Header", { timeout: 8000 });
      const enlaces = await page.$$eval("a", (anchors) =>
        anchors
          .filter((a) => a.textContent?.includes("Horarios Academicos"))
          .map((a) => a.href)
      );
      if (enlaces.length > 0) {
        await page.goto(enlaces[0], { waitUntil: "domcontentloaded" });
        return;
      }
      throw new Error("link not found");
    } catch (err) {
      if (intento === NAV_RETRIES) throw err;
      await page.reload({ waitUntil: "domcontentloaded" });
    }
  }
}

async function submitFormAndShowCalendar(page, id, fechaInicio, fechaFin) {
  await page.waitForSelector("text=Parametros de reporte", { timeout: 4000 });
  await page.click('input[type="radio"][value="Instructor"]').catch(() => {});
  await page.fill('input[name="P9_IDS"]', id).catch(() => {});
  await page.fill('input[name="P9_FECHA_INI"]', fechaInicio).catch(() => {});
  await page.fill('input[name="P9_FECHA_FIN"]', fechaFin).catch(() => {});
  await page.waitForSelector('a.t12Button:has-text("ver calendario")', { timeout: 10000 });
  await page.click('a.t12Button:has-text("ver calendario")').catch(() => {});
  await page.waitForSelector("#dvContainer", { timeout: 4000 });
}

module.exports = {
  openReportPage,
  submitFormAndShowCalendar,
};
