@echo off
rem Abre STL Studio con doble clic, sin terminal ni agente: si esta apagado lo enciende aparte (sigue encendido
rem aunque se cierre esta ventana y se levanta solo si se cae) y lo abre en el navegador. Es npm run encender.
chcp 65001 >nul
cd /d "%~dp0"
node tools\encender.ts
if errorlevel 1 pause
