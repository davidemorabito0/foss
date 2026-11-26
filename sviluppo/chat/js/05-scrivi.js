/* ======================= SCRIVERE E MANDARE ======================= */
function disegnaScrivi(){
  const F = el('scrivi'); const c = S.convs.get(S.aperta); if(!F || !c) return;
  if(S.selezione){ disegnaSelezione(); return; }
  const vecchio = el('testoIn'), testo = vecchio ? vecchio.value : (S.bozze[c.id] || '');
  const r = S.risposta && S.risposta.conv_id === c.id ? S.risposta : null;
  const e = S.effettoScelto;
  const md = S.modifica && S.modifica.conv_id === c.id ? S.modifica : null;
  if(S.modifica && !md){ S.modifica = null; S.extraModifica = null; }
  const pieno = !!testo.trim() || !!md;
  F.innerHTML =
    '<div class="prog-barra nascosto" id="progBarra"></div>'+
    '<div class="picker nascosto" id="picker"></div>'+
    (md ? '<div class="rispondi-a modifica-a"><div class="citazione" style="--col:var(--verde)"><span class="barra"></span><span class="cc"><b>'+svg('matita', 2.2)+'Modifica '+(md.tipo === 'testo' ? 'messaggio' : 'didascalia')+'</b>'+
        '<span>'+esc(testoAnteprima(md))+'</span></span></div><button class="ib" data-a="annulla-modifica" aria-label="Annulla la modifica">'+svg('chiudi')+'</button></div>'
      : r ? '<div class="rispondi-a">'+citazioneHTML(r.id, c).replace('data-a="vai-msg"', '')+'<button class="ib" data-a="annulla-risposta" aria-label="Annulla">'+svg('chiudi')+'</button></div>' : '')+
    '<div id="pannelloEmoji"></div>'+
    '<div class="barra-scrivi'+(md ? ' in-modifica' : '')+'" id="barraScrivi">'+
      '<button class="ib" data-a="emoji" id="emojiB" title="Emoji, GIF e sticker">'+svg('emoji', 1.8)+'</button>'+
      '<span class="allega-wrap"><button class="ib" data-a="allega" id="allegaB" title="Allega">'+svg('piu', 2)+'</button></span>'+
      '<div class="campo">'+
        '<textarea class="testo-in" id="testoIn" rows="1" placeholder="'+(md ? 'Modifica il messaggio' : suTelefono() ? '' : 'Scrivi un messaggio')+'" enterkeyhint="'+(S.cfg.invio && !tocco() ? 'send' : 'enter')+'" '+
          'autocomplete="off" autocapitalize="sentences" spellcheck="true"></textarea>'+
        '<button class="ib effetti-b'+(e ? ' on' : '')+'" data-a="effetti" id="effettiB" title="Effetti" style="'+(!md && (testo.trim() || e) ? '' : 'display:none')+'">'+svg('effetti', 1.8)+'</button>'+
        '<button class="ib stk-b" data-a="emoji-sticker" id="stkB" title="Sticker" style="'+(testo.trim() || md ? 'display:none' : '')+'">'+svg('sticker', 1.8)+'</button>'+
      '</div>'+
      '<button class="ib cam-b" data-a="fotocamera" id="camB" title="Fotocamera" style="'+(testo.trim() || md ? 'display:none' : '')+'">'+svg('camera', 1.8)+'</button>'+
      '<button class="manda'+(pieno ? ' pieno' : '')+'" id="mandaB" aria-label="'+(md ? 'Salva la modifica' : testo.trim() ? 'Invia' : 'Registra un vocale')+'">'+
        svg(md ? 'ok' : testo.trim() ? (suTelefono() ? 'freccia' : 'manda') : 'mic', md ? 2.6 : suTelefono() && testo.trim() ? 2.6 : 1.8)+(e && !md ? '<span class="effetto-segno">'+svg('effetti', 2.4)+'</span>' : '')+'</button>'+
    '</div>';
  const t = el('testoIn');
  t.value = testo; adatta(t);
  t.addEventListener('input', () => { adatta(t); aggiornaTastoManda(); if(!S.modifica){ dicoCheScrivo(); salvaBozzaPresto(); } controllaPicker(); });
  t.addEventListener('keydown', tastiTesto);
  t.addEventListener('keyup', e => { if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) controllaPicker(); });
  t.addEventListener('click', controllaPicker);
  t.addEventListener('blur', () => setTimeout(() => { if(document.activeElement !== t && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('#picker'))) chiudiPicker(); }, 180));
  t.addEventListener('paste', incolla);
  t.addEventListener('focus', () => { if(tocco() && pannelloEmojiAperto) chiudiPannelloEmoji(); });
  const mb = el('mandaB');
  mb.addEventListener('pointerdown', premiManda);
  mb.addEventListener('contextmenu', e => { e.preventDefault(); if(t.value.trim() && !S.modifica) apriEffetti(); });
  el('picker').addEventListener('pointerdown', e => { const b = e.target.closest('[data-pk]'); if(!b) return; e.preventDefault(); scegliPicker(+b.dataset.pk); });
  disegnaBarraProgrammati();
  if(pannelloEmojiAperto) apriPannelloEmoji(pannelloEmojiScheda);
}
function adatta(t){ t.style.height = 'auto'; t.style.height = Math.min(140, t.scrollHeight) + 'px'; }
function aggiornaTastoManda(){
  const t = el('testoIn'), b = el('mandaB'); if(!t || !b) return;
  if(S.modifica){ b.classList.add('pieno'); return; }
  const pieno = !!t.value.trim();
  if(b.classList.contains('pieno') !== pieno){
    b.classList.toggle('pieno', pieno);
    b.innerHTML = svg(pieno ? (suTelefono() ? 'freccia' : 'manda') : 'mic', suTelefono() && pieno ? 2.6 : 1.8) + (S.effettoScelto ? '<span class="effetto-segno">'+svg('effetti', 2.4)+'</span>' : '');
    b.setAttribute('aria-label', pieno ? 'Invia' : 'Registra un vocale');
  }
  const eb = el('effettiB'), cb = el('camB'), sk = el('stkB');
  if(eb) eb.style.display = pieno || S.effettoScelto ? '' : 'none';
  if(cb) cb.style.display = pieno ? 'none' : '';
  if(sk) sk.style.display = pieno ? 'none' : '';
}
function tastiTesto(e){
  if(tastiPicker(e)) return;
  if(e.key === 'Enter' && !e.shiftKey && !e.isComposing && S.cfg.invio && !tocco()){ e.preventDefault(); if(S.modifica) salvaModifica(); else mandaTesto(); return; }
  if(e.key === 'Escape'){
    if(S.modifica){ e.preventDefault(); annullaModifica(); }
    else if(S.risposta){ S.risposta = null; disegnaScrivi(); }
    else if(pannelloEmojiAperto) chiudiPannelloEmoji();
    return;
  }
  /* freccia su con la barra vuota: modifico il mio ultimo messaggio (come Telegram) */
  if(e.key === 'ArrowUp' && !e.target.value && !S.modifica && !tocco()){ if(modificaUltimo()) e.preventDefault(); }
}
const salvaBozzaPresto = debounce(salvaBozza, 600);
function salvaBozza(){
  const t = el('testoIn'); if(!t || !S.aperta || S.modifica) return;
  if(t.value.trim()) S.bozze[S.aperta] = t.value; else { delete S.bozze[S.aperta]; pulisciBozzaExtra(S.aperta); }
  memoria('bozze', S.bozze);
}

