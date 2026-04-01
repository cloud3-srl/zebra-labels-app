; ============================================================================
; Zebra Labels - NSIS Installer v3
; Cloud3 Srl - Sistema Stampa Etichette per Zebra GK420t
; ============================================================================

!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "TextFunc.nsh"
!include "WinMessages.nsh"

; --- App ---
!define APP_NAME "Zebra Labels"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Cloud3 Srl"
!define APP_URL "https://printapp.cloud3.site"
!define SERVICE_NAME "ZebraLabelsServer"
!define DEFAULT_PORT "3010"
!define SOURCE_DIR ".."

; --- Output ---
Name "${APP_NAME} ${APP_VERSION}"
OutFile "${SOURCE_DIR}\ZebraLabels-Setup-${APP_VERSION}.exe"
InstallDir "$PROGRAMFILES\Cloud3\ZebraLabels"
InstallDirRegKey HKLM "Software\Cloud3\ZebraLabels" "InstallDir"
RequestExecutionLevel admin
BrandingText "${APP_NAME} ${APP_VERSION} - ${APP_PUBLISHER}"
Unicode true

; --- Variabili ---
Var PortNumber
Var PortInput
Var PortStatusLabel
Var SSLChoice
Var SSLRadioDefault
Var SSLRadioCustom
Var SSLRadioNone
Var CertFile
Var KeyFile
Var CaFile
Var CertFileInput
Var KeyFileInput
Var CaFileInput
Var TrayCheckbox
Var TrayAutostart
Var NodePath
Var TempDir

; --- MUI ---
!define MUI_ICON "${SOURCE_DIR}\assets\printapp.ico"
!define MUI_UNICON "${SOURCE_DIR}\assets\printapp.ico"
!define MUI_ABORTWARNING

!define MUI_WELCOMEPAGE_TITLE "Benvenuto in ${APP_NAME}"
!define MUI_WELCOMEPAGE_TEXT "Questo wizard installera' ${APP_NAME} ${APP_VERSION}.$\r$\n$\r$\n\
Funzionalita':$\r$\n\
  - Stampa etichette su Zebra GK420t$\r$\n\
  - Connessione HTTPS sicura$\r$\n\
  - Servizio Windows automatico$\r$\n\
  - Tray monitor per controllo rapido$\r$\n$\r$\n\
Requisito: Node.js (https://nodejs.org)$\r$\n$\r$\n\
Premi Avanti per continuare."

!define MUI_FINISHPAGE_TITLE "Installazione completata!"
!define MUI_FINISHPAGE_TEXT "${APP_NAME} e' stato installato.$\r$\n$\r$\n\
Servizio: ${SERVICE_NAME}$\r$\n\
Gestione: services.msc oppure Tray Monitor$\r$\n$\r$\n\
Premi Fine per chiudere."
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Avvia Tray Monitor"
!define MUI_FINISHPAGE_RUN_FUNCTION LaunchTray
!define MUI_FINISHPAGE_SHOWREADME
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Apri Web App nel browser"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION OpenBrowser

; --- Pagine ---
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
Page custom PortPage PortPageLeave
Page custom SSLPage SSLPageLeave
Page custom SummaryPage SummaryPageLeave
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Italian"

