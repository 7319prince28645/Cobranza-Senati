const LeerTodasLasHojas = require("./leerIdsDeColumnaD");

(async () => {
  try {
    console.log("Iniciando lectura de hojas...");
    const resultados = await LeerTodasLasHojas();
    console.log("Resultados obtenidos:", Object.keys(resultados));
    for (const [hoja, ids] of Object.entries(resultados)) {
      console.log(`Hoja: ${hoja}, IDs: ${ids.length}`);
      if (ids.length > 0) {
        console.log(`  Primer ID: ${ids[0]}`);
      }
    }
  } catch (error) {
    console.error("Error capturado en el test:", error);
  }
})();
