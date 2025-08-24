// src/login.js
async function login(page, username, password) {
  await page.goto('https://sinfo.senati.edu.pe/', { waitUntil:'networkidle2' });

  await page.type('input[placeholder="Nombre de usuario"]', username);
  await page.type('input[placeholder="Contraseña"]', password);
  await page.click('button');
  
await page.waitForSelector('button[aria-label="Académicos"]'); // espera a que aparezca el botón

// Una vez visible, puedes dar clic:
await page.click('button[aria-label="Académicos"]'); 
console.log('Navegado a Académicos');


}

module.exports = login;