; ============================================================================
; INIT - Verifica Node.js, estrai helper in temp
; ============================================================================
Function .onInit
  StrCpy $PortNumber "${DEFAULT_PORT}"
  StrCpy $SSLChoice "default"
  StrCpy $TrayAutostart "1"

  ; Cerca Node.js in ordine di priorita'
  StrCpy $NodePath "$PROGRAMFILES64\nodejs\node.exe"
  ${IfNot} ${FileExists} $NodePath
    StrCpy $NodePath "$PROGRAMFILES\nodejs\node.exe"
    ${IfNot} ${FileExists} $NodePath
      StrCpy $NodePath "$PROGRAMFILES32\nodejs\node.exe"
      ${IfNot} ${FileExists} $NodePath
        nsExec::ExecToStack 'where node'
        Pop $0
        Pop $NodePath
        ${TrimNewLines} $NodePath $NodePath
        ${If} $0 != 0
          MessageBox MB_OK|MB_ICONSTOP "Node.js non trovato!$\r$\n$\r$\nScaricalo da https://nodejs.org e riavvia l'installer."
          Abort
        ${EndIf}
      ${EndIf}
    ${EndIf}
  ${EndIf}

  ; Estrai script helper in cartella temp NSIS (disponibili PRIMA dell'installazione)
  InitPluginsDir
  StrCpy $TempDir "$PLUGINSDIR"
  File "/oname=$TempDir\check-port.js" "${SOURCE_DIR}\installer\check-port.js"
  File "/oname=$TempDir\install-deps.js" "${SOURCE_DIR}\installer\install-deps.js"
  File "/oname=$TempDir\write-config.js" "${SOURCE_DIR}\installer\write-config.js"
  File "/oname=$TempDir\setup-service.js" "${SOURCE_DIR}\installer\setup-service.js"
FunctionEnd

; ============================================================================
; PAGINA: Porta
; ============================================================================
Function PortPage
  nsDialogs::Create 1018
  Pop $0

  ${NSD_CreateGroupBox} 0 0 100% 48% "Porta Server"
  Pop $0

  ${NSD_CreateLabel} 15 22 80% 16 "Porta su cui avviare il web server:"
  Pop $0

  ${NSD_CreateText} 15 42 18% 22 "$PortNumber"
  Pop $PortInput

  ${NSD_CreateButton} 38% 41 30% 24 "Verifica disponibilita'"
  Pop $0
  ${NSD_OnClick} $0 OnCheckPort

  ${NSD_CreateLabel} 15 74 80% 28 ""
  Pop $PortStatusLabel

  ${NSD_CreateGroupBox} 0 52% 100% 44% "Note"
  Pop $0
  ${NSD_CreateLabel} 15 65% 85% 28 "Porte consigliate: 3010, 3443, 8443, 8080.$\r$\nSe la porta e' occupata il server non partira'."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function OnCheckPort
  ${NSD_GetText} $PortInput $PortNumber
  ${If} $PortNumber == ""
    ${NSD_SetText} $PortStatusLabel "Inserisci un numero di porta."
    Return
  ${EndIf}

  ${NSD_SetText} $PortStatusLabel "Verifica in corso..."

  nsExec::ExecToStack '"$NodePath" "$TempDir\check-port.js" $PortNumber'
  Pop $0
  Pop $1

  ${If} $0 == 0
    ${NSD_SetText} $PortStatusLabel "Porta $PortNumber DISPONIBILE."
  ${ElseIf} $0 == 1
    ${NSD_SetText} $PortStatusLabel "ATTENZIONE: porta $PortNumber IN USO. Scegline un'altra."
  ${Else}
    ${NSD_SetText} $PortStatusLabel "Errore verifica porta."
  ${EndIf}
FunctionEnd

Function PortPageLeave
  ${NSD_GetText} $PortInput $PortNumber
  ${If} $PortNumber == ""
    StrCpy $PortNumber "${DEFAULT_PORT}"
  ${EndIf}
FunctionEnd

; ============================================================================
; PAGINA: SSL
; ============================================================================
Function SSLPage
  nsDialogs::Create 1018
  Pop $0

  ${NSD_CreateGroupBox} 0 0 100% 26% "Certificato HTTPS"
  Pop $0

  ${NSD_CreateRadioButton} 15 18 85% 15 "Certificato predefinito (printapp.cloud3.site)"
  Pop $SSLRadioDefault
  ${NSD_Check} $SSLRadioDefault

  ${NSD_CreateRadioButton} 15 35 85% 15 "Certificato personalizzato"
  Pop $SSLRadioCustom

  ${NSD_CreateRadioButton} 15 52 85% 15 "Nessun HTTPS (solo HTTP)"
  Pop $SSLRadioNone

  ${NSD_OnClick} $SSLRadioDefault OnSSLToggle
  ${NSD_OnClick} $SSLRadioCustom OnSSLToggle
  ${NSD_OnClick} $SSLRadioNone OnSSLToggle

  ${NSD_CreateGroupBox} 0 30% 100% 52% "Certificato personalizzato"
  Pop $0

  ${NSD_CreateLabel} 15 43% 16% 14 ".crt:"
  Pop $0
  ${NSD_CreateText} 20% 42% 55% 20 ""
  Pop $CertFileInput
  ${NSD_CreateButton} 77% 42% 18% 20 "Sfoglia..."
  Pop $0
  ${NSD_OnClick} $0 BrowseCrt

  ${NSD_CreateLabel} 15 53% 16% 14 ".key:"
  Pop $0
  ${NSD_CreateText} 20% 52% 55% 20 ""
  Pop $KeyFileInput
  ${NSD_CreateButton} 77% 52% 18% 20 "Sfoglia..."
  Pop $0
  ${NSD_OnClick} $0 BrowseKey

  ${NSD_CreateLabel} 15 63% 16% 14 "CA:"
  Pop $0
  ${NSD_CreateText} 20% 62% 55% 20 ""
  Pop $CaFileInput
  ${NSD_CreateButton} 77% 62% 18% 20 "Sfoglia..."
  Pop $0
  ${NSD_OnClick} $0 BrowseCa

  ${NSD_CreateLabel} 15 76% 80% 14 "Il CA Bundle e' opzionale."
  Pop $0

  EnableWindow $CertFileInput 0
  EnableWindow $KeyFileInput 0
  EnableWindow $CaFileInput 0

  nsDialogs::Show
FunctionEnd

Function OnSSLToggle
  ${NSD_GetState} $SSLRadioCustom $0
  ${If} $0 == ${BST_CHECKED}
    EnableWindow $CertFileInput 1
    EnableWindow $KeyFileInput 1
    EnableWindow $CaFileInput 1
  ${Else}
    EnableWindow $CertFileInput 0
    EnableWindow $KeyFileInput 0
    EnableWindow $CaFileInput 0
  ${EndIf}
FunctionEnd

Function BrowseCrt
  nsDialogs::SelectFileDialog open "" "Certificati|*.crt;*.pem|Tutti|*.*"
  Pop $0
  ${If} $0 != ""
    ${NSD_SetText} $CertFileInput $0
  ${EndIf}
FunctionEnd

Function BrowseKey
  nsDialogs::SelectFileDialog open "" "Chiavi|*.key;*.pem|Tutti|*.*"
  Pop $0
  ${If} $0 != ""
    ${NSD_SetText} $KeyFileInput $0
  ${EndIf}
FunctionEnd

Function BrowseCa
  nsDialogs::SelectFileDialog open "" "CA Bundle|*.crt;*.pem|Tutti|*.*"
  Pop $0
  ${If} $0 != ""
    ${NSD_SetText} $CaFileInput $0
  ${EndIf}
FunctionEnd

Function SSLPageLeave
  ${NSD_GetState} $SSLRadioDefault $0
  ${NSD_GetState} $SSLRadioCustom $1

  ${If} $0 == ${BST_CHECKED}
    StrCpy $SSLChoice "default"
  ${ElseIf} $1 == ${BST_CHECKED}
    StrCpy $SSLChoice "custom"
    ${NSD_GetText} $CertFileInput $CertFile
    ${NSD_GetText} $KeyFileInput $KeyFile
    ${NSD_GetText} $CaFileInput $CaFile
    ${If} $CertFile == ""
    ${OrIf} $KeyFile == ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "Specifica almeno il file .crt e .key."
      Abort
    ${EndIf}
    ${IfNot} ${FileExists} $CertFile
      MessageBox MB_OK|MB_ICONEXCLAMATION "File .crt non trovato: $CertFile"
      Abort
    ${EndIf}
    ${IfNot} ${FileExists} $KeyFile
      MessageBox MB_OK|MB_ICONEXCLAMATION "File .key non trovato: $KeyFile"
      Abort
    ${EndIf}
  ${Else}
    StrCpy $SSLChoice "none"
  ${EndIf}
FunctionEnd

; ============================================================================
; PAGINA: Riepilogo
; ============================================================================
Function SummaryPage
  nsDialogs::Create 1018
  Pop $0

  ${NSD_CreateGroupBox} 0 0 100% 52% "Riepilogo"
  Pop $0

  ${NSD_CreateLabel} 15 18 85% 14 "Cartella: $INSTDIR"
  Pop $0
  ${NSD_CreateLabel} 15 34 85% 14 "Porta: $PortNumber"
  Pop $0

  ${If} $SSLChoice == "default"
    ${NSD_CreateLabel} 15 50 85% 14 "HTTPS: printapp.cloud3.site (predefinito)"
    Pop $0
  ${ElseIf} $SSLChoice == "custom"
    ${NSD_CreateLabel} 15 50 85% 14 "HTTPS: certificato personalizzato"
    Pop $0
  ${Else}
    ${NSD_CreateLabel} 15 50 85% 14 "Protocollo: solo HTTP"
    Pop $0
  ${EndIf}

  ${NSD_CreateLabel} 15 66 85% 14 "Servizio: ${SERVICE_NAME}"
  Pop $0

  ${NSD_CreateGroupBox} 0 55% 100% 40% "Opzioni"
  Pop $0

  ${NSD_CreateCheckBox} 15 69% 85% 15 "Avvia Tray Monitor all'accesso Windows"
  Pop $TrayCheckbox
  ${NSD_Check} $TrayCheckbox

  ${NSD_CreateLabel} 15 85% 85% 14 "Icona nel system tray per controllare il servizio."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function SummaryPageLeave
  ${NSD_GetState} $TrayCheckbox $TrayAutostart
FunctionEnd

; ============================================================================
; INSTALLAZIONE
; ============================================================================
Section "Install" SecMain
  SectionIn RO
  SetOutPath $INSTDIR

  ; ── 1. COPIA FILE ──
  DetailPrint "Copia file..."

  SetOutPath "$INSTDIR\server"
  File "${SOURCE_DIR}\server\index.js"
  File "${SOURCE_DIR}\server\db.js"
  File "${SOURCE_DIR}\server\zpl.js"
  File "${SOURCE_DIR}\server\printer.js"
  File "${SOURCE_DIR}\server\logo-converter.js"
  File "${SOURCE_DIR}\server\settings.json"
  File "${SOURCE_DIR}\server\package.json"
  File "${SOURCE_DIR}\server\package-lock.json"
  File /nonfatal "${SOURCE_DIR}\server\clienti.json"
  File /nonfatal "${SOURCE_DIR}\server\zebra-labels.db"

  SetOutPath "$INSTDIR\client\dist"
  File "${SOURCE_DIR}\client\dist\index.html"
  File /nonfatal "${SOURCE_DIR}\client\dist\manifest.webmanifest"
  File /nonfatal "${SOURCE_DIR}\client\dist\favicon.ico"

  SetOutPath "$INSTDIR\client\dist\icons"
  File /nonfatal "${SOURCE_DIR}\client\dist\icons\*.png"

  SetOutPath "$INSTDIR\ssl\_.cloud3.site-certificate-01-04-2026"
  File "${SOURCE_DIR}\ssl\_.cloud3.site-certificate-01-04-2026\wildcard.cloud3.site_2026-04-01.crt"
  File "${SOURCE_DIR}\ssl\_.cloud3.site-certificate-01-04-2026\wildcard.cloud3.site_2026-04-01.key"
  File "${SOURCE_DIR}\ssl\_.cloud3.site-certificate-01-04-2026\ca_bundle.crt"
  File /nonfatal "${SOURCE_DIR}\ssl\_.cloud3.site-certificate-01-04-2026\wildcard.cloud3.site_2026-04-01_windows.pfx"

  SetOutPath "$INSTDIR\assets"
  File "${SOURCE_DIR}\assets\printapp.ico"
  File /nonfatal "${SOURCE_DIR}\assets\*.png"

  SetOutPath "$INSTDIR\tray"
  File "${SOURCE_DIR}\tray\tray-app.js"
  File "${SOURCE_DIR}\tray\launch-tray.vbs"

  SetOutPath "$INSTDIR\installer"
  File "${SOURCE_DIR}\installer\check-port.js"
  File "${SOURCE_DIR}\installer\write-config.js"
  File "${SOURCE_DIR}\installer\setup-service.js"
  File "${SOURCE_DIR}\installer\install-deps.js"

  SetOutPath "$INSTDIR"
  File "${SOURCE_DIR}\service-install.js"
  File "${SOURCE_DIR}\package.json"
  File "${SOURCE_DIR}\package-lock.json"

  CreateDirectory "$INSTDIR\logs"
  CreateDirectory "$INSTDIR\ssl\custom"

  ; ── 2. NPM INSTALL (via helper script, gestisce percorsi con spazi) ──
  DetailPrint "Installazione dipendenze npm (potrebbe richiedere qualche minuto)..."
  nsExec::ExecToLog '"$NodePath" "$INSTDIR\installer\install-deps.js" "$INSTDIR"'
  Pop $0
  ${If} $0 != 0
    DetailPrint "ERRORE: installazione dipendenze fallita (codice $0)"
    MessageBox MB_OK|MB_ICONSTOP "Installazione dipendenze npm non riuscita.$\r$\n$\r$\nPer evitare un'installazione corrotta, il setup verra' interrotto.$\r$\n$\r$\nVerifica Node.js e connettivita' internet, poi rilancia il setup come Amministratore."
    Abort
  ${Else}
    DetailPrint "Dipendenze installate!"
  ${EndIf}

  ; ── 3. CONFIGURAZIONE ──
  DetailPrint "Scrittura configurazione..."
  ${If} $SSLChoice == "custom"
    nsExec::ExecToLog '"$NodePath" "$INSTDIR\installer\write-config.js" "$INSTDIR" $PortNumber custom "$CertFile" "$KeyFile" "$CaFile"'
  ${ElseIf} $SSLChoice == "default"
    nsExec::ExecToLog '"$NodePath" "$INSTDIR\installer\write-config.js" "$INSTDIR" $PortNumber default'
  ${Else}
    nsExec::ExecToLog '"$NodePath" "$INSTDIR\installer\write-config.js" "$INSTDIR" $PortNumber none'
  ${EndIf}
  Pop $0

  ; ── 4. SERVIZIO WINDOWS ──
  DetailPrint "Installazione servizio ${SERVICE_NAME}..."
  nsExec::ExecToLog '"$NodePath" "$INSTDIR\installer\setup-service.js" install "$INSTDIR" $PortNumber'
  Pop $0
  ${If} $0 != 0
    DetailPrint "AVVISO: servizio potrebbe non essersi avviato (codice $0)"
  ${Else}
    DetailPrint "Servizio ${SERVICE_NAME} installato e avviato!"
  ${EndIf}

  ; ── 5. TRAY (launcher VBS silenzioso, nessuna finestra cmd) ──
  ${If} $TrayAutostart == ${BST_CHECKED}
    DetailPrint "Configurazione tray monitor autostart..."
    CreateShortCut "$SMSTARTUP\Zebra Labels Tray.lnk" \
      "wscript.exe" '"$INSTDIR\tray\launch-tray.vbs"' \
      "$INSTDIR\assets\printapp.ico" 0 SW_SHOWMINIMIZED
  ${EndIf}

  ; ── 6. MENU START ──
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"

  ${If} $SSLChoice == "none"
    CreateShortCut "$SMPROGRAMS\${APP_NAME}\Apri ${APP_NAME}.lnk" \
      "http://localhost:$PortNumber" "" "$INSTDIR\assets\printapp.ico"
  ${Else}
    CreateShortCut "$SMPROGRAMS\${APP_NAME}\Apri ${APP_NAME}.lnk" \
      "https://localhost:$PortNumber" "" "$INSTDIR\assets\printapp.ico"
  ${EndIf}

  CreateShortCut "$SMPROGRAMS\${APP_NAME}\Tray Monitor.lnk" \
    "wscript.exe" '"$INSTDIR\tray\launch-tray.vbs"' \
    "$INSTDIR\assets\printapp.ico" 0 SW_SHOWMINIMIZED

  CreateShortCut "$SMPROGRAMS\${APP_NAME}\Disinstalla.lnk" \
    "$INSTDIR\uninstall.exe" "" "$INSTDIR\assets\printapp.ico"

  ; ── 7. REGISTRO ──
  WriteRegStr HKLM "Software\Cloud3\ZebraLabels" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\Cloud3\ZebraLabels" "Port" "$PortNumber"
  WriteRegStr HKLM "Software\Cloud3\ZebraLabels" "Version" "${APP_VERSION}"

  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZebraLabels" \
    "DisplayName" "${APP_NAME} ${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZebraLabels" \
    "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZebraLabels" \
    "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZebraLabels" \
    "URLInfoAbout" "${APP_URL}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZebraLabels" \
    "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZebraLabels" \
    "DisplayIcon" '"$INSTDIR\assets\printapp.ico"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZebraLabels" \
    "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZebraLabels" \
    "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZebraLabels" \
    "NoRepair" 1

  WriteUninstaller "$INSTDIR\uninstall.exe"
  DetailPrint "Installazione completata!"
SectionEnd

; ============================================================================
; DISINSTALLAZIONE
; ============================================================================
Section "Uninstall"
  ; Trova Node.js
  StrCpy $0 "$PROGRAMFILES64\nodejs\node.exe"
  ${IfNot} ${FileExists} $0
    StrCpy $0 "$PROGRAMFILES\nodejs\node.exe"
    ${IfNot} ${FileExists} $0
      StrCpy $0 "$PROGRAMFILES32\nodejs\node.exe"
      ${IfNot} ${FileExists} $0
        nsExec::ExecToStack 'where node'
        Pop $1
        Pop $0
        ${TrimNewLines} $0 $0
      ${EndIf}
    ${EndIf}
  ${EndIf}

  DetailPrint "Arresto servizio..."
  nsExec::ExecToLog 'net stop ${SERVICE_NAME}'

  DetailPrint "Rimozione servizio..."
  nsExec::ExecToLog '"$0" "$INSTDIR\installer\setup-service.js" uninstall "$INSTDIR"'

  ; Rimuovi autostart tray
  Delete "$SMSTARTUP\Zebra Labels Tray.lnk"

  ; Menu Start
  RMDir /r "$SMPROGRAMS\${APP_NAME}"

  ; File
  RMDir /r "$INSTDIR\server\node_modules"
  RMDir /r "$INSTDIR\node_modules"
  RMDir /r "$INSTDIR\ssl"
  RMDir /r "$INSTDIR\assets"
  RMDir /r "$INSTDIR\tray"
  RMDir /r "$INSTDIR\installer"
  RMDir /r "$INSTDIR\logs"
  RMDir /r "$INSTDIR\client"
  RMDir /r "$INSTDIR\server"

  Delete "$INSTDIR\*.js"
  Delete "$INSTDIR\*.json"
  Delete "$INSTDIR\*.bat"
  Delete "$INSTDIR\*.vbs"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"

  DeleteRegKey HKLM "Software\Cloud3\ZebraLabels"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZebraLabels"

  DetailPrint "Disinstallazione completata."
SectionEnd

; ============================================================================
; HELPER
; ============================================================================
Function LaunchTray
  Exec 'wscript.exe "$INSTDIR\tray\launch-tray.vbs"'
FunctionEnd

Function OpenBrowser
  ReadRegStr $0 HKLM "Software\Cloud3\ZebraLabels" "Port"
  ${If} $0 == ""
    StrCpy $0 "${DEFAULT_PORT}"
  ${EndIf}
  ExecShell "open" "https://localhost:$0"
FunctionEnd
