async function RecorrerAlumnos(page, ids, nombreHoja) {
  const resultados = [];

  for (const id of ids) {
    let intentos = 0;
    let procesado = false;

    while (intentos < 3 && !procesado) {
      try {
        await page.click("input#P3_IDS", { clickCount: 3 });
        await page.keyboard.press("Backspace");
        await page.type("input#P3_IDS", id);
        await page.click("a.t12Button");

        const resultado = await page.evaluate((nombreHoja, id) => {
          const nrcEsperado = nombreHoja.split("-")[0].trim();
          const tablaContenedora = document.querySelector("table#R61973209355409387");
          const tablaInterna = tablaContenedora?.querySelector("table");
          const tbody = tablaInterna?.querySelector("tbody");

          if (!tbody) {
            return { id, error: "❌ No se encontró el cuerpo de la tabla (tbody)" };
          }

          const filas = Array.from(tbody.querySelectorAll("tr")).slice(1);
          const datos = filas.map((fila) => {
            const celdas = fila.querySelectorAll("td");
            return {
              id: id,
              nrc: celdas[0]?.innerText.trim() || "",
              concepto: celdas[2]?.innerText.trim() || "",
              monto: celdas[4]?.innerText.trim() || "",
              fechaVencimiento: celdas[5]?.innerText.trim() || "",
              estado: celdas[6]?.innerText.trim() || "",
            };
          });

          const encontrado = datos.find((item) => item.nrc === nrcEsperado);

          if (encontrado) {
            return {
              id,
              match: true,
              mensaje: `✔️ NRC coincide (${nrcEsperado}). Estado del pago: ${encontrado.estado}`,
              datos,
            };
          } else {
            return {
              id,
              match: false,
              mensaje: `⚠️ Alumno no pertenece al NRC ${nrcEsperado}`,
              datos,
            };
          }
        }, nombreHoja, id);

        resultados.push(resultado);
        procesado = true;
      } catch (error) {
        intentos++;
        if (intentos === 3) {
          resultados.push({ id, error: "❌ No se pudo procesar después de 3 intentos" });
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  return resultados;
}

exports.RecorrerAlumnos = RecorrerAlumnos;
