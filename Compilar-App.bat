@echo off
echo ==========================================
echo   Compilando Cobranza SENATI
echo ==========================================
echo.

cd /d "%~dp0electron"

echo Este proceso puede tardar varios minutos...
echo.

echo [1/2] Limpiando builds anteriores...
if exist "dist" (
    rmdir /s /q dist
    echo     - Directorio dist eliminado
)
echo.

echo [2/2] Compilando ejecutable...
echo     - Empaquetando Electron app...
echo     - Creando instalador NSIS...
echo     - Creando portable...
echo.
call npm run build:win

if errorlevel 1 (
    echo.
    echo ==========================================
    echo   ERROR EN LA COMPILACION
    echo ==========================================
    echo.
    echo Por favor revisa los errores anteriores.
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   COMPILACION EXITOSA!
echo ==========================================
echo.
echo Los ejecutables estan en: electron\dist\
echo.
echo Archivos generados:
cd dist
for %%F in (*.exe) do (
    set size=%%~zF
    set /a sizeMB=!size! / 1048576
    echo   V %%F - !sizeMB! MB
)
cd ..
echo.
echo   - Portable: No requiere instalacion, solo ejecutar
echo   - Setup: Instalador completo con accesos directos
echo.
echo NOTA: El icono predeterminado se usara.
echo Para personalizar el icono, lee: electron\README.md
echo.
pause

