import { getApiUrl } from "./apiConfig";

export const ImportDataStream = (onMessage, onDone, year = new Date().getFullYear(), onProgress) => {
  const urlApi = getApiUrl();
  console.log("🔌 Conectando a stream:", `${urlApi}/automatizacion-stream?year=${year}`);
  
  const eventSource = new EventSource(`${urlApi}/automatizacion-stream?year=${year}`);

  eventSource.onopen = () => {
    console.log("✅ Conexión SSE establecida");
  };

  // Cada mensaje que viene del backend (res.write en Node)
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Manejar mensajes de progreso (barra de carga)
      if (data.progress && onProgress) {
        onProgress(data.progress);
        return;
      }
      
      onMessage(data); // 👈 Aquí se lo mandas a React

      if (data.done) { // 👈 Cuando el backend mande { done: true }
        console.log("🏁 Proceso finalizado por el servidor");
        if (onDone) onDone();
        eventSource.close(); 
      }
    } catch (err) {
      console.error("❌ Error parseando mensaje SSE:", err, event.data);
    }
  };

  // Si algo falla, loguea el error y corta
  eventSource.onerror = (err) => {
    console.error("❌ SSE error (posible cierre de conexión o timeout):", err);
    eventSource.close();
  };

  return eventSource;
};
