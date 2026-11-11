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
  const c = S.convs.get(S.aperta); const m = c && trovaMsg(c.id, id); if(!m) return;
  if(m._file){ return inviaFilePronto(m, m._file); }
  m._stato = 'invio'; ridisegnaMessaggio(id);
  try{ await salvaMessaggio(m); }catch(e){ m._stato = 'errore'; ridisegnaMessaggio(id); errore(e, 'Messaggio non inviato'); }
}

/* un file pronto (gia' compresso): lo carico con la barra e poi mando il messaggio */
async function inviaPreparato(conv, tipo, p, extra){
  const c = S.convs.get(conv); if(!c) return;
  const m = nuovoLocale(tipo, {media: Object.assign({locale: URL.createObjectURL(p.blob)}, p.media || {}, extra || {}), _avanza: 0}, conv);
  m._file = p;
  mettiInLista(m);
  return inviaFilePronto(m, p);
}
async function inviaFilePronto(m, p){
  m._stato = 'invio'; m._avanza = 0; ridisegnaMessaggio(m.id);
  const path = m.conv_id + '/' + uuid() + '.' + (p.ext || 'bin');
  let ultimo = 0;
  try{
    const r = await caricaFile(path, p.blob, v => {
      m._avanza = v; const t = Date.now(); if(t - ultimo < 120) return; ultimo = t;
      const n = $('.msg[data-id="'+m.id+'"] .media-carica'); if(n) n.innerHTML = anelloHTML(v);
    });
    const locale = m.media.locale;
    if(r.path){ m.media.path = r.path; firme.set(r.path, {url: locale, scade: Date.now() + 864e5}); }
    if(r.url){ m.media.url = r.url; }
    delete m._avanza;
    await salvaMessaggio(m);
    delete m._file;
  }catch(e){
    m._stato = 'errore'; delete m._avanza; ridisegnaMessaggio(m.id);
    errore(e, /server dei media/i.test(e && e.message) ? '' : 'File non inviato');
    if(/server dei media/i.test(e && e.message)) toast('Il server dei media sembra offline: il file non è partito.');
  }
}

