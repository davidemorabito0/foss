/* ======================= FOTO, VIDEO, FILE ======================= */
async function decodifica(file){
  if(window.createImageBitmap){
    try{ return await createImageBitmap(file, {imageOrientation: 'from-image'}); }catch(e){}
    try{ return await createImageBitmap(file); }catch(e){}
  }
  return new Promise((ok, ko) => {
    const u = URL.createObjectURL(file), i = new Image();
    i.onload = () => { ok(i); setTimeout(() => URL.revokeObjectURL(u), 1000); };
    i.onerror = () => { URL.revokeObjectURL(u); ko(new Error('immagine non leggibile')); };
    i.src = u;
  });
}
function lato(img){ return [img.width || img.videoWidth || img.naturalWidth, img.height || img.videoHeight || img.naturalHeight]; }
function miniatura(sorg, w, h){
  const k = 32 / Math.max(w, h), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  try{ c.getContext('2d').drawImage(sorg, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .5); }catch(e){ return ''; }
}
function versoBlob(c, tipo, q){ return new Promise(ok => c.toBlob(b => ok(b), tipo, q)); }
async function prepara(file, modo){
  const t = (file.type || '').toLowerCase(), nome = file.name || 'file';
  const ext = estensione(nome);
  if(file.size > MAX_FILE) throw new Error('«' + nome + '» è troppo grande: il massimo è ' + (MEDIA_NAS ? '2 GB' : '50 MB'));
  if(modo === 'file' || /svg/.test(t)) return {tipo: 'file', blob: file, ext: ext || 'bin', media: {nome: nome.slice(0, 120), dim: file.size, mime: t}};
  if(t === 'image/gif'){
    let w = 300, h = 300, mini = '';
    try{ const im = await decodifica(file); [w, h] = lato(im); mini = miniatura(im, w, h); }catch(e){}
    return {tipo: 'foto', blob: file, ext: 'gif', media: {w, h, mini, gif: true, dim: file.size}};
  }
  if(/^image\//.test(t) || /^(jpe?g|png|webp|heic|heif|avif|bmp)$/.test(ext)){
    let im;
    try{ im = await decodifica(file); }catch(e){ return {tipo: 'file', blob: file, ext: ext || 'img', media: {nome: nome.slice(0, 120), dim: file.size, mime: t}}; }
    let [w, h] = lato(im);
    const mini = miniatura(im, w, h);
    const tieniPng = t === 'image/png' && file.size < 1.5 * 1048576 && Math.max(w, h) <= 2400;
    if(tieniPng) return {tipo: 'foto', blob: file, ext: 'png', media: {w, h, mini, dim: file.size}};
    const max = 1920, k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
    const b = await versoBlob(c, 'image/jpeg', .84);
    return {tipo: 'foto', blob: b || file, ext: 'jpg', media: {w: c.width, h: c.height, mini, dim: (b || file).size}};
  }
  if(/^video\//.test(t) || /^(mp4|mov|webm|m4v)$/.test(ext)){
    const info = await infoVideo(file);
    const gif = modo === 'gif' || (info.dur && info.dur <= 15 && !info.audio && /gif/i.test(nome));
    return {tipo: 'video', blob: file, ext: ext || 'mp4', media: Object.assign({dim: file.size, gif: gif || undefined, mime: t}, info.media)};
  }
  return {tipo: 'file', blob: file, ext: ext || 'bin', media: {nome: nome.slice(0, 120), dim: file.size, mime: t}};
}
function infoVideo(file){
  return new Promise(ok => {
    const v = document.createElement('video'), u = URL.createObjectURL(file);
    let fatto = false;
    const fine = r => { if(fatto) return; fatto = true; URL.revokeObjectURL(u); ok(r); };
    v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = u;
    v.onloadedmetadata = () => { try{ v.currentTime = Math.min(.2, (v.duration || 1) / 2); }catch(e){ fine({media: {w: v.videoWidth, h: v.videoHeight, dur: Math.round(v.duration || 0)}}); } };
    v.onseeked = () => {
      const w = v.videoWidth || 320, h = v.videoHeight || 240;
      fine({media: {w, h, dur: Math.round(v.duration || 0), mini: miniatura(v, w, h)},
            audio: v.mozHasAudio || (v.webkitAudioDecodedByteCount > 0) || (v.audioTracks && v.audioTracks.length > 0)});
    };
    v.onerror = () => fine({media: {}});
    setTimeout(() => fine({media: {w: v.videoWidth, h: v.videoHeight, dur: Math.round(v.duration || 0)}}), 5000);
  });
}

