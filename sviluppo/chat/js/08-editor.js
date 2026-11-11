/* ======================= DISEGNO E STICKER ======================= */
const COLORI = ['#ffffff','#111111','#ff3b30','#ff9500','#ffcc00','#34c759','#00c7be','#007aff','#af52de','#ff2d92'];

/* tratti a mano libera (anche Apple Pencil, con la pressione) */
function Tratti(canvas, scala){
  this.c = canvas; this.g = canvas.getContext('2d'); this.k = scala || 1;
  this.lista = []; this.tolti = []; this.cur = null;
  this.strumento = 'penna'; this.colore = '#ff3b30'; this.spessore = 6;
}
Tratti.prototype.inizia = function(x, y, p){
  this.cur = {s: this.strumento, c: this.colore, w: this.spessore * this.k, pt: [[x, y, p || .5]]};
  this.lista.push(this.cur); this.tolti = [];
};
Tratti.prototype.muovi = function(x, y, p){ if(!this.cur) return; this.cur.pt.push([x, y, p || .5]); this.ridisegna(); };
Tratti.prototype.fine = function(){ if(this.cur && this.cur.pt.length === 1) this.cur.pt.push([this.cur.pt[0][0] + .1, this.cur.pt[0][1] + .1, this.cur.pt[0][2]]); this.cur = null; this.ridisegna(); };
Tratti.prototype.annulla = function(){ if(this.lista.length){ this.tolti.push(this.lista.pop()); this.ridisegna(); } };
Tratti.prototype.rifai = function(){ if(this.tolti.length){ this.lista.push(this.tolti.pop()); this.ridisegna(); } };
Tratti.prototype.svuota = function(){ this.lista = []; this.tolti = []; this.ridisegna(); };
Tratti.prototype.ridisegna = function(g, sx){
  g = g || this.g; sx = sx || 1;
  if(g === this.g) g.clearRect(0, 0, this.c.width, this.c.height);
  this.lista.forEach(t => {
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.globalCompositeOperation = t.s === 'gomma' ? 'destination-out' : 'source-over';
    g.strokeStyle = t.c; g.globalAlpha = t.s === 'evidenziatore' ? .38 : 1;
    if(t.s === 'neon'){ g.shadowBlur = t.w * 2.2 * sx; g.shadowColor = t.c; }
    const pt = t.pt;
    const larg = i => t.s === 'evidenziatore' ? t.w * 3 : t.s === 'gomma' ? t.w * 3 : t.w * (.55 + (pt[i][2] || .5));
    if(t.s === 'evidenziatore' || t.s === 'gomma' || t.s === 'neon'){
      g.lineWidth = larg(0) * sx;
      g.beginPath(); g.moveTo(pt[0][0] * sx, pt[0][1] * sx);
      for(let i = 1; i < pt.length - 1; i++){ const mx = (pt[i][0] + pt[i + 1][0]) / 2, my = (pt[i][1] + pt[i + 1][1]) / 2; g.quadraticCurveTo(pt[i][0] * sx, pt[i][1] * sx, mx * sx, my * sx); }
      g.lineTo(pt[pt.length - 1][0] * sx, pt[pt.length - 1][1] * sx); g.stroke();
      if(t.s === 'neon'){ g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = Math.max(1, larg(0) * .35) * sx; g.stroke(); }
    } else {
      for(let i = 1; i < pt.length; i++){
        g.lineWidth = larg(i) * sx;
        g.beginPath();
        const a = pt[i - 1], b = pt[i];
        const ma = i > 1 ? [(pt[i - 2][0] + a[0]) / 2, (pt[i - 2][1] + a[1]) / 2] : a;
        const mb = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        g.moveTo(ma[0] * sx, ma[1] * sx); g.quadraticCurveTo(a[0] * sx, a[1] * sx, mb[0] * sx, mb[1] * sx);
        if(i === pt.length - 1) g.lineTo(b[0] * sx, b[1] * sx);
        g.stroke();
      }
    }
    g.restore();
  });
};
function barraColori(attivo){
  return '<div class="ed-colori">'+COLORI.map(c => '<button data-col="'+c+'" class="'+(c === attivo ? 'on' : '')+'" style="background:'+c+'" aria-label="Colore"></button>').join('')+
    '<input type="color" data-col-l="1" value="#ff3b30" aria-label="Altro colore"></div>';
}
function posTela(ev, cv){
  const r = cv.getBoundingClientRect();
  return [(ev.clientX - r.left) * cv.width / r.width, (ev.clientY - r.top) * cv.height / r.height, ev.pressure && ev.pointerType === 'pen' ? ev.pressure : .5];
}