/* ---------- registrazione dei vocali ---------- */
let reg = null;
function formatoAudio(){
  const f = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  if(!window.MediaRecorder) return '';
  for(const x of f) try{ if(MediaRecorder.isTypeSupported(x)) return x; }catch(e){}
  return '';
}
async function avviaRegistrazione(e){
  if(reg) return;
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder){ toast('Questo browser non registra l’audio.'); return; }
  const x0 = e.clientX, inizio = Date.now();
  let bloccata = false, annullata = false, rilasciata = false;
  const suPrima = () => { rilasciata = true; };
  document.addEventListener('pointerup', suPrima, {once: true});
  let stream;
  try{ stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}}); }
  catch(err){ document.removeEventListener('pointerup', suPrima); toast('Serve il permesso di usare il microfono.'); return; }
  const tipo = formatoAudio();
  const rec = new MediaRecorder(stream, tipo ? {mimeType: tipo, audioBitsPerSecond: 48000} : undefined);
  const pezzi = [], livelli = [];
  let ac, an, buf;
  try{ ac = new (window.AudioContext || window.webkitAudioContext)(); const src = ac.createMediaStreamSource(stream); an = ac.createAnalyser(); an.fftSize = 512; src.connect(an); buf = new Uint8Array(an.fftSize); }catch(err){}
  rec.ondataavailable = ev => { if(ev.data && ev.data.size) pezzi.push(ev.data); };
  reg = {rec, stream, pezzi, livelli, inizio: Date.now(), ac};
  rec.start(250);
  dicoCheScrivo('registra');
  const F = el('barraScrivi');
  F.outerHTML = '<div class="registra" id="barraScrivi">'+
    '<button class="ib cestino" data-a="reg-annulla" title="Annulla">'+svg('cestino', 1.8)+'</button>'+
    '<span class="punto"></span><span class="t" id="regT">0:00</span>'+
    '<span class="vivo" id="regVivo"></span>'+
    '<span class="scorri" id="regScorri">‹ Scorri per annullare</span>'+
    '<button class="manda pieno" data-a="reg-manda" id="regManda" title="Invia">'+svg('manda', 1.8)+'</button></div>';
  const vivo = el('regVivo');
  if(vivo) vivo.style.display = 'none';
  const giro = setInterval(() => {
    if(!reg) return clearInterval(giro);
    const s = (Date.now() - reg.inizio) / 1000;
    const t = el('regT'); if(t) t.textContent = fmtDur(s);
    if(an){ an.getByteTimeDomainData(buf); let m = 0; for(let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i] - 128)); livelli.push(Math.min(1, m / 70)); }
    else livelli.push(.3);
    if(vivo && (bloccata || tocco() === false)){
      vivo.style.display = 'flex'; const sc = el('regScorri'); if(sc && bloccata) sc.style.display = 'none';
      const ult = livelli.slice(-60), pk = Math.max(.05, ...livelli.slice(-200)); vivo.innerHTML = ult.map(v => '<i style="height:'+Math.max(3, v / pk * 26)+'px"></i>').join('');
    }
    if(s > 600) fineRegistrazione(true);
    if(s % 3 < .11) dicoCheScrivo('registra');
  }, 100);
  reg.giro = giro;
  /* tenuto premuto: si manda lasciando. Tocco breve: resta aperto (bloccato) */
  if(rilasciata){ bloccata = true; const sc = el('regScorri'); if(sc) sc.style.display = 'none'; }
  else {
    const muovi = ev => {
      const dx = ev.clientX - x0;
      const sc = el('regScorri'); if(sc && !bloccata) sc.style.transform = 'translateX(' + Math.min(0, dx) + 'px)';
      if(dx < -110 && !bloccata){ annullata = true; pulisci(); fineRegistrazione(false); }
    };
    const su = () => {
      pulisci();
      if(annullata) return;
      if(Date.now() - inizio < 400){ bloccata = true; const sc = el('regScorri'); if(sc) sc.style.display = 'none'; const v = el('regVivo'); if(v) v.style.display = 'flex'; return; }
      if(!bloccata) fineRegistrazione(true);
    };
    const pulisci = () => { document.removeEventListener('pointermove', muovi); document.removeEventListener('pointerup', su); };
    document.addEventListener('pointermove', muovi);
    document.addEventListener('pointerup', su);
  }
  if(!tocco()){ bloccata = true; const sc = el('regScorri'); if(sc) sc.style.display = 'none'; }
}
function fineRegistrazione(manda){
  const r = reg; if(!r) return; reg = null;
  clearInterval(r.giro);
  const durata = (Date.now() - r.inizio) / 1000;
  r.rec.onstop = async () => {
    r.stream.getTracks().forEach(t => t.stop());
    try{ r.ac && r.ac.close(); }catch(e){}
    disegnaScrivi();
    if(!manda) return;
    if(durata < 0.8){ toast('Tieni premuto per registrare un vocale.'); return; }
    const tipo = (r.rec.mimeType || 'audio/webm').split(';')[0];
    const blob = new Blob(r.pezzi, {type: tipo});
    const n = 48, lv = r.livelli, onda = [];
    const picco = Math.max(.05, ...lv);
    for(let i = 0; i < n; i++){
      const a = Math.floor(i * lv.length / n), b = Math.max(a + 1, Math.floor((i + 1) * lv.length / n));
      let m = 0; for(let j = a; j < b; j++) m = Math.max(m, lv[j] || 0);
      onda.push(String.fromCharCode(65 + Math.round(Math.min(1, m / picco) * 31)));
    }
    inviaPreparato(S.aperta, 'vocale', {blob, ext: tipo.includes('mp4') ? 'm4a' : tipo.includes('ogg') ? 'ogg' : 'webm',
      media: {dur: Math.round(durata * 10) / 10, onda: onda.join(''), mime: tipo, dim: blob.size}});
  };
  try{ r.rec.stop(); }catch(e){ r.stream.getTracks().forEach(t => t.stop()); disegnaScrivi(); }
}