/* ---------- prima di mandare: anteprima, didascalia, disegno ---------- */
let ai = null;
function anteprimaInvio(files, modo){
  if(!S.aperta){ return; }
  files = files.slice(0, 30);
  if(!ai) ai = {voci: [], i: 0, modo};
  files.forEach(f => ai.voci.push({file: f, did: '', url: /^(image|video)\//.test(f.type) && !/svg/.test(f.type) ? URL.createObjectURL(f) : '', modo}));
  disegnaAnteprima();
}
function chiudiAnteprima(){
  if(ai) ai.voci.forEach(v => v.url && URL.revokeObjectURL(v.url));
  ai = null; const n = el('anteprimaInvio'); if(n) n.remove();
}
function disegnaAnteprima(){
  let n = el('anteprimaInvio');
  if(!n){ n = document.createElement('div'); n.className = 'anteprima-invio'; n.id = 'anteprimaInvio'; el('conv').appendChild(n); }
  const v = ai.voci[ai.i]; if(!v){ chiudiAnteprima(); return; }
  const img = /^image\//.test(v.file.type) && v.modo !== 'file', vid = /^video\//.test(v.file.type) && v.modo !== 'file';
  const ext = estensione(v.file.name);
  const vista = img && v.url ? '<img src="'+v.url+'" alt="">' : vid && v.url ? '<video src="'+v.url+'" controls playsinline'+(v.modo === 'gif' ? ' autoplay loop muted' : '')+'></video>'
    : '<div class="doc-grande"><span class="ic">'+esc((ext || 'file').toUpperCase().slice(0, 4))+'</span><b style="color:var(--testo)">'+esc(v.file.name)+'</b><span>'+fmtDim(v.file.size)+'</span></div>';
  const puoDisegnare = img && !/gif/.test(v.file.type);
  n.innerHTML = '<div class="ai-testa"><button class="ib" data-a="ai-chiudi" aria-label="Chiudi">'+svg('chiudi')+'</button><b>'+esc(nomeConv(S.convs.get(S.aperta)))+'</b>'+
      '<span class="ai-strumenti">'+(puoDisegnare ? '<button class="ib" data-a="ai-disegna" title="Disegna sopra">'+svg('disegno', 1.8)+'</button>'+
        '<button class="ib" data-a="ai-sticker" title="Fai uno sticker">'+svg('sticker', 1.8)+'</button>' : '')+
      (ai.voci.length > 1 ? '<button class="ib" data-a="ai-togli" title="Togli">'+svg('cestino', 1.8)+'</button>' : '')+'</span></div>'+
    '<div class="ai-c">'+vista+'</div>'+
    '<div class="ai-didascalia"><input id="aiDid" placeholder="Aggiungi una didascalia" maxlength="1000" value="'+esc(v.did)+'"><button class="ai-manda" data-a="ai-manda" aria-label="Invia">'+svg('manda', 1.8)+'</button></div>'+
    '<div class="ai-miniature">'+ai.voci.map((x, i) => '<button class="'+(i === ai.i ? 'on' : '')+'" data-a="ai-vai" data-i="'+i+'">'+
      (x.url && /^image/.test(x.file.type) ? '<img src="'+x.url+'" alt="">' : x.url ? '<video src="'+x.url+'" muted></video>' : svg('doc', 1.6))+'</button>').join('')+
      '<button class="agg" data-a="ai-aggiungi" title="Aggiungi">'+svg('piu')+'</button></div>';
  const d = el('aiDid');
  d.addEventListener('input', () => { v.did = d.value; });
  d.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); mandaAnteprima(); } if(e.key === 'Escape') chiudiAnteprima(); });
  if(!tocco()) d.focus();
}
async function mandaAnteprima(){
  if(!ai) return;
  const voci = ai.voci.slice(), conv = S.aperta;
  const risp = S.risposta; S.risposta = null;
  chiudiAnteprima(); disegnaScrivi();
  for(let k = 0; k < voci.length; k++){
    const v = voci[k];
    let p;
    try{ p = await prepara(v.file, v.modo); }catch(e){ toast(e.message || 'File non valido'); continue; }
    const extra = {};
    if(v.did && v.did.trim()) extra.did = v.did.trim().slice(0, 1000);
    if(k === 0 && risp) S.risposta = risp;
    const pr = inviaPreparato(conv, p.tipo, p, extra);
    S.risposta = null;
    if(k < voci.length - 1) await pr;
  }
  suono('invio');
}

