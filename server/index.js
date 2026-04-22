const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb, query, run, get, importClienti } = require('./db');
const { generaZPLMultiplo } = require('./zpl');
const { inviaZPL, verificaStampante } = require('./printer');
const { bufferToZPL } = require('./logo-converter');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// ====== API CLIENTI ======

app.get('/api/clienti', (req, res) => {
  const { q, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  if (q) {
    const clienti = query('SELECT * FROM clienti WHERE ragione_sociale LIKE ? ORDER BY ragione_sociale LIMIT ? OFFSET ?', [`%${q}%`, parseInt(limit), offset]);
    const total = get('SELECT COUNT(*) as c FROM clienti WHERE ragione_sociale LIKE ?', [`%${q}%`]);
    return res.json({ clienti, total: total.c });
  }

  const clienti = query('SELECT * FROM clienti ORDER BY ragione_sociale LIMIT ? OFFSET ?', [parseInt(limit), offset]);
  const total = get('SELECT COUNT(*) as c FROM clienti');
  res.json({ clienti, total: total.c });
});

app.get('/api/clienti/all', (req, res) => {
  const clienti = query('SELECT * FROM clienti ORDER BY ragione_sociale');
  res.json(clienti);
});

app.get('/api/clienti/:id', (req, res) => {
  const cliente = get('SELECT * FROM clienti WHERE id = ?', [parseInt(req.params.id)]);
  if (!cliente) return res.status(404).json({ error: 'Cliente non trovato' });
  res.json(cliente);
});

app.post('/api/clienti', (req, res) => {
  const { ragione_sociale, telefono, email, indirizzo, citta } = req.body;
  if (!ragione_sociale) return res.status(400).json({ error: 'Ragione sociale obbligatoria' });

  const result = run(
    'INSERT INTO clienti (ragione_sociale, telefono, email, indirizzo, citta) VALUES (?, ?, ?, ?, ?)',
    [ragione_sociale, telefono || '', email || '', indirizzo || '', citta || '']
  );
  const cliente = get('SELECT * FROM clienti WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(cliente);
});

app.put('/api/clienti/:id', (req, res) => {
  const { ragione_sociale, telefono, email, indirizzo, citta } = req.body;
  run(
    'UPDATE clienti SET ragione_sociale=?, telefono=?, email=?, indirizzo=?, citta=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [ragione_sociale, telefono || '', email || '', indirizzo || '', citta || '', parseInt(req.params.id)]
  );
  const cliente = get('SELECT * FROM clienti WHERE id = ?', [parseInt(req.params.id)]);
  res.json(cliente);
});

app.delete('/api/clienti/:id', (req, res) => {
  run('DELETE FROM clienti WHERE id = ?', [parseInt(req.params.id)]);
  res.json({ success: true });
});

// ====== API MODELLI ======

app.get('/api/modelli', (req, res) => {
  const modelli = query('SELECT * FROM modelli_etichetta');
  res.json(modelli);
});

app.get('/api/modelli/:id', (req, res) => {
  const modello = get('SELECT * FROM modelli_etichetta WHERE id = ?', [parseInt(req.params.id)]);
  if (!modello) return res.status(404).json({ error: 'Modello non trovato' });
  res.json(modello);
});

app.post('/api/modelli', (req, res) => {
  const { nome, descrizione, titolo_zpl, motivo_zpl, campi_visibili, font_titolo, font_cliente,
    font_dispositivo, font_dettagli, font_motivo, font_data, show_barcode, layout_json } = req.body;
  if (!nome || !titolo_zpl) return res.status(400).json({ error: 'Nome e titolo obbligatori' });

  try {
    const result = run(`
      INSERT INTO modelli_etichetta (nome, descrizione, titolo_zpl, motivo_zpl, is_custom,
        campi_visibili, font_titolo, font_cliente, font_dispositivo, font_dettagli, font_motivo, font_data, show_barcode, layout_json)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [nome, descrizione || '', titolo_zpl, motivo_zpl || '',
        JSON.stringify(campi_visibili || []), font_titolo || 24, font_cliente || 20,
        font_dispositivo || 18, font_dettagli || 16, font_motivo || 18, font_data || 14,
        show_barcode !== false ? 1 : 0,
        typeof layout_json === 'string' ? layout_json : JSON.stringify(layout_json || null)]);
    const modello = get('SELECT * FROM modelli_etichetta WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(modello);
  } catch (e) {
    res.status(400).json({ error: 'Nome modello già esistente' });
  }
});

app.put('/api/modelli/:id', (req, res) => {
  const { nome, descrizione, titolo_zpl, motivo_zpl, campi_visibili, font_titolo, font_cliente,
    font_dispositivo, font_dettagli, font_motivo, font_data, show_barcode, layout_json } = req.body;

  run(`
    UPDATE modelli_etichetta SET nome=?, descrizione=?, titolo_zpl=?, motivo_zpl=?,
      campi_visibili=?, font_titolo=?, font_cliente=?, font_dispositivo=?, font_dettagli=?,
      font_motivo=?, font_data=?, show_barcode=?, layout_json=?
    WHERE id=?
  `, [nome, descrizione || '', titolo_zpl, motivo_zpl || '',
      JSON.stringify(campi_visibili || []), font_titolo || 24, font_cliente || 20,
      font_dispositivo || 18, font_dettagli || 16, font_motivo || 18, font_data || 14,
      show_barcode !== false ? 1 : 0,
      typeof layout_json === 'string' ? layout_json : JSON.stringify(layout_json || null),
      parseInt(req.params.id)]);

  const modello = get('SELECT * FROM modelli_etichetta WHERE id = ?', [parseInt(req.params.id)]);
  res.json(modello);
});

app.delete('/api/modelli/:id', (req, res) => {
  const modello = get('SELECT * FROM modelli_etichetta WHERE id = ?', [parseInt(req.params.id)]);
  if (!modello) return res.status(404).json({ error: 'Modello non trovato' });
  if (!modello.is_custom) return res.status(400).json({ error: 'Non puoi eliminare un modello predefinito' });
  run('DELETE FROM modelli_etichetta WHERE id = ?', [parseInt(req.params.id)]);
  res.json({ success: true });
});

// Upload logo e converti in ZPL
app.post('/api/modelli/:id/logo', (req, res) => {
  const { image_base64, max_width = 80, max_height = 60 } = req.body;
  if (!image_base64) return res.status(400).json({ error: 'Immagine richiesta (base64)' });

  try {
    const buffer = Buffer.from(image_base64, 'base64');
    const result = bufferToZPL(buffer, max_width, max_height);

    if (result.success) {
      run('UPDATE modelli_etichetta SET logo_zpl=?, logo_width=?, logo_height=? WHERE id=?',
        [result.zplCommand, result.width, result.height, parseInt(req.params.id)]);
      res.json({ success: true, width: result.width, height: result.height });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (e) {
    res.status(500).json({ error: 'Errore conversione logo: ' + e.message });
  }
});

app.delete('/api/modelli/:id/logo', (req, res) => {
  run('UPDATE modelli_etichetta SET logo_zpl=?, logo_width=0, logo_height=0 WHERE id=?',
    ['', parseInt(req.params.id)]);
  res.json({ success: true });
});

// Clone modello
app.post('/api/modelli/:id/clone', (req, res) => {
  const orig = get('SELECT * FROM modelli_etichetta WHERE id = ?', [parseInt(req.params.id)]);
  if (!orig) return res.status(404).json({ error: 'Modello non trovato' });

  // Trova un nome unico
  let newName = orig.nome + ' (copia)';
  let n = 2;
  while (get('SELECT id FROM modelli_etichetta WHERE nome = ?', [newName])) {
    newName = orig.nome + ` (copia ${n++})`;
  }

  const ins = run(`INSERT INTO modelli_etichetta
    (nome, descrizione, titolo_zpl, motivo_zpl, is_custom, logo_zpl, logo_width, logo_height,
     campi_visibili, font_titolo, font_cliente, font_dispositivo, font_dettagli, font_motivo, font_data, show_barcode)
    VALUES (?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?)`,
    [newName, orig.descrizione, orig.titolo_zpl, orig.motivo_zpl,
     orig.logo_zpl || '', orig.logo_width || 0, orig.logo_height || 0,
     orig.campi_visibili, orig.font_titolo, orig.font_cliente, orig.font_dispositivo,
     orig.font_dettagli, orig.font_motivo, orig.font_data, orig.show_barcode]);

  const cloned = get('SELECT * FROM modelli_etichetta WHERE nome = ?', [newName]);
  res.json(cloned);
});

// ====== API TIPI DISPOSITIVO ======

app.get('/api/tipi-dispositivo', (req, res) => {
  const tipi = query('SELECT * FROM tipi_dispositivo');
  res.json(tipi);
});

// ====== API STAMPA ======

app.post('/api/stampa/genera-zpl', (req, res) => {
  const { cliente_id, modello, modello_id, tipo_dispositivo, modalita, nome_dispositivo, prefisso, quantita, copie,
    modo_cliente, cliente_manuale } = req.body;

  let cliente;
  if (modo_cliente === 'nessuno') {
    // Etichetta generica senza cliente
    cliente = { ragione_sociale: '', telefono: '', email: '', indirizzo: '', citta: '' };
  } else if (modo_cliente === 'manuale') {
    // Dati cliente inseriti a mano
    cliente = cliente_manuale || { ragione_sociale: '', telefono: '', email: '', indirizzo: '', citta: '' };
  } else {
    // Modalità standard: da rubrica
    cliente = get('SELECT * FROM clienti WHERE id = ?', [parseInt(cliente_id)]);
    if (!cliente) return res.status(404).json({ error: 'Cliente non trovato' });
  }

  // Carica sempre il modello dal DB (per font, campi, logo, barcode)
  let modello_custom = null;
  if (modello_id) {
    modello_custom = get('SELECT * FROM modelli_etichetta WHERE id = ?', [parseInt(modello_id)]);
  } else if (modello) {
    modello_custom = get('SELECT * FROM modelli_etichetta WHERE nome = ?', [modello]);
  }

  const result = generaZPLMultiplo({
    cliente, modello, tipo_dispositivo, modalita,
    nome_dispositivo, prefisso,
    quantita: quantita || 1, copie: copie || 1,
    modello_custom
  });
  res.json(result);
});

app.post('/api/stampa/invia', async (req, res) => {
  const {
    cliente_id, modello, modello_id, tipo_dispositivo, modalita,
    nome_dispositivo, prefisso, quantita, copie,
    stampante_ip = '10.0.50.92', stampante_porta = 9100,
    modo_cliente, cliente_manuale, salva_in_rubrica
  } = req.body;

  let cliente;
  let clienteIdLog = 0;
  if (modo_cliente === 'nessuno') {
    cliente = { ragione_sociale: '(Lab)', telefono: '', email: '', indirizzo: '', citta: '' };
    clienteIdLog = 0;
  } else if (modo_cliente === 'manuale') {
    cliente = cliente_manuale || { ragione_sociale: '', telefono: '', email: '', indirizzo: '', citta: '' };
    // Salva in rubrica se richiesto
    if (salva_in_rubrica && cliente.ragione_sociale) {
      const existing = get('SELECT id FROM clienti WHERE ragione_sociale = ?', [cliente.ragione_sociale]);
      if (!existing) {
        const ins = run('INSERT INTO clienti (ragione_sociale, telefono, email, indirizzo, citta) VALUES (?,?,?,?,?)',
          [cliente.ragione_sociale, cliente.telefono || '', cliente.email || '', cliente.indirizzo || '', cliente.citta || '']);
        clienteIdLog = ins.lastInsertRowid;
      } else {
        clienteIdLog = existing.id;
      }
    }
  } else {
    cliente = get('SELECT * FROM clienti WHERE id = ?', [parseInt(cliente_id)]);
    if (!cliente) return res.status(404).json({ error: 'Cliente non trovato' });
    clienteIdLog = cliente.id;
  }

  let modello_custom = null;
  if (modello_id) {
    modello_custom = get('SELECT * FROM modelli_etichetta WHERE id = ?', [parseInt(modello_id)]);
  } else if (modello) {
    modello_custom = get('SELECT * FROM modelli_etichetta WHERE nome = ?', [modello]);
  }

  const result = generaZPLMultiplo({
    cliente, modello, tipo_dispositivo, modalita,
    nome_dispositivo, prefisso,
    quantita: quantita || 1, copie: copie || 1,
    modello_custom
  });

  try {
    await inviaZPL(result.zpl, stampante_ip, parseInt(stampante_porta));

    const log = run(`
      INSERT INTO stampe_log (cliente_id, cliente_nome, modello, tipo_dispositivo, nome_dispositivo,
        modalita, prefisso, quantita, copie, nomi_generati, zpl_generato, stampante_ip, stampante_porta, stato)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      clienteIdLog || 0, cliente.ragione_sociale || '(Lab)', modello, tipo_dispositivo,
      result.nomi_generati.join(', '), modalita || 'Manuale',
      prefisso || '', quantita || 1, copie || 1,
      JSON.stringify(result.nomi_generati), result.zpl,
      stampante_ip, parseInt(stampante_porta), 'inviato'
    ]);

    res.json({
      success: true, stampa_id: log.lastInsertRowid,
      ...result, stato: 'inviato',
      stampante: `${stampante_ip}:${stampante_porta}`
    });
  } catch (err) {
    run(`
      INSERT INTO stampe_log (cliente_id, cliente_nome, modello, tipo_dispositivo, nome_dispositivo,
        modalita, prefisso, quantita, copie, nomi_generati, zpl_generato, stampante_ip, stampante_porta, stato)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      clienteIdLog || 0, cliente.ragione_sociale || '(Lab)', modello, tipo_dispositivo,
      result.nomi_generati.join(', '), modalita || 'Manuale',
      prefisso || '', quantita || 1, copie || 1,
      JSON.stringify(result.nomi_generati), result.zpl,
      stampante_ip, parseInt(stampante_porta), 'errore'
    ]);
    res.status(500).json({ success: false, error: err.error || err.message || 'Errore invio stampante', ...result });
  }
});

app.get('/api/stampa/log', (req, res) => {
  const { page = 1, limit = 15, cliente_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let sql = 'SELECT * FROM stampe_log';
  let countSql = 'SELECT COUNT(*) as c FROM stampe_log';
  const params = [];

  if (cliente_id) {
    sql += ' WHERE cliente_id = ?';
    countSql += ' WHERE cliente_id = ?';
    params.push(parseInt(cliente_id));
  }

  const total = get(countSql, [...params]);
  sql += ' ORDER BY data_stampa DESC LIMIT ? OFFSET ?';
  const logs = query(sql, [...params, parseInt(limit), offset]);

  res.json({ logs, total: total.c });
});

app.get('/api/stampa/log/:id', (req, res) => {
  const log = get('SELECT * FROM stampe_log WHERE id = ?', [parseInt(req.params.id)]);
  if (!log) return res.status(404).json({ error: 'Log non trovato' });
  res.json(log);
});

app.post('/api/stampa/ristampa/:id', async (req, res) => {
  const log = get('SELECT * FROM stampe_log WHERE id = ?', [parseInt(req.params.id)]);
  if (!log) return res.status(404).json({ error: 'Log non trovato' });

  try {
    await inviaZPL(log.zpl_generato, log.stampante_ip, log.stampante_porta);
    run(`
      INSERT INTO stampe_log (cliente_id, cliente_nome, modello, tipo_dispositivo, nome_dispositivo,
        modalita, prefisso, quantita, copie, nomi_generati, zpl_generato, stampante_ip, stampante_porta, stato)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      log.cliente_id, log.cliente_nome, log.modello, log.tipo_dispositivo,
      log.nome_dispositivo, log.modalita, log.prefisso, log.quantita, log.copie,
      log.nomi_generati, log.zpl_generato, log.stampante_ip, log.stampante_porta, 'ristampato'
    ]);
    res.json({ success: true, message: 'Ristampa inviata con successo' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.error || 'Errore ristampa' });
  }
});

