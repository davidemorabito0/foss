/* ======================= INVIA PIU' TARDI E «RICORDAMELO» =======================
   Programmati: partono dal database all'ora scelta, anche con FOSS.chat chiuso.
   Promemoria: all'ora scelta arriva un avviso con il messaggio (e qui un richiamo). */
function oraTonda(d, h, m){ const x = new Date(d); x.setHours(h, m || 0, 0, 0); return x; }
function opzioniQuando(){
  const ora_ = new Date(), o = [];
  const traUnOra = new Date(ora_.getTime() + 3600000); traUnOra.setSeconds(0, 0);
  o.push(['Tra un’ora', traUnOra]);
  if(ora_.getHours() < 19) o.push(['Stasera', oraTonda(ora_, 21)]);
  if(ora_.getHours() < 7) o.push(['Stamattina', oraTonda(ora_, 9)]);
  const domani = new Date(ora_); domani.setDate(domani.getDate() + 1);
  o.push(['Domani mattina', oraTonda(domani, 9)]);
  const lun = new Date(ora_); lun.setDate(lun.getDate() + ((8 - lun.getDay()) % 7 || 7));
  if(giorniFa(lun) < -1) o.push(['Lunedì', oraTonda(lun, 9)]);
  return o;
}
function isoLocale(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function scegliQuando(titolo, nota, attuale){
  return new Promise(fine => {
    const v = document.createElement('div'); v.className = 'velo scuro basso';
    const base = attuale ? new Date(attuale) : new Date(Date.now() + 3600000);
    let fatto = false;
    v.innerHTML = '<div class="foglio quando-foglio" role="dialog"><div class="foglio-t">'+esc(titolo)+'<button class="ib" data-x="1">'+svg('chiudi')+'</button></div>'+
      '<div class="foglio-c">'+(nota ? '<p class="q-nota">'+esc(nota)+'</p>' : '')+
      '<div class="q-veloci">'+opzioniQuando().map((x, i) => '<button data-q="'+i+'"><b>'+esc(x[0])+'</b><span>'+esc(quando(x[1]))+'</span></button>').join('')+'</div>'+
      '<div class="q-tit">Oppure scegli</div><div class="q-scegli"><input type="date" id="qData" min="'+isoLocale(new Date())+'" value="'+isoLocale(base)+'"><input type="time" id="qOra" value="'+ora(base)+'"></div>'+
      '</div><div class="foglio-f"><button class="btn" data-x="1">Annulla</button><button class="btn pieno" data-ok="1">Conferma</button></div></div>';
    document.body.appendChild(v);
    const ops = opzioniQuando();
    const chiudi = r => { if(fatto) return; fatto = true; v.remove(); fine(r); };
    v.addEventListener('click', e => {
      if(e.target === v || e.target.closest('[data-x]')) return chiudi(null);
      const q = e.target.closest('[data-q]'); if(q) return chiudi(ops[+q.dataset.q][1]);
      if(e.target.closest('[data-ok]')){
        const d = el('qData').value, h = el('qOra').value || '09:00';
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d), hh = /^(\d{2}):(\d{2})/.exec(h);
        if(!m || !hh){ toast('Scegli giorno e ora.'); return; }
        const x = new Date(+m[1], +m[2] - 1, +m[3], +hh[1], +hh[2], 0, 0);
        if(x.getTime() < Date.now() + 30000){ toast('Scegli un momento nel futuro.'); return; }
        if(x.getTime() > Date.now() + 365 * 864e5){ toast('Al massimo tra un anno.'); return; }
        chiudi(x);
      }
    });
  });
}

