/**
 * Resuelve la URL del API de forma dinámica para permitir el uso en red local.
 */
export const getApiUrl = () => {
  const backendPort = "3000";
  const hostname = window.location.hostname;

  // Si estamos en producción (ej: en render.com), usamos la URL de producción
  if (hostname && !hostname.includes('localhost') && !hostname.includes('127.0.0.1') && !hostname.match(/^192\.168\./) && !hostname.match(/^172\./) && !hostname.match(/^10\./)) {
    return import.meta.env.VITE_URL_API_PRODUCCION || "https://cobranza-senati.onrender.com";
  }

  // Si accedemos por IP local (ej: 192.168.x.x), el backend debe estar en esa misma IP
  return `http://${hostname}:${backendPort}`;
};
