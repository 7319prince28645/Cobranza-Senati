export const ImportDataStream = (onMessage, onDone) => {
  const eventSource = new EventSource("http://localhost:3000/automatizacion-stream");

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
