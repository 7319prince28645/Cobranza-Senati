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

    const codigoPago = await page
      .locator("div.codPayValue")
      .evaluate((el) => el.innerText.trim());

    // --- Procesar filas de la tabla (método optimizado) ---
    const datos = await page.evaluate((nrcEsperado) => {
      const rows = document.querySelectorAll("table tbody tr");
      const result = [];

      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll("td");
        if (!cells.length) continue;

        const nrc = (cells[0]?.textContent || "").trim();
        const concepto = (cells[2]?.textContent || "").trim();
        const monto = (cells[4]?.textContent || "").trim();
        const fechaVencimiento = (cells[5]?.textContent || "").trim();
        const estado = (cells[6]?.textContent || "").trim();

        // 👉 Guardar solo si:
        // - NRC es numérico
        // - O si NRC está vacío pero concepto tiene algo relevante
        if (/^\d+$/.test(nrc) || (nrc === "" && concepto !== "")) {
          result.push({
            nrc,
            concepto,
            monto,
            fechaVencimiento,
            estado,
          });
        }
      }

      return result;
    }, nrcEsperado);

    if (datos.length === 0) {
      resultados.push({
        id,
        nombreAlumno,
        codigoPago,
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
            codigoPago,
            match: true,
            mensaje: `✔️ NRC coincide (${nrcEsperado}). Estado del pago: ${encontrado.estado}`,
            datos,
          }
        : {
            id,
            nombreAlumno,
            codigoPago,
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
