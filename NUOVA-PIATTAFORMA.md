# Creare una piattaforma gemella di FOSS (per un cliente)

Questa guida serve a creare un **sito nuovo, con un altro nome**, che funziona come FOSS (gestionale +
chat), da dare a un cliente e personalizzare per lui.

**Cosa si copia:** solo la struttura. Il codice del sito e della chat, e la *struttura* del database
(tabelle, regole di sicurezza, funzioni).

**Cosa NON si copia, mai:** utenti, progetti, messaggi, file, impostazioni delle persone, chiavi e
password di FOSS. La piattaforma nuova nasce **vuota**, con il suo database e i suoi account.
Anche i nomi dei dati dimostrativi e delle prove (che in FOSS sono di persone vere) diventano inventati,
e il diario tecnico di FOSS (`sviluppo/FOSS-CHAT.md`, con dettagli personali) non viene copiato.

Tempo indicativo: un'ora la prima volta, mezz'ora le successive.

---

## Cosa serve prima di iniziare

| Cosa | Perché | Chi lo crea |
|---|---|---|
| Un **dominio** per il cliente (es. `atelier.it` o `app.cliente.it`) | l'indirizzo del sito | il cliente o tu |
| Un **repository GitHub** nuovo, vuoto | dove vive il codice della copia | tu |
| Un **progetto Supabase** nuovo (regione eu-central-1) | il database del cliente, separato da FOSS | tu, dall'account del cliente o dal tuo |
| **Cloudflare Pages** (o GitHub Pages) | pubblica il sito a ogni modifica | tu |
| Logo e colore del cliente | la grafica | il cliente |

---

## Passo 1 — Il file di impostazioni

Copia il modello e compilalo (con un editor di testo qualsiasi):

```bash
cp sviluppo/strumenti/piattaforma-esempio.txt ~/Desktop/cliente.txt
```

Le voci principali:

| Voce | Esempio | Cosa cambia |
|---|---|---|
| `NOME` | `Atelier` | il nome ovunque al posto di «FOSS» |
| `NOME_CHAT` | `Atelier.chat` | il nome della chat |
| `DOMINIO` | `atelier.it` | l'indirizzo del sito (link, email, app) |
| `COLORE` | `#3B82F6` | il colore principale (tasti, accenti) e le sue sfumature |
| `EMAIL` | `info@atelier.it` | il contatto nelle pagine legali |
| `TITOLARE`, `INDIRIZZO`, `PIVA` | dati del cliente | privacy e termini di utilizzo |
| `SUPABASE_PROGETTO`, `SUPABASE_CHIAVE` | dal progetto Supabase nuovo | a quale database si collega |
| `VAPID_PUBBLICA` | dal Passo 3 | gli avvisi sul telefono e sul computer |
| `DOMINIO_MEDIA` | `nessuno` | server per i file grandi; con «nessuno» i file vanno su Supabase (max 50 MB) |
| `ID_APP`, `REPO` | `it.atelier.app`, `utente/atelier` | solo se fai anche le app per computer/Android |

Nel file vanno **solo dati pubblici**. La chiave `SUPABASE_CHIAVE` è quella *publishable*, fatta per
stare nel browser. Nessuna password, nessuna chiave privata.

Se lasci vuote le voci di Supabase la copia parte in **modalità dimostrativa** (dati finti, nessun
database): utile per far vedere l'aspetto al cliente prima di creare tutto.

---

## Passo 2 — Il comando che crea la copia

Dalla cartella del progetto FOSS:

```bash
perl sviluppo/strumenti/nuova-piattaforma.pl ~/Desktop/cliente.txt ~/Desktop/atelier
```

Crea la cartella `~/Desktop/atelier` con tutto il progetto rinominato. FOSS non viene toccato. Alla fine
il comando dice cosa ha fatto e avvisa se è rimasto qualcosa del vecchio nome, dominio, database o dati
personali.

Per vedere subito com'è venuta (modalità dimostrativa):

```bash
cd ~/Desktop/atelier && python3 -m http.server 8123
```

