# FOSS.chat — passaggio di consegne

Questo file serve a chi continua a sviluppare FOSS.chat (la chat del team stile WhatsApp dentro
FOSS) in un'altra conversazione. Fino all'11 novembre 2026 la chat è stata sviluppata in una
conversazione separata da quella del gestionale: da qui in poi si lavora tutto in un'unica chat.
Leggilo tutto prima di toccare la chat.

---

## 1. Dove sta cosa

| Cosa | Dove |
|---|---|
| App pubblicata | `https://foss.team/chat.html` (GitHub Pages, repo `davidemorabito0/foss`, ramo `main`) |
| **Sorgenti della chat** | `sviluppo/chat/` — `head.html`, `chat.css`, `body.html`, `js/*.js`, `fine.html` |
| Costruzione | `python3 sviluppo/chat/build.py` → riscrive `chat.html` nella radice del sito |
| Copia locale delle funzioni SQL | `sviluppo/sql/` (`chat_01.sql`, `chat_02.sql` = prima versione; `fosschat_2_funzioni.sql` = funzioni attuali) |
| Funzioni edge | `sviluppo/edge/push/` (avvisi push), `sviluppo/edge/gif/` (GIPHY) |
| Prove | `sviluppo/test/db/` (database) e `sviluppo/test/app/` (app nel browser) |
| Server dei media sul NAS | `nas/server.mjs`, `nas/avvio.sh`, `nas/docker-compose.yml` |
| Service worker comune | `sw.js` (stesso file per FOSS e per la chat) |
| Database | Supabase, progetto `suqpteanvnvvmfujlevi` |

**Regola d'oro: `chat.html` non si modifica mai a mano.** È un file generato: si cambia il
sorgente in `sviluppo/chat/`, poi si lancia `build.py`. Una modifica fatta direttamente in
`chat.html` viene cancellata alla build successiva.

Il JS è un'unica funzione chiusa `(function(){ ... })()`: i file in `js/` vengono incollati in
ordine alfabetico, quindi l'ordine dei numeri conta (`01-base.js` per primo, `99-via.js` per
ultimo). In `chat.css` la riga `</style>\n</head>` deve restare **in fondo al file** (la build
attacca il body subito dopo).

### I moduli JS

| File | Contenuto |
|---|---|
| `01-base.js` | stato `S`, costanti (`VERSIONE`, `MEDIA_NAS`, `MAX_FILE`), icone `I`, utilità (`esc`, `el`, `$`, `toast`, `conferma`, `nomeDi`, `nomeMsg`, `avatar`, `avatarMsg`, `colore`…) |
| `02-dati.js` | Supabase: caricamenti, realtime (`arrivaMessaggio`), letture, caricamento file (`caricaFile` → NAS, ripiego su bucket `chat`), avvisi del browser |
| `03-lista.js` | elenco delle chat (colonna sinistra) |
| `04-conv.js` | la conversazione: `msgHTML`, `bollaHTML`, raggruppamento, date, formattazione testo |
| `05-scrivi.js` | barra di scrittura, invio, vocali (registrazione e ascolto) |
| `06-media.js` | foto/video/file: preparazione (`prepara`), miniature, visore |
| `07-effetti.js` | effetti tipo iMessage |
| `08-editor.js` | editor foto |
| `09-pin.js` | blocco chat con PIN a 4 cifre |
| `10-pannelli.js` | info chat/gruppo, impostazioni |
| `11-emoji.js` | emoji, sticker, GIF (GIPHY via funzione `gif`) |
| `115-sfondo.js` | sfondi |
| `12-app.js` | avvio, tutti i click (`data-a="..."`), menu della chat (`menu-conv`) |
| `13-menu.js` | menu del messaggio (tocco lungo / clic destro) |
| `14-modifica.js` … `21-importanti.js` | funzioni di FOSS.chat 2: modifica, menzioni, fissati, sondaggi, lavori di FOSS, invio programmato/promemoria, colpetto, importanti |
| `22-importa.js` | **importazione di una chat esportata da WhatsApp** (lettore .zip, lettore del testo iPhone/Android, «chi è chi», caricamento a blocchi, annulla) |
| `99-via.js` | partenza |

---

## 2. Database (Supabase)

**Tabelle della chat:** `chat_conversazioni`, `chat_membri`, `chat_messaggi`, `chat_reazioni`,
`chat_letture`, `chat_nascosti`, `chat_pin`, `chat_presenza`, `chat_programmati`,
`chat_promemoria`, `chat_sticker`, `chat_voti`, `chat_importanti`. Impostazioni personali in
`profili.chat_cfg`. File nel bucket privato `chat` (quando non vanno sul NAS).

