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

