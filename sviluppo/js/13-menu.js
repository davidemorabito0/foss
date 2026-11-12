/* ======================= IL MENU DEL MESSAGGIO (come WhatsApp e Telegram) =======================
   Sul telefono: pressione lunga, lo sfondo si sfoca, il messaggio si alza, sopra le reazioni,
   sotto il menu (con «Altro…» per le voci meno usate). Sul computer: tasto destro o la freccina. */
const REAZ = ['👍','❤️','😂','😮','😢','🙏','🔥'];

function testoDi(m){
  const md = m.media || {};
  if(m.tipo === 'testo' || m.tipo === 'sondaggio') return m.testo || '';
  if(m.tipo === 'lavoro') return m.testo || (md.lavoro ? md.lavoro.n : '');
  return md.did || '';
}
function puoModificare(m){
  return !!m && m.autore === S.io && !m.eliminato && !m._stato && ['testo','foto','video','file'].includes(m.tipo) &&
    Date.now() - new Date(m.creato_il).getTime() < 15 * 60000 - 3000;
}
function vociMessaggio(m, c){
  const mio = m.autore === S.io, md = m.media || {};
  const p = [], a = [];
  if(m.eliminato){
    p.push(['Seleziona', 'seleziona', () => avviaSelezione(m.id)]);
    p.push(['Elimina', 'cestino', () => eliminaMessaggio(m), 'rosso']);
    return {p, a};
  }
  const colp = m.tipo === 'colpetto';
  if(!colp) p.push(['Rispondi', 'rispondi', () => impostaRisposta(m)]);
  if(m.tipo === 'lavoro' && md.lavoro) p.push(['Apri in FOSS', 'apri', () => apriLavoroInFoss(md.lavoro)]);
  if(testoDi(m) && m.tipo !== 'lavoro') p.push(['Copia', 'copia', () => copia(testoDi(m))]);
  if(['foto','video','file','vocale'].includes(m.tipo)) p.push([m.tipo === 'foto' ? 'Salva immagine' : m.tipo === 'video' ? (md.gif ? 'Salva GIF' : 'Salva video') : 'Salva', 'scarica', () => scaricaMedia(m)]);
  if(puoModificare(m)) p.push([m.tipo === 'testo' ? 'Modifica' : 'Modifica didascalia', 'matita', () => avviaModifica(m)]);
  if(!colp) p.push(m.fissato_il ? ['Togli dai fissati', 'spilloVia', () => fissa(m, false)] : ['Fissa', 'spillo', () => fissa(m, true)]);
  if(!colp) p.push(['Inoltra', 'inoltra', () => inoltra([m])]);
  p.push(['Elimina', 'cestino', () => eliminaMessaggio(m), 'rosso']);

  /* v2.3: la super notifica (solo l'amministratore di FOSS): il messaggio arriva anche per email */
  if(mio && S.adminFoss && !colp && !m._stato && m.tipo !== 'sistema' && (c.membri || []).some(x => x.id !== S.io))
    a.push(['Super notifica', 'mail', () => superNotifica(m, c)]);
  if(!colp) a.push(S.importanti.has(m.id) ? ['Non più importante', 'stellaPiena', () => importante(m, false)] : ['Importante', 'stella', () => importante(m, true)]);
  if(!colp) a.push(S.promemoria.has(m.id) ? ['Togli il promemoria', 'sveglia', () => togliPromemoria(m)] : ['Ricordamelo', 'sveglia', () => ricordamelo(m)]);
  if(mio) a.push(['Info', 'info', () => infoMessaggio(m)]);
  a.push(['Seleziona', 'seleziona', () => avviaSelezione(m.id)]);
  if(m.tipo === 'sondaggio') a.push(['Vedi i voti', 'sondaggio', () => vediVoti(m)]);
  if(m.tipo === 'sondaggio' && mio && !md.chiuso) a.push(['Chiudi il sondaggio', 'lucchetto', () => chiudiSondaggio(m)]);
  if(m.tipo === 'foto' && !md.gif) a.push(['Crea sticker', 'sticker', () => stickerDaMessaggio(m)]);
  if(m.tipo === 'sticker' && !(md.path && /^sticker\/[^/]+/.test(md.path) && md.path.indexOf(S.io) === 8)) a.push(['Aggiungi ai miei sticker', 'stella', () => salvaInRaccolta(m, 'sticker')]);
  if(md.gif) a.push(['Aggiungi alle mie GIF', 'gif', () => salvaInRaccolta(m, 'gif')]);
  if(c.tipo === 'gruppo' && !mio && m.autore) a.push(['Scrivi a ' + nomeMsg(m), 'nuova', () => scriviA(m.autore)]);
  return {p, a};
}

