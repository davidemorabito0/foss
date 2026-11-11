# FOSS

*Foss*: cascata, in islandese.

Gestionale di produzione per progetti creativi: dal brief alla consegna, con fasi
in stile DaVinci Resolve, task e subtask assegnabili, calendario, mappa e notifiche.

**Applicazione a pagina singola.** Tutto sta in `index.html`: nessuna build, nessuna
dipendenza da installare. Si apre anche facendo doppio clic sul file.

## Struttura del lavoro

- **Spazio di lavoro** — l'ambito: "Video Milano", "Siti web", "YouTube". Ogni spazio
  ha i suoi progetti, il suo calendario e la sua mappa, separati dagli altri.
- **Progetto** — il singolo lavoro dentro uno spazio: un cliente, un tipo (video,
  fotografia, social, sito web, evento dal vivo, generico), una pipeline di fasi, un team.
- **Task** — le lavorazioni dentro una fase del progetto, ognuna con un responsabile.
- **Subtask** — le singole spunte dentro una task.

Progetti e task si condividono con un link: `#/p/<idProgetto>` per un progetto,
`#/p/<idProgetto>/t/<idTask>` per una task. Aggiungendo `?v=1` il link apre tutto
in sola lettura, per chi guarda da fuori.

## Funzioni

- Barra fasi in basso: avanzando si spengono le fasi chiuse, il tasto cronometro le riapre
- Al 100% di una fase il cerchio diventa il tasto verde **COMPLETATO**: in una fase
  intermedia fa avanzare alla fase successiva, nella fase di consegna chiude il
  progetto con un'animazione e riporta all'elenco progetti
- Menu principale con gli spazi di lavoro e wizard guidato per crearne di nuovi
- Ogni spazio ha icona, colore, sfondo al 20% di opacità e l'elenco di chi ci lavora
- Cinque viste dentro ogni spazio, riordinabili tenendole premute: tessere, lista,
  calendario (eventi trascinabili), mappa di Milano e bacheca delle note adesive
- Note libere anche sulla singola task, con grassetto, sottolineato e link cliccabili
- **Pressione prolungata di 2 secondi** su un testo o un valore per rinominarlo:
  titoli, clienti, campi della scheda, task, subtask, responsabili. Durante
  l'attesa il campo si riempie. Funziona con mouse, dito e Apple Pencil
- Filtri salvabili per tipo, priorità, fase, tag e cliente
- Tasto destro contestuale in ogni zona dell'interfaccia
- Ctrl+Z su ogni modifica, registro completo delle azioni nel profilo
- Blocco del singolo progetto con password
- Sette temi colore, ognuno con variante chiara e scura
- Notifiche a schermo intero per menzioni e assegnazioni

## iPad, Apple Pencil e telefono

Tutte le manipolazioni usano i *pointer events*, quindi funzionano identiche con
mouse, dito e Apple Pencil: trascinare un evento nel calendario, spostare una nota,
riordinare i tasti delle viste, ridimensionare un post-it.

- Su schermi sotto i 1100px la colonna di sinistra diventa un pannello **Scheda**
  che scorre da sinistra, e l'avanzamento di fase (cerchio o tasto COMPLETATO)
  resta sempre in testa alla fase: su iPad non si perde nessuna funzione
- Sotto i 620px la barra delle viste si sposta in basso, sopra la barra delle fasi,
  e vengono rispettate le *safe area* di iPhone
- Aree toccabili ingrandite dove il puntatore è grosso (`hover:none`)
- `manifest.json` e `sw.js` rendono l'app installabile: su iPad e iPhone
  Safari → Condividi → **Aggiungi a Home**, e parte a tutto schermo come un'app

Il service worker mette in cache solo il guscio dell'applicazione, **mai i dati**:
un aggiornamento non può sovrascrivere il lavoro salvato.

## I dati non si perdono con gli aggiornamenti

- I dati stanno sotto la chiave `foss_v1` con un numero di schema (`SCHEMA = 4`).
  Chi aveva dati sotto la vecchia chiave `feedback_v3` se li ritrova: al primo
  avvio vengono spostati e la vecchia chiave viene rimossa
- Ad ogni avvio `normalizza()` riempie i campi che le versioni nuove hanno aggiunto
  e sistema i valori fuori scala, senza mai cancellare quello che c'era: un archivio
  salvato con una versione vecchia si riapre completo
- Prima di ogni salvataggio la versione precedente finisce in `feedback_backup`
- Profilo → **Esporta i dati** scarica un `.json` con tutto (spazi, progetti, task,
  note, filtri, registro); **Importa** lo rimette dentro. Conviene esportare prima
  di ogni aggiornamento importante
- Quando Supabase è attivo, lo stesso archivio viene anche salvato sul database:
  il browser diventa solo una copia locale

## Backend

Supabase (progetto `feedback`, regione eu-central-1):

- `profili` — dati utente, tema e preferenze di notifica
- `spazio_lavoro` — stato dei progetti per utente, in JSON
- `inviti` — chi è atteso nel team: al primo accesso sceglie il proprio nome
  dall'elenco, indica la sua email e imposta la password, che resta la sua.
  La tabella non è leggibile direttamente: si passa dalle funzioni
  `inviti_aperti()` e `usa_invito()`. Chi apre il sito vede i nomi in attesa,
  quindi mettici solo persone che sai già di invitare.
- bucket `avatar` — foto profilo