/* ---------- disegno libero o sopra una foto ---------- */
async function apriDisegno(sfondoBlob, fatto, opz){
  opz = opz || {};
  const v = document.createElement('div'); v.className = 'editor'; v.id = 'editor';
  v.innerHTML = '<div class="ed-testa"><button class="ib" data-d="chiudi" aria-label="Chiudi">'+svg('chiudi')+'</button><b>'+(opz.titolo || 'Disegno')+'</b>'+
    '<button class="ib" data-d="annulla" title="Annulla">'+svg('annulla')+'</button><button class="ib" data-d="rifai" title="Rifai">'+svg('rifai')+'</button>'+
    '<button class="ib" data-d="svuota" title="Cancella tutto">'+svg('cestino', 1.8)+'</button></div>'+
    '<div class="ed-area" id="edArea"><div class="ed-tela" id="edTela"><canvas id="edBase"></canvas><canvas id="edTratti"></canvas></div></div>'+
    '<div class="ed-barra">'+
      '<button class="ed-strumento on" data-s="penna">'+svg('penna', 1.8)+'<span>Penna</span></button>'+
      '<button class="ed-strumento" data-s="evidenziatore">'+svg('evidenziatore', 1.8)+'</button>'+
      '<button class="ed-strumento" data-s="neon">'+svg('effetti', 1.8)+'<span>Neon</span></button>'+
      '<button class="ed-strumento" data-s="gomma">'+svg('gomma', 1.8)+'</button>'+
      '<input class="ed-spessore" type="range" min="2" max="30" value="6" aria-label="Spessore">'+
      barraColori('#ff3b30')+
      (sfondoBlob ? '' : '<button class="ed-strumento" data-d="sfondo" id="edSfondo">Sfondo bianco</button>')+
      '<button class="ed-manda" data-d="fatto" aria-label="Fatto">'+svg(opz.tastoOk === 'ok' ? 'ok' : 'manda', 2)+'</button>'+
    '</div>';
  document.body.appendChild(v);
  const area = el('edArea'), tela = el('edTela'), base = el('edBase'), cv = el('edTratti');
  let img = null, W, H;
  if(sfondoBlob){ try{ img = await decodifica(sfondoBlob); }catch(e){ img = null; } }
  const aw = area.clientWidth - 24, ah = area.clientHeight - 24;
  if(img){ const [iw, ih] = lato(img); const k = Math.min(1, 2048 / Math.max(iw, ih)); W = Math.round(iw * k); H = Math.round(ih * k); }
  else { const dpr = Math.min(2, window.devicePixelRatio || 1); W = Math.round(Math.min(aw, 1400) * dpr); H = Math.round(Math.min(ah, 1400) * dpr); }
  const kv = Math.min(aw / W, ah / H);
  tela.style.width = Math.round(W * kv) + 'px'; tela.style.height = Math.round(H * kv) + 'px';
  base.width = cv.width = W; base.height = cv.height = H;
  let sfondi = ['#ffffff', '#111b21', 'trasparente'], sf = opz.trasparente ? 2 : 0;
  const disegnaBase = () => {
    const g = base.getContext('2d'); g.clearRect(0, 0, W, H);
    if(img) g.drawImage(img, 0, 0, W, H);
    else if(sfondi[sf] !== 'trasparente'){ g.fillStyle = sfondi[sf]; g.fillRect(0, 0, W, H); }
    tela.classList.toggle('scacchi', !img && sfondi[sf] === 'trasparente');
    const b = el('edSfondo'); if(b) b.textContent = ['Sfondo bianco','Sfondo scuro','Trasparente'][sf];
  };
  disegnaBase();
  const T = new Tratti(cv, W / (W * kv));
  T.colore = img ? '#ff3b30' : '#111111';
  if(!img){ $$('[data-col]', v).forEach(b => b.classList.toggle('on', b.dataset.col === T.colore)); }
  let attivo = null;
  cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); attivo = e.pointerId; const p = posTela(e, cv); T.inizia(p[0], p[1], p[2]); });
  cv.addEventListener('pointermove', e => { if(attivo !== e.pointerId) return; const ev = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; ev.forEach(x => { const p = posTela(x, cv); T.cur && T.cur.pt.push(p); }); T.ridisegna(); });
  const su = e => { if(attivo !== e.pointerId) return; attivo = null; T.fine(); };
  cv.addEventListener('pointerup', su); cv.addEventListener('pointercancel', su);
  const chiudi = () => v.remove();
  v.addEventListener('input', e => { if(e.target.classList.contains('ed-spessore')) T.spessore = +e.target.value; if(e.target.dataset.colL){ T.colore = e.target.value; $$('[data-col]', v).forEach(b => b.classList.remove('on')); } });
  v.onclick = async e => {
    const c = e.target.closest('[data-col]'); if(c){ T.colore = c.dataset.col; $$('[data-col]', v).forEach(b => b.classList.toggle('on', b === c)); if(T.strumento === 'gomma') scegli('penna'); return; }
    const s = e.target.closest('[data-s]'); if(s){ scegli(s.dataset.s); return; }
    const d = e.target.closest('[data-d]'); if(!d) return;
    const a = d.dataset.d;
    if(a === 'chiudi'){ if(T.lista.length) conferma('Lasciare il disegno?', 'Quello che hai disegnato andrà perso.', 'Lascia', chiudi, true); else chiudi(); }
    if(a === 'annulla') T.annulla();
    if(a === 'rifai') T.rifai();
    if(a === 'svuota') T.svuota();
    if(a === 'sfondo'){ sf = (sf + 1) % 3; disegnaBase(); }
    if(a === 'fatto'){
      if(!T.lista.length && !img){ toast('Disegna qualcosa prima di inviare.'); return; }
      const out = document.createElement('canvas'); out.width = W; out.height = H;
      const g = out.getContext('2d'); g.drawImage(base, 0, 0); g.drawImage(cv, 0, 0);
      const trasp = !img && sfondi[sf] === 'trasparente';
      const b = await versoBlob(out, trasp || !img ? 'image/png' : 'image/jpeg', .9);
      chiudi(); if(b) fatto(b);
    }
  };
  function scegli(n){ T.strumento = n; $$('[data-s]', v).forEach(b => b.classList.toggle('on', b.dataset.s === n)); }
}