/* le righe in cima al menu: letto / modificato / promemoria (come Telegram) */
function testataMenu(m, c){
  const r = [];
  if(m.autore === S.io && !m.eliminato && m.tipo !== 'colpetto'){
    const st = statoSpunte(m, c);
    const altri = (c.membri || []).filter(x => x.id !== S.io);
    if(st === 'invio') r.push(['orologio', 'In invio…']);
    else if(st === 'errore') r.push(['info', 'Non inviato']);
    else if(!altri.length) r.push(['spunta', 'Salvato nella chat con te']);
    else if(c.tipo === 'gruppo'){
      const t = new Date(m.creato_il).getTime();
      const n = altri.filter(x => new Date(x.letto).getTime() >= t).length;
      r.push(['spunte', n === altri.length ? 'Letto da tutti' : n ? 'Letto da ' + n + ' su ' + altri.length : (st === 'arrivato' ? 'Consegnato a tutti' : 'Inviato'), 'letto-g', n > 0]);
    } else {
      r.push([st === 'inviato' ? 'spunta' : 'spunte', st === 'letto' ? 'Letto' : st === 'arrivato' ? 'Consegnato' : 'Inviato', 'letto-p', st === 'letto']);
    }
  }
  if(m.modificato_il) r.push(['matita', 'Modificato ' + quando(m.modificato_il)]);
  if(m.fissato_il) r.push(['spillo', 'Fissato' + (m.fissato_da && m.fissato_da !== S.io ? ' da ' + nomeDi(m.fissato_da) : '')]);
  const pr = S.promemoria.get(m.id);
  if(pr) r.push(['sveglia', 'Promemoria ' + quando(pr.quando)]);
  if(m.programmato) r.push(['programma', 'Era programmato']);
  return r;
}
function testataHTML(righe, id){
  if(!righe.length) return '';
  return '<div class="fm-testa">'+righe.map(x => '<div class="fm-riga'+(x[2] ? ' ' + x[2] : '')+(x[3] ? ' blu' : '')+'"'+(x[2] === 'letto-g' ? ' data-fm="info"' : '')+'>'+
    '<span class="fm-ic">'+svg(x[0], 2)+'</span><span class="fm-tx">'+esc(x[1])+'</span>'+(x[2] === 'letto-g' ? '<span class="fm-va">'+svg('avanti', 2.2)+'</span>' : '')+'</div>').join('')+'</div>';
}
/* l'ora esatta della lettura, in una chat privata: arriva dopo */
async function oraLettura(m, nodo){
  try{
    const {data, error} = await sb.from('chat_letture').select('utente_id,letto_il').eq('msg_id', m.id);
    if(error || !data || !data.length || !nodo) return;
    const t = data.map(x => new Date(x.letto_il)).sort((a, b) => b - a)[0];
    const tx = nodo.querySelector('.fm-riga.letto-p .fm-tx'); if(tx) tx.textContent = 'Letto ' + quando(t);
  }catch(e){}
}

let fm = null;   // il menu aperto
function chiudiFocus(subito){
  const f = el('focusMenu'); if(!f){ fm = null; return; }
  const orig = fm && fm.orig; fm = null;
  document.removeEventListener('keydown', tastoFocus, true);
  if(subito){ f.remove(); if(orig) orig.style.visibility = ''; return; }
  f.classList.add('via');
  setTimeout(() => { f.remove(); if(orig) orig.style.visibility = ''; }, 160);
}
function tastoFocus(e){ if(e.key === 'Escape'){ e.stopPropagation(); chiudiFocus(); } }