/* ---------- riproduzione dei vocali ---------- */
let audio = null, audioId = null, velocita = 1;
function fermaAudio(){ if(audio){ audio.pause(); } audioId = null; }
async function suonaVocale(id){
  const c = S.convs.get(S.aperta); const m = c && trovaMsg(c.id, id); if(!m) return;
  if(!audio){
    audio = new Audio(); audio.preload = 'auto';
    audio.addEventListener('timeupdate', disegnaAvanzamento);
    audio.addEventListener('ended', () => { const fatto = audioId; disegnaAvanzamento(true); audioId = null; prossimoVocale(fatto); });
    audio.addEventListener('pause', () => disegnaAvanzamento());
    audio.addEventListener('play', () => disegnaAvanzamento());
    audio.addEventListener('error', () => { const id2 = audioId; audioId = null; disegnaAvanzamento(); if(id2) mediaNonArriva(id2); });
  }
  if(audioId === id){ if(audio.paused) audio.play().catch(() => {}); else audio.pause(); return; }
  const u = await urlMedia(m.media);
  if(!u){ mediaNonArriva(id); return; }
  if(audioId){ const vecchio = audioId; audioId = null; disegnaAvanzamento(false, vecchio); }
  audioId = id; audio.src = u; audio.playbackRate = velocita;
  try{ await audio.play(); }catch(e){ if(e && e.name !== 'AbortError') toast(m.media && m.media.url ? 'Il server dei media sembra offline.' : 'Non riesco a riprodurre il vocale.'); }
  const a = memoria('ascoltati') || {}; a[id] = 1; const k = Object.keys(a); if(k.length > 500) k.slice(0, k.length - 500).forEach(x => delete a[x]); memoria('ascoltati', a);
  const mic = $('.vocale[data-voc="'+id+'"] .mic'); if(mic) mic.className = 'mic ascoltato';
}
function prossimoVocale(id){
  const c = S.convs.get(S.aperta); if(!c) return;
  const l = msgVisibili(c.id), i = l.findIndex(x => x.id === id);
  const n = l[i + 1];
  const a = memoria('ascoltati') || {};
  if(n && n.tipo === 'vocale' && n.autore !== S.io && !a[n.id] && !n.eliminato) suonaVocale(n.id);
}
function disegnaAvanzamento(finito, quale){
  const id = quale || audioId; if(!id) return;
  const v = $('.vocale[data-voc="'+id+'"]'); if(!v) return;
  const va = audioId === id && audio && !audio.paused;
  v.classList.toggle('va', audioId === id && !finito);
  const b = v.querySelector('.vp'); if(b) b.innerHTML = svg(va ? 'pausa' : 'play');
  const vel = v.querySelector('.vel'); if(vel) vel.textContent = String(velocita).replace('.', ',') + '×';
  const d = audio && isFinite(audio.duration) && audio.duration ? audio.duration : ((trovaMsg(S.aperta, id) || {}).media || {}).dur || 1;
  const p = finito || audioId !== id ? 0 : Math.min(1, (audio.currentTime || 0) / d);
  const barre = v.querySelectorAll('.barre i'); const k = Math.round(p * barre.length);
  barre.forEach((x, i) => x.classList.toggle('su', i < k));
  const pl = v.querySelector('.pallino'); if(pl) pl.style.left = (p * 100) + '%';
  const t = v.querySelector('.tempo'); if(t) t.textContent = fmtDur(audioId === id && !finito && audio.currentTime ? audio.currentTime : d);
}
function cercaVocale(id, ev){
  const o = ev.target.closest('.onda'); if(!o) return;
  const r = o.getBoundingClientRect(), p = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
  if(audioId !== id){ suonaVocale(id).then(() => { if(audio && isFinite(audio.duration)) audio.currentTime = p * audio.duration; }); return; }
  if(audio && isFinite(audio.duration)) audio.currentTime = p * audio.duration;
}

/* ---------- incollare e trascinare (anche GIF da altre app) ---------- */
function incolla(e){
  const f = Array.from((e.clipboardData && e.clipboardData.files) || []);
  if(f.length){ e.preventDefault(); anteprimaInvio(f); }
}
function attivaTrascina(zona){
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
