// src/login.js
async function login(page, username, password) {
  // Ir al login
  await page.goto("https://sinfo.senati.edu.pe/", {
    waitUntil: "domcontentloaded",
  });

  // Localizadores
  const userInput = page.locator('input[placeholder="Nombre de usuario"]');
  const passInput = page.locator('input[placeholder="Contraseña"]');
  const loginButton = page.getByRole("button", { name: "Continuar" }); // más robusto

  // Esperar y rellenar usuario
  await userInput.waitFor({ timeout: 30000 });
  await userInput.fill(username);

  // Rellenar contraseña
  await passInput.fill(password);

  // Clic en login
  await loginButton.click();

  // Esperar a que la navegación termine después de login

  // Esperar botón de Académicos
  const academicosBtn = page.getByRole("tab", { name: /Acad[eé]micos/i });

  // Asegurar que esté visible y habilitado
  await academicosBtn.waitFor({ state: "visible", timeout: 30000 });

  // Clic en el tab
  await academicosBtn.click();

  console.log("✅ Navegado a Académicos (clic real)");

  console.log("✅ Navegado a Académicos");
}

module.exports = login;
