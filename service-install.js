/**
 * Zebra Labels - Installazione Servizio Windows
 * Utilizza node-windows per registrare il server come servizio nativo
 *
 * Uso: node service-install.js [install|uninstall|status]
 */

const path = require('path');
const { Service } = require('node-windows');

const svc = new Service({
  name: 'ZebraLabelsServer',
  description: 'Zebra Labels WebApp Server - Cloud3 Srl',
  script: path.join(__dirname, 'server', 'index.js'),
  nodeOptions: [],
  workingDirectory: path.join(__dirname, 'server'),
  // Riavvio automatico in caso di crash
  wait: 2,            // 2 secondi prima del riavvio
  grow: 0.5,          // incremento esponenziale ritardo
  maxRestarts: 10,     // max 10 riavvii consecutivi
  maxRetries: 3,       // max 3 tentativi per riavvio
  // Logging
  logpath: path.join(__dirname, 'logs')
});

const action = (process.argv[2] || '').toLowerCase();

if (action === 'install') {
  console.log('');
  console.log('  =============================================');
  console.log('   INSTALLAZIONE SERVIZIO - Zebra Labels');
  console.log('  =============================================');
  console.log('');

  // Crea cartella logs se non esiste
  const fs = require('fs');
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  svc.on('install', () => {
    console.log('  [OK] Servizio installato con successo!');
    console.log('  Avvio servizio...');
    svc.start();
  });

  svc.on('alreadyinstalled', () => {
    console.log('  [INFO] Il servizio e\' gia\' installato.');
    console.log('  Usa "uninstall" per rimuoverlo prima di reinstallare.');
  });

  svc.on('start', () => {
    console.log('  [OK] Servizio avviato!');
    console.log('');
    console.log('  Il server e\' ora accessibile su:');
    console.log('  http://localhost:3000');
    console.log('');
    console.log('  Il servizio si avviera\' automaticamente');
    console.log('  ad ogni riavvio di Windows.');
    console.log('');
    console.log('  Per gestire il servizio:');
    console.log('  - Apri "services.msc" e cerca "ZebraLabelsServer"');
    console.log('  - Oppure usa: net stop ZebraLabelsServer');
    console.log('                net start ZebraLabelsServer');
    console.log('');
  });

  svc.on('error', (err) => {
    console.log('  [ERRORE] ' + err);
  });

  svc.install();

} else if (action === 'uninstall') {
  console.log('');
  console.log('  =============================================');
  console.log('   RIMOZIONE SERVIZIO - Zebra Labels');
  console.log('  =============================================');
  console.log('');

  svc.on('uninstall', () => {
    console.log('  [OK] Servizio rimosso con successo!');
    console.log('  Il server non si avviera\' piu\' automaticamente.');
    console.log('');
  });

  svc.on('invalidinstallation', () => {
    console.log('  [INFO] Il servizio non risulta installato.');
  });

  svc.uninstall();

} else if (action === 'status') {
  console.log('');
  console.log('  Servizio: ZebraLabelsServer');
  console.log('  Script:   ' + path.join(__dirname, 'server', 'index.js'));
  console.log('  Logs:     ' + path.join(__dirname, 'logs'));
  console.log('');
  console.log('  Per verificare lo stato apri services.msc');
  console.log('  oppure esegui: sc query ZebraLabelsServer');
  console.log('');

} else {
  console.log('');
  console.log('  Zebra Labels - Gestione Servizio Windows');
  console.log('  =========================================');
  console.log('');
  console.log('  Uso: node service-install.js [comando]');
  console.log('');
  console.log('  Comandi:');
  console.log('    install    - Installa e avvia il servizio');
  console.log('    uninstall  - Rimuove il servizio');
  console.log('    status     - Mostra informazioni servizio');
  console.log('');
  console.log('  NOTA: Esegui come Amministratore!');
  console.log('');
}
