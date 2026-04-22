@echo off
title Zebra Labels Server - Cloud3
color 0B
echo.
echo  =============================================
echo    ZEBRA LABELS SERVER - Cloud3 Srl
echo  =============================================
echo.
echo  Avvio server in corso...
echo.

cd /d "%~dp0server"

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

:: Verifica node_modules
if not exist "node_modules" (
    echo  Installazione dipendenze...
    npm install
    echo.
)

:: Avvia il server
echo  Server avviato su http://localhost:3000
echo  Premi CTRL+C per fermare il server
echo  ---------------------------------------------
echo.
node index.js

:: Se il server si chiude per errore
if %ERRORLEVEL% neq 0 (
    color 0C
    echo.
    echo  [ERRORE] Il server si e' chiuso con errore %ERRORLEVEL%
    echo.
    pause
)
