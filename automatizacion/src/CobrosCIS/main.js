const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
const login = require("./login");
const LeerTodasLasHojas = require("./leerIdsDeColumnaD");
const { navigateToOtherPage } = require("./NavigateOtherPage");
const { RecorrerAlumnos } = require("./RecorrerAlumnos");

// Aplicar el plugin de sigilo
chromium.use(stealth);

async function main(onProgress = () => {}, year = new Date().getFullYear()) {
  // 🚀 Lanzamos Playwright con sigilo (headless - sin ventana visible)
  const browser = await chromium.launch({
    headless: true, 
    args: [
      "--no-sandbox", 
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
    ],
  });

  try {
    const context = await browser.newContext({
      locale: 'es-PE',
      timezoneId: 'America/Lima',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    // --- Fase 1: Login (0% - 10%) ---
    onProgress({ pct: 2, text: '🚀 Iniciando navegador en modo oculto...' });
    
    await login(page, "001672204", "Pucallpa2026");
    onProgress({ pct: 10, text: '✅ Sesión iniciada correctamente' });

    // --- Fase 2: Leer IDs de Google Sheets (10% - 20%) ---
    onProgress({ pct: 12, text: '📊 Leyendo datos de Google Sheets...' });
    const hojasConIds = await LeerTodasLasHojas();
    
    const totalHojas = Object.keys(hojasConIds).length;
    if (totalHojas === 0) {
      console.warn("⚠️ No se encontraron hojas o IDs para procesar.");
      onProgress({ pct: 100, text: '⚠️ No se encontraron datos para procesar.' });
      onProgress("⚠️ No se encontraron datos para procesar.");
      await browser.close();
      return;
    }

    // Contar total de alumnos para calcular progreso granular
    let totalAlumnos = 0;
    for (const ids of Object.values(hojasConIds)) {
      totalAlumnos += ids.length;
    }
    
    onProgress({ pct: 20, text: `📋 ${totalHojas} hojas encontradas con ${totalAlumnos} alumnos` });

    // --- Fase 3: Navegar a la página de búsqueda (20% - 25%) ---
    onProgress({ pct: 22, text: '🌐 Navegando a la página de búsqueda...' });
    await navigateToOtherPage(page, "Inicio del Proceso");
    onProgress({ pct: 25, text: '✅ Página de búsqueda lista' });

    // --- Fase 4: Procesar alumnos (25% - 95%) ---
    const progressRange = 70; // 25% to 95% = 70 points of progress
    let alumnosProcesados = 0;
    let hojasProcesadas = 0;

    for (const [nombreHoja, ids] of Object.entries(hojasConIds)) {
      hojasProcesadas++;
      const resultados = [];
      
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        alumnosProcesados++;
        
        // Calcular progreso global
        const progressPct = Math.round(25 + (alumnosProcesados / totalAlumnos) * progressRange);
        onProgress({ 
          pct: Math.min(progressPct, 95), 
          text: `📝 Hoja ${hojasProcesadas}/${totalHojas} — Alumno ${i + 1}/${ids.length} (${nombreHoja})` 
        });

        const [resultado] = await RecorrerAlumnos(page, id, nombreHoja, year);
        resultados.push({ id, ...resultado });
      }
      
      // 🚀 Mandamos resultado de la hoja completa al front
      onProgress({ hoja: nombreHoja, resultados });
    }

    // --- Fase 5: Finalización (95% - 100%) ---
    onProgress({ pct: 100, text: '✅ ¡Proceso completado exitosamente!' });
    onProgress("✅ Proceso finalizado");
  } catch (error) {
    console.error(`❌ Error en main: ${error.message}`);
    throw error;
  } finally {
    console.log("🔒 Cerrando navegador...");
    await browser.close().catch(() => {});
  }
}

module.exports = main;