e apri `http://localhost:8123`. Per provarla in automatico:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" python3 sviluppo/test/app/prova-foss.py
```

---

## Passo 3 — Il database del cliente

### 3a. La struttura (una volta, da FOSS)

La struttura del database di FOSS si esporta con un'azione di GitHub che **copia solo la struttura,
nessun dato**, e la prova subito su un database vuoto.

1. La prima volta: GitHub → repository `foss` → Settings → Secrets and variables → Actions → New secret
   `SUPABASE_DB_URL`. Il valore lo trovi in Supabase (progetto FOSS) → **Connect** → «Session pooler»:
   la stringa che inizia con `postgresql://`, con la password del database. **Lo inserisce il titolare.**
2. GitHub → Actions → **«Esporta struttura del database»** → Run workflow.
3. Alla fine, negli «Artifacts», c'è `struttura.sql`. Va riesportata solo quando FOSS cambia il database.

Il file contiene il riferimento al progetto di FOSS solo dentro l'indirizzo della funzione degli avvisi:
metti `struttura.sql` nella cartella del progetto FOSS **prima** del Passo 2 (in `sviluppo/sql/`) e il
comando lo sostituisce da solo con quello del cliente. Altrimenti sostituisci a mano
`suqpteanvnvvmfujlevi` con il riferimento del progetto nuovo.

### 3b. Il progetto Supabase nuovo

1. Supabase → New project (regione **eu-central-1**). Annota il riferimento del progetto e la chiave
   *publishable* (Project Settings → API) e mettili nel file di impostazioni.
2. **SQL Editor** → incolla tutto `struttura.sql` → Run. Il database ora ha tutte le tabelle e le regole,
   vuote.
3. **Chiavi degli avvisi:**

   ```bash
   perl sviluppo/strumenti/chiavi-avvisi.pl
   ```

   Stampa due cose: la **pubblica** va nel file di impostazioni (`VAPID_PUBBLICA`, poi rilancia il
   Passo 2); la **privata** è una riga `select vault.create_secret(...)` da incollare nel SQL Editor del
   progetto nuovo. Non salvarla in nessun file.
4. **Funzioni edge:** dalla cartella della copia, con la CLI di Supabase (`supabase login` una volta):

   ```bash
   supabase functions deploy push --project-ref <riferimento> --no-verify-jwt
   supabase functions deploy gif --project-ref <riferimento>
   supabase functions deploy supernotifica --project-ref <riferimento>
   supabase functions deploy trascrivi --project-ref <riferimento>
   ```

   Le funzioni stanno in `sviluppo/edge/`. I loro segreti (Edge Functions → Secrets) li inserisce il
   titolare: `GIPHY_KEY` per le GIF, `TRASCRIZIONE_CHIAVE` (Groq) per la trascrizione dei vocali, e quelli
   indicati in cima a `sviluppo/edge/supernotifica/index.ts` per le email. Senza, quelle funzioni
   restano spente ma il resto va.
5. **Authentication** → URL Configuration: *Site URL* = `https://<dominio>`, e tra i *Redirect URLs*
   `https://<dominio>/**`. Accendi anche *Leaked password protection*. I modelli delle email sono nella
   cartella `mail/`.
6. **L'amministratore:** dopo che il cliente si è registrato sul sito, nel SQL Editor:

   ```sql
   insert into admin_foss (utente_id, email)
   select id, email from auth.users where email = 'email-del-cliente@esempio.it';
   ```

   Il nome della tabella resta `admin_foss` anche nella copia (è solo un nome interno).

---

## Passo 4 — Pubblicare il sito del cliente

1. Carica la cartella della copia nel repository nuovo: con git, oppure con lo strumento senza git
   (il comando ci ha già scritto il repository indicato in `REPO`):
   `perl sviluppo/strumenti/pubblica.pl . "" "Prima versione"`.
2. Cloudflare → Workers & Pages → Create → Pages → collega il repository → nessun comando di build,
   cartella di uscita `/`. Poi *Custom domains* → il dominio del cliente.
3. Apri il sito, registrati con l'account del cliente, fai il punto 6 del Passo 3, e prova: crea uno
   spazio, un lavoro, una task, un messaggio in chat, un file.

Ogni modifica pubblicata sul repository del cliente arriva al suo sito in circa un minuto.

---

## Passo 5 — La grafica del cliente

Quello che il comando non può fare da solo:

