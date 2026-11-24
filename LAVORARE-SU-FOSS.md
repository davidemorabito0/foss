# Lavorare su FOSS (fuori da Claude Code)

Guida completa per chi riprende in mano il progetto con un altro strumento (un editor, un'altra IA, uno
sviluppatore). Si legge dall'inizio alla fine prima di toccare qualcosa.

Aggiornata al **25 novembre 2026**: FOSS **v81**, FOSS.chat **2.9.10**, app per computer **1.0.6**,
service worker `foss-guscio-v112`. La versione che gira su un dispositivo si legge in fondo al **Profilo**
(FOSS) e nelle impostazioni della chat.

Il diario tecnico dettagliato, con la storia di ogni versione e i motivi delle scelte, è
[`sviluppo/FOSS-CHAT.md`](sviluppo/FOSS-CHAT.md). Questo file è la mappa; quello è il registro.

---

## 1. Cos'è

| Pezzo | Cos'è | Dove si vede |
|---|---|---|
| **FOSS** | Gestionale di produzione per lavori creativi (video, foto, social, eventi): spazi di lavoro → progetti → fasi → task → subtask, calendario, mappa, note, soldi, notifiche | `https://foss.team/` |
| **FOSS.chat** | Chat del team stile WhatsApp, stesso account di FOSS | `https://foss.team/chat.html` |
| **Pannello admin** | Gestione utenti e segnalazioni per l'amministratore | `https://foss.team/admin.html` |
| **App per computer** | Tauri 2 (Mac e Windows): apre le pagine pubblicate, aggiunge avvisi di sistema, icona, aggiornamenti | Releases di GitHub |
| **App Android** | APK «guscio» (Trusted Web Activity) che apre foss.team a tutto schermo | Releases `android-vX.Y.Z` |
| **Server dei media** | Node sul NAS di casa, raggiunto con un tunnel Cloudflare: foto, video e file della chat | `https://media.foss.team` |
| **Database** | Supabase, progetto `suqpteanvnvvmfujlevi` (eu-central-1): Postgres, Auth, Storage, Realtime, Edge Functions | dashboard Supabase |

Principio di fondo: **nessuna build per FOSS, nessun framework**. Le app per computer e Android non
contengono il sito: lo caricano da internet. Quindi una pubblicazione del sito arriva subito ovunque.

---

## 2. Regole che non si discutono

1. **Mai segreti nel codice.** Chiavi API, token, password: il titolare li inserisce da sé nel posto
   giusto (sezione 9). Nel codice ci sono solo la URL di Supabase e la chiave *pubblica* (anon), che sono
   fatte per stare nel browser.
2. **Mai prove nelle chat vere con altre persone.** Per provare la chat dal vivo si crea un gruppo di prova
   con dentro solo il titolare, si prova lì, si controlla nel database e poi si cancella.
3. **`chat.html` non si modifica a mano.** È generato da `sviluppo/chat/` (sezione 5).
4. **A ogni pubblicazione si alza la versione** della cache in `sw.js` (`foss-guscio-vNN`) e la costante
   `VERSIONE` della pagina toccata (`index.html` e/o `sviluppo/chat/js/01-base.js`).
5. **Si consegna solo ciò che è provato** con esito positivo (sezione 7). «Dovrebbe funzionare» non basta.
6. **Il database vero è quello in produzione, non i file `.sql`.** Prima di riscrivere una funzione SQL si
   legge com'è adesso (sezione 8).
7. **Prima il database, poi l'app**: se una modifica richiede una funzione o una colonna nuova, si applica
   la migrazione prima di pubblicare la pagina che la usa.
8. La documentazione si aggiorna in `sviluppo/FOSS-CHAT.md` a ogni modifica non banale.

### Come lavorare con il titolare (Davide)

- Italiano, del tu, risposte brevi, prima la risposta.
- Non programma: si spiega **il risultato** e **cosa deve fare lui**, senza spiegazioni tecniche.
- Una strada consigliata, non menu di opzioni. «vai», «procedi», «via» = esegui.
- Detta a voce: gli errori di trascrizione si interpretano dal contesto.
- Se un lavoro richiede tempo, lo si dice prima.

---

## 3. Mappa del repository

Repository GitHub: **`davidemorabito0/foss`**, ramo **`main`**.

