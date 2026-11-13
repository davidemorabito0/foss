/* ======================= LA CONVERSAZIONE ======================= */
let convCaricata = null, primaNonLetta = null, nuoviSotto = 0;

function sbloccata(c){ return !c || !c.bloccata || S.sbloccate.has(c.id); }

async function apriConv(id, opz){
  opz = opz || {};
  const c = S.convs.get(id);
  if(!c){ if(S.pronti) toast('Questa chat non è più disponibile.'); return; }
  if(c.bloccata && !S.sbloccate.has(id)){
    const ok = await chiediPin('Chat privata', 'Inserisci il codice per aprire «'+nomeConv(c)+'».');
    if(!ok) return;
    S.sbloccate.add(id);
  }
  if(S.aperta && S.aperta !== id) lasciaConv();
  const giaAperta = S.aperta === id;
  if(!giaAperta){ chiudiSelezione(); if(S.modifica) annullaModifica(); chiudiPicker(); fissatoIdx = 0; }
  S.aperta = id;
  if(c.archiviata && S.vista !== 'archiviate' && !opz.daHash){ /* resta archiviata, la apro comunque */ }
  el('app').classList.add('in-conv');
  if(!opz.daHash){
    const h = '#c=' + id;
    if(location.hash !== h){ if(suTelefono() && !location.hash) history.pushState({c: id}, '', h); else history.replaceState({c: id}, '', h); }
  }
  primaNonLetta = c.non_lette > 0 ? c.letto_fino : null;
  nuoviSotto = 0;
  if(!giaAperta){ S.risposta = null; chiudiPannelloEmoji(); }
  disegnaConv();
  const s = statoMsgs(id);
  if(!s.caricato){
    el('msgs').innerHTML = '<div class="carica-prima"><span>Carico i messaggi…</span></div>';
    try{ await caricaMessaggi(id); }catch(e){ errore(e, 'Messaggi non caricati'); }
    if(S.aperta !== id) return;
  }
  disegnaMessaggi();
  vaiInFondo(true);
  preparaMenzioni(c.non_lette > 0 ? c : null);
  if(S.fissati.has(id)) disegnaFissati(); else caricaFissati(id);
  disegnaBarraProgrammati();
  if(opz.msg) setTimeout(() => vaiAMessaggio(opz.msg), 120);
  if(c.non_lette > 0 || c._nonLetta){ c._nonLetta = false; segnaLetto(id); }
  disegnaLista();
  if(!tocco()) setTimeout(() => { const t = el('testoIn'); if(t) t.focus(); }, 60);
  /* gli effetti arrivati mentre ero altrove */
  const da = primaNonLetta ? new Date(primaNonLetta) : null;
  if(da){
    const e = s.lista.filter(m => m.autore !== S.io && m.media && m.media.schermo && !S.visti.has(m.id) && new Date(m.creato_il) > da).pop();
    if(e) setTimeout(() => eseguiEffettoSchermo(e), 400);
  }
}
function lasciaConv(){
  const id = S.aperta; if(!id) return;
  chiudiFocus(true); chiudiSelezione(); chiudiPicker();
  if(S.modifica) annullaModifica();
  salvaBozza();
  const c = S.convs.get(id);
  if(c && c.bloccata) S.sbloccate.delete(id);    /* uscendo, una chat bloccata si richiude */
  fermaAudio();
}
function chiudiConv(){
  lasciaConv();
  S.aperta = null;
  el('app').classList.remove('in-conv');
  chiudiInfo();
  if(location.hash) history.replaceState(null, '', location.pathname + location.search);
  if(suTelefono()) setTimeout(() => { if(!S.aperta) disegnaConvVuota(); }, 260); else disegnaConvVuota();
  disegnaLista();
}

