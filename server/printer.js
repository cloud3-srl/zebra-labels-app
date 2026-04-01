const net = require('net');

/**
 * Invia codice ZPL alla stampante Zebra via TCP socket
 */
function inviaZPL(zplCode, ip = '10.0.50.92', porta = 9100, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.destroy();
        reject({ success: false, error: 'Timeout connessione stampante' });
      }
    }, timeout);

    client.connect(porta, ip, () => {
      client.write(zplCode, () => {
        clearTimeout(timer);
        client.end();
        if (!resolved) {
          resolved = true;
          resolve({ success: true, message: `ZPL inviato a ${ip}:${porta}` });
        }
      });
    });

    client.on('error', (err) => {
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        reject({ success: false, error: `Errore stampante: ${err.message}` });
      }
    });

    client.on('close', () => {
      clearTimeout(timer);
    });
  });
}

/**
 * Verifica connessione alla stampante
 */
function verificaStampante(ip = '10.0.50.92', porta = 9100, timeout = 5000) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    const timer = setTimeout(() => {
      client.destroy();
      resolve({ online: false, error: 'Timeout' });
    }, timeout);

    client.connect(porta, ip, () => {
      clearTimeout(timer);
      client.end();
      resolve({ online: true, ip, porta });
    });

    client.on('error', (err) => {
      clearTimeout(timer);
      resolve({ online: false, error: err.message });
    });
  });
}

module.exports = { inviaZPL, verificaStampante };