/* il tasto in basso a destra: tocco = invia (o registra), pressione lunga sul testo = effetti */
let tPress = null;
function premiManda(e){
  const t = el('testoIn');
  if(e.button === 2) return;
  if(S.modifica){ e.preventDefault(); salvaModifica(); return; }
  if(t && t.value.trim()){
    let lungo = false;
    tPress = setTimeout(() => { lungo = true; apriEffetti(); }, 520);
    const su = () => { clearTimeout(tPress); document.removeEventListener('pointerup', su); if(!lungo) mandaTesto(); };
    document.addEventListener('pointerup', su);
    e.preventDefault();
    return;
  }
  avviaRegistrazione(e);
}

/* ---------- invio ---------- */
function nuovoLocale(tipo, campi, convId){
  const c = S.convs.get(convId || S.aperta);
  return Object.assign({id: uuid(), conv_id: c.id, autore: S.io, tipo, testo: null, media: null, risponde_a: S.risposta && S.risposta.conv_id === c.id ? S.risposta.id : null,
                        creato_il: new Date().toISOString(), eliminato: false, _stato: 'invio'}, campi || {});
}
function mettiInLista(m){
  const s = statoMsgs(m.conv_id); s.ids.add(m.id); s.lista = mescola(s.lista, [m]);
  const c = S.convs.get(m.conv_id);
  if(c){ c.ultimo = {id: m.id, autore: m.autore, tipo: m.tipo, testo: m.testo, creato_il: m.creato_il, media: m.media}; c.ultimo_il = m.creato_il; c.archiviata = c.archiviata && false; }
  if(m.conv_id === S.aperta) aggiungiMessaggioAlFondo(m, false);
  disegnaLista();
}
async function salvaMessaggio(m){
  const riga = {id: m.id, conv_id: m.conv_id, tipo: m.tipo, testo: m.testo, media: pulisciMedia(m.media), risponde_a: m.risponde_a};
  const {data, error} = await sb.from('chat_messaggi').insert(riga).select().single();
  if(error) throw error;
  delete m._stato; delete m._avanza;
  m.creato_il = data.creato_il;
  const s = statoMsgs(m.conv_id); s.lista = mescola(s.lista, []);
  const c = S.convs.get(m.conv_id); if(c && c.ultimo && c.ultimo.id === m.id) c.ultimo.creato_il = data.creato_il;
  ridisegnaMessaggio(m.id); disegnaLista();
  return data;
}
function pulisciMedia(md){
  if(!md) return null;
  const o = {}; Object.keys(md).forEach(k => { if(k !== 'locale' && md[k] != null && md[k] !== '') o[k] = md[k]; });
  return Object.keys(o).length ? o : null;
}
async function mandaTesto(opz){
  const t = el('testoIn'); if(!t) return;
  if(S.modifica) return salvaModifica();
  const testo = t.value.replace(/\s+$/, '').replace(/^\n+/, '');
  if(!testo.trim()) return;
  if(testo.length > 6000){ toast('Il messaggio è troppo lungo (massimo 6000 caratteri).'); return; }
  const c = S.convs.get(S.aperta);
  const eff = Object.assign({}, S.effettoScelto || {}, raccogliExtra(testo, c), opz && opz.muto ? {silenzioso: true} : {});
  const m = nuovoLocale('testo', {testo, media: Object.keys(eff).length ? eff : null});
  t.value = ''; adatta(t); S.effettoScelto = null; S.risposta = null;
  delete S.bozze[S.aperta]; memoria('bozze', S.bozze); pulisciBozzaExtra(S.aperta); chiudiPicker();
  disegnaScrivi(); el('testoIn').focus();
  mettiInLista(m);
  suono('invio');
  if(eff.schermo) setTimeout(() => eseguiEffettoSchermo(m), 250);
  if(opz && opz.muto) toast('Inviato senza suono: arriva senza far suonare il telefono.');
  try{ await salvaMessaggio(m); }
  catch(e){ m._stato = 'errore'; ridisegnaMessaggio(m.id); errore(e, 'Messaggio non inviato'); }
}
async function riprova(id){
  const c = S.convs.get(S.aperta); const m = c && trovaMsg(c.id, id); if(!m || m._stato !== 'errore') return;
  if(m._file){ return inviaFilePronto(m, m._file); }
  m._stato = 'invio'; ridisegnaMessaggio(id);
  try{ await salvaMessaggio(m); }catch(e){ m._stato = 'errore'; ridisegnaMessaggio(id); errore(e, 'Messaggio non inviato'); }
}

