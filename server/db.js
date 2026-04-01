const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'zebra-labels.db');
let db = null;
let SQL = null;

async function initDb() {
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS clienti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ragione_sociale TEXT NOT NULL,
      telefono TEXT DEFAULT '',
      email TEXT DEFAULT '',
      indirizzo TEXT DEFAULT '',
      citta TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS modelli_etichetta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      descrizione TEXT,
      titolo_zpl TEXT NOT NULL,
      motivo_zpl TEXT NOT NULL,
      is_custom INTEGER DEFAULT 0,
      logo_zpl TEXT DEFAULT '',
      logo_width INTEGER DEFAULT 0,
      logo_height INTEGER DEFAULT 0,
      campi_visibili TEXT DEFAULT '["cliente","dispositivo","telefono_email","indirizzo","motivo","data","barcode"]',
      font_titolo INTEGER DEFAULT 24,
      font_cliente INTEGER DEFAULT 20,
      font_dispositivo INTEGER DEFAULT 18,
      font_dettagli INTEGER DEFAULT 16,
      font_motivo INTEGER DEFAULT 18,
      font_data INTEGER DEFAULT 14,
      show_barcode INTEGER DEFAULT 1,
      layout_json TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrazione soft: aggiunge layout_json se il DB esiste gia senza colonna
  const cols = query("PRAGMA table_info(modelli_etichetta)");
  const hasLayoutJson = cols.some(c => c.name === 'layout_json');
  if (!hasLayoutJson) {
    db.run("ALTER TABLE modelli_etichetta ADD COLUMN layout_json TEXT DEFAULT ''");
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS tipi_dispositivo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS stampe_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      cliente_nome TEXT,
      modello TEXT NOT NULL,
      tipo_dispositivo TEXT,
      nome_dispositivo TEXT,
      modalita TEXT DEFAULT 'Manuale',
      prefisso TEXT,
      quantita INTEGER DEFAULT 1,
      copie INTEGER DEFAULT 1,
      nomi_generati TEXT,
      zpl_generato TEXT,
      stampante_ip TEXT DEFAULT '10.0.50.92',
      stampante_porta INTEGER DEFAULT 9100,
      stato TEXT DEFAULT 'inviato',
      data_stampa DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert defaults if needed
  const countModelli = db.exec('SELECT COUNT(*) as c FROM modelli_etichetta');
  if (countModelli[0].values[0][0] === 0) {
    db.run("INSERT INTO modelli_etichetta (nome, descrizione, titolo_zpl, motivo_zpl) VALUES ('Ritiro Assistenza', 'Etichetta per dispositivi ritirati in assistenza', 'RITIRO ASSISTENZA', '>> RITIRO ASSISTENZA <<')");
    db.run("INSERT INTO modelli_etichetta (nome, descrizione, titolo_zpl, motivo_zpl) VALUES ('Preparazione Dispositivo', 'Etichetta per nuovi dispositivi in preparazione', 'NUOVO DISPOSITIVO', '>> PREPARAZIONE <<')");
    db.run("INSERT INTO modelli_etichetta (nome, descrizione, titolo_zpl, motivo_zpl) VALUES ('Generico', 'Etichetta generica multiuso', 'ETICHETTA GENERICA', 'Note: ____________________')");
    db.run(`INSERT INTO modelli_etichetta (nome, descrizione, titolo_zpl, motivo_zpl, campi_visibili, font_titolo, font_cliente, font_dispositivo, font_dettagli, font_motivo, font_data, show_barcode) VALUES ('Default', 'Modello standard completo stile NiceLabel', 'ASSISTENZA TECNICA', '>> IN LAVORAZIONE <<', '["cliente","dispositivo","telefono_email","indirizzo","motivo","referente","data"]', 22, 22, 18, 16, 16, 14, 0)`);
    db.run(`INSERT INTO modelli_etichetta (nome, descrizione, titolo_zpl, motivo_zpl, campi_visibili, font_titolo, font_cliente, font_dispositivo, font_dettagli, font_motivo, font_data, show_barcode) VALUES ('Cloud3 - Note', 'Etichetta intestata con area note libere', 'CLOUD3', 'T.+39 0109110653 | help@cloud3.srl | www.cloud3.srl', '["intestazione","note_grandi","footer_contatti"]', 22, 20, 18, 16, 16, 14, 0)`);
    db.run(`INSERT INTO modelli_etichetta (nome, descrizione, titolo_zpl, motivo_zpl, campi_visibili, font_titolo, font_cliente, font_dispositivo, font_dettagli, font_motivo, font_data, show_barcode) VALUES ('Cloud3 - Cliente', 'Etichetta intestata con cliente e note', 'CLOUD3', 'T.+39 0109110653 | help@cloud3.srl | www.cloud3.srl', '["intestazione","cliente","note_piccole","footer_contatti"]', 22, 20, 18, 16, 16, 14, 0)`);
  }

  const countTipi = db.exec('SELECT COUNT(*) as c FROM tipi_dispositivo');
  if (countTipi[0].values[0][0] === 0) {
    ['PC Desktop', 'Notebook', 'Monitor', 'Stampante', 'Altro'].forEach(t => {
      db.run('INSERT INTO tipi_dispositivo (nome) VALUES (?)', [t]);
    });
  }

  saveDb();
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function getDb() { return db; }

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return {
    lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0].values[0][0],
    changes: db.getRowsModified()
  };
}

function get(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

function importClienti(clientiArray) {
  for (const c of clientiArray) {
    db.run(
      'INSERT OR REPLACE INTO clienti (id, ragione_sociale, telefono, email, indirizzo, citta) VALUES (?, ?, ?, ?, ?, ?)',
      [c.id, c.ragione_sociale, c.telefono || '', c.email || '', c.indirizzo || '', c.citta || '']
    );
  }
  saveDb();
  return clientiArray.length;
}

module.exports = { initDb, getDb, query, run, get, importClienti, saveDb };
