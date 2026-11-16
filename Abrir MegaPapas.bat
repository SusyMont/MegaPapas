@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo No se encontro Node.js. Instala Node.js para iniciar la API de correos.
    pause
    exit /b 1
)

if not exist ".env" (
    echo No se encontro el archivo .env con la configuracion de la API.
    pause
    exit /b 1
)

for /f "delims=" %%P in ('node --env-file=.env -p "process.env.PORT || 3000"') do set "PORT=%%P"
if not defined PORT (
    echo No se pudo leer el puerto desde .env.
    pause
    exit /b 1
)

curl.exe --silent --fail "http://127.0.0.1:%PORT%/Js/api.js" >nul
if errorlevel 1 (
    start "MegaPapas API" /min /D "%~dp0" "%ComSpec%" /k "node --env-file=.env server.js"
)

set /a intentos=0
:esperar_servidor
curl.exe --silent --fail "http://127.0.0.1:%PORT%/Js/api.js" >nul
if not errorlevel 1 goto abrir_navegador
set /a intentos+=1
if %intentos% GEQ 20 goto error_servidor
timeout /t 1 /nobreak >nul
goto esperar_servidor

:abrir_navegador
start "" "http://localhost:%PORT%"
exit /b 0

:error_servidor
echo No se pudo iniciar MegaPapas. Revisa la ventana minimizada del servidor.
pause
exit /b 1
