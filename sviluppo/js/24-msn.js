/* ======================= FOSS.chat 2.4: le idee di MSN =======================
   1) messaggio personale sotto il nome   2) «è appena entrato»
   3) la cornice della foto (ognuno la sua)   4) sfondi animati che reagiscono al colpetto */

/* ---------- 1. messaggio personale ---------- */
function fraseDi(id){ const p = S.persone.get(id); return (p && (p.frase || '').trim()) || ''; }
function aggiornaMe(){
  const me = S.persone.get(S.io); if(!me) return;
  me.frase = (S.cfg.frase || '').trim().slice(0, 140);
  me.cornice = CORNICI.some(x => x.id === S.cfg.cornice) ? S.cfg.cornice : '';
}
function salvaFrase(v){
  v = String(v || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  if(v === (S.cfg.frase || '')) return;
  cambiaCfg('frase', v); aggiornaMe();
  toast(v ? 'Messaggio personale salvato' : 'Messaggio personale tolto');
  disegnaListaPresto(); aggiornaTestaConv();
}

/* ---------- 3. la cornice della foto ---------- */
function scegliCornice(id){
  cambiaCfg('cornice', id === 'nessuna' ? '' : id); aggiornaMe();
  disegnaImpostazioni(); disegnaListaPresto(); aggiornaTestaConv();
  document.querySelectorAll('#railMe').forEach(b => { b.innerHTML = avatar(S.io); });
}
function corniciHTML(){
  const mia = S.cfg.cornice || '';
  return '<div class="cornici">'+[{id:'nessuna', nome:'Nessuna'}].concat(CORNICI).map(x =>
    '<button class="cornice-b'+((x.id === 'nessuna' ? !mia : mia === x.id) ? ' on' : '')+'" data-a="cornice" data-v="'+x.id+'">'+
      '<span class="cornice-av">'+avatar(S.io, 'cr-' + x.id, false, 'width:46px;height:46px')+'</span>'+
      '<span>'+esc(x.nome)+'</span></button>').join('')+'</div>';
}

/* ---------- 2. «è appena entrato» ---------- */
let onlinePronto = 0;              // da quando ascolto: i primi secondi non conto chi c'era già
const entratoIl = new Map();       // una volta ogni 15 minuti per persona
function conosco(id){
  if(S.contatti.includes(id)) return true;
  let si = false; S.convs.forEach(c => { if(!si && (c.membri || []).some(m => m.id === id)) si = true; });
  return si;
}
function notaEntrati(prima, ora){
  if(!onlinePronto || Date.now() - onlinePronto < 6000 || S.cfg.entrati === false) return;
  ora.forEach(id => {
    if(id === S.io || prima.has(id) || !conosco(id)) return;
    const t = entratoIl.get(id) || 0; if(Date.now() - t < 15 * 60000) return;
    entratoIl.set(id, Date.now());
    mostraEntrato(id);
  });
}
function mostraEntrato(id){
  let box = el('entrati');
  if(!box){ box = document.createElement('div'); box.id = 'entrati'; document.body.appendChild(box); }
  const f = fraseDi(id);
  const n = document.createElement('button');
  n.className = 'entrato'; n.dataset.a = 'scrivi-a'; n.dataset.id = id;
  n.innerHTML = avatar(id, '', false)+'<span class="et"><b>'+esc(nomeLungo(id))+'</b><span>è appena entrato</span>'+(f ? '<i>'+esc(f)+'</i>' : '')+'</span>';
  box.appendChild(n);
  while(box.children.length > 3) box.firstChild.remove();
  suono('entrato');
  requestAnimationFrame(() => n.classList.add('dentro'));
  setTimeout(() => { n.classList.remove('dentro'); setTimeout(() => n.remove(), 400); }, 5500);
}

/* ---------- 4. sfondi animati ---------- */
const VIVI = [
  {id:'', nome:'Nessuno'}, {id:'bolle', nome:'Bolle'}, {id:'stelle', nome:'Stelle'},
  {id:'neve', nome:'Neve'}, {id:'lucciole', nome:'Lucciole'}, {id:'coriandoli', nome:'Coriandoli'}
];
const VV = {tipo: '', cv: null, ctx: null, p: [], w: 0, h: 0, raf: 0, ultimo: 0, scossa: 0, ro: null, colori: null};
function vivoScelto(){ return VIVI.some(x => x.id && x.id === S.cfg.vivo) ? S.cfg.vivo : ''; }
function fermaVivo(){
  cancelAnimationFrame(VV.raf); VV.raf = 0;
  if(VV.ro) try{ VV.ro.disconnect(); }catch(e){}
  VV.ro = null;
  if(VV.cv) VV.cv.remove();
  VV.cv = null; VV.ctx = null; VV.p = []; VV.tipo = '';
}
function avviaVivo(){
  const w = $('.msgs-wrap', el('conv'));
  const tipo = vivoScelto();
  if(!w || !tipo){ fermaVivo(); return; }
  if(VV.cv && VV.cv.parentNode === w && VV.tipo === tipo){ leggiColoriVivo(); return; }
  fermaVivo();
  const cv = document.createElement('canvas'); cv.className = 'sfondo-vivo'; cv.setAttribute('aria-hidden', 'true');
  w.insertBefore(cv, w.firstChild);
  VV.cv = cv; VV.ctx = cv.getContext('2d'); VV.tipo = tipo;
  leggiColoriVivo(); misuraVivo();
  try{ VV.ro = new ResizeObserver(misuraVivo); VV.ro.observe(w); }catch(e){}
  VV.ultimo = 0; VV.raf = requestAnimationFrame(passoVivo);
}
function leggiColoriVivo(){
  const s = getComputedStyle(document.documentElement);
  VV.colori = {acc: s.getPropertyValue('--verde').trim() || '#FFAD01', testo: s.getPropertyValue('--testo').trim() || '#fff',
    scuro: document.documentElement.getAttribute('data-tema') === 'scuro'};
}
function misuraVivo(){
  if(!VV.cv) return;
  const r = VV.cv.parentNode.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
  VV.w = Math.max(1, r.width); VV.h = Math.max(1, r.height);
  VV.cv.width = Math.round(VV.w * d); VV.cv.height = Math.round(VV.h * d);
  VV.ctx.setTransform(d, 0, 0, d, 0, 0);
  const n = {bolle: 26, stelle: 70, neve: 60, lucciole: 22, coriandoli: 46}[VV.tipo] || 30;
  const area = Math.min(1.6, (VV.w * VV.h) / (900 * 700));
  VV.p = Array.from({length: Math.max(10, Math.round(n * area))}, () => nuovaParticella(true));
}
const rnd = (a, b) => a + Math.random() * (b - a);
function nuovaParticella(ovunque){
  const W = VV.w, H = VV.h, t = VV.tipo;
  if(t === 'bolle') return {x: rnd(0, W), y: ovunque ? rnd(0, H) : H + 20, r: rnd(4, 18), vx: rnd(-.15, .15), vy: rnd(-.6, -.25), f: rnd(0, 6.28)};
  if(t === 'stelle') return {x: rnd(0, W), y: rnd(0, H), r: rnd(.6, 1.8), vx: rnd(-.05, .05), vy: rnd(-.03, .03), f: rnd(0, 6.28), v: rnd(.01, .04)};
  if(t === 'neve') return {x: rnd(0, W), y: ovunque ? rnd(0, H) : -10, r: rnd(1, 3.4), vx: rnd(-.3, .3), vy: rnd(.3, 1.1), f: rnd(0, 6.28)};
  if(t === 'lucciole') return {x: rnd(0, W), y: rnd(0, H), r: rnd(1.5, 3), vx: rnd(-.3, .3), vy: rnd(-.3, .3), f: rnd(0, 6.28), v: rnd(.02, .05)};
  const pal = ['#FFAD01', '#FF5E7E', '#3EA6FF', '#4CD964', '#B27BFF', '#FFD84D'];
  return {x: rnd(0, W), y: ovunque ? rnd(0, H) : -10, r: rnd(3, 6), vx: rnd(-.4, .4), vy: rnd(.4, 1.2), f: rnd(0, 6.28), v: rnd(-.08, .08), c: pal[Math.floor(Math.random() * pal.length)]};
}
/* il colpetto: lo sfondo fa un salto (come i «dynamic backgrounds» di MSN col trillo) */
function vivoScossa(){
  if(!VV.cv) return;
  VV.scossa = 1;
  const cx = VV.w / 2, cy = VV.h / 2;
  VV.p.forEach(p => { const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1; p.vx += dx / d * rnd(2, 5); p.vy += dy / d * rnd(2, 5); });
  if(!VV.raf) VV.raf = requestAnimationFrame(passoVivo);
}
const fermo = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function passoVivo(ts){
  VV.raf = 0;
  if(!VV.cv || !VV.cv.isConnected) return fermaVivo();
  if(document.visibilityState !== 'visible'){ VV.raf = requestAnimationFrame(passoVivo); return; }
  if(ts - VV.ultimo < 32){ VV.raf = requestAnimationFrame(passoVivo); return; }   // ~30 al secondo
  VV.ultimo = ts;
  const g = VV.ctx, W = VV.w, H = VV.h, C = VV.colori, t = VV.tipo, s = VV.scossa;
  g.clearRect(0, 0, W, H);
  if(s > .02){ g.fillStyle = C.acc; g.globalAlpha = s * .12; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  VV.p.forEach((p, i) => {
    p.f += .02;
    if(t === 'bolle'){ p.x += p.vx + Math.sin(p.f) * .25; p.y += p.vy; if(p.y < -30) VV.p[i] = nuovaParticella(false);
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.strokeStyle = C.acc; g.globalAlpha = .28; g.lineWidth = 1.4; g.stroke();
      g.beginPath(); g.arc(p.x - p.r * .35, p.y - p.r * .35, p.r * .22, 0, 6.283); g.fillStyle = C.testo; g.globalAlpha = .18; g.fill(); }
    else if(t === 'stelle'){ p.x += p.vx; p.y += p.vy; const a = .25 + .55 * (.5 + .5 * Math.sin(p.f * (p.v * 50)));
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fillStyle = i % 5 ? C.testo : C.acc; g.globalAlpha = a * (C.scuro ? 1 : .6); g.fill(); }
    else if(t === 'neve'){ p.x += p.vx + Math.sin(p.f) * .3; p.y += p.vy; if(p.y > H + 10) VV.p[i] = nuovaParticella(false);
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fillStyle = C.scuro ? '#ffffff' : C.acc; g.globalAlpha = C.scuro ? .55 : .35; g.fill(); }
    else if(t === 'lucciole'){ p.vx += rnd(-.03, .03); p.vy += rnd(-.03, .03); p.vx *= .98; p.vy *= .98; p.x += p.vx; p.y += p.vy;
      const a = .35 + .5 * (.5 + .5 * Math.sin(p.f * (p.v * 40)));
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6); gr.addColorStop(0, C.acc); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = a * .5; g.fillStyle = gr; g.fillRect(p.x - p.r * 6, p.y - p.r * 6, p.r * 12, p.r * 12);
      g.globalAlpha = a; g.beginPath(); g.arc(p.x, p.y, p.r * .7, 0, 6.283); g.fillStyle = C.acc; g.fill(); }
    else { p.x += p.vx + Math.sin(p.f) * .4; p.y += p.vy; p.f += p.v; if(p.y > H + 10) VV.p[i] = nuovaParticella(false);
      g.save(); g.translate(p.x, p.y); g.rotate(p.f); g.fillStyle = p.c; g.globalAlpha = .5; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore(); }
    // rientrano dai bordi
    if(p.x < -40) p.x = W + 30; else if(p.x > W + 40) p.x = -30;
    if((t === 'stelle' || t === 'lucciole') && (p.y < -40 || p.y > H + 40)) p.y = (p.y + H) % H;
    // dopo il colpetto rallentano piano piano
    if(s > .02 || Math.abs(p.vx) > 2 || Math.abs(p.vy) > 2){ p.vx *= .93; p.vy *= .93;
      if(t === 'bolle' && p.vy > -.25) p.vy = Math.min(p.vy, -.25 + (p.vy + .25) * .9);
      if((t === 'neve' || t === 'coriandoli') && p.vy < .3) p.vy += .05; }
  });
  g.globalAlpha = 1;
  VV.scossa = s * .94;
  if(fermo() && VV.scossa < .02) return;   // movimento ridotto: un fotogramma e basta
  VV.raf = requestAnimationFrame(passoVivo);
}
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible' && VV.cv && !VV.raf) VV.raf = requestAnimationFrame(passoVivo); });
function vivoHTML(){
  const mio = vivoScelto();
  return '<div class="opz vivi">'+VIVI.map(x => '<button class="'+(mio === x.id ? 'on' : '')+'" data-a="vivo" data-v="'+x.id+'">'+esc(x.nome)+'</button>').join('')+'</div>'+
    '<div style="padding:0 20px 12px;font-size:13px;color:var(--testo-2)">Si muove dietro ai messaggi e fa un salto quando arriva un colpetto.</div>';
}