```
index.html              FOSS: tutto in un file (~1 MB): HTML, CSS e JS. Si modifica direttamente.
chat.html               FOSS.chat GENERATA: non toccare, si rigenera da sviluppo/chat/
admin.html              pannello dell'amministratore
sw.js                   service worker comune a FOSS e chat (cache del "guscio", push, condivisione)
apri-app.js             passa i link di foss.team all'app per computer nei browser collegati
manifest.json           PWA di FOSS        manifest-chat.json   PWA della chat
_headers                intestazioni di sicurezza per Cloudflare Pages
.well-known/            assetlinks.json: lega l'APK Android al dominio (impronta della firma)
privacy.html, termini.html, robots.txt, icone/, *.png, favicon.*
mail/                   modelli delle email
nas/                    server dei media: server.mjs, avvio.sh, docker-compose.yml
desktop/                app per computer (Tauri 2)
  locale/avvio.html     pagina di partenza che aspetta la rete
  src-tauri/src/        lib.rs (finestra e viste), avvisi.rs, vassoio.rs, ponte.js
android/                APK (Trusted Web Activity) + Avvisi.java + icone.py
sviluppo/
  FOSS-CHAT.md          diario tecnico completo
  chat/                 SORGENTI della chat: head.html, chat.css, body.html, js/NN-*.js, fine.html
  sql/                  copia locale delle funzioni SQL (può essere indietro rispetto alla produzione)
  edge/                 funzioni edge: push, gif, supernotifica, trascrivi
  strumenti/            pubblica.pl (pubblica senza git), build.pl (costruisce chat.html)
  test/app/             prove nel browser (Playwright): prova-foss.py (FOSS), prova*.py + mock-supabase.js (chat)
  test/db/              prove del database in memoria (PGlite): prova.mjs
  test/desktop/         prove dell'app per computer
.github/workflows/      controllo-foss.yml, controllo-chat.yml, controllo-app.yml, app-desktop.yml, app-android.yml
```

---

## 4. FOSS (`index.html`)

### Com'è scritto

- JavaScript «vanilla», nomi e commenti **in italiano**. L'HTML si costruisce concatenando stringhe e lo si
  mette in `innerHTML`: ogni testo che viene dall'utente passa da `esc()` (testo semplice) o `sicuro()`
  (HTML ammesso ripulito).
- Tutto lo script sta dentro `(function(){ "use strict"; … })();`: dalla console del browser **non** si
  raggiungono le variabili della pagina.
- Stato in memoria: oggetto `state` (spazi, progetti, utenti, notifiche, vista corrente…). Si cambia lo
  stato e si chiama `render()`.
- **Clic**: un solo gestore. Ogni tasto ha `data-action="nome"` e il comando sta in un grande `switch` con
  `case 'nome':`. Per i dati si usa l'helper `D({pid:…, sid:…})` che scrive gli attributi `data-*`.
- Annulla: `snap('descrizione')` prima di ogni modifica, Ctrl+Z ripristina. `azione(...)` scrive nel
  registro, `logga(progetto, ...)` nella storia del lavoro, `toast(...)` mostra il messaggio.
- Permessi: `puo('modifica' | 'spunta' | 'spazi' | 'soldi' | …)`; `state.ospite` = chi guarda da un link
  in sola lettura.

### Modello dei dati

- **Spazio** (`state.spazi[]`, tabella `spazi`, colonna `dati` jsonb): nome, descrizione, icona, colore,
  copertina, membri, preset… e dalla v77 la **scheda dello spazio** (`descrizione`, `obiettivi`, `tags`,
  `palette`, `rif`, `nota`, `cliente`, `inizio`, `consegna`, `responsabile`; `schedaOff` la nasconde).
- **Progetto** (lavoro): il *nucleo* sta in `progetti.dati` (jsonb), i *pezzi* (task, subtask, commenti…)
  sono righe della tabella `elementi`. Funzioni chiave: `aggiornaDaCloud`, `applicaNucleo`,
  `applicaPezzi`, `sincronizza`, con le mappe «ombra» (`ombraNucleo`, `ombraEl`, `ombraConti`, `ombraSp`)
  che ricordano l'ultima versione salvata per scrivere solo ciò che cambia.
- **Soldi** dei lavori: tabella `conti` (preventivo, incassi, spese).
- Le letture grandi passano da `tutteLeRighe(fai)`, che legge a blocchi di 1000 (limite di Supabase)
  e vuole un `.order()` stabile.
