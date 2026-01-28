async function RecorrerAlumnos(page, id, nombreHoja, year = new Date().getFullYear()) {
  const resultados = [];

  try {
    // 🔹 Validar que el ID exista
    if (!id) {
      resultados.push({
        id: "N/A",
        error: "❌ ID no proporcionado",
        detalle: "El ID del alumno está vacío o es undefined",
      });
      return resultados;
    }

    // 🔹 Obtener NRC esperado desde el nombre de la hoja
    const nrcEsperado = parseInt(nombreHoja.split("-")[0].trim(), 10);

    // 🎯 Calcular periodos dinámicamente según el año
    const periodos = [`${year}02`, `${year}12`];
    
    console.log(`🔍 Buscando NRC ${nrcEsperado} para ID ${id} en periodos: ${periodos.join(", ")}`);

    let datosEncontrados = null;
    let periodoEncontrado = null;
    let datosRespaldo = null;
    let periodoRespaldo = null;
    let nombreAlumno = null;
    let codigoPago = null;

    // 🔄 Recorrer ambos periodos hasta encontrar el cronograma
    for (const termCode of periodos) {
      try {
        console.log(`  📅 Intentando periodo: ${termCode}`);
        
        // Verificar que la página siga abierta
        if (page.isClosed()) {
          console.log(`  ❌ La página se cerró inesperadamente`);
          break;
        }
        
        // --- Interacción con la página ---
        const termInput = page.locator("input#P3_TERM_CODE");
        await termInput.waitFor({ state: "attached", timeout: 15000 });
        await termInput.fill(termCode);

        const idInput = page.locator("input#P3_IDS");
        await idInput.waitFor({ state: "attached", timeout: 15000 });
        await idInput.fill(String(id)); // Usar String() en lugar de toString()

        // Click en botón y esperar tabla de resultados
        const botonBuscar = page.getByRole("link", { name: "Buscar por ID" });

        await Promise.all([
          botonBuscar.click(),
          page
            .locator("table tbody tr")
            .first()
            .waitFor({ state: "attached", timeout: 20000 }),
        ]);

        // Esperar un poco para que cargue completamente
        await page.waitForTimeout(500);

        // Verificar que haya información del estudiante
        const studentInfoExists = await page.locator("#studentInfo li:has(strong:has-text('Nombre:'))").count();
        
        if (studentInfoExists === 0) {
          console.log(`  ⚠️ No se encontró información del estudiante en periodo ${termCode}`);
          continue;
        }

        // Extraer nombre del alumno (solo la primera vez)
        if (!nombreAlumno) {
          try {
            nombreAlumno = await page
              .locator("#studentInfo li:has(strong:has-text('Nombre:'))")
              .evaluate((el) => el.innerText.replace("Nombre:", "").trim());
          } catch (e) {
            console.log(`  ⚠️ No se pudo extraer el nombre: ${e.message}`);
            nombreAlumno = "Nombre no disponible";
          }
        }

        // Extraer código de pago (solo la primera vez)
        if (!codigoPago) {
          try {
            const codPayExists = await page.locator("div.codPayValue").count();
            if (codPayExists > 0) {
              codigoPago = await page
                .locator("div.codPayValue")
                .evaluate((el) => el.innerText.trim());
            } else {
              codigoPago = "N/A";
            }
          } catch (e) {
            console.log(`  ⚠️ No se pudo extraer el código de pago: ${e.message}`);
            codigoPago = "N/A";
          }
        }

        // --- Procesar filas de la tabla ---
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

        // 💾 Guardar como respaldo por si no encontramos el exacto
        if (datos.length > 0) {
          datosRespaldo = datos;
          periodoRespaldo = termCode;
        }

        // 🎯 Verificar si encontramos el NRC esperado en este periodo
        const encontrado = datos.find(
          (item) => parseInt(item.nrc, 10) === nrcEsperado
        );

        if (encontrado) {
          console.log(`  ✅ Cronograma encontrado en periodo ${termCode}`);
          datosEncontrados = datos;
          periodoEncontrado = termCode;
          break; // 👈 Salir del loop si encontramos el cronograma
        } else {
          console.log(`  ⚠️ No se encontró cronograma para NRC ${nrcEsperado} en periodo ${termCode}`);
        }

      } catch (error) {
        console.log(`  ❌ Error en periodo ${termCode}: ${error.message}`);
        // Continuar con el siguiente periodo
        continue;
      }
    }

    // 🔄 Si no encontramos el exacto, usamos el respaldo (Doble Verificación)
    if (!datosEncontrados && datosRespaldo) {
      console.log(`  ⚠️ Usando datos de respaldo del periodo ${periodoRespaldo}`);
      datosEncontrados = datosRespaldo;
      periodoEncontrado = periodoRespaldo;
    }

    // 📊 Evaluar resultados finales
    if (!datosEncontrados || datosEncontrados.length === 0) {
      resultados.push({
        id,
        nombreAlumno: nombreAlumno || "Desconocido",
        codigoPago: codigoPago || "N/A",
        error: "❌ No se encontraron datos en ningún periodo",
        periodoBuscado: periodos.join(", "),
      });
      return resultados;
    }

    const encontrado = datosEncontrados.find(
      (item) => parseInt(item.nrc, 10) === nrcEsperado
    );

    resultados.push(
      encontrado
        ? {
            id,
            nombreAlumno,
            codigoPago,
            match: true,
            mensaje: `✔️ NRC coincide (${nrcEsperado}). Periodo: ${periodoEncontrado}. Estado del pago: ${encontrado.estado}`,
            periodo: periodoEncontrado,
            datos: datosEncontrados,
          }
        : {
            id,
            nombreAlumno,
            codigoPago,
            match: false,
            mensaje: `⚠️ Alumno no pertenece al NRC ${nrcEsperado}. Periodo analizado: ${periodoEncontrado}`,
            periodo: periodoEncontrado,
            datos: datosEncontrados,
          }
    );
  } catch (error) {
    resultados.push({
      id: id || "N/A",
      error: "❌ No se pudo procesar el alumno",
      detalle: error.message,
    });
  }

  return resultados;
}

exports.RecorrerAlumnos = RecorrerAlumnos;
