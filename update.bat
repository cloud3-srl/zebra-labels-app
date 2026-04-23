@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM  Zebra Labels - Script di Aggiornamento
REM  Cloud3 Srl
REM
REM  Esegui come Amministratore (tasto destro -> Esegui come amm.)
REM ============================================================

cd /d "%~dp0"

echo.
echo  ============================================================
echo   ZEBRA LABELS - AGGIORNAMENTO
echo  ============================================================
echo.

REM --- Verifica privilegi admin ---
net session >nul 2>&1
if errorlevel 1 (
    echo  [!] ERRORE: Questo script richiede privilegi di Amministratore.
    echo      Clic destro sul file ^> "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

REM --- Verifica git ---
where git >nul 2>&1
if errorlevel 1 (
    echo  [!] ERRORE: Git non e' installato o non e' nel PATH.
    echo      Installa da: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

REM --- Verifica che sia un repo git ---
if not exist ".git" (
    echo  [!] Questa cartella non e' un repository git.
    echo      Inizializzo il collegamento con GitHub...
    echo.
    git init
    git remote add origin https://github.com/cloud3-srl/zebra-labels-app.git
    git fetch origin
    git reset --mixed origin/master
    if errorlevel 1 (
        echo  [!] ERRORE durante l'inizializzazione repo.
        pause
        exit /b 1
    )
)

REM --- Backup database ---
echo  [1/6] Backup database...
if exist "server\zebra-labels.db" (
    set "TIMESTAMP=%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
    set "TIMESTAMP=!TIMESTAMP: =0!"
    if not exist "backup" mkdir "backup"
    copy /Y "server\zebra-labels.db" "backup\zebra-labels_!TIMESTAMP!.db" >nul
    echo       [OK] Backup salvato in backup\zebra-labels_!TIMESTAMP!.db
) else (
    echo       [SKIP] Nessun database esistente
)

REM --- Stop servizio ---
echo.
echo  [2/6] Arresto servizio ZebraLabelsServer...
sc query ZebraLabelsServer >nul 2>&1
if errorlevel 1 (
    echo       [SKIP] Servizio non installato
) else (
    net stop ZebraLabelsServer >nul 2>&1
    if errorlevel 1 (
        echo       [INFO] Servizio gia' fermo o errore arresto
    ) else (
        echo       [OK] Servizio arrestato
    )
)

REM --- Git pull ---
echo.
echo  [3/6] Download ultime modifiche da GitHub...
git fetch --tags origin
if errorlevel 1 (
    echo       [!] ERRORE git fetch
    goto :restart_service
)

git reset --hard origin/master
if errorlevel 1 (
    echo       [!] ERRORE git reset
    goto :restart_service
)
echo       [OK] Codice aggiornato all'ultima versione master

REM --- Mostra versione ---
for /f "delims=" %%v in ('git describe --tags --abbrev^=0 2^>nul') do set "VERSION=%%v"
if defined VERSION (
    echo       Versione: !VERSION!
)

REM --- Install dipendenze root ---
echo.
echo  [4/6] Installazione dipendenze root...
call npm install --omit=dev
if errorlevel 1 (
    echo       [!] WARNING npm install root fallito
) else (
    echo       [OK] Dipendenze root aggiornate
)

REM --- Install dipendenze server ---
echo.
echo  [5/6] Installazione dipendenze server...
pushd server
call npm install --omit=dev
if errorlevel 1 (
    echo       [!] WARNING npm install server fallito
    popd
    goto :restart_service
) else (
    echo       [OK] Dipendenze server aggiornate
)
popd

:restart_service
REM --- Start servizio ---
echo.
echo  [6/6] Avvio servizio ZebraLabelsServer...
sc query ZebraLabelsServer >nul 2>&1
if errorlevel 1 (
    echo       [SKIP] Servizio non installato - avvia manualmente con "npm start"
) else (
    net start ZebraLabelsServer
    if errorlevel 1 (
        echo       [!] ERRORE avvio servizio - controlla logs\
    ) else (
        echo       [OK] Servizio avviato
    )
)

echo.
echo  ============================================================
echo   AGGIORNAMENTO COMPLETATO
echo  ============================================================
echo.
if defined VERSION echo   Versione installata: !VERSION!
echo   Verifica su: http://localhost:3010
echo.
pause
endlocal
