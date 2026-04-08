// src/login.js
const { chromium } = require("playwright-extra");

/**
 * Realiza el proceso de login base hasta llegar al dashboard (Experience)
 */
async function baseLogin(page, username, password) {
  console.log("🚀 Iniciando navegación a SINFO...");
  
  try {
    await page.goto("https://sinfo.senati.edu.pe/", {
      waitUntil: "load",
      timeout: 90000
    });
  } catch (error) {
    console.error("❌ Error en navegación inicial:", error.message);
  }

  const userInput = page.locator('input[placeholder="Nombre de usuario"], #usernameUserInput');
  const passInput = page.locator('input[placeholder="Contraseña"], #password');
  const loginButton = page.getByRole("button", { name: /Continuar|Continue|Sign in|Log in/i });

  try {
    await userInput.waitFor({ state: "visible", timeout: 45000 });
    await userInput.fill(username);
    await passInput.waitFor({ state: "visible", timeout: 15000 });
    await passInput.fill(password);

    const captchaExists = await page.locator('.g-recaptcha, iframe[src*="recaptcha"], #checkpoint_captcha').count() > 0;
    
    if (captchaExists) {
      console.log("🛡️ CAPTCHA detectado. Por favor, resuélvelo manualmente...");
      await page.waitForURL(/experience\.elluciancloud\.com|login\.microsoftonline\.com/, { timeout: 300000 });
    } else {
      await loginButton.waitFor({ state: "visible", timeout: 15000 });
      await loginButton.click();
    }

    try {
      const staySignedInBtn = page.locator('input[type="submit"][value="Sí"], #idSIButton9');
      if (await staySignedInBtn.count({ timeout: 5000 }) > 0) {
        await staySignedInBtn.click();
      }
    } catch (e) {}

    console.log("⏳ Esperando carga del Dashboard (Experience)...");
    await page.waitForURL(/experience\.elluciancloud\.com/, { timeout: 60000 });
    // Damos un pequeño margen para que carguen los widgets
    await page.waitForTimeout(5000); 
    
    console.log("✅ Llegamos al Dashboard (Experience)");
  } catch (error) {
    console.error("❌ Error durante el proceso de baseLogin:", error.message);
    throw error;
  }
}

/**
 * Realiza el login base y luego hace clic en la pestaña "Académicos" (Comportamiento original)
 */
async function login(page, username, password, skipTabClick = false) {
  await baseLogin(page, username, password);
  
  if (skipTabClick) {
    return;
  }

  console.log("⏳ Buscando botón Académicos...");
  const academicosBtn = page.locator('button:has-text("Académicos"), button:has-text("Academics"), [role="tab"]:has-text("Académicos"), #Académicos_tab, a:has-text("Académicos"), span:has-text("Académicos")').first();
  
  try {
    await academicosBtn.waitFor({ state: "visible", timeout: 60000 });
    await academicosBtn.click();
    await page.waitForTimeout(3000);
    console.log("✅ Clic en pestaña Académicos completado");
  } catch (e) {
    console.warn("⚠️ No se vio el botón Académicos, intentando refrescar...");
    await page.reload({ waitUntil: "networkidle" });
    await academicosBtn.waitFor({ state: "visible", timeout: 30000 });
    await academicosBtn.click();
  }
}

module.exports = login;
module.exports.baseLogin = baseLogin;