/* torna la rete: riprovo da solo i messaggi rimasti indietro */
function riprovaTutti(){
  S.msgs.forEach(st => (st.lista || []).filter(m => m._stato === 'errore' && m.autore === S.io).slice(0, 10).forEach(m => {
    if(m.conv_id === S.aperta) riprova(m.id);
  }));
}
function annullaCaricamento(id){
  const c = S.convs.get(S.aperta); const m = c && trovaMsg(c.id, id);
  if(m && m._ctrl && m._ctrl.ferma) m._ctrl.ferma();
}
/* un file pronto (gia' compresso): lo carico con la barra e poi mando il messaggio */
async function inviaPreparato(conv, tipo, p, extra){
  const c = S.convs.get(conv); if(!c) return;
  const m = nuovoLocale(tipo, {media: Object.assign({locale: URL.createObjectURL(p.blob)}, p.media || {}, extra || {}), _avanza: 0}, conv);
  m._file = p;
  mettiInLista(m);
  sospesoMetti(m, p);                 /* 2.9.6: messo da parte finché non è salvato (29-sospesi.js) */
  /* vocali: l'onda vera dal file arriva dopo, la disegno appena c'e' */
  if(p.ondaDopo) p.ondaDopo.then(o => {
    if(!o || !m.media) return; m.media.onda = o;
    const v = $('.vocale[data-voc="'+m.id+'"] .barre'); if(v) v.innerHTML = ondaDa(o).map(x => '<i style="height:'+Math.max(10, x * 100)+'%"></i>').join('');
  }, () => {});
  return inviaFilePronto(m, p);
}
async function inviaFilePronto(m, p){
  m._stato = 'invio'; m._avanza = 0; ridisegnaMessaggio(m.id);
  const path = m.conv_id + '/' + uuid() + '.' + (p.ext || 'bin');
  let ultimo = 0;
  m._ctrl = {};
  try{
    const r = await caricaFile(path, p.blob, v => {
      m._avanza = v; const t = Date.now(); if(t - ultimo < 120) return; ultimo = t;
      const n = $('.msg[data-id="'+m.id+'"] .media-carica'); if(n) n.innerHTML = anelloHTML(v);
    }, m._ctrl);
    const locale = m.media.locale;
    if(r.path){ m.media.path = r.path; firme.set(r.path, {url: locale, scade: Date.now() + 864e5}); }
    if(r.url){ m.media.url = r.url; }
    delete m._avanza;
    if(p.ondaDopo){ const o = await Promise.race([p.ondaDopo.catch(() => null), new Promise(ok => setTimeout(ok, 4000, null))]); if(o) m.media.onda = o; }
    try{ await salvaMessaggio(m); }
    catch(e){
      /* era già arrivato (la risposta si era persa): è inviato, non lo rimando */
      if(!(e && (e.code === '23505' || /duplicate/i.test(e.message || '')))) throw e;
      delete m._stato; delete m._avanza; ridisegnaMessaggio(m.id);
    }
    sospesoTogli(m.id);
    delete m._file; delete m._ctrl;
    if(m.tipo === 'vocale' && typeof anticipaTrascrizione === 'function') anticipaTrascrizione(m);
  }catch(e){
    m._stato = 'errore'; delete m._avanza; delete m._ctrl; ridisegnaMessaggio(m.id);
    if(e && e.annullato){ toast('Invio annullato: tocca «Riprova» quando vuoi.'); return; }
    errore(e, /server dei media/i.test(e && e.message) ? '' : 'File non inviato');
    if(/server dei media/i.test(e && e.message)) toast('Il server dei media sembra offline: il file non è partito.');
  }
}