- Copia locale nel browser: `localStorage.foss_v1` (con `foss_backup`). Senza Supabase (per esempio
  aprendo il file da disco) l'app gira in **modalità locale** con dati dimostrativi.

### Dove sono le cose principali (cerca il nome nel file)

| Cosa | Funzione |
|---|---|
| Schermata di uno spazio (bacheca, lista, calendario, mappa, note) | `renderHome`, `bachecaColonne`, `tessera` |
| Scheda dello spazio (accanto ai progetti) | `schedaSpazio`, `carteSpazio`, comandi `sps-*` |
| Impostazioni dello spazio | `case 'modifica-spazio'`, `salva-spazio`, `sp-scheda` |
| Dentro un lavoro | `apriProgetto`, la sezione `work`, `riepilogoHTML` (tasto «Scheda» del lavoro) |
| Commenti di task e subtask | `tastoCommenti`, `apriCommenti`, comandi `cm-*` |
| Modifica di un campo | `apriEdit` / `applicaEdit` |
| Profilo | `renderProfilo` |
| Guida dentro l'app | array dei capitoli vicino a `const VERSIONE` |
| Connessione a Supabase | `SUPA_URL`, `SUPA_KEY`, `sb` |
| Ponte con l'app per computer | blocco «APP PER COMPUTER» in fondo (`window.fossApp`) |

### Sicurezza nella pagina