function disegnaConv(){
  const c = S.convs.get(S.aperta); if(!c) return;
  el('conv').innerHTML =
    '<header class="conv-testa" id="convTesta"></header>'+
    '<div class="fissati-barra nascosto" id="fissatiB"></div>'+
    '<div class="msgs-wrap"><div class="messaggi'+(S.cfg.doodle === false ? ' niente-doodle' : '')+'" id="msgs"></div>'+
    '<div class="data-fluttua" id="dataFluttua" aria-hidden="true"><span></span></div>'+
    '<button class="menz-b nascosto" id="menzB" data-a="vai-menzione" aria-label="Vai alla menzione">'+svg('chiocciola', 2.2)+'</button>'+
    '<button class="giu-b nascosto" id="giuB" data-a="in-fondo" aria-label="Vai in fondo">'+svg('giu')+'</button></div>'+
    '<footer class="scrivi" id="scrivi"></footer>';
  aggiornaTestaConv();
  disegnaScrivi();
  applicaSfondoConv();
  const M = el('msgs');
  M.addEventListener('scroll', alloScorrere, {passive: true});
  M.addEventListener('error', e => { const t = e.target; if(t && (t.tagName === 'IMG' || t.tagName === 'VIDEO' || t.tagName === 'AUDIO') && t.dataset.mid) mediaNonArriva(t.dataset.mid); }, true);
  attivaTrascina(el('conv'));
  attivaScorriPerRispondere(M);
}
function aggiornaTestaConv(){
  const T = el('convTesta'); const c = S.convs.get(S.aperta); if(!T || !c) return;
  let stato = '', verde = false;
  const sc = chiScrive(c.id);
  if(sc.length){
    verde = true;
    const cosa = sc[0].cosa === 'registra' ? 'sta registrando un vocale…' : 'sta scrivendo…';
    stato = c.tipo === 'gruppo' ? nomeDi(sc[0].id) + ' ' + cosa : cosa;
  } else if(c.tipo === 'privata'){
    const a = altro(c);
    stato = a === S.io ? (fraseDi(S.io) || 'Messaggi a te stesso') : fraseDi(a) && !S.online.has(a) ? fraseDi(a) : S.online.has(a) ? testoStato(a) + (fraseDi(a) ? ' · ' + fraseDi(a) : '') : ultimoAccesso((S.persone.get(a) || {}).visto) || (S.persone.get(a) || {}).ruolo || '';
  } else {
    const m = (c.membri || []).map(x => x.id).sort((a, b) => (a === S.io) - (b === S.io));
    stato = m.map(id => id === S.io ? 'Tu' : nomeDi(id)).join(', ');
  }
  let altre = 0; S.convs.forEach(x => { if(x.id !== c.id && !x.archiviata && !x.silenziata && x.non_lette > 0) altre++; });
  T.innerHTML = '<button class="ib indietro" data-a="chiudi-conv" aria-label="Indietro"><span class="ic-dt">'+svg('indietro')+'</span><span class="ic-ios">'+svg('chevron', 2.4)+'</span>'+
      (altre ? '<b>'+altre+'</b>' : '')+'</button>'+
    '<button class="chi" data-a="info">'+avatarConv(c)+'<span class="tt"><b>'+esc(nomeConv(c))+
      (c.bloccata ? ' <span style="color:var(--testo-2);display:inline-block;width:14px;vertical-align:-1px">'+svg('lucchetto',2.2)+'</span>' : '')+'</b>'+
      '<span class="'+(verde ? 'verde' : '')+'">'+esc(stato || (c.tipo === 'gruppo' ? 'tocca per le info del gruppo' : 'tocca per le info del contatto'))+'</span></span></button>'+
    '<span class="azioni-testa"><button class="ib" data-a="cerca-in-chat" title="Cerca">'+svg('cerca')+'</button>'+
    '<button class="ib" data-a="menu-conv" title="Menu"><span class="ic-dt">'+svg('menu')+'</span><span class="ic-ios">'+svg('puntini')+'</span></button></span>';
}

