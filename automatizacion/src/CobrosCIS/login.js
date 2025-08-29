// src/login.js
async function login(page, username, password) {
  // Ir al login
  await page.goto("https://sinfo.senati.edu.pe/", { waitUntil: "domcontentloaded" });

  // Localizadores
  const userInput = page.locator('input[placeholder="Nombre de usuario"]');
  const passInput = page.locator('input[placeholder="Contraseña"]');
  const loginButton = page.locator('button:has-text("Continuar")'); // ajusta el texto exacto si es distinto

  // Esperar y rellenar usuario
  await userInput.waitFor({ timeout: 30000 });
  await userInput.fill(username);

  // Rellenar contraseña
  await passInput.fill(password);

  // Clic en login
  await loginButton.click();

  // Esperar que cargue la página post-login
  await page.waitForLoadState("networkidle");

  // Ahora espera al botón de "Académicos"
  const academicosBtn = page.locator('button[aria-label="Académicos"]');
  await academicosBtn.waitFor({ timeout: 30000 });
  await academicosBtn.click();

  console.log("✅ Navegado a Académicos");
}

module.exports = login;