C'è una **Content-Security-Policy** in un `<meta>` all'inizio di `index.html` e di
`sviluppo/chat/head.html`. Volutamente **senza** `default-src`, `connect-src` e `media-src` (altrimenti si
rompono l'app per computer, i media e i blob). Gli script esterni ammessi sono solo da cdnjs e jsdelivr.
Se aggiungi una libreria da un altro sito, va aggiunta lì o non parte.

---

## 5. FOSS.chat (`sviluppo/chat/` → `chat.html`)

- I file in `sviluppo/chat/js/` vengono **incollati in ordine alfabetico** dentro un'unica funzione: il
  numero all'inizio del nome decide l'ordine (`01-base.js` per primo, `99-via.js` per ultimo).
- In `chat.css` la riga `</style>` + `</head>` deve restare **in fondo**.
- Costruire `chat.html` (dalla radice del repository):

```bash
perl sviluppo/strumenti/build.pl sviluppo/chat chat.html
```

  (equivalente: `python3 sviluppo/chat/build.py`).
- I clic della chat usano `data-a="..."` (non `data-action`). Moduli principali: `01-base.js` (stato `S`,
  utilità, `VERSIONE`, `MEDIA_NAS`), `02-dati.js` (Supabase, realtime, caricamento file), `04-conv.js`
  (messaggi), `05-scrivi.js` (scrittura, vocali), `12-app.js` (avvio e clic). Elenco completo in
  `sviluppo/FOSS-CHAT.md`, sezione 1.
- I file vanno sul NAS (fino a 2 GB); se il NAS non risponde ripiegano sul bucket Supabase `chat` (50 MB).

---

## 6. Preparare il computer

| Strumento | A cosa serve | Note |
|---|---|---|
| `gh` (GitHub CLI) collegato all'account | pubblicare, guardare i controlli | sul Mac del titolare sta in `~/.local/bin/gh` |
| `perl` | `pubblica.pl`, `build.pl` | c'è già su macOS |
| `python3` + Playwright | prove nel browser | `python3 -m pip install --user playwright`, poi `CHROME=` col percorso di Chrome |
| Node 20+ | prove del database (`sviluppo/test/db`) | `npm install` nella cartella |
| Rust + `cargo install tauri-cli --version "^2"` | solo per l'app per computer | |
| JDK 17 + Android SDK | solo per l'APK in locale | di solito lo costruisce GitHub |
| Accesso a Supabase | migrazioni, SQL, funzioni edge, log | dashboard o CLI `supabase` |

Sul Mac del titolare **git non è installato**: si pubblica con `pubblica.pl` (sezione 10). Su un
computer con git si può anche clonare e fare `git push` su `main` normalmente.

---

## 7. Provare (obbligatorio prima di pubblicare)

### FOSS nel browser, in locale

```bash
python3 -m http.server 8123
```

Poi apri `http://localhost:8123/index.html`. Per provare l'interfaccia **senza toccare i dati veri**,
usa una copia di `index.html` senza il tag `<script>` di supabase-js: l'app parte in modalità locale
con i dati dimostrativi (spazi «Video Milano», «Social & Food»…). Ricorda che quei dati restano nel
`localStorage` del browser: tra una prova e l'altra svuotalo, o le impostazioni di prima falsano il
risultato.

Controlla sempre: console senza errori nuovi, schermo largo (1500 px e oltre) e telefono (375 px).

### Controllo automatico di FOSS

Con il server sulla porta 8123 attivo:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" python3 sviluppo/test/app/prova-foss.py
```

Apre FOSS senza database (dati dimostrativi), entra in uno spazio, apre un lavoro e il Profilo, prova il
telefono, e si ferma su qualunque errore della pagina. Su GitHub lo lancia `controllo-foss.yml` a ogni
modifica di `index.html` o `sw.js`. Quando aggiungi una funzione importante, aggiungi lì il suo controllo.

### Prove automatiche della chat

Con il server sulla porta 8123 attivo:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" python3 sviluppo/test/app/prova7.py
```

Ci sono `prova7.py` … `prova27.py`; `mock-supabase.js` finge Supabase (se servono RPC nuove vanno
aggiunte lì). Le stesse prove girano da sole su GitHub (`controllo-chat.yml`) a ogni modifica della chat.
**`prova22` a volte fallisce solo sulla macchina di GitHub** (microfono finto): se fallisce solo lei,
si rilancia il controllo.

### Database

```bash
cd sviluppo/test/db && npm install && node prova.mjs
```

Postgres in memoria con le funzioni della chat: ogni funzione nuova va aggiunta con le sue prove.

### Dal vivo

Solo in un **gruppo di prova** con dentro il titolare, mai nelle chat vere. Dopo la prova si controlla
nel database e si cancella il gruppo.

---

## 8. Database (Supabase)

- Progetto `suqpteanvnvvmfujlevi`. Tabelle di FOSS:
  - lavoro: `organizzazioni`, `membri_org`, `spazi`, `progetti`, `membri_progetto`, `elementi`, `conti`,
    `modelli` (preset), `calendari`, `cestino_progetti`, `link_cliente`; file nei bucket `allegati`, `avatar`
    e `chat`;
  - persone e accessi: `profili`, `admin_foss`, `inviti`, `inviti_codici`, `richieste_team`;
  - avvisi: `notifiche`, `push_iscrizioni`, `avvisi_email`, `comunicazioni`;
  - servizio: `segnalazioni`, `errori_app` (errori del browser mandati da `segnalaErrore`),
    `backup_giornalieri`.
  Tabelle della chat: `chat_*` (elenco completo e regole in `sviluppo/FOSS-CHAT.md`, sezione 2).
  `spazio_lavoro` (nome storico) tiene le preferenze personali di ogni utente: filtri, vista, letture,
  registro; si sincronizza fra i suoi dispositivi.
- **Sicurezza a livello di riga (RLS)** su tutte le tabelle. Le operazioni delicate passano da funzioni
  `security definer` che controllano chi chiama. Ogni funzione nuova va chiusa:

```sql
revoke execute on function public.nome(...) from public, anon;
grant execute on function public.nome(...) to authenticated;
```

- Prima di cambiare una funzione, leggi la versione in produzione:

```sql
select pg_get_functiondef('public.nome_funzione(...)'::regprocedure);
```

  e dopo aggiorna anche la copia in `sviluppo/sql/`.
- Le migrazioni della chat si chiamano `fosschat_*`.
- Regex di Postgres: le ripetizioni `{n,m}` arrivano al massimo a 255 (`{1,300}` blocca i messaggi).
- Cron: `fosschat-orologio` ogni 20 secondi (messaggi programmati e promemoria), pulizia di notte.
- Dopo ogni modifica guarda gli *advisors* di Supabase (sicurezza e prestazioni). Quelli noti e voluti:
  9 tabelle «RLS senza regole» (chiuse a tutti apposta) e `togli_iscrizioni_push` chiamabile da anon
  (protetta dalla chiave VAPID nel Vault).

### Funzioni edge (`sviluppo/edge/`)

| Funzione | Cosa fa | Segreto che usa |
|---|---|---|
| `push` | manda gli avvisi push di FOSS e della chat (la chiama il database) | chiave VAPID nel **Vault** (`foss_vapid`) |
| `gif` | cerca le GIF su GIPHY | `GIPHY_KEY` |
| `supernotifica` | avvisi e email importanti | vedi il codice |
| `trascrivi` | trascrive i vocali (Groq) | `TRASCRIZIONE_CHIAVE` (**ancora da inserire**) |

---

## 9. Segreti: dove stanno (i valori non sono mai qui)

| Segreto | Dove | Chi lo inserisce |
|---|---|---|
| Chiavi delle funzioni edge (`GIPHY_KEY`, `TRASCRIZIONE_CHIAVE`, …) | Supabase → Edge Functions → Secrets | il titolare |
| Chiave VAPID degli avvisi | Supabase → Vault (`foss_vapid`) | già presente |
| Firma degli aggiornamenti dell'app per computer | GitHub → Settings → Secrets → `TAURI_SIGNING_PRIVATE_KEY` | già presente |
| Firma dell'APK | GitHub Secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`; file in `Downloads/FOSS-chiavi/` sul Mac del titolare | già presente |
| Firma Apple (facoltativa) | GitHub Secrets `APPLE_*` | non attiva |
| Tunnel Cloudflare del NAS | variabile `CF` del container sul NAS | il titolare |

Se si perde la firma dell'app per computer o dell'APK, le app installate non accettano più
aggiornamenti: vanno reinstallate a mano. Tenere sempre una copia.

---

## 10. Pubblicare il sito

Il sito si pubblica **a ogni push su `main`**: lo servono Cloudflare (dominio `foss.team`, intestazioni
da `_headers`) e GitHub Pages. Di solito in meno di un minuto.

### Con git

```bash
git pull
git add -A && git commit -m "FOSS v81: ..." && git push
```

### Senza git (come sul Mac del titolare)

Dalla radice del repository. Prima una prova a vuoto, che dice solo cosa cambierebbe:

```bash
perl sviluppo/strumenti/pubblica.pl . "" "messaggio" --prova
```

Poi la pubblicazione vera:

```bash
perl sviluppo/strumenti/pubblica.pl . "" "FOSS v81: cosa cambia"
```

Per pubblicare su un ramo di prova (creato da `main`): `RAMO=prova-x perl sviluppo/strumenti/pubblica.pl . "" "..."`.

### Lista di controllo

1. Modifica fatta e provata (sezione 7).
2. Se hai toccato la chat: `perl sviluppo/strumenti/build.pl sviluppo/chat chat.html`.
3. Alzata `VERSIONE` (in `index.html` e/o `01-base.js`) e la cache in `sw.js`.
4. Se serve, migrazione del database **prima**.
5. Pubblica, poi controlla che sia online:

```bash
curl -s https://foss.team/ | grep -o "VERSIONE = 'v[0-9]*'"
```

6. Guarda i controlli automatici su GitHub («Controllo FOSS» e, se hai toccato la chat, «Controllo chat»):

```bash
gh run list -R davidemorabito0/foss -L 5
```

7. Aggiorna `sviluppo/FOSS-CHAT.md`.

---

## 11. App per computer (`desktop/`)

- Tauri 2. Una finestra con due viste: FOSS e la chat (separate, affiancate o una alla volta). Il **ponte**
  `src-tauri/src/ponte.js` entra in cima alle due pagine e definisce `window.fossDesktop`; il sito usa solo
  `if(window.fossDesktop) …`. Non rinominare quello che usa il ponte senza aggiornarlo.
- `lib.rs` dispone le due viste (`disponi`) e ha un controllo (`sorveglia_misura`) che le rimette a posto
  se la finestra cambia misura senza avvisare (schermo intero su Windows).
- **Una versione nuova serve solo se cambia `desktop/`.** Le modifiche al sito arrivano da sole.
- Pubblicare una versione: tag `vX.Y.Z`, oppure GitHub → Actions → «App per computer» → Run workflow con
  il numero. Costruisce `.dmg` e `-setup.exe`, crea la release e scrive `latest.json`, da cui le app
  installate prendono l'aggiornamento (freccia gialla).
- Prove: `cd desktop/src-tauri && cargo build`, poi `python3 sviluppo/test/desktop/prova_app.py`
  (39 controlli). Su GitHub lo fa `controllo-app.yml` a ogni modifica di `desktop/`.

## 12. App Android (`android/`)

- Guscio Trusted Web Activity che apre `https://foss.team`. Di nostro c'è solo `Avvisi.java` (avvisi ad
  alta importanza).