/* ---------- registrazione dei vocali ---------- */
/* il microfono è negato: spiego dove si sblocca, a seconda del dispositivo */
function spiegaMicrofono(err){
  const nome = err && err.name;
  if(nome === 'NotFoundError' || nome === 'OverconstrainedError'){ toast('Non trovo nessun microfono collegato.'); return; }
  if(nome === 'NotReadableError'){ toast('Il microfono è occupato da un’altra app (una chiamata?). Chiudila e riprova.'); return; }
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const icona = window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const passi = ios
    ? '<ol class="passi"><li>Apri <b>Impostazioni</b> dell’iPhone</li><li>Vai in <b>App</b> → <b>Safari</b> (in fondo alla lista)</li>'+
      '<li>Tocca <b>Microfono</b> e scegli <b>Consenti</b> (o «Chiedi»)</li>'+
      (icona ? '<li>Chiudi del tutto FOSS.chat (scorri via dall’elenco delle app aperte) e riaprila dall’icona</li>' : '<li>Torna qui e ricarica la pagina</li>')+'</ol>'
    : /Android/.test(navigator.userAgent)
      ? '<ol class="passi"><li>Tocca il lucchetto accanto all’indirizzo (o tieni premuta l’icona dell’app → <b>Info app</b>)</li><li><b>Autorizzazioni</b> → <b>Microfono</b> → <b>Consenti</b></li><li>Torna qui e riprova</li></ol>'
      : '<ol class="passi"><li>Clicca il lucchetto a sinistra dell’indirizzo in alto</li><li>Accanto a <b>Microfono</b> scegli <b>Consenti</b></li><li>Ricarica la pagina e riprova</li></ol>';
  foglio('Serve il microfono', '<p style="margin:0 0 10px">Per registrare i vocali FOSS.chat deve poter usare il microfono, ma adesso è bloccato. Si sblocca così:</p>'+passi, [['Ho capito', null, 'pieno']]);
}
let reg = null;
function formatoAudio(){
  const f = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  if(!window.MediaRecorder) return '';
  for(const x of f) try{ if(MediaRecorder.isTypeSupported(x)) return x; }catch(e){}
  return '';
}
function vibra(ms){ try{ if(navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); }catch(_){} }
/* 2.9.4: la barra della registrazione compare subito (il microfono arriva dopo, a volte serve mezzo secondo);
   tenendo premuto: lasci = invia, scorri a sinistra = annulla, scorri in su = blocca (registra a mani libere). */
