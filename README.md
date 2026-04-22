# Zebra Labels App

WebApp per la stampa di etichette su stampanti Zebra (ZPL) con interfaccia iOS 26 Liquid Glass ottimizzata per tablet e mobile.

**Cloud3 Srl** · [cloud3.srl](https://www.cloud3.srl)

---

## Caratteristiche

- **Stampa ZPL diretta** via TCP verso stampante Zebra (default `10.0.50.92:9100`)
- **Canvas Designer WYSIWYG** — editor drag-and-drop touch per tablet con palette floating (FAB)
- **Gestione clienti** con import da Excel/CSV
- **Storico stampe** con log completo ZPL
- **Modelli etichetta personalizzabili** con layout salvato in `layout_json`
- **UI iOS 26 Liquid Glass** — glassmorphism, tab bar flottante, micro-interazioni

## Stack

- **Backend**: Node.js + Express + SQLite (sql.js)
- **Frontend**: React 18 via CDN + Babel standalone (no build step)
- **Printer**: TCP socket verso Zebra ZPL

## Struttura

```
zebra-labels-app/
├── server/              # Backend Express + SQLite
│   ├── index.js         # API routes
│   ├── db.js            # Schema e migrazioni
│   └── zebra-labels.db  # Database (gitignored)
├── client/dist/         # Frontend SPA
│   └── index.html       # App React (CDN)
├── .stitch/             # Design system e mockup
└── package.json
```

## Setup

```bash
npm install
cd server && npm install
npm start
```

App disponibile su `http://localhost:3000`.

## API principali

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET    | `/api/clienti` | Lista clienti |
| POST   | `/api/clienti/import` | Import da array |
| GET    | `/api/modelli` | Lista modelli etichetta |
| POST   | `/api/modelli` | Crea modello (con `layout_json`) |
| PUT    | `/api/modelli/:id` | Aggiorna modello |
| POST   | `/api/stampa` | Invia ZPL alla stampante |
| GET    | `/api/storico` | Storico stampe |

## Canvas Designer

Tab **Designer** offre un editor visuale in stile Figma/Canva:

- Area di lavoro = etichetta ingrandita in scala reale (mm)
- **FAB** floating con strumenti: testo, campi dinamici (cliente/dispositivo/…), barcode, linee, rettangoli, logo
- **Drag & drop** con dito (Pointer Events unificati touch/mouse)
- **Inspector** bottom sheet contestuale per editing proprietà
- Al salvataggio: deriva `titolo_zpl`, `campi_visibili`, `font_*` dal canvas; salva l'intero array elementi in `layout_json` per ricostruzione fedele.

## Convenzioni commit

Il progetto usa [Conventional Commits](https://www.conventionalcommits.org/) per l'automazione release:

- `fix:` → patch release (es. `1.1.0` → `1.1.1`)
- `feat:` → minor release (es. `1.1.0` → `1.2.0`)
- `feat!:` / `BREAKING CHANGE:` → major release

## Release automatica

Le release vengono pubblicate automaticamente da GitHub Actions (`release-please`) al merge su `master`.

## Licenza

Proprietario · Cloud3 Srl
