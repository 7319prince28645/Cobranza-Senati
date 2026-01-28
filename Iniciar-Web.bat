@echo off
echo ==========================================
echo   Iniciando Aplicacion Cobranza SENATI
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando backend...
cd automatizacion
start /B cmd /c "npm run dev > nul 2>&1"
cd ..
echo     Backend iniciado en puerto 3000
timeout /t 3 /nobreak > nul

echo.
echo [2/3] Verificando frontend...
cd Senati-comandos
start /B cmd /c "npm run dev:host > nul 2>&1"
cd ..
echo     Frontend iniciado en puerto 5173
timeout /t 3 /nobreak > nul

echo.
echo [3/3] Iniciando navegador...
timeout /t 2 /nobreak > nul
start http://localhost:5173

echo.
echo ==========================================
echo   Aplicacion lista!
echo ==========================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Presiona Ctrl+C para detener los servidores
echo.
pause