async function avviaRegistrazione(e){
  if(reg) return;
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder){ toast('Questo browser non registra l’audio.'); return; }
  const x0 = e.clientX, y0 = e.clientY, premuto = Date.now(), pid = e.pointerId, origine = e.target;
  const r = reg = {pronto: false, bloccata: !tocco(), annullata: false, conv: S.aperta, inizio: Date.now(), pezzi: [], livelli: []};
  let ac0 = null;
  try{ ac0 = new (window.AudioContext || window.webkitAudioContext)(); }catch(_){}
  /* v2.7.1: per registrare l'audio del telefono deve essere in modalità «registra» (con «di contorno» l'iPhone nega il microfono) */
  try{ if(navigator.audioSession) navigator.audioSession.type = 'play-and-record'; }catch(_){}
  vibra(12);
  const F = el('barraScrivi');
  F.outerHTML = '<div class="registra'+(r.bloccata ? ' bloccata' : '')+'" id="barraScrivi">'+
    '<button class="ib cestino" data-a="reg-annulla" title="Annulla">'+svg('cestino', 1.8)+'</button>'+
    '<span class="punto"></span><span class="t" id="regT">0:00</span>'+
    '<span class="vivo" id="regVivo"></span>'+
    '<span class="scorri" id="regScorri">‹ Scorri per annullare</span>'+
    (r.bloccata ? '' : '<span class="reg-blocco" id="regBlocco" aria-hidden="true"><span class="rb-l">'+svg('lucchettoAperto', 2)+'</span><span class="rb-su">'+svg('su', 2.4)+'</span></span>')+
    '<button class="manda pieno" data-a="reg-manda" id="regManda" title="Invia">'+svg('manda', 1.8)+'</button></div>';
  const barra = el('barraScrivi');
  const blocca = () => {
    if(r.bloccata || r.annullata) return;
    r.bloccata = true; barra.classList.add('bloccata');
    const b = el('regBlocco'); if(b){ b.innerHTML = '<span class="rb-l">'+svg('lucchetto', 2)+'</span>'; b.classList.add('chiuso'); setTimeout(() => b.remove(), 450); }
    vibra(10);
  };
  r.blocca = blocca;
  if(!r.bloccata){
    /* il tasto premuto e' appena stato sostituito: catturo il dito sulla barra, cosi' i movimenti arrivano lo stesso */
    try{ barra.setPointerCapture(pid); }catch(_){}
    let finito = false;
    const muovi = ev => {
      if(ev.pointerId !== pid || r.bloccata || r.annullata) return;
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      const sc = el('regScorri'); if(sc) sc.style.transform = 'translateX(' + Math.min(0, dx) + 'px)';
      const b = el('regBlocco'); if(b) b.style.transform = 'translateY(' + Math.max(-60, Math.min(0, dy)) + 'px)';
      if(dy < -75 && dy < dx){ blocca(); return; }
      if(dx < -110){ r.annullata = true; fineRegistrazione(false); }
    };
    const su = ev => {
      if(ev.pointerId !== pid || finito) return;
      finito = true; pulisci();
      if(r.annullata || r.bloccata || reg !== r) return;
      /* tocco breve, o il microfono non e' ancora pronto (la prima volta il telefono chiede il permesso): resta aperta */
      if(Date.now() - premuto < 400 || !r.pronto || ev.type === 'pointercancel'){ blocca(); return; }
      fineRegistrazione(true);
    };
    const pulisci = () => [document, origine].forEach(n => { n.removeEventListener('pointermove', muovi); n.removeEventListener('pointerup', su); n.removeEventListener('pointercancel', su); });
    [document, origine].forEach(n => { n.addEventListener('pointermove', muovi); n.addEventListener('pointerup', su); n.addEventListener('pointercancel', su); });
    r.pulisci = pulisci;
  }
  let stream;
  try{ stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}}); }
  catch(err){
    try{ ac0 && ac0.close(); }catch(_){}
    if(reg === r){ reg = null; r.pulisci && r.pulisci(); disegnaScrivi(); }
    audioDiContorno(); spiegaMicrofono(err); return;
  }
  /* annullata mentre il microfono si accendeva */
  if(reg !== r){ stream.getTracks().forEach(t => t.stop()); try{ ac0 && ac0.close(); }catch(_){} audioDiContorno(); return; }
  const tipo = formatoAudio();
  let rec;
  try{ rec = new MediaRecorder(stream, tipo ? {mimeType: tipo, audioBitsPerSecond: 48000} : undefined); }
  catch(err){ stream.getTracks().forEach(t => t.stop()); reg = null; r.pulisci && r.pulisci(); disegnaScrivi(); toast('Non riesco a registrare su questo dispositivo.'); return; }
  let an, buf;
  try{ r.ac = ac0 || new (window.AudioContext || window.webkitAudioContext)(); if(r.ac.state !== 'running') r.ac.resume().catch(() => {}); const src = r.ac.createMediaStreamSource(stream); an = r.ac.createAnalyser(); an.fftSize = 512; src.connect(an); buf = new Uint8Array(an.fftSize); }catch(err){}
  rec.ondataavailable = ev => { if(ev.data && ev.data.size) r.pezzi.push(ev.data); };
  Object.assign(r, {rec, stream, inizio: Date.now(), pronto: true});
  barra.classList.add('pronta');            /* il pallino rosso lampeggia: adesso si sente */
  rec.start(250);
  dicoCheScrivo('registra');
  const vivo = el('regVivo');
  r.giro = setInterval(() => {
    if(reg !== r) return clearInterval(r.giro);
    const s = (Date.now() - r.inizio) / 1000;
    const t = el('regT'); if(t) t.textContent = fmtDur(s);
    if(an){ an.getByteTimeDomainData(buf); let m = 0; for(let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i] - 128)); r.livelli.push(Math.min(1, m / 70)); }
    else r.livelli.push(.3);
    if(vivo && r.bloccata){
      const ult = r.livelli.slice(-60), pk = Math.max(.05, ...r.livelli.slice(-200)); vivo.innerHTML = ult.map(v => '<i style="height:'+Math.max(3, v / pk * 26)+'px"></i>').join('');
    }
    if(s > 600) fineRegistrazione(true);
    if(s % 3 < .11) dicoCheScrivo('registra');
  }, 100);
}
function fineRegistrazione(manda){
  const r = reg; if(!r) return; reg = null;
  clearInterval(r.giro); r.pulisci && r.pulisci();
  /* la barra per scrivere torna subito; il file si prepara intanto */
  disegnaScrivi();
  if(!r.pronto){ if(manda) toast('Il microfono non è ancora pronto: riprova.'); return; }
  const durata = (Date.now() - r.inizio) / 1000;
  r.rec.onstop = () => {
    r.stream.getTracks().forEach(t => t.stop()); audioDiContorno();
    try{ r.ac && r.ac.close(); }catch(e){}
    if(!manda) return;
    if(durata < 0.8){ toast('Tieni premuto per registrare un vocale.'); return; }
    const tipo = (r.rec.mimeType || 'audio/webm').split(';')[0];
    const blob = new Blob(r.pezzi, {type: tipo});
    /* il vocale compare subito con l'onda presa durante la registrazione; quella vera, calcolata dal file
       (v2.7.2), arriva mentre il file sale e viene salvata con il messaggio */
    inviaPreparato(r.conv || S.aperta, 'vocale', {blob, ext: tipo.includes('mp4') ? 'm4a' : tipo.includes('ogg') ? 'ogg' : 'webm',
      ondaDopo: ondaDalFile(blob),
      media: {dur: Math.round(durata * 10) / 10, onda: ondaDaLivelli(r.livelli), mime: tipo, dim: blob.size}});
  };
  try{ r.rec.stop(); }catch(e){ r.stream.getTracks().forEach(t => t.stop()); audioDiContorno(); }
}

