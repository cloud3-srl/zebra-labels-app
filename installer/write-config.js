/**
 * Scrive server-config.json con percorsi assoluti
 * Uso: node write-config.js <instdir> <port> <certMode:default|custom|none> [certFile] [keyFile] [caFile]
 */
const fs = require('fs');
const path = require('path');

const instDir = process.argv[2];
const port = parseInt(process.argv[3]) || 3010;
const certMode = process.argv[4] || 'none';

const config = {
  port,
  https: { enabled: false },
  httpRedirect: false,
  httpRedirectPort: 80
};

if (certMode === 'default') {
  const certDir = path.join(instDir, 'ssl', '_.cloud3.site-certificate-01-04-2026');
  const certFile = path.join(certDir, 'wildcard.cloud3.site_2026-04-01.crt');
  const keyFile = path.join(certDir, 'wildcard.cloud3.site_2026-04-01.key');
  const caFile = path.join(certDir, 'ca_bundle.crt');

  if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    config.https = {
      enabled: true,
      certFile: certFile.replace(/\\/g, '/'),
      keyFile: keyFile.replace(/\\/g, '/'),
      caFile: fs.existsSync(caFile) ? caFile.replace(/\\/g, '/') : '',
      passphrase: ''
    };
    config.httpRedirect = true;
  }
} else if (certMode === 'custom') {
  const certFile = process.argv[5] || '';
  const keyFile = process.argv[6] || '';
  const caFile = process.argv[7] || '';

  // Copia certificati nella cartella ssl/custom dell'installazione
  const customDir = path.join(instDir, 'ssl', 'custom');
  if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true });

  let destCert = '', destKey = '', destCa = '';

  if (certFile && fs.existsSync(certFile)) {
    destCert = path.join(customDir, path.basename(certFile));
    fs.copyFileSync(certFile, destCert);
  }
  if (keyFile && fs.existsSync(keyFile)) {
    destKey = path.join(customDir, path.basename(keyFile));
    fs.copyFileSync(keyFile, destKey);
  }
  if (caFile && fs.existsSync(caFile)) {
    destCa = path.join(customDir, path.basename(caFile));
    fs.copyFileSync(caFile, destCa);
  }

  if (destCert && destKey) {
    config.https = {
      enabled: true,
      certFile: destCert.replace(/\\/g, '/'),
      keyFile: destKey.replace(/\\/g, '/'),
      caFile: destCa ? destCa.replace(/\\/g, '/') : '',
      passphrase: ''
    };
    config.httpRedirect = true;
  }
}

const configPath = path.join(instDir, 'server-config.json');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
process.exit(0);
