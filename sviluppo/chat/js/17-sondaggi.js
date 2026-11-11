/* ======================= SONDAGGI =======================
   Come WhatsApp: una domanda, da 2 a 12 risposte, una sola o piu' di una.
   I voti si vedono subito per tutti (barre, numeri e chi ha votato). */
function nuovoSondaggio(){
  const c = S.convs.get(S.aperta); if(!c) return;
  const v = document.createElement('div'); v.className = 'velo scuro basso'; v.id = 'veloSondaggio';
  let multi = false;
  v.innerHTML = '<div class="foglio sond-foglio" role="dialog" aria-label="Nuovo sondaggio">'+
    '<div class="foglio-t">Nuovo sondaggio<button class="ib" data-x="1" aria-label="Chiudi">'+svg('chiudi')+'</button></div>'+
    '<div class="foglio-c">'+
      '<label class="campo-t"><span>Domanda</span><textarea id="sDom" rows="1" maxlength="300" placeholder="Fai una domanda"></textarea></label>'+
      '<div class="sond-tit">Risposte</div><div id="sOpz" class="sond-opz"></div>'+
      '<button class="sond-agg" data-agg="1">'+svg('piuCerchio', 1.9)+'Aggiungi una risposta</button>'+
      '<button class="sond-multi" data-multi="1"><span><b>Più risposte</b><i>Ognuno può sceglierne più di una</i></span><span class="interr" id="sMulti"></span></button>'+
    '</div><div class="foglio-f"><button class="btn" data-x="1">Annulla</button><button class="btn pieno" data-invia="1" id="sInvia" disabled>Invia</button></div></div>';
  document.body.appendChild(v);
  const O = el('sOpz'), D = el('sDom');
  const riga = (t) => {
    const d = document.createElement('div'); d.className = 'sond-riga';
    d.innerHTML = '<span class="sond-maniglia">'+svg('lista', 1.8)+'</span><input maxlength="100" placeholder="Risposta" value="'+esc(t || '')+'"><button class="ib" data-togli="1" aria-label="Togli">'+svg('chiudi', 2)+'</button>';
    O.appendChild(d); return d;
  };
  riga(); riga();
  const valori = () => $$('input', O).map(i => i.value.trim());
  const aggiorna = () => {
    const vv = valori(), pieni = vv.filter(Boolean);
    const doppie = new Set(pieni.map(x => x.toLowerCase())).size !== pieni.length;
    el('sInvia').disabled = !D.value.trim() || pieni.length < 2 || doppie;
    $$('.sond-riga', O).forEach((r, i) => { r.querySelector('input').placeholder = 'Risposta ' + (i + 1); r.querySelector('[data-togli]').style.visibility = $$('.sond-riga', O).length > 2 ? '' : 'hidden'; });
    $('[data-agg]', v).style.display = $$('.sond-riga', O).length >= 12 ? 'none' : '';
  };
  aggiorna();
  setTimeout(() => D.focus(), 80);
  D.addEventListener('input', () => { adatta(D); aggiorna(); });
  D.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); const i = $('input', O); if(i) i.focus(); } });
  O.addEventListener('input', e => {
    aggiorna();
    /* scrivendo nell'ultima ne compare un'altra vuota, fino a 12 */
    const r = $$('.sond-riga', O);
    if(e.target === r[r.length - 1].querySelector('input') && e.target.value.trim() && r.length < 12){ riga(); aggiorna(); }
  });
  O.addEventListener('keydown', e => {
    if(e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    const ii = $$('input', O), i = ii.indexOf(e.target);
    if(ii[i + 1]) ii[i + 1].focus(); else if(ii.length < 12 && e.target.value.trim()){ riga().querySelector('input').focus(); aggiorna(); }
  });
  const chiudi = () => v.remove();
  v.addEventListener('click', async e => {
    if(e.target === v || e.target.closest('[data-x]')) return chiudi();
    const t = e.target.closest('[data-togli]');
    if(t){ if($$('.sond-riga', O).length > 2){ t.closest('.sond-riga').remove(); aggiorna(); } return; }
    if(e.target.closest('[data-agg]')){ if($$('.sond-riga', O).length < 12){ riga().querySelector('input').focus(); aggiorna(); } return; }
    if(e.target.closest('[data-multi]')){ multi = !multi; el('sMulti').classList.toggle('on', multi); return; }
    if(e.target.closest('[data-invia]')){
      const dom = D.value.trim(); const vv = valori().filter(Boolean);
      if(!dom || vv.length < 2) return;
      const lettere = 'abcdefghijkl';
      const media = {opzioni: vv.slice(0, 12).map((t, i) => ({id: lettere[i], t})), multi};
      chiudi();
      const m = nuovoLocale('sondaggio', {testo: dom, media});
      S.risposta = null; disegnaScrivi(); mettiInLista(m); suono('invio');
      try{ await salvaMessaggio(m); }catch(err){ m._stato = 'errore'; ridisegnaMessaggio(m.id); errore(err, 'Sondaggio non inviato'); }
    }
  });
}