function menuMessaggio(id, x, y){
  const c = S.convs.get(S.aperta); const m = c && trovaMsg(c.id, id);
  if(!m || m.tipo === 'sistema' || m._finto) return;
  if(S.selezione){ alternaScelto(id); return; }
  chiudiMenu(); chiudiFocus(true);
  const nodo = $('.msg[data-id="'+id+'"]', el('msgs'));
  const bolla = nodo && (nodo.querySelector('.bolla') || nodo.querySelector('span'));
  if(!nodo || !bolla) return;
  const {p, a} = vociMessaggio(m, c);
  const righe = testataMenu(m, c);
  const reazioni = !m.eliminato && m.tipo !== 'colpetto' && !m._stato;
  const telefono = tocco() || suTelefono();
  const f = document.createElement('div'); f.className = 'focus' + (telefono ? ' telefono' : ' computer'); f.id = 'focusMenu';
  const mia = (S.reazioni.get(id) || new Map()).get(S.io);
  const barra = reazioni ? '<div class="focus-reaz'+(telefono ? '' : ' in-menu')+'" id="fmReaz">'+REAZ.map(e => '<button class="'+(mia === e ? 'mia' : '')+'" data-e="'+e+'">'+e+'</button>').join('')+
      '<button class="piu" data-e="+" aria-label="Altre reazioni">'+svg(telefono ? 'giu' : 'piu', 2.2)+'</button></div>' : '';
  /* sul telefono le reazioni stanno sopra il messaggio; sul computer in cima al menu (come Telegram) */
  f.innerHTML = '<div class="focus-velo" data-fm="chiudi"></div>'+
    (telefono ? barra + '<div class="focus-bolla" id="fmBolla"></div>' : '')+
    '<div class="focus-menu" id="fmMenu" role="menu">'+(telefono ? '' : barra)+'<div id="fmVoci"></div></div>';
  document.body.appendChild(f);
  fm = {id, m, c, p, a, righe, pagina: 'p', telefono, orig: telefono ? nodo : null};
  disegnaVociFocus();
  if(telefono){
    const clone = nodo.cloneNode(true);
    clone.classList.add('clone'); clone.removeAttribute('data-id');
    clone.querySelectorAll('[data-a]').forEach(n => n.removeAttribute('data-a'));
    clone.querySelectorAll('video').forEach(v => { v.muted = true; });
    el('fmBolla').appendChild(clone);
    piazzaFocus(nodo);
    nodo.style.visibility = 'hidden';
  } else piazzaComputer(nodo, x, y);
  f.addEventListener('click', clicFocus);
  document.addEventListener('keydown', tastoFocus, true);
  if(m.autore === S.io && c.tipo === 'privata') oraLettura(m, el('fmMenu'));
}
function disegnaVociFocus(){
  const M = el('fmVoci'); if(!M || !fm) return;
  const riga = (v, i, pag) => v ? '<button role="menuitem" class="fm-voce '+(v[3] || '')+'" data-v="'+pag+':'+i+'"><span class="fm-tx">'+esc(v[0])+'</span><span class="fm-ic">'+svg(v[1], 1.9)+'</span></button>' : '<div class="fm-sep"></div>';
  let h = '';
  if(fm.pagina === 'p'){
    h += testataHTML(fm.righe, fm.id);
    if(fm.telefono){
      h += fm.p.map((v, i) => riga(v, i, 'p')).join('');
      if(fm.a.length) h += '<div class="fm-sep"></div><button class="fm-voce altro" data-fm="altro"><span class="fm-tx">Altro…</span><span class="fm-ic">'+svg('puntini', 2)+'</span></button>';
    } else {
      /* sul computer tutto in una lista, come WhatsApp Web */
      const primo = fm.p.filter(v => v[3] !== 'rosso'), rosse = fm.p.filter(v => v[3] === 'rosso');
      h += primo.map(v => riga(v, fm.p.indexOf(v), 'p')).join('') + (fm.a.length ? '<div class="fm-sep"></div>' + fm.a.map((v, i) => riga(v, i, 'a')).join('') : '') +
        '<div class="fm-sep"></div>' + rosse.map(v => riga(v, fm.p.indexOf(v), 'p')).join('');
    }
  } else {
    h += '<button class="fm-voce indietro" data-fm="indietro"><span class="fm-ic sx">'+svg('chevron', 2.2)+'</span><span class="fm-tx">Indietro</span></button><div class="fm-sep"></div>'+
      fm.a.map((v, i) => riga(v, i, 'a')).join('');
  }
  M.innerHTML = h;
}
function clicFocus(e){
  if(!fm) return;
  const r = e.target.closest('[data-e]');
  if(r){
    const id = fm.id;
    if(r.dataset.e === '+'){ apriReazioniTutte(); return; }
    chiudiFocus(); reagisci(id, r.dataset.e); return;
  }
  const t = e.target.closest('[data-fm], [data-v]'); if(!t) return;
  if(t.dataset.fm === 'chiudi'){ chiudiFocus(); return; }
  if(t.dataset.fm === 'altro'){ fm.pagina = 'a'; disegnaVociFocus(); riposizionaMenu(); return; }
  if(t.dataset.fm === 'indietro'){ fm.pagina = 'p'; disegnaVociFocus(); riposizionaMenu(); return; }
  if(t.dataset.fm === 'info'){ const m = fm.m; chiudiFocus(); infoMessaggio(m); return; }
  if(t.dataset.v){
    const [pag, i] = t.dataset.v.split(':'); const v = (pag === 'p' ? fm.p : fm.a)[+i];
    chiudiFocus(); if(v && v[2]) setTimeout(v[2], 30);
  }
}
/* tutte le emoji, dentro la barra che si allarga (come Telegram) */
function apriReazioniTutte(){
  const R = el('fmReaz'); if(!R || !fm) return;
  const id = fm.id;
  const rec = recenti().slice(0, 16);
  const blocchi = (rec.length ? [['Recenti', rec]] : []).concat(EMOJI.map(x => [x[1], x[2].split(' ')]));
  R.classList.add('tutte');
  R.innerHTML = '<div class="fr-scorre">'+blocchi.map(b => '<div class="fr-tit">'+esc(b[0])+'</div><div class="fr-griglia">'+b[1].map(e => '<button data-e2="'+e+'">'+e+'</button>').join('')+'</div>').join('')+'</div>';
  R.onclick = ev => {
    const b = ev.target.closest('[data-e2]'); if(!b) return;
    ev.stopPropagation(); usaEmoji(b.dataset.e2); chiudiFocus(); reagisci(id, b.dataset.e2);
  };
  if(fm.telefono){
    const M = el('fmMenu'); if(M) M.classList.add('nascosto');
    /* la barra larga resta nello schermo */
    const r = R.getBoundingClientRect();
    if(r.bottom > window.innerHeight - 10) R.style.top = Math.max(10, window.innerHeight - 10 - r.height) + 'px';
    if(r.left < 8) R.style.left = '8px';
    if(r.right > window.innerWidth - 8) R.style.left = Math.max(8, window.innerWidth - 8 - r.width) + 'px';
  } else {
    const V = el('fmVoci'); if(V) V.classList.add('nascosto');
    riposizionaMenu();
  }
}