/* ---------- sticker: ritaglio, sfondo via, contorno, testo, disegno ---------- */
async function nuovoSticker(){
  scegliFile('image/*', false, f => {
    const file = f[0];
    if(/gif/.test(file.type)) return salvaStickerFile(file, 'gif', true);
    apriStickerEditor(file);
  });
}
async function stickerDaMessaggio(m){
  try{
    const u = await urlMedia(m.media); if(!u) throw new Error();
    const b = await (await fetch(u)).blob();
    apriStickerEditor(b);
  }catch(e){ toast('Non riesco a prendere la foto.'); }
}
function avvisoEditor(h, fisso){
  let a = el('edAvviso');
  if(!h){ if(a) a.remove(); return; }
  if(!a){ a = document.createElement('div'); a.className = 'ed-avviso'; a.id = 'edAvviso'; const ar = el('edArea'); if(!ar) return; ar.appendChild(a); }
  a.innerHTML = h;
  clearTimeout(a._t); if(!fisso) a._t = setTimeout(() => a.remove(), 3500);
}
async function apriStickerEditor(blob){
  let img;
  try{ img = await decodifica(blob); }catch(e){ toast('Questa immagine non si può usare.'); return; }
  const v = document.createElement('div'); v.className = 'editor'; v.id = 'editor';
  v.innerHTML = '<div class="ed-testa"><button class="ib" data-d="chiudi" aria-label="Chiudi">'+svg('chiudi')+'</button><b>Nuovo sticker</b>'+
    '<button class="ib" data-d="annulla" title="Annulla tratto">'+svg('annulla')+'</button></div>'+
    '<div class="ed-area" id="edArea"><div class="ed-tela scacchi" id="edTela"><canvas id="stkTela"></canvas><canvas id="stkTratti" style="pointer-events:none"></canvas></div></div>'+
    '<div class="ed-barra" id="stkBarra"></div>';
  document.body.appendChild(v);
  const area = el('edArea'), tela = el('edTela'), cv = el('stkTela'), tr = el('stkTratti');
  const N = 512; cv.width = tr.width = N; cv.height = tr.height = N;
  const lato0 = Math.min(area.clientWidth - 30, area.clientHeight - 30, 460);
  tela.style.width = tela.style.height = lato0 + 'px';
  const st = {img, forma: 'libera', contorno: true, scala: 1, x: 0, y: 0, testi: [], modo: 'muovi', senzaSfondo: false};
  const [iw, ih] = lato(img);
  st.scala = Math.max(N / iw, N / ih) * 0.92; st.x = (N - iw * st.scala) / 2; st.y = (N - ih * st.scala) / 2;
  const T = new Tratti(tr, 1); T.colore = '#ffffff'; T.spessore = 7;
  const barra = () => {
    el('stkBarra').innerHTML =
      '<button class="ed-strumento'+(st.modo === 'muovi' ? ' on' : '')+'" data-m="muovi">'+svg('foto', 1.8)+'<span>Sposta</span></button>'+
      '<button class="ed-strumento" data-d="sfondo" id="stkSfondo">'+svg('bacchetta', 1.8)+'<span>'+(st.senzaSfondo ? 'Rimetti sfondo' : st.modo === 'tocca' ? 'Tocca il soggetto' : 'Togli sfondo')+'</span></button>'+
      '<button class="ed-strumento'+(st.forma === 'libera' ? ' on' : '')+'" data-f="libera" title="Libera">'+svg('libero', 1.8)+'</button>'+
      '<button class="ed-strumento'+(st.forma === 'tonda' ? ' on' : '')+'" data-f="tonda" title="Tonda">'+svg('tondo', 1.8)+'</button>'+
      '<button class="ed-strumento'+(st.forma === 'quadra' ? ' on' : '')+'" data-f="quadra" title="Arrotondata">'+svg('quadro', 1.8)+'</button>'+
      '<button class="ed-strumento'+(st.contorno ? ' on' : '')+'" data-d="contorno">'+svg('contorno', 1.8)+'<span>Bordo</span></button>'+
      '<button class="ed-strumento" data-d="testo">'+svg('testo', 1.8)+'<span>Testo</span></button>'+
      '<button class="ed-strumento" data-d="emoji">😀</button>'+
      '<button class="ed-strumento'+(st.modo === 'disegna' ? ' on' : '')+'" data-m="disegna">'+svg('penna', 1.8)+'</button>'+
      (st.modo === 'disegna' ? barraColori(T.colore) : '')+
      '<button class="ed-manda" data-d="salva" aria-label="Salva lo sticker">'+svg('ok', 2.4)+'</button>';
  };
  barra();
  const forma = (g, n) => {
    g.beginPath();
    if(st.forma === 'tonda') g.arc(n / 2, n / 2, n / 2 - 6, 0, 6.283);
    else if(st.forma === 'quadra'){ const r = n * .16, m = 6; g.moveTo(m + r, m); g.arcTo(n - m, m, n - m, n - m, r); g.arcTo(n - m, n - m, m, n - m, r); g.arcTo(m, n - m, m, m, r); g.arcTo(m, m, n - m, m, r); }
    else g.rect(0, 0, n, n);
  };
  const disegnaTesti = (g, k) => st.testi.forEach(t => {
    g.save(); g.font = '800 ' + t.dim * k + 'px ' + getComputedStyle(document.body).fontFamily; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = t.dim * k * .22; g.strokeStyle = t.bordo; g.strokeText(t.t, t.x * k, t.y * k); g.fillStyle = t.col; g.fillText(t.t, t.x * k, t.y * k); g.restore();
  });
  /* il contorno bianco attorno al soggetto (quando lo sfondo e' trasparente) */
  const componi = (n) => {
    const k = n / N;
    const lay = document.createElement('canvas'); lay.width = lay.height = n;
    const g = lay.getContext('2d');
    g.save(); forma(g, n); g.clip();
    g.drawImage(st.img, st.x * k, st.y * k, iw * st.scala * k, ih * st.scala * k);
    g.restore();
    T.ridisegna(g, k);
    disegnaTesti(g, k);
    if(!st.contorno) return lay;
    const out = document.createElement('canvas'); out.width = out.height = n;
    const o = out.getContext('2d');
    const sil = document.createElement('canvas'); sil.width = sil.height = n;
    const s = sil.getContext('2d'); s.drawImage(lay, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = '#fff'; s.fillRect(0, 0, n, n);
    const r = Math.max(3, Math.round(n * .018));
    for(let a = 0; a < 24; a++) o.drawImage(sil, Math.cos(a / 24 * 6.283) * r, Math.sin(a / 24 * 6.283) * r);
    o.shadowColor = 'rgba(0,0,0,.25)'; o.shadowBlur = n * .01;
    o.drawImage(lay, 0, 0);
    return out;
  };
  const anteprima = () => {
    const g = cv.getContext('2d'); g.clearRect(0, 0, N, N);
    g.drawImage(componi(N), 0, 0);
    tr.getContext('2d').clearRect(0, 0, N, N);
  };
  anteprima();
  /* spostare e ingrandire con dito o mouse; trascinare le scritte */
  const punti = new Map(); let d0 = 0, s0 = 1, ultimo = null, preso = null;
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const p = posTela(e, cv);
    if(st.modo === 'tocca'){
      const nx = (p[0] - st.x) / (iw * st.scala), ny = (p[1] - st.y) / (ih * st.scala);
      if(nx < 0 || nx > 1 || ny < 0 || ny > 1){ avvisoEditor('Tocca dentro la foto, sul soggetto'); return; }
      avvisoEditor('<span class="giro"></span>Ritaglio il soggetto…', true);
      st.modo = 'muovi';
      setTimeout(async () => {
        try{ st.originale = st.originale || st.img; st.img = await togliSfondo(st.originale, nx, ny); st.senzaSfondo = true; st.contorno = true; avvisoEditor(''); }
        catch(err){ console.warn(err); avvisoEditor(''); toast(/soggetto/.test(err && err.message) ? 'Non ho trovato il soggetto: tocca proprio sopra.' : 'Non riesco a togliere lo sfondo adesso: controlla la connessione.'); }
        barra(); anteprima();
      }, 30);
      return;
    }
    if(st.modo === 'disegna'){ T.inizia(p[0], p[1], p[2]); punti.set(e.pointerId, p); return; }
    preso = st.testi.slice().reverse().find(t => Math.abs(p[0] - t.x) < t.dim * Math.max(1, t.t.length * .3) && Math.abs(p[1] - t.y) < t.dim * .7) || null;
    punti.set(e.pointerId, p); ultimo = p;
    if(punti.size === 2){ const [a, b] = Array.from(punti.values()); d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); s0 = st.scala; }
  });
  cv.addEventListener('pointermove', e => {
    if(!punti.has(e.pointerId)) return;
    const p = posTela(e, cv);
    if(st.modo === 'disegna'){ T.muovi(p[0], p[1], p[2]); anteprima(); return; }
    punti.set(e.pointerId, p);
    if(punti.size === 2){
      const [a, b] = Array.from(punti.values()), d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const ns = Math.max(.05, s0 * d / (d0 || 1)), cxp = N / 2, cyp = N / 2;
      st.x = cxp - (cxp - st.x) * ns / st.scala; st.y = cyp - (cyp - st.y) * ns / st.scala; st.scala = ns;
    } else if(preso){ preso.x += p[0] - ultimo[0]; preso.y += p[1] - ultimo[1]; }
    else { st.x += p[0] - ultimo[0]; st.y += p[1] - ultimo[1]; }
    ultimo = p; anteprima();
  });
  const su = e => { punti.delete(e.pointerId); if(st.modo === 'disegna') T.fine(); preso = null; anteprima(); };
  cv.addEventListener('pointerup', su); cv.addEventListener('pointercancel', su);
  cv.addEventListener('wheel', e => { e.preventDefault(); const ns = st.scala * (e.deltaY < 0 ? 1.08 : .93); st.x = N / 2 - (N / 2 - st.x) * ns / st.scala; st.y = N / 2 - (N / 2 - st.y) * ns / st.scala; st.scala = ns; anteprima(); }, {passive: false});
  const chiudi = () => v.remove();
  v.addEventListener('input', e => { if(e.target.dataset.colL){ T.colore = e.target.value; } });
  v.onclick = async e => {
    const c = e.target.closest('[data-col]'); if(c){ T.colore = c.dataset.col; barra(); return; }
    const m = e.target.closest('[data-m]'); if(m){ st.modo = m.dataset.m; barra(); return; }
    const f = e.target.closest('[data-f]'); if(f){ st.forma = f.dataset.f; tela.classList.toggle('tondo', false); barra(); anteprima(); return; }
    const d = e.target.closest('[data-d]'); if(!d) return;
    const a = d.dataset.d;
    if(a === 'chiudi') chiudi();
    if(a === 'annulla'){ if(T.lista.length) T.annulla(); else if(st.testi.length) st.testi.pop(); anteprima(); }
    if(a === 'contorno'){ st.contorno = !st.contorno; barra(); anteprima(); }
    if(a === 'testo' || a === 'emoji'){
      const chiedi = a === 'emoji' ? new Promise(ok => sceltaEmoji(ok)) : chiediTesto('Testo dello sticker', 'Scrivi qualcosa', 40);
      const t = await chiedi; if(!t) return;
      st.testi.push({t, x: N / 2, y: a === 'emoji' ? N * .3 : N * .84, dim: a === 'emoji' ? 110 : 64, col: a === 'emoji' ? '#000' : T.colore === '#ffffff' ? '#ffffff' : T.colore, bordo: a === 'emoji' ? 'rgba(0,0,0,0)' : '#111'});
      if(a === 'testo' && st.testi[st.testi.length - 1].col === '#ffffff') st.testi[st.testi.length - 1].bordo = '#111';
      st.modo = 'muovi'; barra(); anteprima();
      toast('Trascina la scritta dove vuoi.');
    }
    if(a === 'sfondo'){
      if(st.senzaSfondo){ st.img = st.originale; st.senzaSfondo = false; barra(); anteprima(); return; }
      st.modo = 'tocca'; barra();
      avvisoEditor('Tocca il soggetto da ritagliare');
      preparaSegmentatore().catch(() => {});
    }
    if(a === 'salva'){
      const out = componi(512);
      let b = await versoBlob(out, 'image/webp', .9);
      if(!b || b.type !== 'image/webp') b = await versoBlob(out, 'image/png');
      chiudi();
      salvaStickerFile(b, 'sticker', true);
    }
  };
}
/* togliere lo sfondo: tocchi il soggetto e un modello di Google (MediaPipe, licenza Apache)
   lo ritaglia direttamente nel browser. Nessuna foto esce dal dispositivo. */
