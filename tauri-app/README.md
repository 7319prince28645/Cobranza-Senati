# Tauri Desktop - Cobranza SENATI

Este proyecto empaqueta el frontend existente (`Senati-comandos`) con Tauri.

## Requisitos previos
- Node.js 18+
- Rust + Cargo (instalar con https://rustup.rs/)
- Herramientas de compilación en Windows: Visual Studio Build Tools o Desktop C++ workload

## Scripts
```bash
# instalar CLI de Tauri
cd tauri-app
npm install

# modo desarrollo (usa el dev server de Vite en localhost:5173)
npm run dev

# build (compila el frontend y genera instalador .exe)
npm run build
```

## Notas
- El frontend se sirve desde `Senati-comandos/dist` al construir.
- El backend Node/Express no se empaqueta; debes tenerlo corriendo aparte (puerto 3000) o migrarlo a Rust para un binario 100%% nativo.
- La ruta de dev es `http://localhost:5173` (Vite default).
