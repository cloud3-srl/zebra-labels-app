/**
 * Zebra Labels - Installer Interattivo
 * Configura porta, certificati SSL, installa come servizio Windows
 *
 * Uso: node installer.js  (come Amministratore)
 */

const readline = require('readline');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { execSync } = require('child_process');

const PROJECT_ROOT = __dirname;
const CONFIG_PATH = path.join(PROJECT_ROOT, 'server-config.json');
const DEFAULT_CERT_DIR = path.join(PROJECT_ROOT, 'ssl', '_.cloud3.site-certificate-01-04-2026');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question, defaultVal) {
  return new Promise((resolve) => {
    const prompt = defaultVal !== undefined ? `${question} [${defaultVal}]: ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || (defaultVal !== undefined ? String(defaultVal) : ''));
    });
  });
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve({ available: false, reason: `La porta ${port} e' gia' in uso da un altro processo.` });
      } else {
        resolve({ available: false, reason: err.message });
      }
    });
    server.once('listening', () => {
      server.close();
      resolve({ available: true });
    });
    server.listen(port, '0.0.0.0');
  });
}

function banner() {
  console.log('');
  console.log('  ╔═══════════════════════════════════════════════╗');
  console.log('  ║                                               ║');
  console.log('  ║   ZEBRA LABELS - Installer                    ║');
  console.log('  ║   Cloud3 Srl - Sistema Stampa Etichette       ║');
  console.log('  ║                                               ║');
  console.log('  ╚═══════════════════════════════════════════════╝');
  console.log('');
}

function sectionHeader(title) {
  console.log('');
  console.log(`  --- ${title} ---`);
  console.log('');
}

async function installDeps() {
  sectionHeader('VERIFICA DIPENDENZE');

  // Root deps
  const rootModules = path.join(PROJECT_ROOT, 'node_modules');
  if (!fs.existsSync(rootModules) || !fs.existsSync(path.join(rootModules, 'node-windows'))) {
    console.log('  Installazione dipendenze root...');
    execSync('npm install', { cwd: PROJECT_ROOT, stdio: 'inherit' });
  } else {
    console.log('  [OK] Dipendenze root presenti');
  }

  // Server deps
  const serverModules = path.join(PROJECT_ROOT, 'server', 'node_modules');
  if (!fs.existsSync(serverModules) || !fs.existsSync(path.join(serverModules, 'express'))) {
    console.log('  Installazione dipendenze server...');
    execSync('npm install', { cwd: path.join(PROJECT_ROOT, 'server'), stdio: 'inherit' });
  } else {
    console.log('  [OK] Dipendenze server presenti');
  }

  // Tray deps (systray2)
  if (!fs.existsSync(path.join(rootModules, 'systray2'))) {
    console.log('  Installazione systray2 per tray monitor...');
    execSync('npm install systray2', { cwd: PROJECT_ROOT, stdio: 'inherit' });
  } else {
    console.log('  [OK] systray2 presente');
  }
}

async function configurePort() {
  sectionHeader('CONFIGURAZIONE PORTA');

  let port;
  let valid = false;

  while (!valid) {
    const input = await ask('  Porta del server', '3010');
    port = parseInt(input);

    if (isNaN(port) || port < 1 || port > 65535) {
      console.log('  [!] Porta non valida. Inserisci un numero tra 1 e 65535.');
      continue;
    }

    console.log(`  Verifica disponibilita' porta ${port}...`);
    const result = await checkPort(port);

    if (!result.available) {
      console.log(`  [!] ${result.reason}`);
      const retry = await ask('  Vuoi provare un\'altra porta? (s/n)', 's');
      if (retry.toLowerCase() !== 's') {
        console.log(`  [!] Proseguo con porta ${port} (verra' usata quando il processo corrente sara' fermato)`);
        valid = true;
      }
    } else {
      console.log(`  [OK] Porta ${port} disponibile`);
      valid = true;
    }
  }

  return port;
}

async function configureSSL() {
  sectionHeader('CONFIGURAZIONE HTTPS / SSL');

  console.log('  Opzioni disponibili:');
  console.log('');
  console.log('  1) Usa certificato predefinito (printapp.cloud3.site)');
  console.log('  2) Fornisci un certificato personalizzato');
  console.log('  3) Nessun HTTPS (solo HTTP)');
  console.log('');

  const choice = await ask('  Scelta', '1');

  if (choice === '3') {
    return { enabled: false };
  }

  if (choice === '2') {
    console.log('');
    console.log('  Inserisci i percorsi dei file certificato:');
    console.log('');

    const certFile = await ask('  File certificato (.crt)');
    if (!fs.existsSync(certFile)) {
      console.log(`  [!] File non trovato: ${certFile}`);
      console.log('  Fallback al certificato predefinito.');
      return getDefaultCert();
    }

    const keyFile = await ask('  File chiave privata (.key)');
    if (!fs.existsSync(keyFile)) {
      console.log(`  [!] File non trovato: ${keyFile}`);
      console.log('  Fallback al certificato predefinito.');
      return getDefaultCert();
    }

    const caFile = await ask('  File CA bundle (.crt, vuoto per saltare)', '');
    if (caFile && !fs.existsSync(caFile)) {
      console.log(`  [!] File CA non trovato: ${caFile}, verra' ignorato`);
    }

    const passphrase = await ask('  Passphrase chiave (vuoto se non protetta)', '');

    // Copia certs in cartella ssl del progetto
    const customDir = path.join(PROJECT_ROOT, 'ssl', 'custom');
    if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true });

    const certDest = path.join(customDir, path.basename(certFile));
    const keyDest = path.join(customDir, path.basename(keyFile));
    fs.copyFileSync(certFile, certDest);
    fs.copyFileSync(keyFile, keyDest);

    const result = {
      enabled: true,
      certFile: path.relative(PROJECT_ROOT, certDest),
      keyFile: path.relative(PROJECT_ROOT, keyDest),
      passphrase: passphrase || ''
    };

    if (caFile && fs.existsSync(caFile)) {
      const caDest = path.join(customDir, path.basename(caFile));
      fs.copyFileSync(caFile, caDest);
      result.caFile = path.relative(PROJECT_ROOT, caDest);
    }

    console.log('  [OK] Certificato personalizzato configurato');
    return result;
  }

  // Default: printapp.cloud3.site
  return getDefaultCert();
}

