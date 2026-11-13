/* ======================= IL COLPETTO (come «Pat» di WeChat) =======================
   Doppio tocco sulla foto di qualcuno: «Davide ha dato un colpetto a Momo».
   A chi lo riceve vibra il telefono e la chat fa un piccolo sobbalzo. */
function testoColpetto(m){
  const a = m.media && m.media.a;
  if(m.autore === S.io) return 'Hai dato un colpetto a ' + nomeDi(a);
  if(a === S.io) return nomeMsg(m) + ' ti ha dato un colpetto';
  return nomeMsg(m) + ' ha dato un colpetto a ' + nomeDi(a);
}
function colpettoHTML(m){
  const nuovo = Date.now() - new Date(m.creato_il).getTime() < 8000 && !S.visti.has(m.id);
  return '<div class="sistema colpetto'+(nuovo ? ' nuovo' : '')+'" data-id="'+m.id+'"><span><i class="mano">'+svg('mano', 1.9)+'</i>'+esc(testoColpetto(m))+'</span></div>';
}
async function colpetto(a){
  const c = S.convs.get(S.aperta); if(!c || !a || a === S.io) return;
  if(!(c.membri || []).some(x => x.id === a)){ toast(nomeDi(a) + ' non è in questa chat.'); return; }
  const m = nuovoLocale('colpetto', {media: {a}, risponde_a: null});
  mettiInLista(m); vivoScossa(); suono('trillo');   /* lo senti anche tu, come su MSN */
  try{ navigator.vibrate && navigator.vibrate(20); }catch(e){}
  try{ await salvaMessaggio(m); segnaVisto(m.id); }
  catch(e){
    const s = S.msgs.get(m.conv_id); if(s){ s.lista = s.lista.filter(x => x.id !== m.id); s.ids.delete(m.id); }
    const n = $('.sistema[data-id="'+m.id+'"]'); if(n) n.remove();
    errore(e, 'Colpetto non dato');
  }
}
function colpettoRicevuto(m, guardo){
  const c = S.convs.get(m.conv_id); if(!c || !sbloccata(c)) return;
  try{ navigator.vibrate && navigator.vibrate([25, 70, 25]); }catch(e){}
  if(!c.silenziata) suono('trillo');
  if(!c.silenziata && !guardo) avvisoDesktop(m, c, {colpetto: true});
  if(m.conv_id === S.aperta){
    vivoScossa();
    const cv = el('conv'); if(cv){ cv.classList.remove('colpito'); void cv.offsetWidth; cv.classList.add('colpito'); setTimeout(() => cv.classList.remove('colpito'), 900); }
  } else if(!c.silenziata) toast('👋 ' + nomeMsg(m) + ' ti ha dato un colpetto' + (c.tipo === 'gruppo' ? ' in «' + nomeConv(c) + '»' : ''), 'Apri', () => apriConv(c.id));
  setTimeout(() => segnaVisto(m.id), 3000);
}
/* il doppio tocco: sulle foto accanto ai messaggi di un gruppo e sulla foto in cima a una chat privata */
(function doppioTocco(){
  let ultimo = null, quando_ = 0, tSingolo = null;
  document.addEventListener('click', e => {
    const av = e.target.closest('.msg .av-g, .conv-testa .chi .av');
    if(!av || S.selezione) return;
    const c = S.convs.get(S.aperta); if(!c) return;
    let chi = null;
    if(av.classList.contains('av-g')){ const n = av.closest('.msg[data-id]'); const m = n && trovaMsg(c.id, n.dataset.id); chi = m && m.autore; }
    else if(c.tipo === 'privata') chi = altro(c);
    if(!chi || chi === S.io) return;
    const t = Date.now();
    if(ultimo === av && t - quando_ < 380){
      e.preventDefault(); e.stopImmediatePropagation();
      clearTimeout(tSingolo); ultimo = null;
      av.classList.remove('dai-colpetto'); void av.offsetWidth; av.classList.add('dai-colpetto');
      colpetto(chi);
      return;
    }
    ultimo = av; quando_ = t;
    /* sulla foto in cima il tocco singolo apre le info: aspetto un attimo per capire se e' doppio */
    if(av.closest('.conv-testa')){
      e.preventDefault(); e.stopImmediatePropagation();
      clearTimeout(tSingolo);
      tSingolo = setTimeout(() => { if(ultimo === av) apriInfo(); ultimo = null; }, 320);
    }
  }, true);
})();
