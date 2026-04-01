/**
 * Zebra Labels - Installazione Servizio Windows
 * Utilizza node-windows per registrare il server come servizio nativo
 *
 * Uso CLI: node service-install.js [install|uninstall|status]
 * Uso programmatico: require('./service-install').installService(options)
 */

const path = require('path');
const fs = require('fs');

function createService(options = {}) {
  const { Service } = require('node-windows');

  const env = [];
  if (options.port) {
    env.push({ name: 'PORT', value: String(options.port) });
  }

  return new Service({
    name: 'ZebraLabelsServer',
    description: 'Zebra Labels WebApp Server - Cloud3 Srl',
    script: path.join(__dirname, 'server', 'index.js'),
    nodeOptions: [],
    workingDirectory: path.join(__dirname, 'server'),
    env: env.length > 0 ? env : undefined,
    wait: 2,
    grow: 0.5,
    maxRestarts: 10,
    maxRetries: 3,
    logpath: path.join(__dirname, 'logs')
  });
}

function installService(options = {}) {
  return new Promise((resolve, reject) => {
    const svc = createService(options);
    const port = options.port || 3010;
    const protocol = options.https ? 'https' : 'http';

    // Crea cartella logs
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    svc.on('install', () => {
      console.log('  [OK] Servizio installato con successo!');
      console.log('  Avvio servizio...');
      svc.start();
    });

    svc.on('alreadyinstalled', () => {
      console.log('  [INFO] Il servizio e\' gia\' installato.');
      console.log('  Riavvio il servizio con la nuova configurazione...');
      svc.stop();
      setTimeout(() => svc.start(), 2000);
      resolve('alreadyinstalled');
    });

    svc.on('start', () => {
      console.log('  [OK] Servizio avviato!');
      console.log('');
      console.log(`  Il server e' ora accessibile su:`);
      console.log(`  ${protocol}://localhost:${port}`);
      console.log(`  ${protocol}://printapp.cloud3.site:${port}`);
      console.log('');
      console.log('  Il servizio si avviera\' automaticamente');
      console.log('  ad ogni riavvio di Windows.');
      console.log('');
      resolve('installed');
    });

    svc.on('error', (err) => {
      console.log('  [ERRORE] ' + err);
      reject(err);
    });

    svc.install();
  });
}

function uninstallService() {
  return new Promise((resolve, reject) => {
    const svc = createService();

    svc.on('uninstall', () => {
      console.log('  [OK] Servizio rimosso con successo!');
      resolve('uninstalled');
    });

    svc.on('invalidinstallation', () => {
      console.log('  [INFO] Il servizio non risulta installato.');
      resolve('notinstalled');
    });

    svc.on('error', (err) => {
      reject(err);
    });

    svc.uninstall();
  });
}

function stopService() {
  return new Promise((resolve) => {
    const svc = createService();
    svc.on('stop', () => resolve('stopped'));
    svc.on('error', () => resolve('error'));
    svc.stop();
  });
}

function startService() {
  return new Promise((resolve) => {
    const svc = createService();
    svc.on('start', () => resolve('started'));
    svc.on('error', () => resolve('error'));
    svc.start();
  });
}

// Esporta per uso programmatico
module.exports = { installService, uninstallService, stopService, startService, createService };

// CLI
if (require.main === module) {
  const action = (process.argv[2] || '').toLowerCase();

  if (action === 'install') {
    console.log('');
    console.log('  =============================================');
    console.log('   INSTALLAZIONE SERVIZIO - Zebra Labels');
    console.log('  =============================================');
    console.log('');

    // Leggi config per la porta
    let port = 3010;
    let httpsEnabled = false;
    try {
      const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'server-config.json'), 'utf-8'));
      port = config.port || 3010;
      httpsEnabled = config.https && config.https.enabled;
    } catch (e) {}

    installService({ port, https: httpsEnabled }).catch(console.error);

  } else if (action === 'uninstall') {
    console.log('');
    console.log('  =============================================');
    console.log('   RIMOZIONE SERVIZIO - Zebra Labels');
    console.log('  =============================================');
    console.log('');
    uninstallService().catch(console.error);

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
}
