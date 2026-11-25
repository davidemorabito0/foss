# Brief per una chat nuova — piattaforma per un cliente

> Come si usa: sostituisci le parole tra [parentesi quadre], poi copia **tutto il testo sotto la riga** e incollalo come primo messaggio in una chat nuova di Claude Code, aperta nella cartella della copia del cliente.

---

Ciao. Lavori su **[NOME]**, una piattaforma per **[NOME CLIENTE]**, che fa **[PROFESSIONE / SETTORE DEL CLIENTE]**.

## Cos'è

[NOME] è una copia personalizzata di **FOSS**, un'app per gestire progetti creativi (spazi di lavoro, progetti divisi in fasi con task e sottotask, scadenze, budget, file, commenti) con una chat integrata. La copia è stata creata con lo strumento `nuova-piattaforma.pl` di FOSS: **c'è solo la struttura del sito, nessun dato di utenti, nessun messaggio, nessun progetto reale.** Sostituisce nomi, colori e domini, ed è anonimizzata.

- Sito: **[DOMINIO]**
- Chat: **[NOME].chat**
- Colore principale: **[COLORE]**
- Database Supabase: **[RIFERIMENTO PROGETTO, oppure «non ancora creato»]**
- Repository GitHub: **[utente/repository, oppure «non ancora creato»]**

## Leggi prima questi file (sono nella cartella)

1. `LAVORARE-SU-FOSS.md`: com'è fatto tutto il progetto (architettura, database, chat, app, test, pubblicazione). Dove c'è scritto il nome della piattaforma originale, vale per [NOME].
2. `NUOVA-PIATTAFORMA.md` (non è nella copia: sta nella cartella di FOSS, `~/Downloads/foss/NUOVA-PIATTAFORMA.md`): i passi per mettere in piedi la copia (database, avvisi, pubblicazione, grafica, personalizzazione). Dimmi a che punto siamo e qual è il prossimo passo.

## Regole (valgono sempre)

- **Io non programmo.** Spiegami solo il risultato e cosa devo fare io, **una cosa sola alla volta**, con link diretti e parole semplici. Niente spiegazioni tecniche.
- **Niente password o chiavi nel codice.** I segreti li inserisco io: dimmi esattamente dove (pagina e nome del campo).
- **Non fare prove con dati o chat di persone vere:** usa solo dati e gruppi di prova.
- **Non copiare mai dati da FOSS** (utenti, messaggi, progetti, file). Da FOSS si prende solo la struttura.
- **Prova tutto prima di consegnarmelo** (test automatici e controllo nel browser, anche a misura di telefono). Se serve più tempo, dimmelo.
- Prima di cose che non si possono annullare (cancellare dati, pubblicare, inviare messaggi, spendere soldi) chiedimi conferma.
- Tieni aggiornata la documentazione (`LAVORARE-SU-FOSS.md` e il diario delle modifiche) a ogni cambiamento.

## Cosa vuole il cliente

[Scrivi qui, anche a parole tue, cosa deve fare la piattaforma per questo cliente. Esempi:]
- [i tipi di progetto che usa (es. matrimoni, campagne, cantieri…) e le fasi di ognuno]
- [le informazioni che vuole vedere nella scheda dello spazio e del progetto]
- [cose da togliere perché non gli servono (es. chat, budget, server dei media)]
- [chi lo usa: solo lui, un team, anche i suoi clienti come ospiti]
- [logo e immagini: dove li trovo]

## Primo compito

Leggi i due file e controlla a che punto è la copia (quali passi di `NUOVA-PIATTAFORMA.md` sono già fatti), poi dimmi **la prima cosa sola** che devo fare io. Intanto tu fai tutto quello che puoi fare senza di me.
