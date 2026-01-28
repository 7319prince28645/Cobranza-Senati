const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');

let mainWindow;

const backendPath = app.isPackaged 
  ? path.join(process.resourcesPath, 'backend') 
  : path.join(__dirname, '..', 'automatizacion');

const frontendPath = app.isPackaged 
  ? path.join(process.resourcesPath, 'frontend') 
  : path.join(__dirname, '..', 'Senati-comandos', 'dist');

function startBackend() {
  try {
    const backendApp = require(path.join(backendPath, 'index.js'));
    if (backendApp) {
        const PORT = 3000;
        if (typeof backendApp.listen === 'function') {
             backendApp.listen(PORT, '0.0.0.0', () => {
                 console.log(`Backend interno iniciado en puerto ${PORT}`);
             });
        }
    }
  } catch (error) {
    console.error('Error iniciando backend:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Cobranza SENATI',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile(path.join(frontendPath, 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  startBackend();
  setTimeout(createWindow, 500);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
