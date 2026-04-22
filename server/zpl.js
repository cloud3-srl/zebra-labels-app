/**
 * Generazione codice ZPL per etichette Zebra GK420t
 * Dimensione etichetta: 55mm x 35mm = 440 x 280 dot (203 DPI)
 * Supporta logo, campi personalizzabili, font configurabili
 */

function generaNomiDispositivo(prefisso, quantita) {
  const nomi = [];
  for (let i = 1; i <= quantita; i++) {
    const numero = String(i).padStart(2, '0');
    nomi.push(`${prefisso}${numero}`);
  }
  return nomi;
}

function truncate(str, max) {
  if (!str) return 'N/D';
  return str.length > max ? str.substring(0, max - 1) + '.' : str;
}

/**
 * Genera ZPL per una singola etichetta con supporto logo e layout personalizzato
 */
function generaZPLSingolo(params) {
  const {
    titolo,
    motivo,
    ragione_sociale,
    tipo_dispositivo,
    nome_dispositivo,
    telefono,
    email,
    indirizzo,
    citta,
    copie = 1,
    // Opzioni layout personalizzato
    logo_zpl = '',
    logo_width = 0,
    logo_height = 0,
    campi_visibili = ['cliente', 'dispositivo', 'telefono_email', 'indirizzo', 'motivo', 'data', 'barcode'],
    font_titolo = 24,
    font_cliente = 20,
    font_dispositivo = 18,
    font_dettagli = 16,
    font_motivo = 18,
    font_data = 14,
    show_barcode = true
  } = params;

  const oggi = new Date();
  const data = `${oggi.getDate()}/${oggi.getMonth() + 1}/${oggi.getFullYear()}`;
  const tel = telefono || 'N/D';
  const mail = email || 'N/D';
  const ind = indirizzo || 'N/D';
  const city = citta || '';
  const nome = nome_dispositivo || '-';

  let zpl = '^XA\n^MMT^PW440^LL280^LS0\n';

  // Calcola offset X per il titolo se c'è il logo
  const hasLogo = logo_zpl && logo_zpl.length > 0;
  const titleX = hasLogo ? (logo_width + 15) : 10;
  const titleFieldWidth = 440 - titleX - 10;
  const contentX = 10;

  // Y tracking per layout dinamico
  let y = 8;

  // === LOGO (se presente, in alto a sinistra) ===
  if (hasLogo) {
    zpl += `^FO5,4${logo_zpl}^FS\n`;
  }

  // === TITOLO (centrato, o spostato a destra se c'è logo) ===
  if (hasLogo) {
    zpl += `^CF0,${font_titolo}^FO${titleX},${y}^FB${titleFieldWidth},1,0,C,0^FD${titolo}^FS\n`;
  } else {
    zpl += `^CF0,${font_titolo}^FO10,${y}^FB420,1,0,C,0^FD${titolo}^FS\n`;
  }

  // Linea separatore sotto titolo
  const lineY = Math.max(y + font_titolo + 4, hasLogo ? (logo_height + 8) : 0);
  y = lineY;
  zpl += `^FO10,${y}^GB420,2,2^FS\n`;
  y += 8;

  // === CAMPI DINAMICI ===
  const fields = Array.isArray(campi_visibili) ? campi_visibili : JSON.parse(campi_visibili || '[]');

  for (const campo of fields) {
    switch (campo) {
      case 'cliente': {
        const clienteStr = truncate(ragione_sociale, 38);
        zpl += `^CF0,${font_cliente}^FO${contentX},${y}^FDCliente: ${clienteStr}^FS\n`;
        y += font_cliente + 2;
        break;
      }
      case 'dispositivo': {
        const dispStr = truncate(`${tipo_dispositivo} | ${nome}`, 36);
        zpl += `^CF0,${font_dispositivo}^FO${contentX},${y}^FDDisp: ${dispStr}^FS\n`;
        y += font_dispositivo + 2;
        break;
      }
      case 'telefono_email': {
        const teStr = truncate(`Tel: ${tel} | ${mail}`, 42);
        zpl += `^CF0,${font_dettagli}^FO${contentX},${y}^FD${teStr}^FS\n`;
        y += font_dettagli + 2;
        break;
      }
      case 'indirizzo': {
        const indStr = truncate(`Ind: ${ind} - ${city}`, 42);
        zpl += `^CF0,${font_dettagli}^FO${contentX},${y}^FD${indStr}^FS\n`;
        y += font_dettagli + 2;
        break;
      }
      case 'motivo': {
        zpl += `^CF0,${font_motivo}^FO${contentX},${y}^FD${motivo}^FS\n`;
        y += font_motivo + 2;
        break;
      }
      case 'data': {
        // Non aggiungiamo qui, la data va alla fine prima del barcode
        break;
      }
      case 'barcode': {
        // Gestito dopo
        break;
      }
      case 'referente': {
        zpl += `^CF0,${font_dettagli}^FO${contentX},${y}^FDRif: ____________________^FS\n`;
        y += font_dettagli + 2;
        break;
      }
      case 'note': {
        zpl += `^CF0,${font_dettagli}^FO${contentX},${y}^FDNote: ____________________^FS\n`;
        y += font_dettagli + 2;
        break;
      }
      // === NUOVI CAMPI PER LAYOUT "INTESTATO" ===
      case 'intestazione': {
        // Header aziendale: logo a sinistra (se presente) + data a destra
        // Il titolo/logo è già gestito sopra, qui aggiungiamo solo la data in alto a destra
        zpl += `^CF0,${font_data}^FO320,10^FD${data}^FS\n`;
        break;
      }
      case 'note_grandi': {
        // Area grande per note libere a mano - linee orizzontali
        zpl += `^CF0,14^FO${contentX},${y}^FDNote:^FS\n`;
        y += 18;
        const endY = 280 - (fields.includes('footer_contatti') ? 40 : 10);
        while (y + 22 < endY) {
          zpl += `^FO${contentX},${y}^GB420,1,1^FS\n`;
          y += 22;
        }
        break;
      }
      case 'note_piccole': {
        // Area più piccola per note - 3 righe
        zpl += `^CF0,14^FO${contentX},${y}^FDNote:^FS\n`;
        y += 18;
        for (let nl = 0; nl < 3; nl++) {
          zpl += `^FO${contentX},${y}^GB420,1,1^FS\n`;
          y += 20;
        }
        break;
      }
      case 'footer_contatti': {
        // Footer fisso in basso con contatti aziendali (usa motivo_zpl)
        // Gestito dopo il loop, lo segniamo solo
        break;
      }
    }
  }

  // === FOOTER CONTATTI (se presente, fisso in basso) ===
  if (fields.includes('footer_contatti')) {
    const footerY = 256;
    zpl += `^FO10,${footerY - 4}^GB420,1,1^FS\n`;
    const footerText = truncate(motivo, 55);
    zpl += `^CF0,12^FO10,${footerY}^FB420,1,0,C,0^FD${footerText}^FS\n`;
  } else {
    // Layout classico: separatore + data + barcode
    zpl += `^FO10,${y}^GB420,2,2^FS\n`;
    y += 6;

    if (fields.includes('data') || fields.length === 0) {
      zpl += `^CF0,${font_data}^FO${contentX},${y}^FDData: ${data}^FS\n`;
      y += font_data + 4;
    }

    if ((fields.includes('barcode') || fields.length === 0) && show_barcode) {
      const barcodeVal = nome.length > 20 ? nome.substring(0, 20) : nome;
      const barcodeHeight = Math.max(25, Math.min(40, 280 - y - 10));
      zpl += `^BY2,2,${barcodeHeight}^FO100,${y}^BCN,${barcodeHeight},Y,N,N^FD${barcodeVal}^FS\n`;
    }
  }

  zpl += `^PQ${copie}\n^XZ`;
  return zpl;
}