function getDefaultCert() {
  const certFile = path.join(DEFAULT_CERT_DIR, 'wildcard.cloud3.site_2026-04-01.crt');
  const keyFile = path.join(DEFAULT_CERT_DIR, 'wildcard.cloud3.site_2026-04-01.key');
  const caFile = path.join(DEFAULT_CERT_DIR, 'ca_bundle.crt');

  if (!fs.existsSync(certFile)) {
    console.log('  [!] Certificato predefinito non trovato in ssl/');
    console.log('  Il server partira\' in modalita\' HTTP.');
    return { enabled: false };
  }

  console.log('  [OK] Certificato printapp.cloud3.site trovato');
  return {
    enabled: true,
    certFile: path.relative(PROJECT_ROOT, certFile).replace(/\\/g, '/'),
    keyFile: path.relative(PROJECT_ROOT, keyFile).replace(/\\/g, '/'),
    caFile: fs.existsSync(caFile) ? path.relative(PROJECT_ROOT, caFile).replace(/\\/g, '/') : undefined,
    passphrase: ''
  };
}

async function writeConfig(port, sslConfig) {
  sectionHeader('SALVATAGGIO CONFIGURAZIONE');

  const config = {
    port,
    https: sslConfig,
    httpRedirect: sslConfig.enabled,
    httpRedirectPort: 80
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`  [OK] Configurazione salvata in server-config.json`);
  console.log(`       Porta: ${port}`);
  console.log(`       HTTPS: ${sslConfig.enabled ? 'Attivo' : 'Disattivo'}`);
  if (sslConfig.enabled) {
    console.log(`       Cert:  ${sslConfig.certFile}`);
  }

  return config;
}

