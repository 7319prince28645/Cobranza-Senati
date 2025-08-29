async function RecorrerAlumnos(page, id, nombreHoja) {
  const resultados = [];

  try {
    // 🔹 Obtener NRC esperado desde el nombre de la hoja
    const nrcEsperado = parseInt(nombreHoja.split("-")[0].trim(), 10);

    // 🔹 Determinar el periodo dinámicamente según el NRC
    const termCode = nrcEsperado > 1001 ? "202512" : "202502";

    // --- Interacción con la página ---
    await page.waitForSelector("input#P3_TERM_CODE", { visible: true });
    await page.focus("input#P3_TERM_CODE");
    await page.keyboard.down("Control");
    await page.keyboard.press("A");
    await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");
    await page.type("input#P3_TERM_CODE", termCode);

    // Esperar y limpiar campo IDS
    await page.waitForSelector("input#P3_IDS", { visible: true });
    await page.focus("input#P3_IDS");
    await page.keyboard.down("Control");
    await page.keyboard.press("A");
    await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");
    await page.type("input#P3_IDS", id.toString());

    // Click en botón y esperar que cargue nueva tabla
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle" }),
      page.click("a.t12Button"),
    ]);

    // --- Evaluación dentro del navegador ---
    const resultado = await page.evaluate(
      (nombreHoja, id) => {
        const nrcEsperado = parseInt(nombreHoja.split("-")[0].trim(), 10);

        // 📌 Extraer nombre del alumno
        let nombreAlumno = null;
        const studentInfo = document.querySelector("#studentInfo");
        if (studentInfo) {
          const liNombre = Array.from(studentInfo.querySelectorAll("li"))
            .find(li => li.querySelector("strong")?.innerText.includes("Nombre"));
          if (liNombre) {
            nombreAlumno = liNombre.innerText.replace("Nombre:", "").trim();
          }
        }

        // 📌 Buscar tabla de deudas
        const tablaContenedora = document.querySelector("table#R61973209355409387");
        const tablaInterna = tablaContenedora?.querySelector("table");
        const tbody = tablaInterna?.querySelector("tbody");

        if (!tbody) {
          return {
            id,
            nombreAlumno,
            error: "❌ No se encontró el cuerpo de la tabla (tbody)",
          };
        }

        const filas = Array.from(tbody.querySelectorAll("tr")).slice(1);
        const datos = filas.map((fila) => {
          const celdas = fila.querySelectorAll("td");
          return {
            id,
            nrc: celdas[0]?.innerText.trim() || "",
            concepto: celdas[2]?.innerText.trim() || "",
            monto: celdas[4]?.innerText.trim() || "",
            fechaVencimiento: celdas[5]?.innerText.trim() || "",
            estado: celdas[6]?.innerText.trim() || "",
          };
        });

        const encontrado = datos.find((item) => {
          const nrcAlumno = parseInt(item.nrc, 10);
          return nrcAlumno === nrcEsperado;
        });

        if (encontrado) {
          return {
            id,
            nombreAlumno,
            match: true,
            mensaje: `✔️ NRC coincide (${nrcEsperado}). Estado del pago: ${encontrado.estado}`,
            datos,
          };
        } else {
          return {
            id,
            nombreAlumno,
            match: false,
            mensaje: `⚠️ Alumno no pertenece al NRC ${nrcEsperado}`,
            datos,
          };
        }
      },
      nombreHoja,
      id
    );

    resultados.push(resultado);
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
