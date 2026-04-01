/**
 * Zebra Labels - System Tray Monitor
 * Monitora il servizio ZebraLabelsServer, permette start/stop, apre il browser
 */

const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const http = require('http');
const https = require('https');

const PROJECT_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'server-config.json');
const SERVICE_NAME = 'ZebraLabelsServer';

// ── Configurazione ──────────────────────────────────────────────
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch (e) {
    return { port: 3010, https: { enabled: false } };
  }
}

const config = loadConfig();
const port = config.port || 3010;
const useHttps = config.https && config.https.enabled;
const protocol = useHttps ? 'https' : 'http';
const baseUrl = `${protocol}://localhost:${port}`;

// ── Icona ICO 16x16 in base64 (Z su sfondo blu) ─────────────────
function loadIcon() {
  const icoPath = path.join(PROJECT_ROOT, 'assets', 'printapp.ico');
  try {
    return fs.readFileSync(icoPath).toString('base64');
  } catch (e) {
    return '';
  }
}

// ── Controllo stato servizio ─────────────────────────────────────
function getServiceStatus() {
  return new Promise((resolve) => {
    exec(`sc query ${SERVICE_NAME}`, (err, stdout) => {
      if (err || !stdout) return resolve('not_installed');
      if (stdout.includes('RUNNING')) resolve('running');
      else if (stdout.includes('STOPPED')) resolve('stopped');
      else if (stdout.includes('PENDING')) resolve('pending');
      else resolve('unknown');
    });
  });
}

function healthCheck() {
  return new Promise((resolve) => {
    const mod = useHttps ? https : http;
    const req = mod.get(`${baseUrl}/api/impostazioni`, { rejectUnauthorized: false }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });
}

function serviceControl(cmd) {
  return new Promise((resolve) => {
    exec(`net ${cmd} ${SERVICE_NAME}`, { timeout: 15000 }, (err) => {
      resolve(!err);
    });
  });
}

// ── Menu items con indici chiari ─────────────────────────────────
const MENU = {
  TITLE:   0,
  STATUS:  1,
  // separator = 2
  START:   3,
  STOP:    4,
  RESTART: 5,
  // separator = 6
  OPEN:    7,
  // separator = 8
  EXIT:    9
};

// ── Avvio tray ───────────────────────────────────────────────────
async function main() {
  const SysTray = require('systray2').default;
  const icon = loadIcon();

  const systray = new SysTray({
    menu: {
      icon: icon,
      title: '',
      tooltip: `Zebra Labels (${baseUrl})`,
      items: [
        /* 0 */ { title: 'Zebra Labels Server', tooltip: 'Cloud3 Srl', enabled: false },
        /* 1 */ { title: 'Stato: verifico...', tooltip: 'Stato', enabled: false },
        /* 2 */ SysTray.separator,
        /* 3 */ { title: 'Avvia Servizio', tooltip: 'net start', enabled: true },
        /* 4 */ { title: 'Ferma Servizio', tooltip: 'net stop', enabled: true },
        /* 5 */ { title: 'Riavvia Servizio', tooltip: 'restart', enabled: true },
        /* 6 */ SysTray.separator,
        /* 7 */ { title: `Apri ${baseUrl}`, tooltip: 'Apri nel browser', enabled: true },
        /* 8 */ SysTray.separator,
        /* 9 */ { title: 'Esci', tooltip: 'Chiudi tray', enabled: true }
      ]
    },
    debug: false,
    copyDir: false
  });

  // ── Click handler ──
  systray.onClick(async (action) => {
    switch (action.seq_id) {
      case MENU.START:
        await serviceControl('start');
        setTimeout(refreshStatus, 2000);
        break;
      case MENU.STOP:
        await serviceControl('stop');
        setTimeout(refreshStatus, 2000);
        break;
      case MENU.RESTART:
        await serviceControl('stop');
        setTimeout(async () => {
          await serviceControl('start');
          setTimeout(refreshStatus, 3000);
        }, 2000);
        break;
      case MENU.OPEN:
        exec(`start "" "${baseUrl}"`);
        break;
      case MENU.EXIT:
        systray.kill(false);
        process.exit(0);
    }
  });

  // ── Status updater ──
  async function refreshStatus() {
    const status = await getServiceStatus();
    let label;

    if (status === 'running') {
      const ok = await healthCheck();
      label = ok
        ? `Stato: In esecuzione (:${port})`
        : 'Stato: Avviato (non risponde)';
    } else if (status === 'stopped') {
      label = 'Stato: Fermo';
    } else if (status === 'pending') {
      label = 'Stato: In attesa...';
    } else if (status === 'not_installed') {
      label = 'Stato: Servizio non installato';
    } else {
      label = 'Stato: Sconosciuto';
    }

    systray.sendAction({
      type: 'update-item',
      item: { title: label, tooltip: label, enabled: false },
      seq_id: MENU.STATUS
    });
  }

  // Poll ogni 10 secondi
  refreshStatus();
  setInterval(refreshStatus, 10000);

  console.log(`Zebra Labels Tray Monitor avviato - ${baseUrl}`);
}

main().catch((err) => {
  console.error('Errore avvio tray:', err.message);
  process.exit(1);
});