/* ---------- messaggi programmati ---------- */
function programmatiQui(){ return S.programmati.filter(x => x.conv_id === S.aperta).sort((a, b) => new Date(a.quando) - new Date(b.quando)); }
async function programmaInvio(){
  const t = el('testoIn'); const c = S.convs.get(S.aperta); if(!t || !c) return;
  const testo = t.value.replace(/\s+$/, '').replace(/^\n+/, '');
  if(!testo.trim()){ toast('Scrivi prima il messaggio.'); return; }
  if(testo.length > 6000){ toast('Il messaggio è troppo lungo (massimo 6000 caratteri).'); return; }
  const d = await scegliQuando('Programma il messaggio', 'Parte all’ora scelta anche se FOSS.chat è chiuso.');
  if(!d) return;
  const extra = raccogliExtra(testo, c);
  const media = Object.assign({}, S.effettoScelto || {}, extra);
  const riga = {conv_id: c.id, autore: S.io, testo, media: Object.keys(media).length ? media : null,
                risponde_a: S.risposta && S.risposta.conv_id === c.id ? S.risposta.id : null, quando: d.toISOString()};
  try{
    const {data, error} = await sb.from('chat_programmati').insert(riga).select().single();
    if(error) throw error;
    if(!S.programmati.some(x => x.id === data.id)) S.programmati.push(data);
    t.value = ''; adatta(t); S.effettoScelto = null; S.risposta = null;
    delete S.bozze[c.id]; memoria('bozze', S.bozze); pulisciBozzaExtra(c.id);
    disegnaScrivi();
    toast('Messaggio programmato per ' + quando(d) + '.');
    sveglia();
  }catch(e){ errore(e, 'Messaggio non programmato'); }
}
function disegnaBarraProgrammati(){
  const B = el('progBarra'); if(!B) return;
  const l = programmatiQui();
  if(!l.length || S.modifica || S.selezione){ B.classList.add('nascosto'); B.innerHTML = ''; return; }
  B.classList.remove('nascosto');
  B.innerHTML = '<button data-a="programmati">'+svg('programma', 2)+'<span><b>'+(l.length === 1 ? '1 messaggio programmato' : l.length + ' messaggi programmati')+'</b> · '+esc(quando(l[0].quando))+'</span>'+svg('avanti', 2.2)+'</button>';
}
function elencoProgrammati(){
  const v = foglio('Messaggi programmati', '<div id="prElenco"></div>', [['Chiudi']]);
  const disegna = () => {
    const E = el('prElenco'); if(!E) return;
    const l = programmatiQui();
    if(!l.length){ v.remove(); return; }
    E.innerHTML = l.map(x => '<div class="pr-riga"><div class="pr-quando">'+svg('programma', 2)+esc(maiuscola(quando(x.quando)))+'</div>'+
      '<div class="pr-testo">'+formatta(x.testo, x.media)+'</div>'+
      '<div class="pr-azioni"><button data-ora="'+x.id+'">'+svg('manda', 1.8)+'Invia ora</button><button data-orario="'+x.id+'">'+svg('orologio', 1.9)+'Cambia ora</button>'+
      '<button class="rosso" data-via="'+x.id+'">'+svg('cestino', 1.8)+'Elimina</button></div></div>').join('');
  };
  disegna();
  v.querySelector('.foglio-c').onclick = async e => {
    const b = e.target.closest('[data-ora], [data-orario], [data-via]'); if(!b) return;
    const id = b.dataset.ora || b.dataset.orario || b.dataset.via;
    const x = S.programmati.find(z => z.id === id); if(!x) return;
    if(b.dataset.via){
      const {error} = await sb.from('chat_programmati').delete().eq('id', id);
      if(error) return errore(error, 'Non eliminato');
      S.programmati = S.programmati.filter(z => z.id !== id); disegna(); disegnaBarraProgrammati(); return;
    }
    if(b.dataset.orario){
      const d = await scegliQuando('Cambia ora', '', x.quando); if(!d) return;
      const {error} = await sb.from('chat_programmati').update({quando: d.toISOString()}).eq('id', id);
      if(error) return errore(error, 'Ora non cambiata');
      x.quando = d.toISOString(); disegna(); disegnaBarraProgrammati(); sveglia(); return;
    }
    if(b.dataset.ora){
      const {error} = await sb.from('chat_programmati').delete().eq('id', id);
      if(error) return errore(error, 'Non inviato');
      S.programmati = S.programmati.filter(z => z.id !== id); disegna(); disegnaBarraProgrammati();
      const m = nuovoLocale('testo', {testo: x.testo, media: x.media, risponde_a: x.risponde_a});
      mettiInLista(m); suono('invio');
      try{ await salvaMessaggio(m); }catch(err){ m._stato = 'errore'; ridisegnaMessaggio(m.id); errore(err, 'Messaggio non inviato'); }
    }
  };
}

