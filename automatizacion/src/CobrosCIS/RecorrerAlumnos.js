async function RecorrerAlumnos(page, id, nombreHoja) {
  const resultados = [];

  try {
    // 🔹 Obtener NRC esperado desde el nombre de la hoja
    const nrcEsperado = parseInt(nombreHoja.split("-")[0].trim(), 10);

    // 🔹 Determinar el periodo dinámicamente según el NRC
    const termCode = nrcEsperado > 1001 ? "202512" : "202502";

    // --- Interacción con la página ---
    const termInput = page.locator("input#P3_TERM_CODE");
    await termInput.waitFor({ state: "visible" });
    await termInput.fill(termCode);

    const idInput = page.locator("input#P3_IDS");
    await idInput.waitFor({ state: "visible" });
    await idInput.fill(id.toString());

    // Click en botón y esperar tabla de resultados
    const botonBuscar = page.getByRole("link", { name: "Buscar por ID" });

    await Promise.all([
      botonBuscar.click(),
      page
        .locator("table tbody tr")
        .first()
        .waitFor({ state: "visible", timeout: 60000 }),
      page
        .locator("#studentInfo li:has(strong:has-text('Nombre:'))")
        .waitFor({ state: "visible", timeout: 60000 }),
    ]);

    // Ahora sí extraemos el nombre de forma segura
    const nombreAlumno = await page
      .locator("#studentInfo li:has(strong:has-text('Nombre:'))")
      .evaluate((el) => el.innerText.replace("Nombre:", "").trim());

    // --- Procesar filas de la tabla (método optimizado) ---
    const datos = await page.evaluate((nrcEsperado) => {
      const rows = document.querySelectorAll("table tbody tr");
      const result = [];

      if (rows.length <= 1) return result;

      for (let i = 1; i < rows.length; i++) {
        // saltamos cabecera
        const cells = rows[i].querySelectorAll("td");
        const fila = Array.from(cells).map((c) => (c.textContent || "").trim());

        result.push({
          nrc: fila[0] || "",
          all: fila, // 👈 todos los td en orden
        });
      }
      return result;
    }, nrcEsperado);

    if (datos.length === 0) {
      resultados.push({
        id,
        nombreAlumno,
        error: "❌ No se encontraron datos en la tabla",
      });
      return resultados;
    }

    const encontrado = datos.find(
      (item) => parseInt(item.nrc, 10) === nrcEsperado
    );

    resultados.push(
      encontrado
        ? {
            id,
            nombreAlumno,
            match: true,
            mensaje: `✔️ NRC coincide (${nrcEsperado}). Estado del pago: ${
              encontrado.all[6] || ""
            }`,
            datos,
          }
        : {
            id,
            nombreAlumno,
            match: false,
            mensaje: `⚠️ Alumno no pertenece al NRC ${nrcEsperado}`,
            datos,
          }
    );
  } catch (error) {
    resultados.push({
      id,
      error: "❌ No se pudo procesar el alumno",
      detalle: error.message,
    });
  }

  return resultados;
}

exports.RecorrerAlumnos = RecorrerAlumnos;