**Funzioni principali (RPC):** `chat_elenco`, `chat_apri_privata`, `chat_crea_gruppo`,
`chat_aggiungi`, `chat_togli`, `chat_esc`, `chat_modifica_gruppo`, `chat_letto`, `chat_modifica`,
`chat_elimina`, `chat_fissa`, `chat_vota`, `chat_chiudi_sondaggio`, `chat_blocca`,
`chat_imposta_pin`/`chat_verifica_pin`/`chat_reimposta_pin`, `chat_lavori`, `chat_crea_lavoro`,
`chat_importa`, `chat_importa_annulla`; dal lato FOSS `foss_completa_da_chat`,
`chat_gruppo_lavoro`, `chat_lavoro_c_e` (queste ultime due fatte dalla chat del gestionale: il
tasto «Crea chat / Entra in chat» del lavoro).

**Cose da sapere prima di cambiare il database:**

- **La verità è il database in produzione, non i file `.sql`.** La copia locale può restare
  indietro. Prima di riscrivere una funzione, leggila com'è adesso:
  `select pg_get_functiondef('public.nome_funzione(...)'::regprocedure);`, modifica quella e
  aggiorna anche `sviluppo/sql/fosschat_2_funzioni.sql`.
- **Due trigger su `chat_messaggi`:**
  - `chat_prima_del_messaggio` (BEFORE INSERT): mette `creato_il = clock_timestamp()`,
    `autore = auth.uid()` e controlla ogni tipo di messaggio (testo, sondaggio, lavoro,
    colpetto, file con `path`/`url`).
  - `chat_dopo_il_messaggio` (AFTER INSERT): aggiorna `ultimo_il` e le letture, poi manda i
    push via `pg_net` alla funzione edge `push` (chiave VAPID nel Vault, segreto `foss_vapid`).
- **Due interruttori interni (GUC)**, accesi solo dentro funzioni `security definer`:
  - `chat.interno = '1'` permette di scrivere a nome di un altro: lo usa l'orologio per i
    messaggi programmati.
  - `chat.importa = '1'` tiene la data e l'autore dei messaggi importati da WhatsApp e salta
    avvisi e letture. Lo accende solo `chat_importa`, e il trigger ricontrolla comunque che chi
    importa sia amministratore di FOSS e membro della chat.
- **Regex di Postgres:** le ripetizioni `{n,m}` arrivano al massimo a 255. `{1,300}` dà errore
  2201B e blocca tutti i messaggi con file (è già successo). Per gli URL si usa `{1,250}`.
- **Orologio:** il cron `fosschat-orologio` gira ogni 20 secondi (`chat_orologio`: programmati e
  promemoria); `fosschat-pulizia-orologio` gira di notte.
- **Amministratore di FOSS:** `e_admin_foss()` (tabella `admin_foss`). Oggi l'import da WhatsApp
  è riservato a lui.
- **Regole di sicurezza (RLS):** un messaggio lo legge solo chi è nella chat (`chat_membro`); si
  scrive solo come se stessi e mai di tipo `sistema`. Tutto il resto passa da funzioni
  `security definer` che controllano chi chiama. Le funzioni nuove vanno chiuse:
  `revoke execute ... from public, anon; grant execute ... to authenticated;`.
- Le migrazioni della chat si chiamano `fosschat_*` (ultima: `fosschat_importa_whatsapp`).

### Messaggi importati da WhatsApp

Hanno `media.importato = {n: nome su WhatsApp, k: chiave anti-doppione, da: chi ha importato,
l: lotto}`. Se l'autore WhatsApp non è collegato a nessuno su FOSS, `autore` è `null` e in chat
si mostra `importato.n` con un'iniziale colorata (`importatoDa`, `chiaveAutore`, `nomeMsg`,
`avatarMsg` in `01-base.js`). C'è un indice su `(conv_id, media->'importato'->>'k')`. Quando un
messaggio importato arriva in diretta non suona e non conta come non letto: la chat si ricarica
da capo (`arrivaImportato`).

---

## 3. Funzioni edge

- **`push`** (versione 10, `verify_jwt` spento perché la chiama il database):
  `sviluppo/edge/push/index.ts` + `webpush.js`. Serve sia FOSS sia la chat (tipo `fosschat`).
  Negli avvisi della chat passano la foto di chi scrive (`foto`/`foto_chat`) e l'anteprima della
  foto (`img`/`img_url`).
- **`gif`** (`verify_jwt` acceso): cerca su GIPHY. La chiave sta nel segreto `GIPHY_KEY`, non nel
  codice.
- **I segreti li inserisce Davide.** Chiavi API e token non si scrivono mai al suo posto: gli si
  dice dove incollarli.

---

## 4. Server dei media sul NAS

