@echo off
title Cobranza SENATI - Modo Desarrollo
echo ==========================================
echo    INICIANDO MODO DESARROLLO (UNIFICADO)
echo ==========================================
echo.

REM Abrimos el navegador previamente
echo Abriendo navegador en http://localhost:5173 ...
start http://localhost:5173

REM Ejecutamos concurrently definido en package.json
echo Iniciando servicios (Front + Back)...
call npm.cmd run dev

pause
