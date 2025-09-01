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
    ]);

    // --- Extraer datos usando Playwright ---
    const nombreAlumno = await page.locator(
      "#studentInfo li:has(strong:has-text('Nombre'))"
    );

    const filas = page.locator("table tbody tr");
    const rowCount = await filas.count();

    if (rowCount <= 1) {
      resultados.push({
        id,
        nombreAlumno,
        error: "❌ No se encontró el cuerpo de la tabla (tbody)",
      });
      return resultados;
    }

    const datos = [];
    for (let i = 1; i < rowCount; i++) {
      // saltar cabecera
      const fila = filas.nth(i);

      datos.push({
        id,
        nrc: ((await fila.locator("td").nth(0).textContent()) || "").trim(),
        concepto: (
          (await fila.locator("td").nth(2).textContent()) || ""
        ).trim(),
        monto: ((await fila.locator("td").nth(4).textContent()) || "").trim(),
        fechaVencimiento: (
          (await fila.locator("td").nth(5).textContent()) || ""
        ).trim(),
        estado: ((await fila.locator("td").nth(6).textContent()) || "").trim(),
      });
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
            mensaje: `✔️ NRC coincide (${nrcEsperado}). Estado del pago: ${encontrado.estado}`,
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