- NAS QNAP TS-464 in casa (`192.168.1.25:8080`). In Container Station c'è l'app **«fosschat»**:
  un solo container `node:22-alpine` con comando
  `wget -qO /tmp/avvio.sh https://foss.team/nas/avvio.sh && exec sh /tmp/avvio.sh`, volume
  `/share/FOSSchat:/data`, variabili `PUBBLICO=https://media.foss.team` e `CF=<comando
  cloudflared incollato da Davide>`.
- Si raggiunge da fuori con il tunnel Cloudflare `fosschat-nas`: `media.foss.team` →
  `http://localhost:8080`.
- In `01-base.js`: `MEDIA_NAS = 'https://media.foss.team'`. Limite di 2 GB a file sul NAS e 50 MB
  sul bucket Supabase. Se il NAS non risponde, `caricaFile` ripiega da solo sul bucket `chat`. Se
  un file già caricato non arriva, la chat mostra «Il server dei media sembra offline» con il
  tasto Riprova.
- `avvio.sh` legge il token del tunnel con `grep -oE 'eyJ[A-Za-z0-9_=-]+'`: così funziona anche
  quando Davide incolla il comando intero.
- Per aggiornare il server basta pubblicare `nas/server.mjs`/`avvio.sh` e riavviare il container
  (lo scarica a ogni avvio).

---

## 5. Avvisi e notifiche

- **Service worker** `sw.js`, cache `foss-guscio-vNN`. A ogni pubblicazione che tocca la chat o FOSS
  si **alza il numero** (oggi v81).
- Il SW non mostra l'avviso se la chat è già aperta e in primo piano (`chatDavanti()`; su
  Safari non è affidabile, quindi lì l'avviso arriva sempre).
- **Nel browser:** numero nel titolo della scheda e avvisi a comparsa in basso (stile WhatsApp
  Web). Si chiudono da soli quando la chat viene letta (`chiudiAvvisi`, `pulisciAvvisi`).
- **Ancora da provare dal vivo:** il push vero sul telefono. Davide non ha ancora attivato
  «Avvisi su questo dispositivo», quindi non ha dispositivi registrati.

---

## 6. Come si prova (obbligatorio prima di consegnare)

Davide vuole **prove vere con esito positivo**, non «dovrebbe funzionare».

1. **Database** (Postgres finto in memoria, PGlite):
   `cd sviluppo/test/db && npm install && node prova.mjs`. Oggi: 122 prove riuscite, 0 fallite.
   Il file `prelude.sql` simula il necessario di Supabase (auth, profili, `admin_foss`…), poi
   carica `../../sql/fosschat_2_funzioni.sql`. Ogni funzione nuova va aggiunta lì con le sue prove.
2. **App nel browser con un Supabase finto** (Playwright + Chrome):
   - servire la radice del sito: `python3 -m http.server 8123` (dalla cartella del repo);
   - poi `python3 sviluppo/test/app/prova7.py` (menu e reazioni), `prova8.py` (modifica,
     telefono), `prova9.py` (FOSS.chat 2), `prova11.py` (avvisi), `prova13.py` (import da
     WhatsApp: 24 controlli).
   - `mock-supabase.js` sostituisce supabase-js. Se servono RPC nuove, vanno aggiunte nel suo
     oggetto `RPC`. Gli screenshot finiscono in `sviluppo/test/app/shot/`.
3. **Dal vivo** su foss.team con Claude in Chrome (scheda di Davide, già collegato):
   - creare un gruppo di prova con dentro solo Davide, provare lì, controllare il risultato
     nel database con SQL e poi cancellare il gruppo;
   - **mai** provare nelle chat vere con le altre persone.
   - Il vecchio gruppo «Prova FOSS.chat (Claude)» è rimasto senza membri: Davide ne è uscito.
   - Nota: dentro l'estensione `fetch` verso `media.foss.team` fallisce per un limite
     dell'estensione, ma le immagini si caricano. Si controlla con `img.naturalWidth`.

---

## 7. Pubblicare

1. `python3 sviluppo/chat/build.py`
2. Alzare la versione della cache in `sw.js`.
3. Lanciare le prove (sezione 6).
4. `git pull` di `main` prima di tutto (ci lavorano due conversazioni), commit, `git push` su
   `main`. GitHub Pages pubblica in circa un minuto.
5. Se c'è una migrazione: prima il database, poi l'app. Altrimenti l'app nuova chiama funzioni che
   non esistono ancora. L'assistente può chiedere conferma a Davide per toccare la produzione;
   lui ha detto di procedere.

---

## 8. Cosa c'è già (in breve)

L'elenco completo è nel `README.md` del sito, sezioni «FOSS.chat» e «FOSS.chat 2».

- Chat private e gruppi tra persone dei propri team, stesso account di FOSS.
- Messaggi, risposte, reazioni, inoltro, eliminazione, modifica entro 15 minuti.
- Menzioni `@nome`/`@tutti`, fissati, sondaggi, invio programmato, invio senza suono,
  «Ricordamelo», importanti, selezione multipla.