/* ---------- i messaggi ---------- */
function msgVisibili(id){
  const s = S.msgs.get(id); if(!s) return [];
  return s.lista.filter(m => !S.nascosti.has(m.id));
}
function disegnaMessaggi(mantieni){
  ultimoDisegno = Date.now();
  const M = el('msgs'); const c = S.convs.get(S.aperta); if(!M || !c) return;
  const lista = msgVisibili(c.id), s = statoMsgs(c.id);
  const daFondo = M.scrollHeight - M.scrollTop;
  let h = s.tutti ? '<div class="avviso-cifrato"><span>'+svg('lucchetto').replace('<svg','<svg style="width:11px;height:11px;display:inline;vertical-align:-1px;margin-right:4px"')+
      'Questa chat è visibile solo a chi ne fa parte. Il tuo account è quello di FOSS.</span></div>'
    : '<div class="carica-prima"><span>Scorri in su per i messaggi precedenti</span></div>';
  let giorno = null, sepFatto = false;
  lista.forEach((m, i) => {
    const d = new Date(m.creato_il);
    if(!giorno || !stessoGiorno(giorno, d)){ giorno = d; h += '<div class="giorno"><span>'+dataGiorno(d)+'</span></div>'; }
    if(primaNonLetta && !sepFatto && m.autore !== S.io && m.tipo !== 'sistema' && d > new Date(primaNonLetta)){
      sepFatto = true;
      const n = lista.slice(i).filter(x => x.autore !== S.io && x.tipo !== 'sistema').length;
      h += '<div class="nonlette-sep" id="sepNonLette"><span>'+n+' '+(n === 1 ? 'messaggio non letto' : 'messaggi non letti')+'</span></div>';
    }
    h += msgHTML(m, lista[i - 1], lista[i + 1], c);
  });
  M.innerHTML = h;
  idrataMedia(M);
  if(mantieni) M.scrollTop = M.scrollHeight - daFondo;
  /* gli effetti si vedono una volta: poi restano fermi (si rivedono toccandoli) */
  const conEff = lista.filter(m => m.media && (m.media.bolla || m.media.anim) && !S.visti.has(m.id));
  if(conEff.length) setTimeout(() => conEff.forEach(m => segnaVisto(m.id)), 2600);
}
function stessoGruppo(a, b){
  if(!a || !b || a.tipo === 'sistema' || b.tipo === 'sistema' || a.tipo === 'colpetto' || b.tipo === 'colpetto') return false;
  if(chiaveAutore(a) !== chiaveAutore(b)) return false;
  const da = new Date(a.creato_il), db = new Date(b.creato_il);
  return stessoGiorno(da, db) && Math.abs(db - da) < 7 * 60000;
}
function msgHTML(m, prev, next, c){
  if(m.tipo === 'sistema'){
    const md = m.media || {};
    if(md.fissato) return '<div class="sistema fissato" data-id="'+m.id+'"><span data-a="vai-msg" data-id="'+esc(md.fissato)+'" role="button">'+svg('spillo', 2)+
      esc(m.autore === S.io ? 'Hai fissato un messaggio' : nomeMsg(m) + ' ha fissato un messaggio')+'</span></div>';
    return '<div class="sistema" data-id="'+m.id+'"><span>'+esc(m.testo || '')+'</span></div>';
  }
  if(m.tipo === 'colpetto') return colpettoHTML(m);
  const mio = m.autore === S.io, gr = c.tipo === 'gruppo';
  const primo = !stessoGruppo(prev, m), ultimo = !stessoGruppo(m, next);
  const r = S.reazioni.get(m.id), haR = r && r.size;
  let cls = 'msg ' + (mio ? 'mio' : 'suo') + (primo ? ' primo' : '') + (ultimo ? ' ultimo' : '') + (gr ? ' gr' : '') + (haR ? ' con-reazioni' : '') +
    (S.selezione && S.selezione.has(m.id) ? ' scelto' : '') + (m.tipo === 'lavoro' || m.tipo === 'sondaggio' ? ' largo' : '');
  const conAv = suTelefono() ? ultimo : primo;   /* su iPhone la foto sta accanto all'ultimo messaggio del gruppo */
  const pre = gr && !mio ? (conAv ? avatarMsg(m, 'av-g') : '<span class="vuoto-av"></span>') : '';
  return '<div class="'+cls+'" data-id="'+m.id+'">'+pre+bollaHTML(m, c, primo, mio, gr)+'</div>';
}
function bollaHTML(m, c, primo, mio, gr){
  const md = m.media || {};
  let corpo = '', bcls = 'bolla';
  const autore = (gr || importatoDa(m)) && !mio && primo && m.tipo !== 'sticker'
    ? '<div class="autore" style="color:'+colore(chiaveAutore(m))+'">'+esc(nomeMsg(m))+((S.persone.get(m.autore) || {}).ruolo ? '<i>'+esc(S.persone.get(m.autore).ruolo)+'</i>' : '')+'</div>' : '';
  const cit = m.risponde_a && !m.eliminato ? citazioneHTML(m.risponde_a, c) : '';
  if(m.eliminato){
    corpo = '<div class="eliminato">'+svg('vietato', 1.8)+(mio ? 'Hai eliminato questo messaggio' : 'Questo messaggio è stato eliminato')+meta(m, c, mio)+'</div>';
    return '<div class="'+bcls+'">'+autore+corpo+'</div>';
  }
  const nuovoEff = !S.visti.has(m.id);
  const eff = md.bolla && (md.bolla === 'inchiostro' || nuovoEff) ? ' eff-' + md.bolla : '';
  if(m.tipo === 'testo'){
    const em = soloEmoji(m.testo);
    if(em && !cit && !md.anim){ bcls += ' solo-emoji'; corpo = '<div class="testo grande-emoji">'+esc(m.testo.trim())+'</div>'; }
    else {
      /* l'ora sta sull'ultima riga del testo, come su WhatsApp: le lascio il posto con una copia invisibile */
      const accanto = !md.anim && !(md.lavori && md.lavori.length);
      if(accanto) bcls += ' meta-in';
      corpo = '<div class="testo'+(md.anim && nuovoEff ? ' anim-' + md.anim : '')+'"'+(md.anim ? ' data-anim="'+esc(md.anim)+'" data-a="rianima"' : '')+'>'+
        (md.anim ? testoAnimato(m.testo, md.anim) : formatta(m.testo, md))+(accanto ? metaSpazio(m, c, mio) : '')+'</div>' + (md.lavori && md.lavori.length && !md.anim ? schedeInTesto(md) : '');
    }
    if(md.lavori && md.lavori.length) bcls += ' con-scheda';
  } else if(m.tipo === 'foto' || m.tipo === 'video'){
    const solo = !md.did && !cit;
    if(solo) bcls += ' solo-media';
    if(md.did) bcls += ' meta-in';
    corpo = mediaBoxHTML(m) + (md.did ? '<div class="testo didascalia">'+formatta(md.did)+metaSpazio(m, c, mio)+'</div>' : '');
  } else if(m.tipo === 'sticker'){
    bcls += ' sticker';
    corpo = '<img class="stk" data-mid="'+m.id+'" data-a="vedi" data-id="'+m.id+'" alt="Sticker"'+(md.path && /^foss:/.test(md.path) ? ' src="'+stickerFoss(md.path.slice(5))+'"' : '')+'>';
  } else if(m.tipo === 'vocale'){
    corpo = vocaleHTML(m, mio);
  } else if(m.tipo === 'file'){
    corpo = docHTML(m);
  } else if(m.tipo === 'sondaggio'){
    bcls += ' sondaggio';
    corpo = sondaggioHTML(m);
  } else if(m.tipo === 'lavoro'){
    bcls += ' lavoro';
    corpo = lavoroHTML(m);
  }
  const menu = '<button class="menu-msg" data-a="menu-msg" data-id="'+m.id+'" aria-label="Opzioni">'+svg('giu')+'</button>';
  const polvere = md.bolla === 'inchiostro' ? '<span class="polvere"><canvas data-polvere="1"></canvas></span>' : '';
  return '<div class="'+bcls+eff+'"'+(md.bolla === 'inchiostro' ? ' data-a="svela"' : '')+'>'+menu+autore+cit+corpo+
    (m.tipo === 'sticker' || bcls.includes('solo-media') || bcls.includes('solo-emoji') ? meta(m, c, mio) : (m.tipo === 'vocale' ? '' : meta(m, c, mio)))+
    polvere+reazioniHTML(m.id)+'</div>'+
    (m._stato === 'errore' ? '<span class="a-capo"></span><button class="riprova-b" data-a="riprova" data-id="'+m.id+'">'+svg('aggiorna', 2)+'<span>Non inviato · <b>Riprova</b></span></button>' : '');
}
function meta(m, c, mio){
  const md = m.media || {};
  return '<span class="meta">'+
    (m.fissato_il ? '<span class="mt-ic" title="Fissato">'+svg('spillo', 2.2)+'</span>' : '')+
    (S.importanti.has(m.id) ? '<span class="mt-ic stella" title="Importante">'+svg('stellaPiena', 1.6)+'</span>' : '')+
    (S.promemoria.has(m.id) ? '<span class="mt-ic" title="Promemoria '+esc(quando(S.promemoria.get(m.id).quando))+'">'+svg('sveglia', 2.2)+'</span>' : '')+
    (md.schermo || md.bolla || md.anim ? '<span class="mt-ic" title="Inviato con effetto">'+svg('effetti', 2)+'</span>' : '')+
    (m.modificato_il ? '<button class="mod" data-a="info-modifica" data-id="'+m.id+'" title="Modificato '+esc(quando(m.modificato_il))+'">modificato</button>' : '')+
    ora(m.creato_il)+(mio ? spunteHTML(statoSpunte(m, c)) : '')+'</span>';
}
function metaSpazio(m, c, mio){ return meta(m, c, mio).replace('<span class="meta">', '<span class="meta spazio" aria-hidden="true">'); }
function reazioniHTML(id){
  const r = S.reazioni.get(id); if(!r || !r.size) return '';
  const cont = new Map(); r.forEach(e => cont.set(e, (cont.get(e) || 0) + 1));
  const ord = Array.from(cont.entries()).sort((a, b) => b[1] - a[1]);
  return '<span class="reazioni" data-a="chi-reagisce" data-id="'+id+'">'+ord.slice(0, 3).map(x => x[0]).join('')+(r.size > 1 ? '<b>'+r.size+'</b>' : '')+'</span>';
}
function citazioneHTML(rid, c){
  const q = trovaMsg(c.id, rid);
  if(!q) return '<div class="citazione" data-a="vai-msg" data-id="'+rid+'"><span class="barra"></span><span class="cc"><span>Messaggio non disponibile</span></span></div>';
  const col = q.autore === S.io ? 'var(--cit-mio)' : colore(chiaveAutore(q));
  const md = q.media || {};
  let t = q.eliminato ? 'Messaggio eliminato' : '';
  let ic = '';
  if(!q.eliminato){
    if(q.tipo === 'testo') t = testoSemplice(q.testo);
    else if(q.tipo === 'foto'){ ic = svg('foto', 2); t = md.did || (md.gif ? 'GIF' : 'Foto'); }
    else if(q.tipo === 'video'){ ic = svg('video', 2); t = md.did || (md.gif ? 'GIF' : 'Video'); }
    else if(q.tipo === 'vocale'){ ic = svg('mic', 2); t = 'Messaggio vocale (' + fmtDur(md.dur) + ')'; }
    else if(q.tipo === 'sticker'){ ic = svg('sticker', 2); t = 'Sticker'; }
    else if(q.tipo === 'file'){ ic = svg('doc', 2); t = md.nome || 'Documento'; }
  }
  const mini = (q.tipo === 'foto' || q.tipo === 'video' || q.tipo === 'sticker') && !q.eliminato
    ? '<img data-mini-di="'+q.id+'" alt=""'+(md.mini ? ' src="'+esc(md.mini)+'"' : '')+'>' : '';
  return '<div class="citazione" style="--col:'+col+'" data-a="vai-msg" data-id="'+rid+'"><span class="barra"></span><span class="cc"><b>'+esc(q.autore === S.io ? 'Tu' : nomeMsg(q))+'</b>'+
    '<span>'+ic+esc(t)+'</span></span>'+mini+'</div>';
}
function soloEmoji(t){
  t = String(t || '').trim(); if(!t || t.length > 24) return false;
  try{
    if(!/^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u.test(t)) return false;
    const n = (t.match(/\p{Extended_Pictographic}/gu) || []).length;
    return n >= 1 && n <= 3 && !/^[\d#*\s]+$/.test(t);
  }catch(e){ return false; }
}
/* *grassetto* _corsivo_ ~barrato~ `codice` e i link */
function formatta(t, md){
  let s = esc(t || '');
  const blocchi = [];
  const metti = h => { blocchi.push(h); return '\u0000' + (blocchi.length - 1) + '\u0000'; };
  s = s.replace(/```([\s\S]+?)```/g, (_, x) => metti('<pre>' + x + '</pre>'));
  s = s.replace(/`([^`\n]+)`/g, (_, x) => metti('<code>' + x + '</code>'));
  s = s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, u => metti('<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>'));
  s = decoraTesto(s, md, metti);
  s = s.replace(/(^|[\s(])\*\*(\S(?:[^*\n]*\S)?)\*\*(?=$|[\s).,!?:;])/g, '$1<b>$2</b>');   /* anche **cosi'** */
  s = s.replace(/(^|[\s(])\*(\S(?:[^*\n]*\S)?)\*(?=$|[\s).,!?:;])/g, '$1<b>$2</b>')
       .replace(/(^|[\s(])_(\S(?:[^_\n]*\S)?)_(?=$|[\s).,!?:;])/g, '$1<i>$2</i>')
       .replace(/(^|[\s(])~(\S(?:[^~\n]*\S)?)~(?=$|[\s).,!?:;])/g, '$1<s>$2</s>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => blocchi[+i]);
  return s;
}
function testoAnimato(t, anim){
  const lettere = Array.from(String(t || ''));
  return lettere.map((l, i) => {
    if(l === '\n') return '<br>';
    const dx = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 60, dy = (Math.cos(i * 78.233) * 12345.678 % 1) * 50, rot = ((i * 47) % 70) - 35;
    return '<span class="anim-l" style="animation-delay:'+(anim === 'onda' || anim === 'fiorisci' || anim === 'annuisci' ? i * 45 : anim === 'esplodi' ? 0 : i * 8)+'ms;'+
      '--dx:'+dx.toFixed(0)+'px;--dy:'+dy.toFixed(0)+'px;--rot:'+rot+'deg">'+esc(l)+'</span>';
  }).join('');
}
function dimensioniMedia(md, max){
  max = max || (suTelefono() ? Math.min(260, window.innerWidth * .68) : 330);
  let w = md.w || 300, h = md.h || 220;
  const r = h / w;
  w = Math.min(max, w); if(w < 160) w = Math.min(max, 160);
  h = Math.round(w * r);
  h = Math.max(110, Math.min(h, 380));
  return [Math.round(w), h];
}
function mediaBoxHTML(m){
  const md = m.media || {};
  const [w, h] = dimensioniMedia(md);
  const st = 'width:'+w+'px;height:'+h+'px';
  const mini = md.mini ? '<img class="mini" src="'+esc(md.mini)+'" alt="">' : '';
  const carica = m._avanza != null ? '<div class="media-carica" data-a="annulla-carica" data-id="'+m.id+'" title="Tocca per fermare">'+anelloHTML(m._avanza)+'</div>' : '';
  const errore = m._stato === 'errore' ? '<div class="media-carica"><button class="anello" data-a="riprova" data-id="'+m.id+'" title="Riprova">'+svg('aggiorna')+'</button></div>' : '';
  if(m.tipo === 'video'){
    if(md.gif) return '<div class="media-box" style="'+st+'" data-a="vedi" data-id="'+m.id+'">'+mini+
      '<video data-mid="'+m.id+'" muted loop playsinline autoplay preload="metadata"></video><span class="gif-tag">GIF</span>'+carica+errore+'</div>';
    return '<div class="media-box" style="'+st+'" data-a="vedi" data-id="'+m.id+'">'+mini+
      '<video data-mid="'+m.id+'" preload="metadata" muted playsinline></video><span class="ombra-ora"></span>'+
      (m._avanza == null && m._stato !== 'errore' ? '<span class="play"><span>'+svg('play')+'</span></span>' : '')+
      (md.dur ? '<span class="dur">'+svg('video', 2)+fmtDur(md.dur)+'</span>' : '')+carica+errore+'</div>';
  }
  return '<div class="media-box" style="'+st+'" data-a="vedi" data-id="'+m.id+'">'+mini+'<img data-mid="'+m.id+'" alt="" draggable="false">'+
    (md.gif ? '<span class="gif-tag">GIF</span>' : '')+'<span class="ombra-ora"></span>'+carica+errore+'</div>';
}
function anelloHTML(p){
  const C = 2 * Math.PI * 20, v = Math.max(.02, Math.min(1, p || 0));
  return '<span class="anello"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="3"/>'+
    '<circle cx="26" cy="26" r="20" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+(C * (1 - v))+'" transform="rotate(-90 26 26)"/></svg></span>';
}
function estensione(nome){ const m = /\.([a-z0-9]{1,6})$/i.exec(nome || ''); return m ? m[1].toLowerCase() : ''; }
function classeDoc(ext){
  if(ext === 'pdf') return 'pdf';
  if(/^(doc|docx|odt|rtf|txt|pages)$/.test(ext)) return 'doc';
  if(/^(xls|xlsx|csv|ods|numbers)$/.test(ext)) return 'xls';
  if(/^(ppt|pptx|key|odp)$/.test(ext)) return 'ppt';
  if(/^(zip|rar|7z|tar|gz)$/.test(ext)) return 'zip';
  if(/^(mp3|wav|m4a|aac|flac|ogg)$/.test(ext)) return 'aud';
  return '';
}
function docHTML(m){
  const md = m.media || {}, ext = estensione(md.nome);
  const carica = m._avanza != null ? '<span class="sc" data-a="annulla-carica" data-id="'+m.id+'">'+'<span class="giro" style="border-color:rgba(134,150,160,.3);border-top-color:var(--verde)"></span></span>' : '<span class="sc">'+svg('scarica')+'</span>';
  return '<button class="doc" data-a="apri-doc" data-id="'+m.id+'"><span class="ic '+classeDoc(ext)+'">'+esc((ext || 'file').toUpperCase().slice(0, 4))+'</span>'+
    '<span class="nm"><b>'+esc(md.nome || 'Documento')+'</b><span>'+[ext.toUpperCase(), fmtDim(md.dim)].filter(Boolean).join(' · ')+'</span></span>'+carica+'</button>'+
    (md.did ? '<div class="testo didascalia">'+formatta(md.did)+'</div>' : '');
}
function vocaleHTML(m, mio){
  const md = m.media || {};
  const onda = ondaDa(md.onda);
  const ascoltati = memoria('ascoltati') || {};
  const nuovo = !mio && !ascoltati[m.id];
  return '<div class="vocale" data-voc="'+m.id+'">'+
    '<button class="vp" data-a="play-voc" data-id="'+m.id+'" aria-label="Ascolta">'+svg('play')+'</button>'+
    '<div class="onda" data-a="cerca-voc" data-id="'+m.id+'"><span class="barre">'+onda.map(v => '<i style="height:'+Math.max(10, v * 100)+'%"></i>').join('')+'</span><span class="pallino"></span>'+
      '<span class="tempo">'+fmtDur(md.dur)+'</span></div>'+
    '<button class="vel" data-a="vel-voc">1×</button>'+
    '<span class="vav">'+avatarMsg(m)+'<span class="mic '+(nuovo ? 'nuovo' : 'ascoltato')+'">'+svg('mic', 2.4)+'</span></span>'+
    '</div>'+meta(m, S.convs.get(m.conv_id) || {membri: []}, mio);
}
function ondaDa(s){
  const n = suTelefono() ? 32 : 40;
  if(typeof s === 'string' && s.length){
    const v = Array.from(s).map(ch => Math.max(0, Math.min(31, ch.charCodeAt(0) - 65)) / 31);
    const out = []; for(let i = 0; i < n; i++) out.push(v[Math.floor(i * v.length / n)] || .1);
    return out;
  }
  const out = []; for(let i = 0; i < n; i++) out.push(.15 + Math.abs(Math.sin(i * 1.7)) * .5); return out;
}

/* i file arrivano dopo: prima disegno, poi chiedo gli indirizzi */
async function idrataMedia(root){
  const c = S.convs.get(S.aperta); if(!c) return;
  const nodi = $$('img[data-mid]:not([src]), video[data-mid]:not([src])', root);
  for(const n of nodi){
    const m = trovaMsg(c.id, n.dataset.mid); if(!m || !m.media) continue;
    const u = await urlMedia(m.media.locale ? m.media : m.media);
    if(u){ n.src = u; if(n.tagName === 'VIDEO' && n.autoplay) n.play().catch(() => {}); n.addEventListener('load', () => { const mi = n.parentNode && n.parentNode.querySelector('.mini'); if(mi) mi.remove(); }, {once: true}); }
    else if(!m._avanza) mediaNonArriva(m.id);
  }
  $$('img[data-mini-di]:not([src])', root).forEach(async n => {
    const q = trovaMsg(c.id, n.dataset.miniDi); if(!q || !q.media) return;
    const u = await urlMedia(q.media); if(u) n.src = u;
  });
  $$('canvas[data-polvere]', root).forEach(polvere);
  /* effetti a bolla: si vedono una volta sola, quando il messaggio e' nuovo */
}
function mediaNonArriva(mid){
  const c = S.convs.get(S.aperta); if(!c) return;
  const m = trovaMsg(c.id, mid); if(!m || m._avanza != null) return;
  const nas = !!(m.media && m.media.url && !m.media.giphy);
  const box = $('.msg[data-id="'+mid+'"] .media-box, .msg[data-id="'+mid+'"] .stk', el('msgs'));
  const html = '<div class="media-offline">'+svg(nas ? 'server' : 'foto', 1.6)+
    '<b>'+(nas ? 'Il server dei media sembra offline' : (navigator.onLine ? 'File non disponibile' : 'Sei offline'))+'</b>'+
    '<span>'+(nas ? 'Il NAS non risponde: il file tornerà visibile quando sarà di nuovo acceso.' : 'Non riesco a scaricarlo adesso.')+'</span>'+
    '<button data-a="ricarica-media" data-id="'+mid+'">Riprova</button></div>';
  if(box){
    const d = document.createElement('div'); d.innerHTML = html; d.style.width = (box.offsetWidth || 260) + 'px'; d.style.maxWidth = '100%';
    box.replaceWith(d);
  }
  const v = $('.vocale[data-voc="'+mid+'"]');
  if(v && nas){ const t = v.querySelector('.tempo'); if(t) t.textContent = 'Il server dei media sembra offline'; }
}

function ridisegnaMessaggio(id){
  const c = S.convs.get(S.aperta); if(!c) return;
  const n = $('.msg[data-id="'+id+'"]', el('msgs')); if(!n) return;
  const lista = msgVisibili(c.id), i = lista.findIndex(x => x.id === id); if(i < 0){ n.remove(); return; }
  const d = document.createElement('div'); d.innerHTML = msgHTML(lista[i], lista[i - 1], lista[i + 1], c);
  const nuovo = d.firstChild;
  n.replaceWith(nuovo); idrataMedia(nuovo);
}
function aggiornaSpunte(){
  const c = S.convs.get(S.aperta); if(!c) return;
  $$('.msg.mio', el('msgs')).forEach(n => {
    const m = trovaMsg(c.id, n.dataset.id); if(!m) return;
    const mt = n.querySelector('.bolla > .meta, .vocale + .meta, .eliminato .meta'); if(!mt) return;
    const sp = mt.querySelector('.sp'); const nuovo = spunteHTML(statoSpunte(m, c));
    if(sp){ const d = document.createElement('span'); d.innerHTML = nuovo; sp.replaceWith(d.firstChild); }
  });
}
function aggiungiMessaggioAlFondo(m, altrui){
  const M = el('msgs'); const c = S.convs.get(S.aperta); if(!M || !c) return;
  if(S.nascosti.has(m.id)) return;
  const giu = vicinoAlFondo();
  const lista = msgVisibili(c.id), i = lista.findIndex(x => x.id === m.id);
  if(i < 0) return;
  if(i < lista.length - 1){ disegnaMessaggi(true); return; }
  const prev = lista[i - 1];
  if(prev && !stessoGiorno(new Date(prev.creato_il), new Date(m.creato_il))) M.insertAdjacentHTML('beforeend', '<div class="giorno"><span>'+dataGiorno(m.creato_il)+'</span></div>');
  if(prev && stessoGruppo(prev, m)) ridisegnaMessaggio(prev.id);
  const d = document.createElement('div'); d.innerHTML = msgHTML(m, prev, null, c);
  const nodo = d.firstChild;
  M.appendChild(nodo);
  idrataMedia(nodo);
  const md = m.media || {};
  if(md.bolla === 'slam' && !S.visti.has(m.id)){ const cv = el('conv'); cv.classList.remove('scossa'); void cv.offsetWidth; cv.classList.add('scossa'); }
  if(giu || !altrui) vaiInFondo(!altrui ? false : true);
  else { nuoviSotto++; mostraGiu(); if(menzionaMe(m)){ menzDaVedere.push(m.id); mostraMenz(); } }
  if(md.bolla || md.anim) setTimeout(() => segnaVisto(m.id), 2600);
}
function segnaVisto(id){ S.visti.add(id); const a = Array.from(S.visti).slice(-400); memoria('effetti_visti', a); }

/* ---------- scorrere ---------- */
function vicinoAlFondo(){ const M = el('msgs'); return !M || M.scrollHeight - M.scrollTop - M.clientHeight < 160; }
function vaiInFondo(subito){
  const M = el('msgs'); if(!M) return;
  const sep = subito && primaNonLetta && el('sepNonLette');
  const fai = () => {
    if(sep){ M.scrollTop = Math.max(0, sep.offsetTop - 80); }
    else M.scrollTo({top: M.scrollHeight, behavior: subito ? 'auto' : 'smooth'});
  };
  fai(); requestAnimationFrame(fai); setTimeout(fai, 120);
  nuoviSotto = 0; mostraGiu();
}
function mostraGiu(){
  const b = el('giuB'); if(!b) return;
  const lontano = !vicinoAlFondo();
  b.classList.toggle('nascosto', !lontano);
  b.innerHTML = svg('giu') + (nuoviSotto ? '<span class="contatore">'+nuoviSotto+'</span>' : '');
}
let caricandoSu = false;
async function alloScorrere(){
  const M = el('msgs'); if(!M) return;
  mostraGiu();
  mostraDataFluttua();
  if(menzDaVedere.length) mostraMenz();
  if(vicinoAlFondo()){ nuoviSotto = 0; const c = S.convs.get(S.aperta); if(c && c.non_lette) segnaLetto(c.id); }
  if(M.scrollTop < 300 && !caricandoSu){
    const s = S.msgs.get(S.aperta); if(!s || s.tutti) return;
    caricandoSu = true;
    try{ const n = await caricaMessaggi(S.aperta, true); if(n.length) disegnaMessaggi(true); else if(s.tutti) disegnaMessaggi(true); }
    catch(e){} finally{ caricandoSu = false; }
  }
}
async function vaiAMessaggio(id){
  const conv = S.aperta; if(!conv || !id) return;
  let giri = 0;
  while(!msgVisibili(conv).some(m => m.id === id) && giri < 40){
    const s = S.msgs.get(conv); if(!s || s.tutti) break;
    await caricaMessaggi(conv, true); giri++;
  }
  if(S.aperta !== conv) return;
  if(giri) disegnaMessaggi(true);
  const n = $('.msg[data-id="'+id+'"], .sistema[data-id="'+id+'"]', el('msgs'));
  if(!n){ toast(S.nascosti.has(id) ? 'Hai eliminato quel messaggio.' : 'Messaggio non trovato: forse è stato eliminato o la chat è stata svuotata.'); return; }
  n.scrollIntoView({block: 'center', behavior: 'smooth'});
  n.classList.remove('evidenzia'); void n.offsetWidth; n.classList.add('evidenzia');
}

/* ---------- reazioni (il menu del messaggio sta in 13-menu.js) ---------- */
async function reagisci(id, emoji){
  const c = S.convs.get(S.aperta); if(!c) return;
  if(!S.reazioni.has(id)) S.reazioni.set(id, new Map());
  const r = S.reazioni.get(id), mia = r.get(S.io);
  try{
    if(mia === emoji){
      r.delete(S.io); ridisegnaMessaggio(id);
      const {error} = await sb.from('chat_reazioni').delete().eq('msg_id', id).eq('utente_id', S.io); if(error) throw error;
    } else {
      r.set(S.io, emoji); ridisegnaMessaggio(id);
      const {error} = await sb.from('chat_reazioni').upsert({msg_id: id, utente_id: S.io, conv_id: c.id, emoji, creata_il: new Date().toISOString()}, {onConflict: 'msg_id,utente_id'});
      if(error) throw error;
    }
  }catch(e){ errore(e, 'Reazione non salvata'); }
}
function chiReagisce(id){
  const r = S.reazioni.get(id); if(!r || !r.size) return;
  const righe = Array.from(r.entries()).map(([u, e]) =>
    '<div class="voce" '+(u === S.io ? 'data-a="togli-reazione" data-id="'+id+'" role="button"' : '')+'>'+avatar(u)+'<span class="vc"><b>'+esc(u === S.io ? 'Tu' : nomeLungo(u))+'</b>'+
    (u === S.io ? '<span>Tocca per togliere</span>' : '')+'</span><span style="font-size:24px">'+e+'</span></div>').join('');
  foglio('Reazioni · ' + r.size, '<div style="margin:0 -24px">'+righe+'</div>', [['Chiudi']]);
}
function impostaRisposta(m){
  S.risposta = m;
  disegnaScrivi();
  const t = el('testoIn'); if(t) t.focus();
}
async function copia(t){
  try{ await navigator.clipboard.writeText(t || ''); toast('Testo copiato'); }
  catch(e){ const a = document.createElement('textarea'); a.value = t || ''; document.body.appendChild(a); a.select(); try{ document.execCommand('copy'); toast('Testo copiato'); }catch(_){} a.remove(); }
}
function eliminaMessaggio(m){
  const mio = m.autore === S.io && !m.eliminato;
  const voci = [['Elimina per me', async () => {
    S.nascosti.add(m.id); const n = $('.msg[data-id="'+m.id+'"]'); if(n) n.remove();
    const {error} = await sb.from('chat_nascosti').insert({msg_id: m.id, utente_id: S.io});
    if(error && !/duplicate/i.test(error.message)) errore(error, 'Non eliminato');
  }, 'rosso']];
  if(mio) voci.unshift(['Elimina per tutti', async () => {
    try{
      const {data, error} = await sb.rpc('chat_elimina', {p_id: m.id}); if(error) throw error;
      m.eliminato = true; m.testo = null; const md = m.media; m.media = null; ridisegnaMessaggio(m.id);
      const p = (data && data.path) || (md && md.path);
      if(p && !/^foss:|^sticker\//.test(p)) sb.storage.from('chat').remove([p]).catch(() => {});
    }catch(e){ errore(e, 'Non eliminato'); }
  }, 'rosso']);
  foglio('Eliminare il messaggio?', mio ? 'Puoi eliminarlo solo per te o per tutti quelli della chat.' : 'Il messaggio sparisce solo da questo dispositivo e dagli altri tuoi.',
    voci.concat([['Annulla']]));
}
async function infoMessaggio(m){
  const c = S.convs.get(m.conv_id) || S.convs.get(S.aperta); if(!c) return;
  const t = new Date(m.creato_il).getTime();
  const altri = (c.membri || []).filter(x => x.id !== S.io);
  let ore = new Map();
  try{ const {data} = await sb.from('chat_letture').select('utente_id,letto_il').eq('msg_id', m.id); (data || []).forEach(r => ore.set(r.utente_id, r.letto_il)); }catch(e){}
  const letti = altri.filter(x => ore.has(x.id) || new Date(x.letto).getTime() >= t);
  const arrivati = altri.filter(x => !letti.includes(x) && new Date(x.ricevuto).getTime() >= t);
  const resto = altri.filter(x => !letti.includes(x) && !arrivati.includes(x));
  const blocco = (tit, ic, l, conOra) => l.length ? '<div class="sez-t" style="padding:14px 0 6px;display:flex;gap:8px;align-items:center">'+ic+tit+'</div>'+
    l.map(x => '<div class="voce" style="padding:6px 0">'+avatar(x.id)+'<span class="vc"><b>'+esc(nomeLungo(x.id))+'</b>'+(conOra && ore.has(x.id) ? '<span>'+esc(maiuscola(quando(ore.get(x.id))))+'</span>' : '')+'</span></div>').join('') : '';
  foglio('Info messaggio', '<div class="info-msg-ant">'+esc(testoAnteprima(m)).slice(0, 300)+'</div>'+
    '<div style="color:var(--testo-2);font-size:13px">Inviato '+esc(quando(m.creato_il))+(m.modificato_il ? '<br>Modificato '+esc(quando(m.modificato_il)) : '')+'</div>'+
    blocco('Letto da', '<span style="width:18px;color:var(--blu-spunta)">'+svg('spunte')+'</span>', letti, true)+
    blocco('Consegnato a', '<span style="width:18px">'+svg('spunte')+'</span>', arrivati)+
    blocco('In attesa', '<span style="width:18px">'+svg('spunta')+'</span>', resto), [['Chiudi']]);
}
async function scaricaMedia(m){
  try{
    const u = await urlMedia(m.media); if(!u) throw new Error('nessun indirizzo');
    const r = await fetch(u); const b = await r.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(b);
    a.download = (m.media && m.media.nome) || ('FOSS-chat-' + new Date(m.creato_il).toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.' + ((b.type.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace(/;.*/, '')));
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }catch(e){ toast(m.media && m.media.url ? 'Il server dei media sembra offline.' : 'Non riesco a scaricare il file.'); }
}

/* scorrere a destra un messaggio = rispondi (come sul telefono) */
function attivaScorriPerRispondere(M){
  let x0 = 0, y0 = 0, nodo = null, attivo = false;
  M.addEventListener('touchstart', e => {
    const n = e.target.closest('.msg'); if(!n || e.touches.length > 1) return;
    nodo = n; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; attivo = false;
  }, {passive: true});
  M.addEventListener('touchmove', e => {
    if(!nodo) return;
    const dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
    if(!attivo && Math.abs(dy) > 12){ nodo = null; return; }
    if(dx > 10 && Math.abs(dx) > Math.abs(dy)) attivo = true;
    if(attivo){ const v = Math.min(80, Math.max(0, dx)); nodo.style.transform = 'translateX('+v+'px)'; nodo.style.transition = 'none'; }
  }, {passive: true});
  M.addEventListener('touchend', () => {
    if(!nodo) return;
    const v = parseFloat((nodo.style.transform.match(/-?[\d.]+/) || [0])[0]);
    nodo.style.transition = 'transform .2s'; nodo.style.transform = '';
    if(attivo && v >= 60){ const c = S.convs.get(S.aperta); const m = trovaMsg(c.id, nodo.dataset.id); if(m && m.tipo !== 'sistema' && !m.eliminato){ impostaRisposta(m); try{ navigator.vibrate && navigator.vibrate(15); }catch(e){} } }
    nodo = null; attivo = false;
  });
}
/* 2.8.1: la data in alto mentre scorri (come WhatsApp). Prima le date restavano incollate
   in cima una sull'altra; ora i separatori scorrono con i messaggi e in alto compare una sola
   data, quella del primo messaggio che vedi, che sparisce da sola appena smetti di scorrere. */
let ultimoDisegno = 0, tDataFluttua = null;
function mostraDataFluttua(){
  const M = el('msgs'), D = el('dataFluttua'); if(!M || !D) return;
  if(Date.now() - ultimoDisegno < 700) return;          // e' il ridisegno, non sei tu che scorri
  const alto = M.scrollTop + (parseFloat(getComputedStyle(M).paddingTop) || 0) + 4;
  let testo = '';
  for(const g of M.querySelectorAll('.giorno')){ if(g.offsetTop <= alto) testo = g.textContent; else break; }
  clearTimeout(tDataFluttua);
  if(!testo){ D.classList.remove('su'); return; }
  D.firstChild.textContent = testo;
  D.classList.add('su');
  tDataFluttua = setTimeout(() => D.classList.remove('su'), 1300);
}
