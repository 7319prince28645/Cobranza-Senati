@echo off
echo ==========================================
echo   Cobranza SENATI - Aplicacion Desktop
echo ==========================================
echo.

cd /d "%~dp0electron"

echo [1/3] Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias de Electron...
    call npm install
    if errorlevel 1 (
        echo Error al instalar dependencias
        pause
        exit /b 1
    )
)

echo [2/3] Verificando backend...
cd ..\automatizacion
if not exist "node_modules" (
    echo Instalando dependencias del backend...
    call npm install
    if errorlevel 1 (
        echo Error al instalar dependencias del backend
        pause
        exit /b 1
    )
)

echo [3/3] Verificando frontend...
cd ..\Senati-comandos
if not exist "node_modules" (
    echo Instalando dependencias del frontend...
    call npm install
    if errorlevel 1 (
        echo Error al instalar dependencias del frontend
        pause
        exit /b 1
    )
)

echo.
echo Iniciando aplicacion...
echo.
cd ..\electron
call npm run electron

if errorlevel 1 (
    echo.
    echo Error al iniciar la aplicacion
    pause
    exit /b 1
)
