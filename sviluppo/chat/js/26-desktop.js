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
                               hash: '#c=' + c.id + '&m=' + m.id, suono: false});
    if(o.colpetto) window.fossDesktop.attenzione();
  }catch(e){}
}