Chiavi e URL sono nella sezione `SUPABASE` in fondo a `index.html`. La chiave
pubblicabile è pensata per stare nel client: i permessi veri sono nelle policy
row level security del database.

## FOSS.chat

`chat.html` è la chat del team (stile WhatsApp, con gli effetti di iMessage). Si apre dal tasto
**FOSS.chat** nella colonna di sinistra (sul telefono: il tasto tondo accanto alla campanella).
Usa lo stesso account di FOSS: nessuna registrazione in più.

- Tabelle: `chat_conversazioni`, `chat_membri`, `chat_messaggi`, `chat_reazioni`, `chat_nascosti`,
  `chat_sticker` (sticker e GIF salvati), `chat_presenza`, `chat_pin` (codice di 4 cifre, cifrato)
- Si può scrivere solo a chi sta in uno dei propri team; ogni chat la vede solo chi ne fa parte
- File (foto, vocali, video, documenti, sticker) nel bucket privato `chat`. Quando il NAS sarà
  collegato basta scrivere il suo indirizzo in `MEDIA_NAS` dentro `chat.html`: se il NAS non
  risponde, la chat mostra «Il server dei media sembra offline»
- Avvisi sul telefono: la stessa funzione `push` di FOSS (tipo `fosschat`)
- Le impostazioni della chat stanno nella colonna `profili.chat_cfg`

### FOSS.chat 2

- **Tocco lungo su un messaggio** (clic destro sul computer): reazioni, Rispondi, Copia, Modifica,
  Fissa, Ricordamelo, Inoltra, Importante, Seleziona, Info, Elimina. In cima al menu: letto da chi
  e quando, se è stato modificato, chi l'ha fissato, il promemoria attivo
- **Modifica** entro 15 minuti (anche con ↑ sul computer): accanto all'ora compare «modificato»,
  toccandolo si vede quando (`chat_modifica`, colonna `modificato_il`)
- **Menzioni** con `@nome` e `@tutti`: avvisano anche chi ha silenziato il gruppo; nell'elenco
  delle chat un badge @ finché non le leggi. L'avviso porta dritto al messaggio
- **Messaggi fissati** (fino a 10 per chat) in una barra in alto (`chat_fissa`)
- **Sondaggi** a scelta singola o multipla, voti in tempo reale, chiusura da chi l'ha creato
  (`chat_voti`, `chat_vota`, `chat_chiudi_sondaggio`)
- **Invia più tardi** e **Invia senza suono** dal tasto invio (tieni premuto): i programmati li
  manda il database anche ad app chiusa (`chat_programmati`, cron `fosschat-orologio` ogni 20 secondi)
- **Ricordamelo** su un messaggio: alla data scelta arriva un avviso che apre quel messaggio
  (`chat_promemoria`)
- **Importanti**: i messaggi segnati restano in un elenco tuo (`chat_importanti`)
- **Lavori di FOSS in chat**: con `#` si cita un lavoro e diventa una scheda viva (fase,
  avanzamento, date, location, squadra) che si aggiorna da sola; chi non è nel lavoro vede solo
  che esiste. Dal menu + → «Lavoro di FOSS» si **crea un lavoro** (titolo, cliente, giorno e ora
  delle riprese, location, consegna, spazio, squadra): nasce subito in FOSS (`chat_crea_lavoro`) e
  la prima volta che qualcuno con i permessi apre FOSS si completa con fasi e task del suo tipo
  (`foss_completa_da_chat`); da lì si modifica tutto il resto
- **Colpetto**: doppio tocco sulla foto di qualcuno (gruppi) o dal menu della chat; fa vibrare la
  sua chat e arriva come avviso
- **Seleziona**: più messaggi insieme da copiare, inoltrare o eliminare
- **Importa da WhatsApp** (menu della chat, solo per l'amministratore di FOSS): si sceglie il file esportato
  da WhatsApp (.zip con foto, video e vocali, oppure .txt) e per ogni nome di WhatsApp si dice chi
  è su FOSS (o si tiene il nome, o lo si salta). I messaggi entrano con la loro data, senza avvisi;
  reimportando la stessa chat non si doppia nulla, e l'importazione si può annullare
  (`chat_importa`, `chat_importa_annulla`; nel messaggio `media.importato`)

## Pubblicazione su GitHub Pages

1. Carica i file di questa cartella nel repository
2. Settings → Pages → Source: `Deploy from a branch`, ramo `main`, cartella `/ (root)`
3. Copia l'indirizzo che GitHub assegna e incollalo in Supabase → Authentication →
   URL Configuration, sia in *Site URL* sia in *Redirect URLs*, altrimenti il link
   di conferma della mail non torna sull'app

Il file `.nojekyll` serve a GitHub Pages per non passare i file attraverso Jekyll.

**Se il sito finisce in un sottopercorso** (`utente.github.io/foss/`), il service
worker non può uscire dalla sua cartella e GitHub Pages non permette di cambiare
gli header. In quel caso servono `"scope": "/foss/"` e `"start_url": "/foss/"` nel
manifest, e la registrazione con lo stesso scope. Molto più semplice puntare un
sottodominio (`foss.davidemorabito.com`) su GitHub Pages: il sito sta in root e
il problema sparisce.

## Nota sul nome

L'app si chiama FOSS. Il progetto Supabase collegato si chiama ancora `feedback`:
è solo l'etichetta nella dashboard, si rinomina in Project Settings → General.