/* telefono: il messaggio resta dov'era (o sale quanto basta), reazioni sopra e menu sotto */
function piazzaFocus(nodo){
  const B = el('fmBolla'), R = el('fmReaz'), M = el('fmMenu'); if(!B || !M) return;
  const bolla = nodo.querySelector('.bolla') || nodo;
  const rb = bolla.getBoundingClientRect(), rn = nodo.getBoundingClientRect();
  const alto = window.innerHeight, largo = window.innerWidth;
  const sopra = 12 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0) + (suIOS() ? 44 : 0);
  const sotto = 12 + (suIOS() ? 20 : 0);
  const hR = R ? 58 : 0, gap = 8;
  const hM = Math.min(M.scrollHeight, alto * .55);
  const maxB = Math.max(80, alto - sopra - sotto - hR - hM - gap * 3);
  const hB = Math.min(rb.height, maxB);
  if(rb.height > maxB) B.classList.add('taglia');
  B.style.height = (rn.height - rb.height + hB) + 'px';
  /* dove sta il blocco intero */
  let top = rb.top - hR - gap;
  const tot = hR + gap + hB + gap + hM;
  if(top + tot > alto - sotto) top = alto - sotto - tot;
  if(top < sopra) top = sopra;
  const topB = top + hR + gap;
  const dy = topB - rb.top;
  B.style.top = (rn.top) + 'px'; B.style.left = rn.left + 'px'; B.style.width = rn.width + 'px';
  B.style.setProperty('--dy', dy + 'px');
  requestAnimationFrame(() => B.classList.add('su'));
  const mio = nodo.classList.contains('mio');
  if(R){
    const w = R.offsetWidth;
    let l = mio ? rb.right - w : rb.left;
    l = Math.max(8, Math.min(largo - w - 8, l));
    R.style.left = l + 'px'; R.style.top = top + 'px';
    R.style.transformOrigin = (mio ? 'right' : 'left') + ' bottom';
  }
  const wM = M.offsetWidth;
  let lM = mio ? rb.right - wM : rb.left;
  lM = Math.max(8, Math.min(largo - wM - 8, lM));
  M.style.left = lM + 'px'; M.style.top = (topB + hB + gap) + 'px';
  M.style.maxHeight = Math.max(160, alto - sotto - (topB + hB + gap)) + 'px';
  M.style.transformOrigin = (mio ? 'right' : 'left') + ' top';
}
function riposizionaMenu(){
  const M = el('fmMenu'); if(!M) return;
  if(fm && fm.telefono){
    const r = M.getBoundingClientRect();
    M.style.maxHeight = Math.max(160, window.innerHeight - 12 - r.top) + 'px';
  } else {
    const r = M.getBoundingClientRect();
    if(r.bottom > window.innerHeight - 8) M.style.top = Math.max(8, window.innerHeight - 8 - r.height) + 'px';
    if(r.right > window.innerWidth - 8) M.style.left = Math.max(8, window.innerWidth - 8 - r.width) + 'px';
  }
}
/* computer: il menu (con le reazioni in cima) dove ho cliccato, sempre dentro lo schermo */
function piazzaComputer(nodo, x, y){
  const M = el('fmMenu'); if(!M) return;
  M.style.maxHeight = (window.innerHeight - 16) + 'px';
  const w = M.offsetWidth, h = M.offsetHeight;
  let l = x - w, t = y;
  if(l < 8) l = Math.min(x, window.innerWidth - w - 8);
  if(t + h > window.innerHeight - 8) t = Math.max(8, window.innerHeight - 8 - h);
  M.style.left = Math.max(8, l) + 'px'; M.style.top = Math.max(8, t) + 'px';
}

