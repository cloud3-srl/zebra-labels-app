@echo off
title Zebra Labels - Rimozione Servizio
color 0E

echo.
echo  =============================================
echo    ZEBRA LABELS - RIMOZIONE SERVIZIO
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

echo  Rimozione servizio ZebraLabelsServer...
echo.
node service-install.js uninstall

echo.
pause