function ondaDaLivelli(lv){
  const n = 48, onda = [], picco = Math.max(.05, ...lv);
  for(let i = 0; i < n; i++){
    const a = Math.floor(i * lv.length / n), b = Math.max(a + 1, Math.floor((i + 1) * lv.length / n));
    let m = 0; for(let j = a; j < b; j++) m = Math.max(m, lv[j] || 0);
    onda.push(String.fromCharCode(65 + Math.round(Math.min(1, m / picco) * 31)));
  }
  return onda.join('');
}
async function ondaDalFile(blob){
  try{
    const C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = C ? new C(1, 2, 44100) : new (window.AudioContext || window.webkitAudioContext)();
    const ab = await blob.arrayBuffer();
    const buf = await new Promise((ok, ko) => { const p = ctx.decodeAudioData(ab, ok, ko); if(p && p.then) p.then(ok, ko); });
    const d = buf.getChannelData(0), n = 48, out = [];
    let picco = 0; const v = [];
    for(let i = 0; i < n; i++){
      const a = Math.floor(i * d.length / n), b = Math.floor((i + 1) * d.length / n);
      let s = 0, k = 0; for(let j = a; j < b; j += 16){ s += d[j] * d[j]; k++; }
      const rms = Math.sqrt(s / Math.max(1, k)); v.push(rms); picco = Math.max(picco, rms);
    }
    if(picco < 1e-4) return null;
    v.forEach(x => out.push(String.fromCharCode(65 + Math.round(Math.min(1, Math.pow(x / picco, .8)) * 31))));
    return out.join('');
  }catch(e){ return null; }
}
const ondaPiatta = s => !s || /^[A-D]+$/.test(s);

