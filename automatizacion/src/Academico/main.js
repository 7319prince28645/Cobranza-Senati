const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
const { baseLogin } = require("../CobrosCIS/login");

chromium.use(stealth);

// Evitar que el proceso muera por promesas no capturadas
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Promesa no capturada (ignorada):', err?.message || err);
});

async function verificarNota(ids = [], username, password, onProgress = null) {
  console.log(`🚀 Procesamiento paralelo: ${ids.length} IDs con hasta 10 pestañas`);
  let processedCount = 0;
  const totalIds = ids.length;
  
  const browser = await chromium.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // ═══════════════════════════════════════════════
    // 1. SESIÓN ÚNICA: Login y capturar URL de SINFO
    // ═══════════════════════════════════════════════
    const context = await browser.newContext();
    const loginPage = await context.newPage();
    console.log("🔐 Autenticando...");
    await baseLogin(loginPage, username, password);
    
    const acadBtn = loginPage.locator('button:has-text("Académicos"), [role="tab"]:has-text("Académicos")').first();
    await acadBtn.waitFor({ state: "visible" });
    await acadBtn.click();
    await loginPage.waitForTimeout(1500);

    const sinfoLink = loginPage.locator('a[href*="sinfo--administrativo"]').filter({ has: loginPage.locator('img[alt="Sinfo Administrativo"]') }).first();
    const [adminPage] = await Promise.all([
      context.waitForEvent('page', { timeout: 60000 }),
      sinfoLink.click(),
    ]);
    await adminPage.waitForLoadState("domcontentloaded");
    const sinfoBaseUrl = adminPage.url();
    console.log("📍 URL SINFO:", sinfoBaseUrl);

    await loginPage.close();
    await adminPage.close();

    // ═══════════════════════════════════════════════
    // 2. MUTEX para popups (solo 1 a la vez)
    // ═══════════════════════════════════════════════
    const workQueue = [...ids];
    const finalResults = [];
    const numWorkers = Math.min(ids.length, 10);
    let popupBusy = false;

    async function acquirePopupLock() {
      while (popupBusy) await new Promise(r => setTimeout(r, 50));
      popupBusy = true;
    }
    function releasePopupLock() { popupBusy = false; }

    // ═══════════════════════════════════════════════
    // 3. WORKER: preparación + procesamiento
    // ═══════════════════════════════════════════════
    async function worker(workerId) {
      await new Promise(r => setTimeout(r, workerId * 2000));

      const page = await context.newPage();
      try {
        console.log(`👷 [${workerId}] Navegando a SINFO...`);
        await page.goto(sinfoBaseUrl, { waitUntil: "load", timeout: 60000 });

        // Menú Administrativo
        const menuBtn = page.locator('button[url*="sinfo.administrativo"]').first();
        await menuBtn.waitFor({ state: "visible", timeout: 30000 });
        await menuBtn.click();
        await page.waitForTimeout(1500);

        // Emisión de Certificados (ID exacto)
        const emisionDiv = page.locator('#certifica--p_menu___UID0');
        await emisionDiv.waitFor({ state: "visible", timeout: 20000 });
        await emisionDiv.click();
        await page.waitForTimeout(1500);

        // Constancia de Estudios
        const constancia = page.locator('a#contentItem14, h3:has-text("Constancia de Estudios")').first();
        await constancia.waitFor({ state: "visible", timeout: 20000 });
        await constancia.click();

        await page.waitForSelector('#inp_id', { timeout: 30000 });
        console.log(`✅ [${workerId}] Listo para procesar.`);

        // ═══════════════════════════════════════════
        // LOOP: procesar IDs de la cola compartida
        // ═══════════════════════════════════════════
        while (workQueue.length > 0) {
          const id = workQueue.shift();
          if (!id) break;

          console.log(`👷 [${workerId}] → ID: ${id} (Quedan: ${workQueue.length})`);
          const studentData = { id, nombre: "Desconocido", careers: [], status: "No registrado" };

          try {
            await page.fill('#inp_id', id);
            await page.click('#BOT_buscar');
            await page.waitForTimeout(600);

            const nameElem = page.locator('font.fon12b');
            if (await nameElem.count() > 0) {
              studentData.nombre = (await nameElem.innerText()).trim().replace(`${id} - `, "");
              studentData.status = "Verificando...";

              const certSelector = 'td[onclick*="ver_curri"]';
              const count = await page.locator(certSelector).count();
              const ordinals = ["", "(Segunda)", "(Tercera)", "(Cuarta)", "(Quinta)"];

              for (let i = 0; i < count; i++) {
                const cell = page.locator(certSelector).nth(i);
                const row = page.locator('tr').filter({ has: cell });
                let carrera = "Carrera " + (i + 1);
                try {
                  const raw = (await row.locator('td.fon10').nth(1).innerText()).trim();
                  carrera = `${raw} ${ordinals[i] || ""}`.trim();
                } catch (e) {}

                // ═══════════════════════════════════════
                // POPUP CON MUTEX: solo 1 worker a la vez
                // ═══════════════════════════════════════
                try {
                  await acquirePopupLock();

                  let gradePage = null;
                  try {
                    // Escuchar ANTES de hacer clic
                    const pagePromise = context.waitForEvent('page', { timeout: 10000 });
                    await cell.evaluate(n => {
                      const o = window.open;
                      window.open = (u, m, s) => o(u, '_blank', s);
                      n.click();
                      window.open = o;
                    });
                    gradePage = await pagePromise;
                  } catch (e) {
                    // Si falla, cerrar cualquier página huérfana
                    const pages = context.pages();
                    for (const p of pages) {
                      if (p !== page && !p.isClosed()) {
                        await p.close().catch(() => {});
                      }
                    }
                    releasePopupLock();
                    continue;
                  }

                  try {
                    await gradePage.waitForLoadState("domcontentloaded", { timeout: 10000 });
                    const nota = await gradePage.evaluate(() => {
                      const t = Array.from(document.querySelectorAll('tr')).find(r => r.innerText.includes('SUSTENTACIÓN DEL PROYECTO'));
                      return t ? t.querySelectorAll('td')[2]?.innerText.trim() : "No registrada";
                    });

                    if (nota !== "No registrada") {
                      studentData.careers.push({ carrera, nota });
                      studentData.status = "Completado";
                    }
                  } catch (e) {}
                  
                  await gradePage.close().catch(() => {});
                  releasePopupLock();
                } catch (e) {
                  releasePopupLock();
                }
              }

              if (studentData.careers.length === 0) studentData.status = "Sin notas de sustentación";
            }
          } catch (e) {
            console.error(`❌ [${workerId}] Error ID ${id}:`, e.message);
            studentData.status = "Error";
            studentData.error = e.message;
          } finally {
            finalResults.push(studentData);
            processedCount++;
            if (onProgress) onProgress(studentData, processedCount, totalIds);
          }
        }

        console.log(`🏁 [${workerId}] Terminó.`);
      } catch (err) {
        console.error(`🔴 [${workerId}] Falló setup:`, err.message);
      } finally {
        await page.close();
      }
    }

    // ═══════════════════════════════════════════════
    // 4. LANZAR WORKERS
    // ═══════════════════════════════════════════════
    const workerPromises = Array.from({ length: numWorkers }, (_, i) => worker(i + 1));
    await Promise.all(workerPromises);

    // Recuperar IDs huérfanos que quedaron en la cola
    while (workQueue.length > 0) {
      const id = workQueue.shift();
      if (!id) break;
      const orphan = { id, nombre: "Desconocido", careers: [], status: "Pendiente", error: "No fue procesado (worker cerrado)" };
      finalResults.push(orphan);
      processedCount++;
      if (onProgress) onProgress(orphan, processedCount, totalIds);
    }

    await browser.close();
    return { success: true, results: finalResults };

  } catch (error) {
    console.error(`❌ Error general: ${error.message}`);
    await browser.close();
    throw error;
  }
}

module.exports = verificarNota;