/* ---------- promemoria ---------- */
async function ricordamelo(m){
  const d = await scegliQuando('Ricordamelo', 'All’ora scelta ti arriva un avviso con questo messaggio.');
  if(!d) return;
  try{
    const {data, error} = await sb.from('chat_promemoria').upsert({utente_id: S.io, msg_id: m.id, conv_id: m.conv_id, quando: d.toISOString()}, {onConflict: 'utente_id,msg_id'}).select().single();
    if(error) throw error;
    S.promemoria.set(m.id, data || {msg_id: m.id, conv_id: m.conv_id, quando: d.toISOString()});
    ridisegnaMessaggio(m.id); orologioPromemoria();
    const p = await statoPush().catch(() => null);
    if(p === 'no' || p === 'ios-home') toast('Te lo ricordo ' + quando(d) + '. Attiva gli avvisi per riceverlo anche a FOSS.chat chiusa.', 'Attiva', () => attivaPush());
    else toast('Te lo ricordo ' + quando(d) + '.');
  }catch(e){ errore(e, 'Promemoria non salvato'); }
}
async function togliPromemoria(m){
  const x = S.promemoria.get(m.id);
  S.promemoria.delete(m.id); ridisegnaMessaggio(m.id); orologioPromemoria();
  const {error} = await sb.from('chat_promemoria').delete().eq('msg_id', m.id).eq('utente_id', S.io);
  if(error){ if(x) S.promemoria.set(m.id, x); ridisegnaMessaggio(m.id); errore(error, 'Promemoria non tolto'); }
  else toast('Promemoria tolto.');
}
/* quando scatta mentre FOSS.chat e' aperta: un richiamo qui (l'avviso sul telefono arriva comunque) */
let tPromemoria = null;
function orologioPromemoria(){
  clearTimeout(tPromemoria);
  let primo = null;
  S.promemoria.forEach(x => { const t = new Date(x.quando).getTime(); if(primo == null || t < primo) primo = t; });
  if(primo == null) return;
  const attesa = Math.max(500, Math.min(primo - Date.now(), 6 * 3600000));
  tPromemoria = setTimeout(scattaPromemoria, attesa);
}
async function scattaPromemoria(){
  const ora_ = Date.now(), scaduti = [];
  S.promemoria.forEach((x, id) => { if(new Date(x.quando).getTime() <= ora_ + 1000) scaduti.push([id, x]); });
  for(const [id, x] of scaduti){
    S.promemoria.delete(id);
    let m = trovaMsg(x.conv_id, id);
    if(!m){ try{ const {data} = await sb.from('chat_messaggi').select('*').eq('id', id).maybeSingle(); m = data; }catch(e){} }
    if(S.aperta === x.conv_id) ridisegnaMessaggio(id);
    if(!m || m.eliminato) continue;
    const c = S.convs.get(x.conv_id);
    suono('arrivo');
    avvisoDesktop(m, c, {promemoria: true});
    const chi = m.autore === S.io ? 'Tu' : nomeMsg(m);
    toast('⏰ ' + chi + ': ' + testoAnteprima(m).slice(0, 80), 'Apri', async () => { if(c){ await apriConv(c.id); vaiAMessaggio(id); } });
  }
  orologioPromemoria();
}
/* il messaggio programmato parte dal database: al momento giusto ricontrollo l'elenco */
let tProg = null;
function sveglia(){
  clearTimeout(tProg);
  const l = S.programmati.map(x => new Date(x.quando).getTime()).sort((a, b) => a - b);
  disegnaBarraProgrammati();
  if(!l.length) return;
  tProg = setTimeout(async () => {
    try{ const {data} = await sb.from('chat_programmati').select('*').order('quando').limit(500); if(data) S.programmati = data; }catch(e){}
    disegnaBarraProgrammati(); sveglia();
  }, Math.max(15000, Math.min(l[0] - Date.now() + 25000, 6 * 3600000)));
}
/* tutti i programmati, di tutte le chat (dalle impostazioni) */
function tuttiProgrammati(){
  const disegna = () => {
    const l = S.programmati.slice().sort((a, b) => new Date(a.quando) - new Date(b.quando));
    return l.length ? l.map(x => { const c = S.convs.get(x.conv_id);
      return '<button class="voce pr-voce" data-prconv="'+x.conv_id+'">'+(c ? avatarConv(c) : '')+'<span class="vc"><span class="imp-chi">'+esc(c ? nomeConv(c) : 'Chat')+'<em>'+esc(maiuscola(quando(x.quando)))+'</em></span>'+
        '<b>'+esc(testoSemplice(x.testo))+'</b></span></button>'; }).join('') : '<div class="vuoto-lista">Nessun messaggio programmato.</div>';
  };
  const p = pannelloSinistra('Messaggi programmati', '<div id="prTutti">'+disegna()+'</div>', false);
  p.addEventListener('click', async e => {
    const b = e.target.closest('[data-prconv]'); if(!b) return;
    chiudiPannelloSinistra(); await apriConv(b.dataset.prconv); elencoProgrammati();
  });
}