/* ---------- riproduzione dei vocali ---------- */
let audio = null, audioId = null, velocita = 1;
function fermaAudio(){ if(audio){ audio.pause(); } audioId = null; }
async function suonaVocale(id){
  const c = S.convs.get(S.aperta); const m = c && trovaMsg(c.id, id); if(!m) return;
  if(!audio){
    audio = new Audio(); audio.preload = 'auto';
    audio.addEventListener('timeupdate', disegnaAvanzamento);
    audio.addEventListener('ended', () => { const fatto = audioId; disegnaAvanzamento(true); audioId = null; prossimoVocale(fatto); if(!audioId) audioDiContorno(); });
    audio.addEventListener('pause', () => { disegnaAvanzamento(); setTimeout(() => { if(audio.paused) audioDiContorno(); }, 400); });
    audio.addEventListener('play', () => { disegnaAvanzamento(); scorriPallino(); });
    /* 2.9.4: finché il file non parte si vede la rotellina sul tasto (prima sembrava che il tocco non avesse fatto niente) */
    audio.addEventListener('playing', () => vocaleInCarica(null));
    audio.addEventListener('waiting', () => { if(audioId) vocaleInCarica(audioId); });
    audio.addEventListener('loadedmetadata', () => {   /* i vocali registrati nel browser a volte dicono «durata infinita» */
      const mm = audioId && trovaMsg(S.aperta, audioId);
      if(audio.duration === Infinity && !(mm && mm.media && mm.media.dur)){ const t = audio.currentTime; audio.currentTime = 1e101; audio.addEventListener('timeupdate', function una(){ audio.removeEventListener('timeupdate', una); audio.currentTime = t; }); }
    });
    audio.addEventListener('error', () => { vocaleInCarica(null); const id2 = audioId; audioId = null; disegnaAvanzamento(); if(id2) mediaNonArriva(id2); });
  }
  if(audioId === id){ if(audio.paused) audio.play().catch(() => {}); else audio.pause(); return; }
  vocaleInCarica(id);
  const u = await urlMedia(m.media);
  if(!u){ vocaleInCarica(null); mediaNonArriva(id); return; }
  if(audioId){ const vecchio = audioId; audioId = null; disegnaAvanzamento(false, vecchio); }
  audioId = id; audio.src = u; audio.playbackRate = velocita;
  try{ if(navigator.audioSession) navigator.audioSession.type = 'playback'; }catch(e){}
  try{ await audio.play(); }catch(e){ vocaleInCarica(null); if(e && e.name !== 'AbortError') toast(m.media && m.media.url ? 'Il server dei media sembra offline.' : 'Non riesco a riprodurre il vocale.'); }
  if(ondaPiatta((m.media || {}).onda)) ridisegnaOnda(m, u);
  const a = memoria('ascoltati') || {}; a[id] = 1; const k = Object.keys(a); if(k.length > 500) k.slice(0, k.length - 500).forEach(x => delete a[x]); memoria('ascoltati', a);
  const mic = $('.vocale[data-voc="'+id+'"] .mic'); if(mic) mic.className = 'mic ascoltato';
}
function vocaleInCarica(id){
  $$('.vocale.carica').forEach(v => { if(v.dataset.voc !== id) v.classList.remove('carica'); });
  if(id){ const v = $('.vocale[data-voc="'+id+'"]'); if(v) v.classList.add('carica'); }
}
function prossimoVocale(id){
  const c = S.convs.get(S.aperta); if(!c) return;
  const l = msgVisibili(c.id), i = l.findIndex(x => x.id === id);
  const n = l[i + 1];
  const a = memoria('ascoltati') || {};
  if(n && n.tipo === 'vocale' && n.autore !== S.io && !a[n.id] && !n.eliminato) suonaVocale(n.id);
}
let rafPallino = 0;
function scorriPallino(){
  cancelAnimationFrame(rafPallino);
  const passo = () => { if(!audio || audio.paused || !audioId){ rafPallino = 0; return; } disegnaAvanzamento(); rafPallino = requestAnimationFrame(passo); };
  rafPallino = requestAnimationFrame(passo);
}
/* i vocali vecchi con l'onda piatta: la ricalcolo dal file mentre lo ascolti (solo sullo schermo) */
async function ridisegnaOnda(m, u){
  try{
    const r = await fetch(u, {cache: 'reload'}); const o = await ondaDalFile(await r.blob()); if(!o) return;
    m.media.onda = o;
    const v = $('.vocale[data-voc="'+m.id+'"] .barre'); if(!v) return;
    v.innerHTML = ondaDa(o).map(x => '<i style="height:'+Math.max(10, x * 100)+'%"></i>').join('');
    disegnaAvanzamento();
  }catch(e){}
}
function disegnaAvanzamento(finito, quale){
  const id = quale || audioId; if(!id) return;
  const v = $('.vocale[data-voc="'+id+'"]'); if(!v) return;
  const va = audioId === id && audio && !audio.paused;
  v.classList.toggle('va', audioId === id && !finito);
  /* gira a ogni fotogramma: tocco il tasto solo quando cambia */
  const b = v.querySelector('.vp'), ic = va ? 'pausa' : 'play'; if(b && b.dataset.ic !== ic){ b.dataset.ic = ic; b.innerHTML = svg(ic); }
  const vel = v.querySelector('.vel'), vt = String(velocita).replace('.', ',') + '×'; if(vel && vel.textContent !== vt) vel.textContent = vt;
  /* v2.7.2: i vocali registrati sull'iPhone a volte dichiarano una durata sbagliata (enorme o infinita):
     se non torna con quella salvata quando l'abbiamo registrato, vale quella salvata */
  const d = durataVoc(id);
  const p = finito || audioId !== id ? 0 : Math.min(1, (audio.currentTime || 0) / d);
  const barre = v.querySelectorAll('.barre i'); const k = Math.round(p * barre.length);
  barre.forEach((x, i) => x.classList.toggle('su', i < k));
  const pl = v.querySelector('.pallino'); if(pl) pl.style.left = (p * 100) + '%';
  const t = v.querySelector('.tempo'), tt = fmtDur(audioId === id && !finito && audio.currentTime ? audio.currentTime : d); if(t && t.textContent !== tt) t.textContent = tt;
}
function durataVoc(id){
  const salvata = +(((trovaMsg(S.aperta, id) || {}).media || {}).dur) || 0, dich = audio && audioId === id && isFinite(audio.duration) ? audio.duration : 0;
  return salvata && (!dich || Math.abs(dich - salvata) > Math.max(1.5, salvata * .25)) ? salvata : (dich || salvata || 1);
}
/* sposta l'ascolto al punto p (0..1) dell'onda; se il vocale non sta suonando lo fa partire da li' */
function vaiAlPunto(id, p){
  const metti = () => { if(audio && audioId === id){ try{ audio.currentTime = Math.max(0, Math.min(.999, p)) * durataVoc(id); }catch(e){} disegnaAvanzamento(); } };
  if(audioId !== id){ suonaVocale(id).then(metti); return; }
  metti();
}
let trascinoVoc = 0;
function cercaVocale(id, ev){
  if(Date.now() - trascinoVoc < 350) return;      /* il click che arriva alla fine di un trascinamento */
  const o = ev.target.closest('.onda'); if(!o) return;
  const r = o.getBoundingClientRect(), p = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
  toccoVocale(id, () => vaiAlPunto(id, p));          /* due tocchi = trascrizione (28-trascrivi.js) */
}
/* 2.9.4: col dito si trascina il pallino lungo l'onda; in verticale la chat scorre come sempre */
document.addEventListener('pointerdown', e => {
  const o = e.target.closest && e.target.closest('.vocale .onda'); if(!o || e.button > 0) return;
  const id = o.dataset.id, x0 = e.clientX, y0 = e.clientY;
  let attivo = false;
  const punto = ev => { const r = o.getBoundingClientRect(); return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); };
  const muovi = ev => {
    if(ev.pointerId !== e.pointerId) return;
    if(!attivo){
      if(Math.abs(ev.clientX - x0) < 8 || Math.abs(ev.clientX - x0) < Math.abs(ev.clientY - y0)) return;
      attivo = true; if(audioId !== id) suonaVocale(id);
    }
    trascinoVoc = Date.now();
    if(audioId === id && audio){ try{ audio.currentTime = punto(ev) * durataVoc(id); }catch(_){} disegnaAvanzamento(); }
  };
  const fine = ev => { if(ev.pointerId !== e.pointerId) return; if(attivo) trascinoVoc = Date.now(); document.removeEventListener('pointermove', muovi); document.removeEventListener('pointerup', fine); document.removeEventListener('pointercancel', fine); };
  document.addEventListener('pointermove', muovi); document.addEventListener('pointerup', fine); document.addEventListener('pointercancel', fine);
});

