@echo off
title Zebra Labels - Installer

:: Verifica privilegi amministratore
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [!] Questo installer richiede privilegi di Amministratore!
    echo  Clicca col tasto destro su questo file e seleziona
    echo  "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

:: Verifica Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [!] Node.js non trovato!
    echo  Scarica e installa Node.js da https://nodejs.org
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"
node installer.js
pause
