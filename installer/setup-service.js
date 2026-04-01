/**
 * Installa/disinstalla servizio Windows ZebraLabelsServer
 * Uso: node setup-service.js <install|uninstall> <instdir> [port]
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const action = process.argv[2] || 'install';
const instDir = process.argv[3] || path.join(__dirname, '..');
const port = parseInt(process.argv[4]) || 3010;

function ensureDependenciesInstalled() {
  if (action !== 'install') return;

  const required = [
    path.join(instDir, 'node_modules', 'node-windows'),
    path.join(instDir, 'server', 'node_modules', 'express'),
    path.join(instDir, 'server', 'node_modules', 'cors'),
    path.join(instDir, 'server', 'node_modules', 'sql.js')
  ];

  const missing = required.filter((p) => !fs.existsSync(p));
  if (missing.length === 0) return;

  console.log('Dipendenze mancanti, avvio installazione automatica...');
  const installScript = path.join(instDir, 'installer', 'install-deps.js');
  execFileSync(process.execPath, [installScript, instDir], { stdio: 'inherit' });
}

try {
  ensureDependenciesInstalled();
} catch (e) {
  console.error('ERRORE installazione dipendenze: ' + e.message);
  process.exit(1);
}

// Risolvi node-windows dal node_modules dell'installazione
const nmPath = path.join(instDir, 'node_modules');
if (fs.existsSync(nmPath)) {
  module.paths.unshift(nmPath);
}

let Service;
try {
  Service = require('node-windows').Service;
} catch (e) {
  console.error('ERRORE: node-windows non trovato in ' + nmPath);
  console.error('Esegui: npm install node-windows');
  process.exit(1);
}

const svc = new Service({
  name: 'ZebraLabelsServer',
  description: 'Zebra Labels - Cloud3 Srl (porta ' + port + ')',
  script: path.join(instDir, 'server', 'index.js'),
  nodeOptions: [],
  workingDirectory: path.join(instDir, 'server'),
  env: [{ name: 'PORT', value: String(port) }],
  wait: 2,
  grow: 0.5,
  maxRestarts: 10,
  maxRetries: 3,
  logpath: path.join(instDir, 'logs')
});

// Crea cartella logs
const logsDir = path.join(instDir, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

if (action === 'install') {
  svc.on('install', () => {
    console.log('SERVICE_INSTALLED');
    svc.start();
  });
  svc.on('alreadyinstalled', () => {
    console.log('SERVICE_ALREADY_EXISTS');
    // Ferma e riavvia
    try { svc.stop(); } catch (e) {}
    setTimeout(() => {
      try { svc.start(); } catch (e) {}
      console.log('SERVICE_RESTARTED');
      process.exit(0);
    }, 3000);
  });
  svc.on('start', () => {
    console.log('SERVICE_STARTED');
    process.exit(0);
  });
  svc.on('error', (err) => {
    console.error('SERVICE_ERROR: ' + err);
    process.exit(1);
  });
  svc.install();

} else if (action === 'uninstall') {
  // Ferma prima il servizio
  try {
    require('child_process').execSync('net stop ZebraLabelsServer', { stdio: 'ignore' });
  } catch (e) {}

  svc.on('uninstall', () => {
    console.log('SERVICE_UNINSTALLED');
    process.exit(0);
  });
  svc.on('invalidinstallation', () => {
    console.log('SERVICE_NOT_FOUND');
    process.exit(0);
  });
  svc.on('error', (err) => {
    console.error('SERVICE_ERROR: ' + err);
    process.exit(1);
  });
  svc.uninstall();
}

// Timeout di sicurezza 30s
setTimeout(() => {
  console.log('TIMEOUT');
  process.exit(0);
}, 30000);
