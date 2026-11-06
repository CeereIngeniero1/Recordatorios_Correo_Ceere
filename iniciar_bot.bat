@echo off
title Bot de Correo - Notificaciones de Citas
echo ===================================================
echo   Iniciando notificaciones por correo electronico
echo ===================================================
echo.
:: Cambiar al directorio donde se encuentra este archivo .bat
cd /d "%~dp0"

:: Ejecutar el proyecto
node index.js

echo.
echo El bot se ha detenido o ha ocurrido un error.
pause