/* ---------- incollare e trascinare (anche GIF da altre app) ---------- */
function incolla(e){
  const f = Array.from((e.clipboardData && e.clipboardData.files) || []);
  if(f.length){ e.preventDefault(); anteprimaInvio(f); }
}
function attivaTrascina(zona){
  /* 2.9.12: la zona resta la stessa cambiando chat: si attiva una volta sola (prima ogni file arrivava doppio) */
  if(zona._trascina) return; zona._trascina = true;
  let n = 0, velo = null;
  zona.addEventListener('dragenter', e => { if(!Array.from(e.dataTransfer.types || []).includes('Files')) return; e.preventDefault(); n++;
    if(!velo){ velo = document.createElement('div'); velo.className = 'trascina'; velo.innerHTML = '<span>Lascia qui per inviare</span>'; zona.appendChild(velo); } });
  zona.addEventListener('dragover', e => { if(velo) e.preventDefault(); });
  zona.addEventListener('dragleave', () => { n--; if(n <= 0 && velo){ velo.remove(); velo = null; n = 0; } });
  zona.addEventListener('drop', e => {
    if(velo){ velo.remove(); velo = null; } n = 0;
    const f = Array.from(e.dataTransfer.files || []); if(!f.length) return;
    e.preventDefault(); anteprimaInvio(f);
  });
}

/* ---------- il menu «allega» ---------- */
function menuAllega(){
  const b = el('allegaB').getBoundingClientRect();
  apriMenu(b.left, b.top - 8, [
    ['Documento', 'doc', () => scegliFile('*/*', true, f => anteprimaInvio(f, 'file'))],
    ['Foto e video', 'foto', () => scegliFile('image/*,video/*', true, f => anteprimaInvio(f))],
    ['Fotocamera', 'camera', () => fotocamera()],
    ['Disegno', 'disegno', () => apriDisegno(null, blob => anteprimaInvio([new File([blob], 'disegno.png', {type: 'image/png'})]))],
    ['Nuovo sticker', 'sticker', () => nuovoSticker()],
    ['GIF dal dispositivo', 'gif', () => scegliFile('image/gif,video/mp4,video/webm', true, f => anteprimaInvio(f, 'gif'))],
    null,
    ['Sondaggio', 'sondaggio', () => nuovoSondaggio()],
    ['Lavoro di FOSS', 'lavoro', () => foglioLavori()],
  ], false, true);
}
function scegliFile(accept, multi, fatto, cattura){
  const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = !!multi;
  if(cattura) i.setAttribute('capture', cattura);
  i.style.display = 'none'; document.body.appendChild(i);
  i.onchange = () => { const f = Array.from(i.files || []); i.remove(); if(f.length) fatto(f); };
  i.click();
  setTimeout(() => { if(document.body.contains(i) && !i.files.length) i.remove(); }, 60000);
}
async function fotocamera(){
  if(tocco() || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return scegliFile('image/*,video/*', false, f => anteprimaInvio(f), 'environment');
  let stream;
  try{ stream = await navigator.mediaDevices.getUserMedia({video: {width: {ideal: 1920}, height: {ideal: 1080}}, audio: false}); }
  catch(e){ return scegliFile('image/*', false, f => anteprimaInvio(f)); }
  const v = document.createElement('div'); v.className = 'visore';
  v.innerHTML = '<div class="visore-t"><span class="tt"><b>Scatta una foto</b></span><button class="ib" data-x="1">'+svg('chiudi')+'</button></div>'+
    '<div class="visore-c"><video autoplay playsinline muted style="transform:scaleX(-1)"></video></div>'+
    '<div style="display:flex;justify-content:center;padding:18px"><button class="ai-manda" data-s="1" aria-label="Scatta">'+svg('camera', 1.8)+'</button></div>';
  document.body.appendChild(v);
  const vid = v.querySelector('video'); vid.srcObject = stream;
  const chiudi = () => { stream.getTracks().forEach(t => t.stop()); v.remove(); };
  v.onclick = e => {
    if(e.target.closest('[data-x]')) chiudi();
    if(e.target.closest('[data-s]')){
      const cv = document.createElement('canvas'); cv.width = vid.videoWidth; cv.height = vid.videoHeight;
      const g = cv.getContext('2d'); g.translate(cv.width, 0); g.scale(-1, 1); g.drawImage(vid, 0, 0);
      cv.toBlob(b => { chiudi(); if(b) anteprimaInvio([new File([b], 'foto.jpg', {type: 'image/jpeg'})]); }, 'image/jpeg', .9);
    }
  };
}
