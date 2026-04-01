/**
 * Verifica disponibilita' porta - chiamato da NSIS installer
 * Uso: node check-port.js <porta>
 * Stdout: OK | BUSY
 * Exit code: 0 = disponibile, 1 = occupata, 2 = errore
 */
const net = require('net');
const port = parseInt(process.argv[2]);

if (!port || port < 1 || port > 65535) {
  process.stdout.write('ERROR');
  process.exit(2);
}

const server = net.createServer();
server.once('error', () => {
  process.stdout.write('BUSY');
  process.exit(1);
});
server.once('listening', () => {
  server.close(() => {
    process.stdout.write('OK');
    process.exit(0);
  });
});
server.listen(port, '0.0.0.0');

// Timeout sicurezza
setTimeout(() => {
  process.stdout.write('ERROR');
  process.exit(2);
}, 5000);