- Foto (con editor), video, vocali con onda, documenti, sticker, GIF (GIPHY), effetti tipo iMessage.
- Formattazione `*grassetto*`/`**grassetto**`, `_corsivo_`, link.
- Lavori di FOSS in chat: `#lavoro` come scheda viva e «Crea un lavoro di FOSS» dalla chat
  (nasce in FOSS e si completa con `foss_completa_da_chat`). In più il gruppo del lavoro creato
  da FOSS (`chat_gruppo_lavoro`).
- Colpetto, blocco chat con PIN, silenzia, blocca, svuota, archivia.
- Grafica desktop simile a WhatsApp Web; tema chiaro e scuro.
- Avvisi push e del browser con foto di chi scrive e anteprima.
- File sul NAS (`media.foss.team`) con ripiego su Supabase.
- **Import da WhatsApp** (solo amministratore di FOSS): .zip o .txt da iPhone e Android, in
  italiano e in inglese. Si sceglie «chi è chi» (nome WhatsApp → persona FOSS, oppure tieni il
  nome, oppure non importare). I messaggi entrano con la loro data e senza avvisi, non si doppiano
  se si reimporta, e l'importazione si può annullare.

---

## 9. Ancora aperto

- Provare dal vivo il push sul telefono (serve che Davide attivi gli avvisi su un dispositivo).
- Provare dal vivo la creazione di un lavoro dalla chat. Finora è stata provata solo con
  annullamento, senza scrivere davvero.
- I vocali di WhatsApp sono `.opus`: su Chrome e Android si sentono, sugli iPhone con iOS vecchi
  forse no (non provato).
- Il gruppo vuoto «Prova FOSS.chat (Claude)» si può cancellare quando Davide lo chiede.

---

## 10. Come lavorare con Davide

- Italiano, del tu, risposte brevi ma educate, prima la risposta.
- Una sola strada consigliata, non menu di opzioni. «vai», «procedi» e «via» vogliono dire: esegui.
- Il lavoro lo fa l'assistente (migrazioni, pubblicazione, prove), non gli si passano i passaggi.
  Lui non programma: niente spiegazioni tecniche.
- Si consegna solo a lavoro finito e provato, con le prove positive. Niente consegne a metà.
- Detta a voce: gli errori di trascrizione si interpretano dal contesto.
- File in chat solo se li chiede. Sul suo PC si toccano solo le cartelle che ha collegato.

---

## 11. Aggiornamenti dopo il passaggio (chat del gestionale, 11-12 novembre 2026)

- **2.1 Temi colore di FOSS** (`colori` in `profili.chat_cfg`, predefinito `brand`): regole `:root[data-colori=…][data-tema=…]` in fondo a `chat.css`, generate dai temi del sito (Autunno e Limoni ritoccati solo nella chat: Autunno marrone scuro, Limoni giallo limone e verde foglia). Variabili nuove: `--pieno`/`--su-pieno` (tasti pieni), `--verde-ios`, `--cit-mio`, `--su-verde`. Il visore si chiude toccando fuori dalla foto.
- **2.2 Tempo reale che si ricollega da solo** (`02-dati.js`: `riavviaTempoReale`, `controllaTempoReale`, `canaliVivi`): al ritorno sulla chat, quando torna la rete, su errore del canale, al rinnovo dell'accesso e con un controllo leggero ogni 20 s. Prova: `prova15.py`.
- **2.3** (`prova16.py`):
  - grandezza del testo: moltiplicatore `--tk` (vale anche sul telefono, lista e campo di scrittura);
  - «Rendi privata» / «Togli privata» (era «Blocca chat»): chiede sempre il codice;
  - **Super notifica** (solo `e_admin_foss`): menu del messaggio → Altro → Super notifica. Funzione edge `chat-supernotifica` (`sviluppo/edge/supernotifica/`), tabella `chat_super_notifiche` (una volta per messaggio, 20 al giorno). Usa `RESEND_API_KEY` come `avvisa-email`;
  - chat con te stesso: `chat_apri_privata(te stesso)` crea una privata con un solo membro (coppia `io:io`); in «Nuova chat» c'è «Nome (tu)».
- FOSS v72: barra in basso del telefono a tre voci (Home, Chat, Profilo) come quella della chat.
- **2.4 Idee di MSN** (`js/24-msn.js`, `prova17.py`):
  - messaggio personale (`chat_cfg.frase`, 140 caratteri): sotto il nome in testata, in «Nuova chat» e nelle info;
  - cornice della foto a scelta (`chat_cfg.cornice`, elenco `CORNICI` in `01-base.js`, classi `.av.cr-*`), la vedono tutti: `chat_contatti`/`chat_persone` restituiscono `frase` e `cornice`;
  - «è appena entrato»: avviso in basso (in alto sul telefono) con suono quando un collega entra, una volta ogni 15 minuti per persona (`notaEntrati`, si spegne in Impostazioni);
  - sfondi animati (`chat_cfg.vivo`: bolle, stelle, neve, lucciole, coriandoli) su canvas dietro ai messaggi; col colpetto fanno un salto (`vivoScossa`). Fermi con «riduci movimento».