async function installWindowsService(config) {
  sectionHeader('INSTALLAZIONE SERVIZIO WINDOWS');

  const confirm = await ask('  Installare come servizio Windows? (s/n)', 's');
  if (confirm.toLowerCase() !== 's') {
    console.log('  [SKIP] Installazione servizio saltata.');
    console.log('  Puoi avviare manualmente con: npm start');
    return;
  }

  // Crea cartella logs
  const logsDir = path.join(PROJECT_ROOT, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  try {
    const { installService } = require('./service-install');
    await installService({
      port: config.port,
      https: config.https && config.https.enabled
    });
  } catch (e) {
    console.log('  [ERRORE] Installazione servizio fallita: ' + e.message);
    console.log('  Assicurati di eseguire come Amministratore.');
  }
}

async function setupTrayAutostart() {
  sectionHeader('TRAY MONITOR');

  const confirm = await ask('  Configurare tray monitor all\'avvio di Windows? (s/n)', 's');
  if (confirm.toLowerCase() !== 's') {
    console.log('  [SKIP] Tray monitor non configurato.');
    console.log('  Puoi avviarlo manualmente con: node tray/tray-app.js');
    return;
  }

  // Crea shortcut nella cartella Startup
  const startupDir = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
  const trayScript = path.join(PROJECT_ROOT, 'tray', 'tray-app.js');
  const batPath = path.join(startupDir, 'ZebraLabelsTray.bat');

  const batContent = `@echo off\r\ncd /d "${PROJECT_ROOT}"\r\nstart /b "" node "${trayScript}"\r\n`;
  fs.writeFileSync(batPath, batContent, 'utf-8');
  console.log(`  [OK] Tray monitor configurato per avvio automatico`);
  console.log(`       ${batPath}`);
}

function showSummary(config) {
  const protocol = config.https && config.https.enabled ? 'https' : 'http';

  console.log('');
  console.log('  ╔═══════════════════════════════════════════════╗');
  console.log('  ║          INSTALLAZIONE COMPLETATA             ║');
  console.log('  ╚═══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  URL:        ${protocol}://localhost:${config.port}`);
  if (config.https && config.https.enabled) {
    console.log(`  URL:        ${protocol}://printapp.cloud3.site:${config.port}`);
  }
  console.log(`  Protocollo: ${protocol.toUpperCase()}`);
  console.log(`  Porta:      ${config.port}`);
  console.log('');
  console.log('  Gestione servizio:');
  console.log('    net start ZebraLabelsServer');
  console.log('    net stop ZebraLabelsServer');
  console.log('    sc query ZebraLabelsServer');
  console.log('');
  console.log('  Tray monitor:');
  console.log('    node tray/tray-app.js');
  console.log('');
  console.log('  File di configurazione:');
  console.log(`    ${CONFIG_PATH}`);
  console.log('');
}

async function main() {
  banner();

  // Check admin
  try {
    execSync('net session', { stdio: 'ignore' });
  } catch (e) {
    console.log('  [!] ATTENZIONE: Questo installer richiede privilegi di Amministratore');
    console.log('  per installare il servizio Windows.');
    console.log('  Clicca col tasto destro -> "Esegui come amministratore"');
    console.log('');
    const proceed = await ask('  Continuare comunque (senza servizio)? (s/n)', 'n');
    if (proceed.toLowerCase() !== 's') {
      rl.close();
      return;
    }
  }

  await installDeps();
  const port = await configurePort();
  const sslConfig = await configureSSL();
  const config = await writeConfig(port, sslConfig);
  await installWindowsService(config);
  await setupTrayAutostart();
  showSummary(config);

  rl.close();
}

main().catch(err => {
  console.error('Errore installer:', err);
  rl.close();
  process.exit(1);
});
