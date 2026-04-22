@echo off
title Zebra Labels - Installazione Servizio
color 0B

echo.
echo  =============================================
echo    ZEBRA LABELS - INSTALLAZIONE SERVIZIO
echo    Cloud3 Srl
echo  =============================================
echo.

:: Verifica privilegi amministratore
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  [ERRORE] Questo script richiede privilegi di Amministratore!
    echo.
    echo  Clicca col tasto destro su questo file e seleziona
    echo  "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"

:: Verifica Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  [ERRORE] Node.js non trovato!
    echo  Scarica Node.js da https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo  [1/4] Verifica Node.js...
for /f "tokens=*" %%i in ('node -v') do echo         Node.js %%i trovato
echo.

:: Installa dipendenze server se mancanti
echo  [2/4] Verifica dipendenze server...
if not exist "server\node_modules" (
    echo         Installazione dipendenze server...
    cd server
    npm install
    cd ..
)
echo         Dipendenze server OK
echo.

:: Installa node-windows se mancante
echo  [3/4] Verifica node-windows...
if not exist "node_modules\node-windows" (
    echo         Installazione node-windows...
    npm install node-windows --save
)
echo         node-windows OK
echo.

:: Installa il servizio
echo  [4/4] Installazione servizio Windows...
echo.
node service-install.js install

echo.
echo  =============================================
echo    INSTALLAZIONE COMPLETATA
echo  =============================================
echo.
echo  Comandi utili:
echo    net stop ZebraLabelsServer    - Ferma il servizio
echo    net start ZebraLabelsServer   - Avvia il servizio
echo    sc query ZebraLabelsServer    - Stato del servizio
echo    services.msc                  - Gestione servizi Windows
echo.
echo  Per rimuovere il servizio:
echo    uninstall-service.bat
echo.
pause