function conteggioVoti(m){
  const op = (m.media && m.media.opzioni) || [];
  const v = S.voti.get(m.id) || new Map();
  const per = new Map(op.map(o => [o.id, []]));
  v.forEach((set, u) => set.forEach(o => { if(per.has(o)) per.get(o).push(u); }));
  return {op, v, per, votanti: v.size, miei: v.get(S.io) || new Set()};
}
function sondaggioHTML(m){
  const md = m.media || {}, chiuso = !!md.chiuso;
  const {op, per, votanti, miei} = conteggioVoti(m);
  const max = Math.max(0, ...Array.from(per.values()).map(a => a.length));
  return '<div class="sond" data-sond="'+m.id+'">'+
    '<div class="sond-dom">'+esc(m.testo || '')+'</div>'+
    '<div class="sond-sub">'+svg(md.multi ? 'seleziona' : 'sondaggio', 2)+'<span>'+(chiuso ? 'Sondaggio chiuso' : md.multi ? 'Scegli una o più risposte' : 'Scegli una risposta')+'</span></div>'+
    op.map(o => {
      const l = per.get(o.id) || [], mio = miei.has(o.id);
      const pc = votanti ? Math.round(l.length / votanti * 100) : 0;
      return '<button class="sond-op'+(mio ? ' mio' : '')+(l.length && l.length === max ? ' testa' : '')+'" data-a="vota" data-id="'+m.id+'" data-o="'+esc(o.id)+'"'+(chiuso || m._stato ? ' disabled' : '')+'>'+
        '<span class="sond-sel'+(md.multi ? ' quadro' : '')+'">'+(mio ? svg('ok', 3.2) : '')+'</span>'+
        '<span class="sond-cc"><span class="sond-r1"><span class="sond-t">'+esc(o.t)+'</span>'+
          '<span class="sond-av">'+l.slice(0, 3).map(u => avatar(u, 'mini')).join('')+'</span><b>'+l.length+'</b></span>'+
        '<span class="sond-bar"><i style="width:'+pc+'%"></i></span></span></button>';
    }).join('')+
    '<button class="sond-vedi" data-a="vedi-voti" data-id="'+m.id+'"'+(votanti ? '' : ' disabled')+'>'+(votanti ? 'Vedi i voti' : 'Ancora nessun voto')+'</button></div>';
}
async function vota(id, o){
  const c = S.convs.get(S.aperta); const m = c && trovaMsg(c.id, id);
  if(!m || !m.media || m.media.chiuso || m._stato) return;
  if(!S.voti.has(id)) S.voti.set(id, new Map());
  const v = S.voti.get(id);
  const prima = new Set(v.get(S.io) || []);
  const ora_ = new Set(prima);
  if(m.media.multi){ if(ora_.has(o)) ora_.delete(o); else ora_.add(o); }
  else { if(ora_.has(o)) ora_.clear(); else { ora_.clear(); ora_.add(o); } }
  if(ora_.size) v.set(S.io, ora_); else v.delete(S.io);
  ridisegnaMessaggio(id);
  try{ navigator.vibrate && navigator.vibrate(10); }catch(e){}
  try{
    const {error} = await sb.rpc('chat_vota', {p_msg: id, p_opzioni: Array.from(ora_)});
    if(error) throw error;
  }catch(e){
    if(prima.size) v.set(S.io, prima); else v.delete(S.io);
    ridisegnaMessaggio(id); errore(e, 'Voto non salvato');
  }
}
function vediVoti(m){
  const {op, per, votanti} = conteggioVoti(m);
  const corpo = '<div class="voti-dom">'+esc(m.testo || '')+'</div>'+
    op.map(o => { const l = per.get(o.id) || [];
      return '<div class="voti-op"><div class="voti-t"><b>'+esc(o.t)+'</b><span>'+(l.length === 1 ? '1 voto' : l.length + ' voti')+'</span></div>'+
        (l.length ? l.map(u => '<div class="voce" style="padding:6px 0">'+avatar(u)+'<span class="vc"><b>'+esc(u === S.io ? 'Tu' : nomeLungo(u))+'</b></span></div>').join('')
                  : '<div class="voti-vuoto">Nessuno</div>')+'</div>'; }).join('');
  foglio(votanti === 1 ? '1 persona ha votato' : votanti + ' persone hanno votato', corpo, [['Chiudi']]);
}
function chiudiSondaggio(m){
  conferma('Chiudere il sondaggio?', 'Nessuno potrà più votare o cambiare il voto. I risultati restano visibili.', 'Chiudi sondaggio', async () => {
    try{
      const {error} = await sb.rpc('chat_chiudi_sondaggio', {p_msg: m.id}); if(error) throw error;
      m.media = Object.assign({}, m.media, {chiuso: true}); ridisegnaMessaggio(m.id);
    }catch(e){ errore(e, 'Sondaggio non chiuso'); }
  });
}