- **2.5 Trillo** (colpetto): suono forte `suonoTrillo` (tre ronzii + campanello, con limitatore), lo sente chi lo riceve e chi lo manda; l'audio si sblocca al primo tocco sulla pagina.
- **2.6 Colori del gruppo** (`js/25-stile.js`, `prova18.py`): colonna `chat_conversazioni.stile` = {primario, secondario, palette}; li cambia solo chi ha creato il gruppo (se è uscito, un amministratore) con `chat_stile_gruppo(conv, stile)`, che scrive anche il messaggio di sistema. `chat_elenco` restituisce `stile`. Primario = accenti e tasti, secondario = bolle dei propri messaggi, palette = una delle 10 (`PALETTE`) disegnate in SVG come sfondo. Valgono per tutti, sopra al tema; uno sfondo personale scelto per quella chat resta più forte.
- **2.6.1** iPhone dall'icona: `--alto` (altezza della tastiera) si usa solo quando la tastiera c'è davvero; prima la pagina restava corta della barra di stato (`prova19.py`).
- **2.7** (`prova20.py`): i suoni della chat sono «di contorno» (`navigator.audioSession.type = 'ambient'`, motore audio sospeso dopo ogni suono) e non fermano Spotify; i vocali usano `playback` mentre suonano. File non partiti: sotto la bolla «Non inviato · Riprova» (anche documenti e vocali), caricamento fermo per 45 s interrotto da solo, anello/giro toccabile per fermarlo, riprova automatica quando torna la rete.
- **2.7.1** microfono: prima di `getUserMedia` la sessione audio passa a `play-and-record` (con `ambient` l'iPhone nega il microfono), poi torna `ambient`; se il microfono è negato, `spiegaMicrofono` mostra dove sbloccarlo (iPhone, Android, computer). Prova: `prova21.py`.
- **2.7.2** vocali: il pallino scorre con `requestAnimationFrame`; la durata usata è quella salvata (`media.dur`) quando quella dichiarata dal file non torna (l'iPhone dichiara durate sbagliate); l'onda si calcola dal file registrato (`ondaDalFile`), e i vocali vecchi con onda piatta la ricalcolano mentre li ascolti. Prova: `prova22.py`.
- **2.7.3** iPhone dall'icona (correzione vera della fascia vuota): la pagina crede di essere alta come lo schermo meno la barra di stato. `--schermo` = altezza vera (su iPhone in modalità icona `screen.height`), usata da html, body e #app; `--alto` solo con la tastiera aperta. Prova: `prova23.py` (con la versione vecchia fallisce: 873 invece di 932).

### 2.7.4 / FOSS v73 — fascia vuota in basso sull'iPhone (app dall'icona)
- Causa vera (iOS 26, bug WebKit 301108): se la pagina è più corta dello schermo, l'app aperta dall'icona viene disegnata più corta della barra di stato. Allungare la chat (2.7.3, `--schermo`) era sbagliato: iOS taglia comunque al bordo corto e le etichette della barra sparivano. Tolto.
- Soluzione (frappe-ui #1284/#1289, verificata nel simulatore iOS 26.2): `html{min-height:min(100lvh, calc(100% + env(safe-area-inset-top)))}` solo dall'icona (`display-mode: standalone` o classe `html.da-icona` messa da uno script nel `<head>`). In chat `html` non è più `position:fixed` (solo `body`).
- Le chat finiscono sopra la barra (`.lato` con spazio in basso); in FOSS `--nav-h` conta anche il bordo del telefono.
- Prova: `sviluppo/test/app/prova24.py` (sostituisce prova23).

### 2.7.5 — due icone separate sul telefono
- La chat ha il suo manifest `manifest-chat.json` (id e start_url `./chat.html`, nome FOSS.chat, icone `chat-icona-*.png` nella radice, condivisione da altre app). `manifest.json` di FOSS ha ora `"id": "./"`.
- Prima la chat usava il manifest di FOSS (start_url `./`) e l'icona aperta portava a FOSS.
- Sorgente dell'icona: `sviluppo/chat/chat-icona.svg` (il LOGO della chat).

### 2.8.1 — le date in alto non si accavallano più
- I separatori dei giorni (`.giorno`) non sono più `position:sticky` (si incollavano tutti in cima, uno
  sull'altro). Mentre scorri compare una sola data in alto (`#dataFluttua`, `mostraDataFluttua` in
  `04-conv.js`), quella del primo messaggio che vedi, e sparisce da sola dopo 1,3 s (come WhatsApp).

### FOSS — copertine degli spazi (13 novembre 2026)
- In Safari e nell'app per computer l'icona degli spazi di lavoro nella Home era tagliata: la copertina (`.hm-spc .cop`) restava larga
  e alta zero perche' la scheda (un `<button>`) allinea i figli a sinistra (`align-items:flex-start`). Ora ha
  `width:100%` e l'altezza dal padding (`padding-bottom: calc(100% / 3.6)`), che funziona ovunque.

### 2.9 — stato: online, occupato, invisibile (`js/27-stato.js`)
- Intorno alla foto di chi è online un cerchio **verde**; chi si è messo «occupato» un cerchio **rosso**
  (colori fissi, non del tema). Al posto del vecchio pallino. Con una cornice scelta, il cerchio va dentro la foto.
- Il proprio stato si sceglie in Impostazioni → «Come ti vedono gli altri» → «Il tuo stato»; sta in
  `profili.chat_cfg.stato` e passa agli altri nella presenza del tempo reale (`canaleOnline.track({... stato})`),
  quindi **nessuna modifica al database**. «Invisibile» fa `untrack()` e non chiama `chat_ping`
  (niente «online» e niente «ultimo accesso» aggiornato).
- Su GitHub `.github/workflows/controllo-chat.yml` fa girare le prove della chat nel browser (sezione 6)
  a ogni modifica della chat (anche nei rami `prova-*`) e controlla che `chat.html` sia uguale ai sorgenti.

---

## 12. App per computer (Mac e Windows) — cartella `desktop/`

Dal 13 novembre 2026 FOSS ha un'app per Mac e Windows fatta con **Tauri 2**. Non contiene una
copia del sito: apre le pagine pubblicate (`https://foss.team/` e `https://foss.team/chat.html`),
quindi **ogni pubblicazione del sito arriva subito anche all'app**. Stesso database, stesso
accesso. Il sito per il resto del team non cambia.

### Com'è fatta

- Una finestra con **due pagine**: FOSS (pagina «foss») e la chat (pagina «chat»). **Di serie sono separate**
  (una alla volta; dalla 1.0.3, anche per chi aveva l'app: `schema` 2 in `impostazioni.json`). Si possono avere
  **affiancate** (chat a destra o a sinistra: `lato`) oppure **una alla volta a tutta finestra** (`modo = pieno`,
  `davanti` = quale si vede): il tasto FOSS.chat di FOSS porta alla chat, il logo/tasto FOSS della chat riporta
  a FOSS, ⌘1/⌘2 (Ctrl+1/2) scelgono, ⌘J scambia, ⌘\ passa da affiancate a una alla volta. Si sceglie anche
  nel pannellino dell'app e dal menu dell'icona (`disponi`, `porta_davanti`, `cambia_modo`, `cambia_lato` in `lib.rs`).
  Affiancate: la chat si allarga/stringe tirando il suo bordo verso FOSS, si nasconde con
  ⌘J/Ctrl+J o con la linguetta «›» (o «‹») sul bordo, si riapre col tasto FOSS.chat di FOSS.
- Partono da `desktop/locale/avvio.html`, che aspetta la rete e poi apre il sito.
- In cima a entrambe l'app mette il **ponte** `desktop/src-tauri/src/ponte.js` (prima di ogni altro
  script). Il ponte: definisce `window.fossDesktop`; manda nel browser i link esterni e porta
  FOSS↔chat nella colonna giusta (`window.open`, link, `location`); prende il numero dei non letti
  da `navigator.setAppBadge` (quello che la chat già calcola in `aggiornaTitolo`); in FOSS gestisce
  i file trascinati, le scadenze del giorno e la **freccia gialla dell'aggiornamento** (in basso a destra).
- `src-tauri/src/lib.rs`: finestra, disposizione delle due colonne, navigazione, download (cartella
  Download + avviso), aggiornamenti, comandi che le pagine possono chiamare (elenco `COMANDI`, uguale a
  `build.rs`; solo le pagine del sito li possono chiamare). `avvisi.rs`: avvisi di sistema col clic che
  porta al punto giusto. `vassoio.rs`: icona nella barra dei menu (Mac) / vicino all'orologio (Windows)
  col numero, menu del Mac (FOSS, Modifica, Vista, Finestra).
- Prima dell'accesso la chat mostra «entra prima in FOSS»: il ponte della chat controlla ogni 2 s se compare la sessione
  di Supabase (`sb-…-auth-token` nel localStorage, comune alle due colonne) e allora ricarica la chat.
- **Impostazioni dell'app**: un tasto in FOSS in alto a destra, subito a sinistra della foto del profilo
  (`#fdAppBtn`, messo dal ponte prima di `#meBtn`), apre un pannellino sotto il tasto (`#fdPannello`): FOSS e la
  chat separate/affiancate, lato della chat (sinistra, destra, nascosta), avvio all'accensione, avvisi, prova
  avviso, collega il browser, versione e aggiornamento. ⌘, (Ctrl+,) e «Impostazioni…» del menu aprono lo stesso
  pannellino (`apri_impostazioni` → messaggio `impostazioni` al ponte). Niente finestre a parte.
- Sul Mac l'avviso compare anche con FOSS in primo piano (il delegato risponde sì a `shouldPresentNotification`):
  quando mandarlo lo decide `avvisi::mostra`, che lo salta se la pagina giusta è già davanti a te.
- Icone: sorgenti in `desktop/grafica/` (`icona.svg` dal logo di FOSS), file finali in `src-tauri/icons/`
  (`cargo tauri icon desktop/grafica/icona-1024.png -o desktop/src-tauri/icons`).

### Il patto tra sito e app (non rinominare senza aggiornare `ponte.js`)

- **`window.fossDesktop`** esiste solo nell'app. Nel sito si usa solo così: `if(window.fossDesktop) ...`.
  `avviso({titolo, testo, foto, hash, notifica, azione, suono, vista})`, `attenzione()` (il trillo:
  icona che salta/lampeggia), `impostazioni()`, `imposta(k, v)`, `aggiorna()`, `collegaBrowser()`, `mostraChat()`.
- **`window.fossApp`** (in `index.html`, blocco «APP PER COMPUTER» in fondo allo script): `pronto()`,
  `cerca()` (⌘K), `nuovaTask()` (⌘N; risponde `ok` / `serve-progetto` / `non-puoi`), `dove()`,
  `allega(files)` (usa `allegaAlLavoro`), `apriNotifica(id)` (come la campanella), `apriMie()`, `scadenze()`.
- Agganci nel sito: `index.html` → `<script src="apri-app.js">` nel `<head>`, `avvisoSulComputer` chiamato da
  `arrivaNotifica`, stato `'desktop'` in `statoPush`/`rigaAvvisi`. Chat → `head.html` (`apri-app.js`),
  `js/26-desktop.js` (`avvisoDesktop`), chiamate in `02-dati.js` (`arrivaMessaggio`), `20-colpetto.js`,
  `19-tempo.js` (promemoria), stato `'desktop'` in `10-pannelli.js`.
- Gli avvisi della chat seguono le stesse regole del suono: niente se la chat è silenziata (salvo
  menzioni), niente se stai guardando quella chat; nelle chat protette col codice niente testo.
  FOSS manda tutte le notifiche della campanella (non durante «silenzia», salvo menzioni e tag).
  Con la finestra davanti e la pagina in vista l'avviso di sistema non parte (la pagina lo mostra già).

### Link di foss.team aperti nell'app

Il sistema non permette a un'app di «prendersi» i link `https://`. Quindi: l'app registra `foss://`
(`foss://apri?u=<indirizzo foss.team>`), e `apri-app.js` (nel sito) passa il link all'app **solo nei
browser collegati**: al primo avvio l'app apre `https://foss.team/#app-collega` nel browser
predefinito, che si segna `localStorage.foss_app_pc = '1'`. Da lì ogni pagina di FOSS aperta in quel
browser prova ad aprire l'app e mostra «Ti ho aperto FOSS nell'app» con «Continua nel browser»
(vale per la scheda) e «Non aprire più i link nell'app». `?browser=1` resta nel browser.
`#app-scollega` scollega. Sul telefono e nell'app `apri-app.js` non fa nulla.

### Avvisi, icona, avvio

- **Rispondi dall'avviso** (1.0.5): gli avvisi dei messaggi hanno il campo «Scrivi una risposta…» (Mac:
  `setHasReplyButton`; Windows: avviso costruito a mano con `<input>` e «Invia»). La risposta va a `rispondi` →
  ponte della chat (`rispondi`) → `window.__fossChatRispondi` in `26-desktop.js`, che la manda come un messaggio
  normale (nei gruppi cita il messaggio) senza aprire la finestra.
- **Non disturbare** (1.0.5): nel pannellino «Per 1 ora», «Fino a domani», «Riprendi» e «Ogni giorno dalle … alle …»
  (`silenzio_orario`, `silenzio_da`, `silenzio_a`, `pausa_fino` in `impostazioni.json`; `in_silenzio`, `metti_pausa`,
  `annuncia_silenzio` in `lib.rs`, controllato ogni 30 s). Niente avvisi e niente suoni della chat
  (`fossDesktop.silenzio()` in `suono()` di `01-base.js`); il numero sull'icona resta; sul Mac accanto al numero c'è ☾.

- I clic sui menu li gestisce un solo gestore (quello dell'icona, che in Tauri riceve tutti i menu): con due
  gestori ogni voce partiva due volte (⌘J apriva e richiudeva la chat).
- Mac: avvisi del Centro notifiche con un delegato nostro (`avvisi.rs`, modulo `mac`): ogni avviso ha un
  identificativo, il clic lo restituisce e da li' l'app sa dove portarti. Windows: avvisi «toast» con
  `tauri-winrt-notification`, nome app `team.foss.app` (lo registra l'installer). Su Windows il clic da
  Centro notifiche, molto dopo, può solo aprire l'app.
- Chiudere la finestra la nasconde: l'app resta nella barra in alto (Mac) o vicino all'orologio
  (Windows) e continua a ricevere. Si esce da «Esci da FOSS» (menu dell'icona o ⌘Q).
- Avvio automatico acceso al primo avvio (parte nascosta, `--nascosta`); si spegne dalle impostazioni o
  dal menu dell'icona. Su Windows le pagine nascoste restano sveglie con gli argomenti di WebView2 in
  `lib.rs` (audio senza tocco, niente rallentamento in secondo piano).
- Microfono/fotocamera: concessi solo alle pagine di FOSS; testi per il Mac in `src-tauri/Info.plist`.

### Aggiornamenti dell'app

- A ogni avvio (e ogni 6 ore) l'app legge
  `https://github.com/davidemorabito0/foss/releases/latest/download/latest.json`. Se c'è una versione
  nuova compare la **freccia gialla**: un clic scarica, installa e riapre l'app (anche dal menu
  dell'icona e dalle impostazioni).
- Gli aggiornamenti sono firmati: la chiave pubblica sta in `tauri.conf.json`, la **privata** solo nel
  segreto GitHub `TAURI_SIGNING_PRIVATE_KEY` (e nella copia di Davide). Se si perde, le app installate
  non accettano più aggiornamenti: serve una chiave nuova e reinstallare a mano.
- Le modifiche al sito NON richiedono una versione nuova dell'app. Serve solo quando cambia `desktop/`.

- Il sito lo pubblica Cloudflare Pages a ogni push su `main` (di solito in meno di un minuto). Se resta fermo
  (stato «Cloudflare Pages» del commit su GitHub in corso da molto o fallito), un nuovo commit lo fa ripartire.
  Le funzioni nuove della chat usate dall'app (es. `__fossChatRispondi`) arrivano solo quando il sito è pubblicato.

### Pubblicare una versione nuova dell'app

`.github/workflows/app-desktop.yml`: con un tag `vX.Y.Z` (oppure GitHub → Actions → «App per computer» →
Run workflow → numero di versione) costruisce `.dmg` (Mac universale, Intel e Apple Silicon) e
`-setup.exe` (Windows), li mette in **Releases** e scrive `latest.json` alla fine. Il numero di versione
lo scrive il workflow in `tauri.conf.json`/`Cargo.toml`: in `main` può restare quello vecchio.
Firma Apple facoltativa (segreti `APPLE_*`, vedi in cima al workflow): senza, al primo avvio sul Mac
l'app va autorizzata in Impostazioni di Sistema → Privacy e sicurezza → «Apri comunque». Windows senza
certificato: SmartScreen → «Ulteriori informazioni» → «Esegui comunque».

### Come si prova (obbligatorio prima di consegnare)

1. Strumenti: Rust (`rustup`) e `cargo install tauri-cli --version "^2"`.
2. `cd desktop/src-tauri && cargo build`, poi dalla radice `python3 sviluppo/test/desktop/prova_app.py`:
   apre l'app vera con FOSS e la chat **finti** (server `sviluppo/test/desktop/server.py` sulla porta
   8124: al posto di supabase-js mette `../app/mock-supabase.js` + `mock-foss.js`) e controlla 39 cose
   (avvisi chat/FOSS e clic, gruppo silenziato e @tutti, trillo, numero, colonna della chat, link,
   ⌘K/⌘N, file trascinati, scadenze, freccia di aggiornamento, avvisi spenti, impostazioni).
   Variabili: `FOSS_SITO` (solo `http://localhost`), `FOSS_PROVA` (registro), `FOSS_PROVA_JS` (script di
   prova messo nel ponte), `FOSS_PROVA_AVVISI_VERI=1` (mostra anche gli avvisi veri).
3. Le prove della chat nel browser (sezione 6) devono restare tutte come prima.
   Su GitHub il controllo `.github/workflows/controllo-app.yml` costruisce l'app per Mac, fa le stesse 39
   prove e lascia l'app da provare negli «Artifacts»; per Windows controlla che si costruisca.
4. Costruzione completa sul Mac: `TAURI_SIGNING_PRIVATE_KEY="$(cat <chiave>)" cargo tauri build`.