/* ---------- visore a schermo intero ---------- */
let visoreDati = null;
function mediaDellaChat(){
  const c = S.convs.get(S.aperta); if(!c) return [];
  return msgVisibili(c.id).filter(m => !m.eliminato && (m.tipo === 'foto' || m.tipo === 'video' || m.tipo === 'sticker'));
}
async function apriVisore(id){
  const lista = mediaDellaChat(); const i = lista.findIndex(m => m.id === id); if(i < 0) return;
  visoreDati = {lista, i, zoom: 1, x: 0, y: 0};
  let v = el('visore');
  if(!v){ v = document.createElement('div'); v.className = 'visore'; v.id = 'visore'; document.body.appendChild(v); }
  await disegnaVisore();
}
async function disegnaVisore(){
  const v = el('visore'); if(!v || !visoreDati) return;
  const m = visoreDati.lista[visoreDati.i], md = m.media || {};
  const u = await urlMedia(md);
  const quando = dataGiorno(m.creato_il) + ' alle ' + ora(m.creato_il);
  let cont;
  if(!u) cont = '<div class="media-offline" style="max-width:340px">'+svg(md.url && !md.giphy ? 'server' : 'foto', 1.6)+'<b>'+(md.url && !md.giphy ? 'Il server dei media sembra offline' : 'File non disponibile')+'</b></div>';
  else if(m.tipo === 'video') cont = '<video src="'+esc(u)+'" controls autoplay playsinline'+(md.gif ? ' loop muted' : '')+'></video>';
  else cont = '<img src="'+esc(u)+'" alt="" id="visoreImg" draggable="false" style="'+(m.tipo === 'sticker' ? 'max-width:60vmin;max-height:60vmin' : '')+'">';
  v.innerHTML = '<div class="visore-t">'+avatarMsg(m)+'<span class="tt"><b>'+esc(m.autore === S.io ? 'Tu' : nomeMsg(m))+'</b><span>'+quando+'</span></span>'+
    (m.tipo === 'foto' && !md.gif ? '<button class="ib" data-v="sticker" title="Crea sticker">'+svg('sticker', 1.8)+'</button>' : '')+
    '<button class="ib" data-v="rispondi" title="Rispondi">'+svg('rispondi', 1.8)+'</button>'+
    '<button class="ib" data-v="inoltra" title="Inoltra">'+svg('inoltra', 1.8)+'</button>'+
    (m.tipo !== 'sticker' ? '<button class="ib" data-v="scarica" title="Scarica">'+svg('scarica', 1.8)+'</button>' : '')+
    '<button class="ib" data-v="chiudi" title="Chiudi">'+svg('chiudi')+'</button></div>'+
    '<div class="visore-c" id="visoreC">'+
      (visoreDati.i > 0 ? '<button class="ib" data-v="prima" style="position:absolute;left:12px;background:rgba(134,150,160,.2)">'+svg('indietro')+'</button>' : '')+cont+
      (visoreDati.i < visoreDati.lista.length - 1 ? '<button class="ib" data-v="dopo" style="position:absolute;right:12px;background:rgba(134,150,160,.2);transform:scaleX(-1)">'+svg('indietro')+'</button>' : '')+
    '</div>'+(md.did ? '<div class="visore-did">'+formatta(md.did)+'</div>' : '<div style="height:20px"></div>');
  visoreDati.zoom = 1; visoreDati.x = visoreDati.y = 0;
  /* un tocco fuori dalla foto o dal video chiude il visore (non solo la X) */
  let giu = null;
  v.onpointerdown = e => { giu = {t: e.target, x: e.clientX, y: e.clientY}; };
  v.onclick = e => {
    const b = e.target.closest('[data-v]');
    if(!b){
      const t0 = giu && giu.t, mosso = giu ? Math.hypot(e.clientX - giu.x, e.clientY - giu.y) > 10 : false;
      if(!t0 || mosso || (visoreDati && visoreDati.zoom > 1)) return;
      if(t0.closest('img, video, .media-offline, .visore-did, button, a')) return;
      chiudiVisore(); return;
    }
    const a = b.dataset.v;
    if(a === 'chiudi') chiudiVisore();
    if(a === 'prima'){ visoreDati.i--; disegnaVisore(); }
    if(a === 'dopo'){ visoreDati.i++; disegnaVisore(); }
    if(a === 'scarica') scaricaMedia(m);
    if(a === 'inoltra'){ chiudiVisore(); inoltra([m]); }
    if(a === 'rispondi'){ chiudiVisore(); impostaRisposta(m); }
    if(a === 'sticker'){ chiudiVisore(); stickerDaMessaggio(m); }
  };
  const img = el('visoreImg'), C = el('visoreC');
  if(img && C){
    const applica = () => { img.style.transform = 'translate('+visoreDati.x+'px,'+visoreDati.y+'px) scale('+visoreDati.zoom+')'; img.style.cursor = visoreDati.zoom > 1 ? 'grab' : 'zoom-in'; };
    img.ondblclick = e => { visoreDati.zoom = visoreDati.zoom > 1 ? 1 : 2.5; visoreDati.x = visoreDati.y = 0; applica(); };
    C.onwheel = e => { e.preventDefault(); visoreDati.zoom = Math.max(1, Math.min(6, visoreDati.zoom * (e.deltaY < 0 ? 1.15 : .87))); if(visoreDati.zoom === 1) visoreDati.x = visoreDati.y = 0; applica(); };
    const punti = new Map(); let d0 = 0, z0 = 1, px = 0, py = 0, sx = 0, ultimoTocco = 0;
    C.onpointerdown = e => {
      if(e.target.closest('button')) return;
      punti.set(e.pointerId, {x: e.clientX, y: e.clientY}); C.setPointerCapture(e.pointerId);
      if(punti.size === 2){ const [a, b] = Array.from(punti.values()); d0 = Math.hypot(a.x - b.x, a.y - b.y); z0 = visoreDati.zoom; }
      px = e.clientX; py = e.clientY; sx = e.clientX;
      if(e.pointerType === 'touch'){ const t = Date.now(); if(t - ultimoTocco < 300){ img.ondblclick(); } ultimoTocco = t; }
    };
    C.onpointermove = e => {
      if(!punti.has(e.pointerId)) return;
      punti.set(e.pointerId, {x: e.clientX, y: e.clientY});
      if(punti.size === 2){ const [a, b] = Array.from(punti.values()); visoreDati.zoom = Math.max(1, Math.min(6, z0 * Math.hypot(a.x - b.x, a.y - b.y) / (d0 || 1))); applica(); return; }
      if(visoreDati.zoom > 1){ visoreDati.x += e.clientX - px; visoreDati.y += e.clientY - py; px = e.clientX; py = e.clientY; applica(); }
    };
    C.onpointerup = e => {
      punti.delete(e.pointerId);
      if(visoreDati.zoom === 1 && e.pointerType === 'touch'){
        const dx = e.clientX - sx;
        if(dx > 70 && visoreDati.i > 0){ visoreDati.i--; disegnaVisore(); }
        else if(dx < -70 && visoreDati.i < visoreDati.lista.length - 1){ visoreDati.i++; disegnaVisore(); }
      }
    };
  }
}
function chiudiVisore(){ const v = el('visore'); if(v){ $$('video', v).forEach(x => x.pause()); v.remove(); } visoreDati = null; }
async function apriDocumento(id){
  const c = S.convs.get(S.aperta); const m = trovaMsg(c.id, id); if(!m || !m.media) return;
  const u = await urlMedia(m.media);
  if(!u){ toast(m.media.url ? 'Il server dei media sembra offline.' : 'Non riesco ad aprire il file.'); return; }
  const ext = estensione(m.media.nome);
  if(/^(pdf|jpe?g|png|gif|webp|mp4|mp3|m4a|txt)$/.test(ext)) window.open(u, '_blank', 'noopener');
  else scaricaMedia(m);
}
