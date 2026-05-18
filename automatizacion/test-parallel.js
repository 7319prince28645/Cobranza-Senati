/**
 * Test de paralelismo - verifica que Promise.all realmente ejecuta en paralelo
 * Simula el mismo patrón que index.js usa para procesar batches de IDs
 */

// Simular FetchReportes con un delay de 3 segundos
async function fakeFetchReportes(id) {
  const start = Date.now();
  console.log(`[${new Date().toLocaleTimeString()}] 🚀 INICIANDO Chrome para ID: ${id}`);
  
  // Simular el tiempo que tarda un reporte (3 segundos)
  await new Promise(r => setTimeout(r, 3000));
  
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[${new Date().toLocaleTimeString()}] ✅ TERMINADO ID: ${id} (tardó ${elapsed}s)`);
  return { id, ok: true };
}

// Misma lógica que index.js
const chunkArray = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

async function main() {
  const ids = ['ID_001', 'ID_002', 'ID_003', 'ID_004', 'ID_005', 'ID_006', 'ID_007', 'ID_008', 'ID_009', 'ID_010'];
  const idBatches = chunkArray(ids, 5);
  
  console.log(`\n========================================`);
  console.log(`PRUEBA DE PARALELISMO - ${ids.length} IDs en batches de 5`);
  console.log(`========================================\n`);
  
  const globalStart = Date.now();

  for (let index = 0; index < idBatches.length; index++) {
    const batch = idBatches[index];
    const batchStart = Date.now();
    console.log(`\n--- [Batch ${index+1}/${idBatches.length}] Procesando ${batch.length} IDs simultáneamente ---`);
    
    await Promise.all(batch.map(async (id) => {
      try {
        await fakeFetchReportes(id);
      } catch (err) {
        console.error(`Error ${id}:`, err.message);
      }
    }));
    
    const batchElapsed = ((Date.now() - batchStart) / 1000).toFixed(1);
    console.log(`--- Batch ${index+1} completado en ${batchElapsed}s (si fuera secuencial serían ${batch.length * 3}s) ---`);
  }

  const totalElapsed = ((Date.now() - globalStart) / 1000).toFixed(1);
  console.log(`\n========================================`);
  console.log(`TOTAL: ${totalElapsed}s (secuencial hubiera sido ${ids.length * 3}s)`);
  console.log(`Si el total es ~6s = PARALELO FUNCIONA ✅`);
  console.log(`Si el total es ~30s = SECUENCIAL ❌`);
  console.log(`========================================\n`);
}

main();