/* ======================= SELEZIONE DI PIU' MESSAGGI ======================= */
function avviaSelezione(id){
  S.selezione = new Set(id ? [id] : []);
  el('conv').classList.add('selezione');
  chiudiPannelloEmoji();
  $$('.msg[data-id]', el('msgs')).forEach(n => n.classList.toggle('scelto', S.selezione.has(n.dataset.id)));
  disegnaSelezione();
}
function chiudiSelezione(){
  if(!S.selezione) return;
  S.selezione = null;
  const C = el('conv'); if(C) C.classList.remove('selezione');
  $$('.msg.scelto').forEach(n => n.classList.remove('scelto'));
  const T = el('selTesta'); if(T) T.remove();
  aggiornaTestaConv(); disegnaScrivi();
}
function alternaScelto(id){
  if(!S.selezione) return;
  const c = S.convs.get(S.aperta); const m = c && trovaMsg(c.id, id);
  if(!m || m.tipo === 'sistema') return;
  if(S.selezione.has(id)) S.selezione.delete(id); else S.selezione.add(id);
  const n = $('.msg[data-id="'+id+'"]', el('msgs')); if(n) n.classList.toggle('scelto', S.selezione.has(id));
  try{ navigator.vibrate && navigator.vibrate(8); }catch(e){}
  disegnaSelezione();
}
function msgScelti(){
  const c = S.convs.get(S.aperta); if(!c || !S.selezione) return [];
  return msgVisibili(c.id).filter(m => S.selezione.has(m.id));
}
function disegnaSelezione(){
  const C = el('conv'); if(!C || !S.selezione) return;
  const n = S.selezione.size, l = msgScelti();
  let T = el('selTesta');
  if(!T){ T = document.createElement('div'); T.className = 'sel-testa'; T.id = 'selTesta'; C.appendChild(T); }
  T.innerHTML = '<button class="ib" data-a="sel-chiudi" aria-label="Annulla">'+svg('chiudi')+'</button><b>'+(n === 1 ? '1 selezionato' : n + ' selezionati')+'</b>';
  const F = el('scrivi'); if(!F) return;
  const vivi = l.filter(m => !m.eliminato);
  const tutteStella = vivi.length && vivi.every(m => S.importanti.has(m.id));
  const testo = vivi.some(m => testoDi(m));
  F.innerHTML = '<div class="sel-barra">'+
    '<button data-a="sel-stella"'+(vivi.length ? '' : ' disabled')+'>'+svg(tutteStella ? 'stellaPiena' : 'stella', 1.9)+'<span>'+(tutteStella ? 'Togli stella' : 'Importante')+'</span></button>'+
    '<button data-a="sel-copia"'+(testo ? '' : ' disabled')+'>'+svg('copia', 1.9)+'<span>Copia</span></button>'+
    '<button data-a="sel-inoltra"'+(vivi.length && !vivi.some(m => m.tipo === 'colpetto') ? '' : ' disabled')+'>'+svg('inoltra', 1.9)+'<span>Inoltra</span></button>'+
    '<button data-a="sel-elimina" class="rosso"'+(n ? '' : ' disabled')+'>'+svg('cestino', 1.9)+'<span>Elimina</span></button></div>';
}
async function azioneSelezione(cosa){
  const l = msgScelti(); if(!l.length) return;
  const vivi = l.filter(m => !m.eliminato);
  if(cosa === 'copia'){
    const c = S.convs.get(S.aperta);
    const io = S.persone.get(S.io) || {};
    const nome = id => id === S.io ? ((io.nick || '').trim() || (io.nome || '').trim() || 'Io') : nomeDi(id);
    const t = vivi.filter(m => testoDi(m)).map(m => vivi.length > 1 ? '[' + ora(m.creato_il) + '] ' + nome(m.autore) + ': ' + testoDi(m) : testoDi(m)).join('\n');
    await copia(t); chiudiSelezione(); return;
  }
  if(cosa === 'inoltra'){ chiudiSelezione(); inoltra(vivi); return; }
  if(cosa === 'stella'){
    const si = !vivi.every(m => S.importanti.has(m.id));
    for(const m of vivi) await importante(m, si, true);
    toast(si ? (vivi.length === 1 ? 'Segnato come importante' : vivi.length + ' messaggi importanti') : 'Stelle tolte');
    chiudiSelezione(); return;
  }
  if(cosa === 'elimina'){
    const miei = vivi.length === l.length && l.every(m => m.autore === S.io && m.tipo !== 'sistema');
    const perMe = async () => {
      for(const m of l){
        S.nascosti.add(m.id); const n = $('.msg[data-id="'+m.id+'"]'); if(n) n.remove();
        const {error} = await sb.from('chat_nascosti').insert({msg_id: m.id, utente_id: S.io});
        if(error && !/duplicate/i.test(error.message)) errore(error, 'Non eliminato');
      }
      chiudiSelezione();
    };
    const perTutti = async () => {
      for(const m of l){
        try{
          const {data, error} = await sb.rpc('chat_elimina', {p_id: m.id}); if(error) throw error;
          const md = m.media; m.eliminato = true; m.testo = null; m.media = null; m.fissato_il = null; aggiornaFissato(m); ridisegnaMessaggio(m.id);
          const p = (data && data.path) || (md && md.path);
          if(p && !/^foss:|^sticker\//.test(p)) sb.storage.from('chat').remove([p]).catch(() => {});
        }catch(e){ errore(e, 'Non eliminato'); }
      }
      chiudiSelezione();
    };
    const voci = [['Elimina per me', perMe, 'rosso']];
    if(miei) voci.unshift(['Elimina per tutti', perTutti, 'rosso']);
    foglio(l.length === 1 ? 'Eliminare il messaggio?' : 'Eliminare ' + l.length + ' messaggi?',
      miei ? 'Puoi eliminarli solo per te o per tutti quelli della chat.' : 'Spariscono solo per te, su tutti i tuoi dispositivi.', voci.concat([['Annulla']]));
  }
}