const MP_V = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2';
const MP_MODELLO = 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite';
let segmentatore = null;
async function preparaSegmentatore(){
  if(segmentatore) return segmentatore;
  const vis = await import(MP_V + '/vision_bundle.mjs');
  const files = await vis.FilesetResolver.forVisionTasks(MP_V + '/wasm');
  const Cls = vis.InteractiveSegmenterLegacy || vis.InteractiveSegmenter;
  segmentatore = await Cls.createFromOptions(files, {baseOptions: {modelAssetPath: MP_MODELLO, delegate: 'CPU'}, outputConfidenceMasks: true, outputCategoryMask: false});
  return segmentatore;
}
async function togliSfondo(img, nx, ny){
  const seg = await preparaSegmentatore();
  const [iw, ih] = lato(img), k = Math.min(1, 1024 / Math.max(iw, ih));
  const c = document.createElement('canvas'); c.width = Math.round(iw * k); c.height = Math.round(ih * k);
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
  const r = seg.segment(c, {keypoint: {x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny))}});
  const mk = r && r.confidenceMasks && r.confidenceMasks[0];
  if(!mk) throw new Error('nessuna maschera');
  const f = mk.getAsFloat32Array(), w = mk.width, h = mk.height;
  const dati = g.getImageData(0, 0, c.width, c.height);
  let pieni = 0;
  for(let y = 0; y < c.height; y++) for(let x = 0; x < c.width; x++){
    const v = f[Math.floor(y * h / c.height) * w + Math.floor(x * w / c.width)] || 0;
    const a = Math.max(0, Math.min(1, (v - .35) / .3));
    if(a > .5) pieni++;
    dati.data[(y * c.width + x) * 4 + 3] = Math.round(a * 255);
  }
  try{ r.close && r.close(); }catch(e){}
  if(pieni < c.width * c.height * .01) throw new Error('soggetto non trovato');
  g.putImageData(dati, 0, 0);
  return c;
}
/* salva nella mia raccolta (e, se sono in una chat, lo manda subito) */
async function salvaStickerFile(blob, tipo, manda){
  const ext = blob.type === 'image/gif' ? 'gif' : blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : /mp4/.test(blob.type) ? 'mp4' : 'webp';
  const path = 'sticker/' + S.io + '/' + uuid() + '.' + ext;
  toast(tipo === 'gif' ? 'Salvo la GIF…' : 'Salvo lo sticker…');
  try{
    await caricaFile(path, blob);
    firme.set(path, {url: URL.createObjectURL(blob), scade: Date.now() + 864e5});
    const {data, error} = await sb.from('chat_sticker').insert({path, tipo: tipo === 'gif' ? 'gif' : 'sticker'}).select().single();
    if(error) throw error;
    (tipo === 'gif' ? S.gif : S.sticker).unshift(data);
    if(pannelloEmojiAperto) apriPannelloEmoji(pannelloEmojiScheda);
    if(manda && S.aperta) mandaDaRaccolta(data);
    else toast(tipo === 'gif' ? 'GIF salvata tra le tue GIF' : 'Sticker salvato tra i tuoi');
  }catch(e){ errore(e, 'Non salvato'); }
}
async function salvaInRaccolta(m, tipo){
  try{
    const u = await urlMedia(m.media); const b = await (await fetch(u)).blob();
    salvaStickerFile(b, tipo, false);
  }catch(e){ toast('Non riesco a salvarlo.'); }
}
async function mandaDaRaccolta(x){
  const conv = S.aperta; if(!conv) return;
  if(x.tipo === 'gif'){
    /* una GIF salvata: la copio nella cartella della chat */
    const ext = estensione(x.path) || 'gif';
    const dest = conv + '/' + uuid() + '.' + ext;
    const loc = await urlFirmata(x.path);
    const m = nuovoLocale(ext === 'mp4' ? 'video' : 'foto', {media: {gif: true, locale: loc, w: 300, h: 300}});
    try{ const dims = await new Promise(ok => { if(ext === 'mp4') return ok([320, 240]); const i = new Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.onerror = () => ok([300, 300]); i.src = loc; });
      m.media.w = dims[0]; m.media.h = dims[1]; }catch(e){}
    m._avanza = .5; S.risposta = null; disegnaScrivi(); mettiInLista(m);
    try{
      const {error} = await sb.storage.from('chat').copy(x.path, dest); if(error) throw error;
      m.media.path = dest; firme.set(dest, {url: loc, scade: Date.now() + 864e5}); delete m._avanza;
      await salvaMessaggio(m);
    }catch(e){ m._stato = 'errore'; delete m._avanza; ridisegnaMessaggio(m.id); errore(e, 'GIF non inviata'); }
    return;
  }
  const m = nuovoLocale('sticker', {media: {path: x.path, w: 512, h: 512}});
  S.risposta = null; disegnaScrivi(); mettiInLista(m); suono('invio');
  try{ await salvaMessaggio(m); }catch(e){ m._stato = 'errore'; ridisegnaMessaggio(m.id); errore(e, 'Sticker non inviato'); }
}
async function mandaStickerFoss(nome){
  if(!S.aperta) return;
  const m = nuovoLocale('sticker', {media: {path: 'foss:' + nome, w: 512, h: 512}});
  S.risposta = null; disegnaScrivi(); mettiInLista(m); suono('invio');
  try{ await salvaMessaggio(m); }catch(e){ m._stato = 'errore'; ridisegnaMessaggio(m.id); errore(e, 'Sticker non inviato'); }
}
