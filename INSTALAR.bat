@echo off
title Instalador Cobranza SENATI
echo ==========================================
echo    INSTALANDO DEPENDENCIAS DEL PROYECTO
echo ==========================================
echo.

echo 1. Comprobando Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] NodeJS no esta instalado. Por favor instala NodeJS desde nodejs.org
    pause
    exit /b
)

echo 2. Instalando modulos principales...
call npm install

echo 3. Instalando Backend y Navegadores Ocultos...
cd automatizacion
call npm install
echo Instalando motor Chromium para automatizacion...
call npx playwright install chromium
cd ..

echo 4. Instalando Frontend (Vista React)...
cd Senati-comandos
call npm install
cd ..

echo.
echo ==========================================
echo   INSTALACION COMPLETADA CORRECTAMENTE
echo ==========================================
echo Ahora puedes hacer doble clic en "INICIAR_DEV.bat" para arrancar el sistema.
pause
