# Delete All Google Photos — Free & Unlimited (v2.0)

Estensione browser **100% gratuita, open-source, locale e illimitata** (Manifest V3) per **Chrome, Edge, Brave, Opera, Vivaldi, Arc e Firefox**.

Unisce in un unico strumento il meglio di **Delete All Google Photos** e **Google Photos Bulk Delete — Free Up Storage Fast**, eliminando ogni limite giornaliero (niente cap da 200/500 foto) e ogni paywall.

## Funzionalità principali
- **100% Free & Illimitata**: zero limiti giornalieri, zero pagamenti, zero tracciamento, permessi minimi (`storage`, `activeTab`, solo `https://photos.google.com/*`).
- **Pulizia Spazio Rapida (Storage Cleanup)** con accesso a 1 click:
  - **File Pesanti** (`/quotamanagement/large`)
  - **Tutti i Video** (`/videos`)
  - **Screenshot** (`/quotamanagement/screenshots`)
  - **Foto Sfocate** (`/quotamanagement/blurry`)
  - **Aggiunti di Recente** (`/search/_tra_`)
  - **Archivio**, **Libreria**, **Album**, **Ricerca** e **Cestino** (con pulsante rapido **Svuota Cestino**)
- **Filtri Intelligenti integrati**:
  - **Tipo file**: *Tutti* / *Solo Video* / *Solo Foto*
  - **Intervallo date**: *Dalla data* / *Alla data* (parser date multilingua IT / EN / 中文 / EU / ISO)
  - **Salta Preferiti (★)**: protegge automaticamente gli elementi contrassegnati con la stella
  - **Limite massimo opzionale** (`0` = illimitato) con barra di avanzamento live
- **3 Modalità di selezione**:
  - **Smart (Giorni + Foto)**: seleziona intere giornate + foto singole
  - **Turbo (Shift+Click)**: seleziona interi blocchi in un solo click
  - **Singole foto (Precisa)**: automatica quando i filtri sono attivi
- **Multi-Account (`u/0..u/4`)**, **Multi-lingua UI (`IT` / `EN` / `中文`)**, rilevamento bottoni Google Foto in **30+ lingue** (SVG Material + ARIA + scorciatoia `#`), **Dark Mode**, **Dry Run (Test)**, **Pausa/Riprendi**, **Stop immediato `ESC`**, e **Log copiabile**.

---

## Installazione

Scarica i pacchetti pronti dalla pagina [**Releases**](../../releases) (oppure genera i pacchetti localmente con `npm run build`).

### Chrome, Edge, Brave, Opera, Vivaldi, Arc (Chromium)
1. Scarica **`delete-all-google-photos-v2.0.0-chromium.zip`** dalle [Releases](../../releases) ed estrai la cartella.
2. Apri la pagina estensioni del tuo browser:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
   - Opera: `opera://extensions`
   - Vivaldi: `vivaldi://extensions`
3. Attiva **Modalità sviluppatore** (*Developer mode*).
4. Clicca **Carica estensione non pacchettizzata** (*Load unpacked*) e seleziona la cartella estratta (oppure direttamente la root del repository).
5. Apri [photos.google.com](https://photos.google.com/) (o premi `F5`).

### Firefox (Desktop & Developer Edition / Nightly)
- **Installazione rapida (tutte le versioni di Firefox)**:
  1. Scarica **`delete-all-google-photos-v2.0.0-firefox.xpi`** (o `.zip`) dalle [Releases](../../releases).
  2. Apri `about:debugging#/runtime/this-firefox`.
  3. Clicca **Carica componente aggiuntivo temporaneo…** (*Load Temporary Add-on…*) e seleziona il file `.xpi` (oppure il file `manifest.json` dentro `dist/firefox/`).
  4. Apri [photos.google.com](https://photos.google.com/) e, se Firefox chiede il permesso per `photos.google.com` in `about:addons`, clicca **Consenti**.
- **Installazione permanente su Firefox Developer Edition / Nightly / Waterfox / LibreWolf**:
  - Imposta `xpinstall.signatures.required = false` in `about:config`, poi trascina il file **`.xpi`** direttamente nella finestra di Firefox.

---

## Build dei pacchetti da sorgente
Richiede solo **Node.js** (zero dipendenze `npm install` necessarie):

```bash
npm run build
```

Genera in `dist/`:
- `delete-all-google-photos-v2.0.0-chromium.zip` + `dist/chromium/` (Chrome, Edge, Brave, Opera, Vivaldi, Arc)
- `delete-all-google-photos-v2.0.0-firefox.xpi` + `delete-all-google-photos-v2.0.0-firefox.zip` + `dist/firefox/` (Firefox MV3)

## Sicurezza e Backup
- Prima di eliminare grandi librerie, esegui un backup con [Google Takeout](https://takeout.google.com/).
- Usa la **Modalità Test (Dry Run)** per verificare la selezione senza eliminare nulla.
- Le foto eliminate dalla Libreria o dall'Archivio vengono spostate nel **Cestino** (recuperabili per 60 giorni). Per liberare subito lo spazio del tuo account Google, svuota poi il Cestino.
