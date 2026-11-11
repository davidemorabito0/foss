/* ======================= MESSAGGI FISSATI =======================
   Una barra sotto il nome della chat (come Telegram e WhatsApp): mostra il fissato piu'
   recente; toccandola si va al messaggio e la barra passa al fissato prima. Fino a 10. */
let fissatoIdx = 0;
function testoAnteprima(m){
  if(!m) return '';
  const md = m.media || {};
  if(m.eliminato) return 'Messaggio eliminato';
  switch(m.tipo){
    case 'testo': return testoSemplice(m.testo || '');
    case 'foto': return '📷 ' + (md.did || (md.gif ? 'GIF' : 'Foto'));
    case 'video': return md.gif ? 'GIF' : '🎥 ' + (md.did || 'Video');
    case 'vocale': return '🎤 Messaggio vocale (' + fmtDur(md.dur) + ')';
    case 'sticker': return 'Sticker';
    case 'file': return '📄 ' + (md.nome || 'Documento');
    case 'sondaggio': return '📊 ' + (m.testo || 'Sondaggio');
    case 'lavoro': return '🎬 ' + (md.lavoro ? md.lavoro.n : 'Lavoro di FOSS');
    case 'colpetto': return '👋 Colpetto';
  }
  return m.testo || '';
}
function fissatiDi(conv){ return (S.fissati.get(conv) || []).filter(m => !m.eliminato && !S.nascosti.has(m.id)); }
function disegnaFissati(){
  const B = el('fissatiB'), C = el('conv'); const c = S.convs.get(S.aperta); if(!B || !c) return;
  const l = fissatiDi(c.id);
  if(C) C.classList.toggle('con-fissati', !!l.length);
  if(!l.length){ B.innerHTML = ''; B.classList.add('nascosto'); return; }
  B.classList.remove('nascosto');
  if(fissatoIdx >= l.length) fissatoIdx = 0;
  const m = l[fissatoIdx], md = m.media || {};
  const tacche = l.length > 1 ? '<span class="fis-tacche">'+l.map((_, i) => '<i class="'+(i === fissatoIdx ? 'on' : '')+'"></i>').join('')+'</span>' : '';
  const mini = (m.tipo === 'foto' || m.tipo === 'video') && md.mini ? '<img class="fis-mini" src="'+esc(md.mini)+'" alt="">' : '';
  B.innerHTML = '<button class="fis-vai" data-a="fissato-vai">'+tacche+'<span class="fis-ic">'+svg('spillo', 2)+'</span>'+
    '<span class="fis-tx"><b>'+(l.length > 1 ? 'Messaggio fissato <i>'+(fissatoIdx + 1)+' di '+l.length+'</i>' : 'Messaggio fissato')+'</b>'+
    '<span>'+esc((m.autore === S.io ? 'Tu: ' : (c.tipo === 'gruppo' ? nomeMsg(m) + ': ' : '')) + testoAnteprima(m))+'</span></span>'+mini+'</button>'+
    (l.length > 1 ? '<button class="ib fis-lista" data-a="fissati-lista" title="Tutti i fissati">'+svg('lista', 2)+'</button>'
                  : '<button class="ib fis-lista" data-a="fissato-togli" data-id="'+m.id+'" title="Togli dai fissati">'+svg('chiudi', 2)+'</button>');
}
function vaiAlFissato(){
  const c = S.convs.get(S.aperta); if(!c) return;
  const l = fissatiDi(c.id); if(!l.length) return;
  const m = l[fissatoIdx % l.length];
  vaiAMessaggio(m.id);
  fissatoIdx = (fissatoIdx + 1) % l.length;
  setTimeout(disegnaFissati, 350);
}
async function fissa(m, si){
  try{
    const {error} = await sb.rpc('chat_fissa', {p_id: m.id, p_si: si});
    if(error) throw error;
    m.fissato_il = si ? new Date().toISOString() : null; m.fissato_da = si ? S.io : null;
    if(!S.fissati.has(m.conv_id)) S.fissati.set(m.conv_id, []);
    if(si) fissatoIdx = 0;
    aggiornaFissato(m); ridisegnaMessaggio(m.id);
    toast(si ? 'Messaggio fissato: lo vedono tutti in cima alla chat.' : 'Tolto dai fissati.');
  }catch(e){ errore(e, si ? 'Messaggio non fissato' : 'Non tolto dai fissati'); }
}
function togliFissato(id){
  const c = S.convs.get(S.aperta); if(!c) return;
  const m = fissatiDi(c.id).find(x => x.id === id); if(!m) return;
  conferma('Togliere dai fissati?', 'Il messaggio resta nella chat: sparisce solo dalla barra in alto, per tutti.', 'Togli', () => fissa(m, false));
}
function elencoFissati(){
  const c = S.convs.get(S.aperta); if(!c) return;
  const l = fissatiDi(c.id); if(!l.length) return;
  const corpo = () => '<div class="fis-elenco">'+fissatiDi(c.id).map(m => '<div class="fis-riga">'+
      '<button class="fis-r-vai" data-vai="'+m.id+'"><b>'+esc(m.autore === S.io ? 'Tu' : nomeMsg(m))+'<i>'+esc(dataBreve(m.creato_il))+'</i></b><span>'+esc(testoAnteprima(m))+'</span></button>'+
      '<button class="ib" data-togli="'+m.id+'" title="Togli dai fissati">'+svg('spilloVia', 1.9)+'</button></div>').join('')+'</div>';
  const v = foglio(l.length + ' messaggi fissati', corpo(), [['Chiudi']]);
  v.querySelector('.foglio-c').onclick = e => {
    const a = e.target.closest('[data-vai]'); if(a){ v.remove(); vaiAMessaggio(a.dataset.vai); return; }
    const t = e.target.closest('[data-togli]');
    if(t){ const m = fissatiDi(c.id).find(x => x.id === t.dataset.togli); if(m) fissa(m, false).then(() => { const C = v.querySelector('.foglio-c'); if(!fissatiDi(c.id).length) v.remove(); else if(C) C.innerHTML = corpo(); }); }
  };
}
