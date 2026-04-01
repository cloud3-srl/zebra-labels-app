/**
 * Installa dipendenze npm - chiamato da NSIS installer
 * Uso: node install-deps.js <instdir>
 * Gestisce correttamente percorsi con spazi (es. Program Files)
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const instDir = process.argv[2];
if (!instDir) {
  console.error('Uso: node install-deps.js <cartella_installazione>');
  process.exit(1);
}

function runNpm(args, cwd) {
  // In ambiente NSIS/Program Files l'invocazione di npm.cmd puo fallire con EINVAL.
  // Usiamo quindi sempre Node + npm-cli.js.
  const npmCliCandidates = [
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(path.dirname(process.execPath), '..', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'npm', 'bin', 'npm-cli.js')
  ].filter(Boolean);

  const npmCli = npmCliCandidates.find((p) => fs.existsSync(p));
  if (!npmCli) {
    throw new Error(`npm-cli.js non trovato. Percorsi testati: ${npmCliCandidates.join(', ')}`);
  }

  return execFileSync(process.execPath, [npmCli, ...args], {
    cwd,
    stdio: 'inherit',
    timeout: 300000,
    env: { ...process.env, NODE_ENV: 'production' }
  });
}

function ensureDeps(dir, label, requiredPackages) {
  console.log(`[${label}] Verifica dipendenze in ${dir}...`);
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    console.log(`[${label}] SKIP - package.json non trovato`);
    return { ok: true };
  }

  const missingBefore = requiredPackages.filter((pkg) => !fs.existsSync(path.join(dir, 'node_modules', pkg)));
  if (missingBefore.length === 0) {
    console.log(`[${label}] OK - dipendenze gia presenti`);
    return { ok: true };
  }

  console.log(`[${label}] Mancanti: ${missingBefore.join(', ')}`);

  try {
    const hasLock = fs.existsSync(path.join(dir, 'package-lock.json'));
    if (hasLock) {
      console.log(`[${label}] Eseguo npm ci --omit=dev...`);
      runNpm(['ci', '--omit=dev', '--no-audit', '--no-fund'], dir);
    } else {
      console.log(`[${label}] Eseguo npm install --omit=dev...`);
      runNpm(['install', '--omit=dev', '--no-audit', '--no-fund'], dir);
    }
  } catch (installError) {
    console.log(`[${label}] Tentativo fallback con installazione pacchetti minimi...`);
    try {
      runNpm(['install', '--omit=dev', '--no-audit', '--no-fund', ...requiredPackages], dir);
    } catch (fallbackError) {
      console.error(`[${label}] ERRORE installazione: ${fallbackError.message}`);
      return { ok: false, error: fallbackError };
    }
  }

  const missingAfter = requiredPackages.filter((pkg) => !fs.existsSync(path.join(dir, 'node_modules', pkg)));
  if (missingAfter.length > 0) {
    console.error(`[${label}] ERRORE: dipendenze non installate: ${missingAfter.join(', ')}`);
    return { ok: false, error: new Error(`Missing packages: ${missingAfter.join(', ')}`) };
  }

  console.log(`[${label}] OK`);
  return { ok: true };
}

const rootResult = ensureDeps(instDir, 'ROOT', ['node-windows', 'systray2']);
const serverResult = ensureDeps(path.join(instDir, 'server'), 'SERVER', ['express', 'cors', 'sql.js']);

if (!rootResult.ok || !serverResult.ok) {
  console.error('Installazione dipendenze NON completata.');
  process.exit(1);
}

console.log('Dipendenze installate correttamente.');
process.exit(0);
