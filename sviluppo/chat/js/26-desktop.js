/* ---------- App per computer (cartella desktop/ del repository) ----------
   L'app per Mac e Windows mette questa chat accanto a FOSS. Li' esiste window.fossDesktop
   (lo mette l'app prima della pagina): qui la chat gli chiede gli avvisi di sistema.
   Il numero sull'icona arriva da solo (navigator.setAppBadge in aggiornaTitolo).
   Nel browser window.fossDesktop non c'e' e queste funzioni non fanno nulla. */
function suComputer(){ return !!window.fossDesktop; }
/* o = {colpetto, promemoria, muto} */
function avvisoDesktop(m, c, o){
  if(!suComputer() || !m || !c) return;
  o = o || {};
  try{
    const gruppo = c.tipo === 'gruppo', chi = m.autore === S.io ? 'Tu' : nomeMsg(m);
    /* chat protetta col codice: niente testo, come sul telefono */
    const riservata = !!c.bloccata && !S.sbloccate.has(c.id);
    let titolo = gruppo ? nomeConv(c) : chi;
    let testo = riservata ? 'Nuovo messaggio' : testoAnteprima(m);
    if(gruppo && !riservata) testo = chi + ': ' + testo;
    if(o.colpetto){ titolo = chi; testo = '👋 Ti ha mandato un trillo' + (gruppo ? ' in «' + nomeConv(c) + '»' : ''); }
    if(o.promemoria){ titolo = '⏰ Promemoria' + (gruppo ? ' · ' + nomeConv(c) : ''); testo = riservata ? 'Un messaggio da rivedere' : chi + ': ' + testoAnteprima(m); }
    const p = S.persone.get(m.autore) || {};
    window.fossDesktop.avviso({vista: 'chat', titolo, testo, foto: riservata ? '' : fotoSicura(p.foto),
                               hash: '#c=' + c.id + '&m=' + m.id, suono: false, risposta: !o.promemoria});
    if(o.colpetto) window.fossDesktop.attenzione();
  }catch(e){}
}
/* risposta scritta direttamente nell'avviso (Mac e Windows): la mando come un messaggio normale,
   senza aprire la chat; nei gruppi cita il messaggio a cui rispondi */
async function rispondiDaAvviso(conv, msg, testo){
  const c = conv && S.convs.get(conv);
  testo = String(testo || '').replace(/\s+$/, '').slice(0, 6000);
  if(!c || !testo.trim()) return false;
  const m = nuovoLocale('testo', {testo, risponde_a: c.tipo === 'gruppo' && msg && trovaMsg(conv, msg) ? msg : null}, conv);
  mettiInLista(m);
  try{ await salvaMessaggio(m); segnaLetto(conv); return true; }
  catch(e){
    m._stato = 'errore'; ridisegnaMessaggio(m.id);
    if(suComputer()) window.fossDesktop.avviso({vista: 'chat', titolo: 'Risposta non inviata', testo: '«' + testo.slice(0, 80) + '» non è partito: apri la chat e riprova.', hash: '#c=' + conv});
    return false;
  }
}
if(suComputer()) window.__fossChatRispondi = rispondiDaAvviso;