// ====== API IMPOSTAZIONI ======
const SETTINGS_PATH = path.join(__dirname, 'settings.json');
const DEFAULT_SETTINGS = {
  printer_ip: '10.0.50.92',
  printer_port: 9100,
  label_width_mm: 55,
  label_height_mm: 35,
  dpi: 203
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    }
  } catch(e) {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

app.get('/api/impostazioni', (req, res) => {
  res.json(loadSettings());
});

app.put('/api/impostazioni', (req, res) => {
  const { printer_ip, printer_port, label_width_mm, label_height_mm, dpi } = req.body;
  const settings = {
    printer_ip: printer_ip || '10.0.50.92',
    printer_port: parseInt(printer_port) || 9100,
    label_width_mm: parseFloat(label_width_mm) || 55,
    label_height_mm: parseFloat(label_height_mm) || 35,
    dpi: parseInt(dpi) || 203
  };
  saveSettings(settings);
  res.json({ success: true, ...settings });
});

app.get('/api/stampante/stato', async (req, res) => {
  const { ip = '10.0.50.92', porta = 9100 } = req.query;
  const stato = await verificaStampante(ip, parseInt(porta));
  res.json(stato);
});

// Fallback to frontend
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'client', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend non ancora compilato' });
  }
});

// Start server
async function start() {
  await initDb();

  // Auto-import clienti if DB is empty
  const total = get('SELECT COUNT(*) as c FROM clienti');
  if (total.c === 0) {
    const jsonPath = path.join(__dirname, 'clienti.json');
    if (fs.existsSync(jsonPath)) {
      const clienti = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const imported = importClienti(clienti);
      console.log(`Importati ${imported} clienti dal file JSON`);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🏷️  Zebra Labels Server avviato su http://localhost:${PORT}`);
    console.log(`📡 Stampante configurata: 10.0.50.92:9100`);
    console.log(`📊 Database: ${path.join(__dirname, 'zebra-labels.db')}\n`);
  });
}

start().catch(err => {
  console.error('Errore avvio server:', err);
  process.exit(1);
});
