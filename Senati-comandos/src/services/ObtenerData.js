export const ImportDataStream = (onMessage, onDone, year = new Date().getFullYear()) => {
  const urlApi = import.meta.env.VITE_URL_API_LOCAL;
  const eventSource = new EventSource(`${urlApi}/automatizacion-stream?year=${year}`);

  // Cada mensaje que viene del backend (res.write en Node)
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data); // 👈 Aquí se lo mandas a React

    if (data.done) { // 👈 Cuando el backend mande { done: true }
      if (onDone) onDone();
      eventSource.close(); // cerrar conexión SSE
    }
  };

  // Si algo falla, loguea el error y corta
  eventSource.onerror = (err) => {
    console.error("❌ SSE error:", err);
    eventSource.close();
  };

  return eventSource;
};