| Cosa | Dove |
|---|---|
| **Logo** in alto a sinistra e nella schermata di avvio | `index.html`: le regole CSS `.mark::before` e `.mark::after` (sono due sagome SVG, una colorata e una del colore del testo). Sostituisci le due `mask-image` con il logo del cliente in SVG. |
| **Icone** dell'app (Home del telefono, scheda del browser) | `foss-icona-*.png`, `chat-icona-*.png`, `icone/`, `favicon.ico`, `favicon.svg` (stessi nomi, stesse misure) |
| **Copertine e immagini** della Home | i disegni del saluto sono in `index.html` (cerca `saluto`) |
| **Colore** più fine | i temi sono in testa a `index.html` (righe con `--amber:`) e in `sviluppo/chat/chat.css`; l'elenco dei temi è `TEMI` |
| **Email** | la cartella `mail/` e `sviluppo/edge/supernotifica/` |
| **Privacy e termini** | `privacy.html`, `termini.html`: il comando mette nome e dati del cliente, ma il testo legale va riletto per la sua attività |

## Passo 6 — Personalizzare il lavoro per il cliente

FOSS nasce per la produzione video e foto. Per un cliente di un altro settore si cambiano, in
`index.html`:

| Cosa | Dove |
|---|---|
| Professioni, tipi di lavoro e **fasi** (es. Brief → Riprese → Montaggio) | l'oggetto `TIPI` |
| I campi della scheda di un lavoro | `TIPI[...].dett` e `CAMPI` |
| Le task di partenza di ogni fase | `mkSubs` e i piani dentro `TIPI` |
| I dati dimostrativi (spazi, lavori, persone finte) | il blocco `SEED` (`UTENTI`, spazi, progetti) |
| I testi della guida dentro l'app | l'elenco dei capitoli vicino a `const VERSIONE` |
| Le viste di uno spazio (Bacheca, Lista, Calendario, Mappa, Note) | `schedeViste` |

I **preset** (lavori modello con le loro fasi e task) si possono anche creare dall'app stessa, senza
toccare il codice, e scegliere per ogni spazio in «Modifica spazio».

---

## Passo 7 — App per computer e Android (facoltative)

Servono solo se il cliente vuole le app oltre al sito.

- **Computer:** nella copia `desktop/` ha già nome, identificativo e indirizzi nuovi. Serve una chiave di
  firma degli aggiornamenti tutta sua: `cargo tauri signer generate`, la pubblica in
  `desktop/src-tauri/tauri.conf.json`, la privata nel segreto GitHub `TAURI_SIGNING_PRIVATE_KEY` del
  repository del cliente. Poi GitHub → Actions → «App per computer».
- **Android:** serve una firma nuova (keystore) nei segreti `ANDROID_KEYSTORE_BASE64` e
  `ANDROID_KEYSTORE_PASSWORD`, e il file `.well-known/assetlinks.json` con l'impronta della firma nuova
  (il comando non copia quello di FOSS). Poi Actions → «App Android».
- Le icone delle app si rigenerano dalle icone del sito (`android/icone.py`, `desktop/grafica/`).

---

## Tenere aggiornato il cliente quando FOSS migliora

Il sito del cliente è una copia: le novità di FOSS **non arrivano da sole**. Per portarle:

1. Tieni il file di impostazioni del cliente (es. `cliente.txt`) al sicuro: è la sua «ricetta».
2. Rilancia il Passo 2 in una cartella nuova, con la versione aggiornata di FOSS.
3. Riapplica le personalizzazioni fatte a mano (logo, testi, `TIPI`…). Conviene annotarle in un file
   `PERSONALIZZAZIONI.md` nel repository del cliente, man mano che le fai.
4. Se FOSS ha cambiato il database: riesporta la struttura (Passo 3a) e applica al database del cliente
   **solo le parti nuove** (le migrazioni con data successiva all'ultima applicata), mai lo schema intero
   sopra un database già in uso.
5. Pubblica sul repository del cliente.

---

## Lista di controllo finale

- [ ] Nessun «FOSS» visibile nel sito, nella chat, nelle email, nelle pagine legali
- [ ] Il sito parla col database del cliente (non con quello di FOSS): registrazione e accesso funzionano
- [ ] Spazio, lavoro, task, commento, messaggio in chat, file: tutto funziona
- [ ] Avvisi: Profilo → Avvisi → attiva → «Prova» arriva
- [ ] Recupero password: arriva l'email
- [ ] Il cliente è amministratore (pannello `admin.html` accessibile solo a lui, con il codice a due passaggi)
- [ ] Privacy e termini riletti con i dati del cliente
- [ ] *Leaked password protection* accesa in Supabase
