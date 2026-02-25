// src/login.js
async function login(page, username, password) {
  console.log("🚀 Iniciando navegación a SINFO...");
  
  // Ir al login
  try {
    await page.goto("https://sinfo.senati.edu.pe/", {
      waitUntil: "load", // Cambiado a load para ser más permisivo
      timeout: 90000     // Aumentado a 90 segundos
    });
  } catch (error) {
    console.error("❌ Error en navegación inicial:", error.message);
    // Intentar continuar de todos modos por si cargó algo
  }

  console.log("📍 URL actual:", page.url());

  // Localizadores
  const userInput = page.locator('input[placeholder="Nombre de usuario"], #usernameUserInput');
  const passInput = page.locator('input[placeholder="Contraseña"], #password');
  const loginButton = page.getByRole("button", { name: /Continuar/i });

  try {
    // Esperar y rellenar usuario
    console.log("⏳ Esperando campo de usuario...");
    await userInput.waitFor({ state: "visible", timeout: 45000 });
    await page.waitForTimeout(500); 
    await userInput.fill(username);
    console.log("✅ Usuario ingresado");

    // Rellenar contraseña
    await passInput.waitFor({ state: "visible", timeout: 15000 });
    await passInput.fill(password);
    console.log("✅ Contraseña ingresada");

    // 🛡️ Manejo de CAPTCHA
    const captchaExists = await page.locator('.g-recaptcha, iframe[src*="recaptcha"], #checkpoint_captcha').count() > 0;
    
    if (captchaExists) {
      console.log("🛡️ CAPTCHA detectado. Por favor, resuélvelo y haz clic en 'Continuar' manualmente en el navegador...");
      
      try {
        // Esperamos a que la URL cambie, lo que indica que el usuario resolvió el captcha y pulsó continuar
        await page.waitForURL(/experience\.elluciancloud\.com|login\.microsoftonline\.com/, { timeout: 300000 }); // 5 minutos de espera
        console.log("✅ Login detectado tras interacción manual");
      } catch (e) {
        console.log("⚠️ Tiempo de espera agotado o error esperando interacción manual.");
      }
    } else {
      // Si no hay captcha, procedemos automáticamente
      await loginButton.waitFor({ state: "visible", timeout: 15000 });
      await page.waitForTimeout(1000); 
      await loginButton.click();
      console.log("🖱️ Clic automático en Continuar");
    }

    // 🔄 Manejar posible pantalla de "Mantener sesión" (Microsoft)
    try {
      const staySignedInBtn = page.locator('input[type="submit"][value="Sí"], #idSIButton9');
      if (await staySignedInBtn.count({ timeout: 5000 }) > 0) {
        console.log("🖱️ Haciendo clic en 'Mantener sesión iniciada'...");
        await staySignedInBtn.click();
      }
    } catch (e) {}

    // Esperar a que la URL se estabilice en Experience
    console.log("⏳ Esperando estabilización de Experience...");
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000); 

    // Esperamos directamente al botón de Académicos en la página principal
    console.log("⏳ Buscando botón Académicos...");
    const academicosBtn = page.locator('button:has-text("Académicos"), [role="tab"]:has-text("Académicos"), #Académicos_tab, a:has-text("Académicos"), span:has-text("Académicos")').first();
    
    try {
      await academicosBtn.waitFor({ state: "visible", timeout: 60000 });
      console.log("✅ Botón Académicos encontrado");
    } catch (e) {
      console.warn("⚠️ No se vio el botón Académicos, intentando refrescar...");
      await page.reload({ waitUntil: "load" });
      await academicosBtn.waitFor({ state: "visible", timeout: 30000 });
    }

    await page.waitForTimeout(2000); 

    // Clic en el tab
    console.log("🖱️ Clic en pestaña Académicos");
    await academicosBtn.click();
    
    // Damos un pequeño margen para que se procese el clic antes de terminar la función
    await page.waitForTimeout(3000);

    console.log("✅ Login completado con éxito");
  } catch (error) {
    if (error.message.includes('Target page, context or browser has been closed')) {
      console.error("❌ El navegador se cerró inesperadamente durante el login.");
    } else {
      console.error("❌ Error durante el proceso de login:", error.message);
    }
    throw error;
  }
}

module.exports = login;