/**
 * Genera ZPL multiplo con supporto modello personalizzato
 */
function generaZPLMultiplo(params) {
  const {
    cliente,
    modello,
    tipo_dispositivo,
    modalita,
    nome_dispositivo,
    prefisso,
    quantita = 1,
    copie = 1,
    // Opzioni modello personalizzato
    modello_custom = null
  } = params;

  // Modelli predefiniti
  const modelliMap = {
    'Ritiro Assistenza': { titolo: 'RITIRO ASSISTENZA', motivo: '>> RITIRO ASSISTENZA <<' },
    'Preparazione Dispositivo': { titolo: 'NUOVO DISPOSITIVO', motivo: '>> PREPARAZIONE <<' },
    'Generico': { titolo: 'ETICHETTA GENERICA', motivo: 'Note: ____________________' },
    'Default': { titolo: 'ASSISTENZA TECNICA', motivo: '>> IN LAVORAZIONE <<' },
    'Cloud3 - Note': { titolo: 'CLOUD3', motivo: 'T.+39 0109110653 | help@cloud3.srl | www.cloud3.srl' },
    'Cloud3 - Cliente': { titolo: 'CLOUD3', motivo: 'T.+39 0109110653 | help@cloud3.srl | www.cloud3.srl' }
  };

  let modInfo;
  let layoutOpts = {};

  if (modello_custom) {
    modInfo = {
      titolo: modello_custom.titolo_zpl,
      motivo: modello_custom.motivo_zpl
    };
    layoutOpts = {
      logo_zpl: modello_custom.logo_zpl || '',
      logo_width: modello_custom.logo_width || 0,
      logo_height: modello_custom.logo_height || 0,
      campi_visibili: modello_custom.campi_visibili
        ? (typeof modello_custom.campi_visibili === 'string'
          ? JSON.parse(modello_custom.campi_visibili)
          : modello_custom.campi_visibili)
        : undefined,
      font_titolo: modello_custom.font_titolo || 24,
      font_cliente: modello_custom.font_cliente || 20,
      font_dispositivo: modello_custom.font_dispositivo || 18,
      font_dettagli: modello_custom.font_dettagli || 16,
      font_motivo: modello_custom.font_motivo || 18,
      font_data: modello_custom.font_data || 14,
      show_barcode: modello_custom.show_barcode !== 0
    };
  } else {
    modInfo = modelliMap[modello] || modelliMap['Generico'];
  }

  let nomi;
  if (modalita === 'Automatica') {
    nomi = generaNomiDispositivo(prefisso, quantita);
  } else {
    nomi = [nome_dispositivo || 'DISPOSITIVO'];
  }

  const zplParts = nomi.map(nome =>
    generaZPLSingolo({
      titolo: modInfo.titolo,
      motivo: modInfo.motivo,
      ragione_sociale: cliente.ragione_sociale,
      tipo_dispositivo: tipo_dispositivo,
      nome_dispositivo: nome,
      telefono: cliente.telefono,
      email: cliente.email,
      indirizzo: cliente.indirizzo,
      citta: cliente.citta,
      copie: copie,
      ...layoutOpts
    })
  );

  return {
    zpl: zplParts.join('\n'),
    nomi_generati: nomi,
    etichette_generate: nomi.length,
    copie_per_etichetta: copie,
    totale_stampe_fisiche: nomi.length * copie
  };
}

module.exports = { generaNomiDispositivo, generaZPLSingolo, generaZPLMultiplo };