- Costruzione: GitHub → Actions → «App Android» → Run workflow con la versione. Crea la release
  `android-vX.Y.Z`, che **non deve mai essere «latest»** (quella è dell'app per computer).
- Un APK nuovo serve solo se cambia il guscio. Se cambia la firma va aggiornato `.well-known/assetlinks.json`.

## 13. Server dei media sul NAS (`nas/`)

- NAS QNAP in casa, Container Station, app «fosschat»: container `node:22-alpine` che a ogni avvio
  scarica `https://foss.team/nas/avvio.sh` e `server.mjs`. Volume `/share/FOSSchat:/data`.
- Raggiunto da fuori con il tunnel Cloudflare: `media.foss.team`.
- **Per aggiornarlo**: pubblicare `nas/server.mjs` / `nas/avvio.sh` e riavviare il container.
- Se il NAS è spento la chat ripiega da sola su Supabase per i nuovi file; i file già sul NAS non si
  aprono finché non torna acceso.

---

## 14. Stato attuale e cose aperte

### Da fare da parte del titolare (servono le sue credenziali)

- Inserire `TRASCRIZIONE_CHIAVE` (Groq) in Supabase → Edge Functions → Secrets: la trascrizione dei
  vocali è pronta ma spenta finché manca.
- Accendere **Leaked password protection** in Supabase → Authentication.
- Provare sui dispositivi veri: avvisi su Android e iPhone (icona sulla Home), email di recupero password.
- Gli avvisi accesi sono pochi (3 dispositivi su 9 persone a fine novembre 2026): dalla v81 FOSS invita
  tutti ad accenderli; vale la pena ricordarlo anche a voce ai collaboratori.

### Miglioramenti noti, non ancora fatti

- Stringere la Content-Security-Policy togliendo `'unsafe-inline'` (richiede di spostare tutto il codice
  in linea e di riprovare app per computer e Android).
- I canali realtime di «presenza» e «sta scrivendo» sono comuni a tutti gli utenti.
- Rara corsa tra cestino e realtime (un elemento appena cestinato può ricomparire per un attimo).
- La scheda dello spazio non ha ancora gli **allegati** (moodboard, PDF, foto): oggi i file stanno solo
  dentro ai singoli lavori.

### Ultime modifiche

- **v81** — invito ad accendere gli avvisi per tutti (anche nel browser); scheda dello spazio
  richiudibile e più stretta sugli schermi medi; versione nel Profilo; controllo automatico di FOSS;
  indici e una regola del database ottimizzati.
- **v80** — il fumetto per commentare task e subtask è sempre visibile (prima compariva solo passandoci
  sopra col mouse).
- **v77–v79** — scheda dello spazio di lavoro accanto ai progetti (a destra, larga circa il 44% della
  finestra, carte su più colonne), sotto ai progetti sul telefono; interruttore in Modifica spazio.
- **v75** — Content-Security-Policy; lettura a blocchi oltre i 1000 progetti.
- **App 1.0.6** — corretta la fascia vuota quando la finestra viene ingrandita.

---

## 15. Creare una piattaforma gemella per un cliente

Tutto in [`NUOVA-PIATTAFORMA.md`](NUOVA-PIATTAFORMA.md): un comando copia il progetto con un altro nome,
dominio, colore e database, senza nessun dato di FOSS; un'azione di GitHub esporta la struttura del
database.

## 16. Problemi già visti e come si riconoscono

| Sintomo | Causa | Cosa fare |
|---|---|---|
| Una modifica non si vede dopo la pubblicazione | pagina vecchia ancora aperta (l'app per computer resta aperta nella barra) | ricaricare (Ctrl+R) o uscire del tutto dall'app e riaprirla |
| In prova locale un'impostazione «non funziona» | il `localStorage` conserva le prove di prima | svuotarlo (`localStorage.clear()`) e ricaricare |
| Messaggi con file bloccati, errore 2201B | regex Postgres con `{n,m}` oltre 255 | usare al massimo `{1,250}` |
| Il controllo della chat su GitHub fallisce solo su `prova22` | microfono finto instabile | rilanciare il controllo |
| Elenco progetti incompleto con tanti lavori | lettura senza `tutteLeRighe` (limite di 1000 righe) | passare sempre da `tutteLeRighe` con un `.order()` |
| Una libreria esterna non si carica | la CSP non ammette quel sito | aggiungerlo alla CSP in testa alla pagina |
| Download dal NAS che non partono nel browser | intestazioni CORS del server | `nas/server.mjs` deve rispondere con `Vary: Origin`; riavviare il container |
