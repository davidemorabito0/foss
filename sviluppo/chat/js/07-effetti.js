/* ======================= EFFETTI (come iMessage) ======================= */
const EFF_BOLLA = [['slam','Sbatti','💥'],['forte','Forte','📢'],['delicato','Delicato','🪶'],['inchiostro','Inchiostro invisibile','🫥']];
const EFF_SCHERMO = [['coriandoli','Coriandoli','🎊'],['palloncini','Palloncini','🎈'],['fuochi','Fuochi d’artificio','🎆'],['cuori','Cuori','💖'],
  ['laser','Laser','🪩'],['festa','Festa','✨'],['stella','Stella cadente','🌠'],['eco','Eco','🔁'],['riflettore','Riflettore','🔦']];
const EFF_ANIM = [['grande','Grande','🔠'],['piccolo','Piccolo','🔡'],['trema','Trema','🫨'],['annuisci','Annuisci','🙂‍↕️'],['esplodi','Esplodi','💫'],
  ['onda','Onda','🌊'],['fiorisci','Fiorisci','🌸'],['salta','Salta','🦘']];

let effScheda = 'bolla', effBozza = null;
function apriEffetti(){
  const t = el('testoIn'); const testo = t ? t.value.trim() : '';
  if(!testo){ toast('Scrivi prima il messaggio, poi scegli l’effetto.'); return; }
  effBozza = Object.assign({}, S.effettoScelto || {});
  const v = document.createElement('div'); v.className = 'velo scuro basso'; v.id = 'veloEffetti';
  v.innerHTML = '<div class="foglio eff-foglio" role="dialog" aria-label="Invia con effetto">'+
    '<div class="foglio-t">Invia con effetto<button class="ib" data-e="chiudi">'+svg('chiudi')+'</button></div>'+
    '<div class="eff-extra"><button data-e="programma">'+svg('programma', 2)+'<span><b>Invia più tardi</b><i>Scegli giorno e ora</i></span></button>'+
      '<button data-e="muto">'+svg('silenzia', 2)+'<span><b>Senza suono</b><i>Arriva senza far suonare</i></span></button></div>'+
    '<div class="eff-schede" id="effSchede"></div>'+
    '<div class="eff-anteprima" id="effAnt"></div>'+
    '<div class="eff-lista" id="effLista"></div>'+
    '<div class="foglio-f"><button class="btn" data-e="togli">Nessun effetto</button><button class="btn" data-e="tieni">Scegli e continua</button>'+
      '<button class="btn pieno" data-e="invia">Invia</button></div></div>';
  document.body.appendChild(v);
  const disegna = () => {
    el('effSchede').innerHTML = [['bolla','Bolla'],['schermo','Schermo'],['anim','Testo animato'],['stile','Stile']].map(x =>
      '<button class="'+(effScheda === x[0] ? 'on' : '')+'" data-s="'+x[0]+'">'+x[1]+'</button>').join('');
    const lista = effScheda === 'bolla' ? EFF_BOLLA : effScheda === 'schermo' ? EFF_SCHERMO : effScheda === 'anim' ? EFF_ANIM : null;
    if(lista){
      const att = effScheda === 'anim' ? effBozza.anim : effScheda === 'bolla' ? effBozza.bolla : effBozza.schermo;
      el('effLista').innerHTML = lista.map(x => '<button class="'+(att === x[0] ? 'on' : '')+'" data-k="'+x[0]+'"><span>'+x[2]+'</span>'+x[1]+'</button>').join('');
    } else {
      el('effLista').innerHTML = '<div style="grid-column:1/-1;color:var(--testo-2);font-size:13.5px;line-height:1.5">Seleziona una parte del testo e scegli lo stile. '+
        'Puoi anche scrivere tu i simboli: *grassetto*, _corsivo_, ~barrato~, ```monospazio```.</div>'+
        [['*','<b>Grassetto</b>'],['_','<i>Corsivo</i>'],['~','<s>Barrato</s>'],['```','<code>Mono</code>']].map(x =>
          '<button data-f="'+x[0]+'">'+x[1]+'</button>').join('');
    }
    const testoOra = (el('testoIn') || {}).value || testo;
    el('effAnt').innerHTML = '<div class="bolla'+(effBozza.bolla ? ' eff-' + effBozza.bolla : '')+'" style="max-width:80%">'+
      '<div class="testo'+(effBozza.anim ? ' anim-' + effBozza.anim : '')+'">'+(effBozza.anim ? testoAnimato(testoOra, effBozza.anim) : formatta(testoOra))+'</div>'+
      '<span class="meta">'+ora(new Date())+'</span>'+(effBozza.bolla === 'inchiostro' ? '<span class="polvere"><canvas data-polvere="1"></canvas></span>' : '')+'</div>';
    $$('canvas[data-polvere]', el('effAnt')).forEach(polvere);
  };
  disegna();
  v.onclick = e => {
    if(e.target === v) return chiudi();
    const s = e.target.closest('[data-s]'); if(s){ effScheda = s.dataset.s; disegna(); return; }
    const k = e.target.closest('[data-k]');
    if(k){
      const chiave = effScheda === 'anim' ? 'anim' : effScheda;
      if(chiave === 'anim') effBozza.anim = effBozza.anim === k.dataset.k ? undefined : k.dataset.k;
      else { const gia = effBozza[chiave] === k.dataset.k; delete effBozza.bolla; delete effBozza.schermo; if(!gia) effBozza[chiave] = k.dataset.k; }
      disegna();
      if(effScheda === 'schermo' && effBozza.schermo) effettoSchermo(effBozza.schermo, {testo: testo, el: $('.bolla', el('effAnt'))});
      return;
    }
    const f = e.target.closest('[data-f]'); if(f){ applicaStile(f.dataset.f); disegna(); return; }
    const b = e.target.closest('[data-e]'); if(!b) return;
    const a = b.dataset.e;
    if(a === 'chiudi') return chiudi();
    if(a === 'togli'){ S.effettoScelto = null; chiudi(); aggiornaSegnoEffetto(); return; }
    const pulito = {}; ['bolla','schermo','anim'].forEach(x => { if(effBozza[x]) pulito[x] = effBozza[x]; });
    S.effettoScelto = Object.keys(pulito).length ? pulito : null;
    chiudi(); aggiornaSegnoEffetto();
    if(a === 'invia') mandaTesto();
    if(a === 'programma') programmaInvio();
    if(a === 'muto') mandaTesto({muto: true});
  };
  function chiudi(){ v.remove(); }
}
function aggiornaSegnoEffetto(){
  const e = el('effettiB'); if(e) e.classList.toggle('on', !!S.effettoScelto);
  const b = el('mandaB'); if(b){ const s = b.querySelector('.effetto-segno'); if(S.effettoScelto && !s) b.insertAdjacentHTML('beforeend', '<span class="effetto-segno">'+svg('effetti', 2.4)+'</span>'); if(!S.effettoScelto && s) s.remove(); }
  aggiornaTastoManda();
}
function applicaStile(seg){
  const t = el('testoIn'); if(!t) return;
  const a = t.selectionStart, b = t.selectionEnd, v = t.value;
  if(a === b){
    /* niente selezionato: avvolgo la parola dove sta il cursore, o tutto */
    t.value = seg + v + seg;
  } else t.value = v.slice(0, a) + seg + v.slice(a, b) + seg + v.slice(b);
  adatta(t); aggiornaTastoManda();
}

/* ---------- inchiostro invisibile: la polvere che si muove ---------- */
function polvere(cv){
  if(cv._vivo) return; cv._vivo = true;
  const g = cv.getContext('2d');
  const box = cv.parentNode.parentNode;
  const W = cv.width = Math.max(40, box.offsetWidth), H = cv.height = Math.max(30, box.offsetHeight);
  const pt = []; const n = Math.min(500, Math.round(W * H / 40));
  for(let i = 0; i < n; i++) pt.push({x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: Math.random() * 1.2 + .4});
  const scuro = document.documentElement.getAttribute('data-tema') === 'scuro';
  const giro = () => {
    if(!document.body.contains(cv)){ return; }
    const svelato = box.classList.contains('svelato');
    g.clearRect(0, 0, W, H);
    if(!svelato){
      g.fillStyle = scuro ? 'rgba(233,237,239,.75)' : 'rgba(17,27,33,.55)';
      pt.forEach(p => { p.x += p.vx; p.y += p.vy; if(p.x < 0 || p.x > W) p.vx *= -1; if(p.y < 0 || p.y > H) p.vy *= -1; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); });
    }
    requestAnimationFrame(giro);
  };
  giro();
}
function svela(b){
  if(!b.classList.contains('eff-inchiostro')) return;
  b.classList.add('svelato');
  clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('svelato'), 8000);
}

/* ---------- effetti a tutto schermo ---------- */
function eseguiEffettoSchermo(m){
  segnaVisto(m.id);
  const n = $('.msg[data-id="'+m.id+'"] .bolla');
  effettoSchermo(m.media.schermo, {testo: m.testo || '', el: n});
}
function effettoSchermo(nome, o){
  o = o || {};
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const vecchio = el('effSchermo'); if(vecchio) vecchio.remove();
  if(nome === 'riflettore') return riflettore(o.el);
  if(nome === 'eco') return eco(o.testo, o.el);
  const c = document.createElement('canvas'); c.className = 'eff-schermo'; c.id = 'effSchermo';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth, H = window.innerHeight;
  c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px';
  document.body.appendChild(c);
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  let buio = null;
  if(nome === 'fuochi' || nome === 'laser'){ buio = document.createElement('div'); buio.className = 'eff-buio'; document.body.appendChild(buio); }
  const durata = {coriandoli: 4200, palloncini: 5200, fuochi: 4200, cuori: 4200, laser: 3800, festa: 3600, stella: 3400}[nome] || 4000;
  const R = Math.random, P = [];
  const COL = ['#ff3b5c','#ffad01','#00c2a8','#4f8cff','#b36bff','#ffd23f','#ff7ac6','#25d366'];
  const inizio = performance.now();
  const r0 = o.el && o.el.getBoundingClientRect ? o.el.getBoundingClientRect() : {left: W / 2, top: H / 2, width: 0, height: 0};
  const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  if(nome === 'coriandoli') for(let i = 0; i < 220; i++) P.push({x: R() * W, y: -R() * H * .8 - 20, w: 6 + R() * 7, h: 9 + R() * 9, vy: 2 + R() * 3.5, vx: (R() - .5) * 2, a: R() * 6, va: (R() - .5) * .25, c: COL[i % COL.length], f: R() * 6});
  if(nome === 'palloncini') for(let i = 0; i < 28; i++) P.push({x: R() * W, y: H + 60 + R() * H * .9, r: 26 + R() * 20, vy: 2.2 + R() * 2, f: R() * 6, c: COL[i % COL.length]});
  if(nome === 'cuori') for(let i = 0; i < 46; i++) P.push({x: R() * W, y: H + 40 + R() * H, s: 14 + R() * 30, vy: 2 + R() * 3, f: R() * 6, c: ['#ff3b5c','#ff7ac6','#e0245e','#ff9ab0'][i % 4]});
  if(nome === 'festa') for(let i = 0; i < 160; i++){ const an = Math.PI * (.55 + R() * .45), v = 6 + R() * 12; P.push({x: W - 10, y: 10, vx: Math.cos(an) * v * -1, vy: Math.sin(an) * v, r: 1.5 + R() * 2.5, t: R() * 400, c: ['#ffd23f','#ffe9a3','#ffad01','#fff'][i % 4]}); }
  const razzi = [];
  const scoppia = (x, y) => { const col = COL[Math.floor(R() * COL.length)], n = 70; for(let i = 0; i < n; i++){ const an = i / n * 6.283, v = 2 + R() * 4.5; P.push({x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vita: 1, c: R() < .2 ? '#fff' : col}); } };
  if(nome === 'fuochi') for(let i = 0; i < 7; i++) razzi.push({x: W * (.15 + R() * .7), y: H + 10, ty: H * (.15 + R() * .35), t: i * 420, partito: false});
  const cuore = (x, y, s) => { g.beginPath(); g.moveTo(x, y + s * .3); g.bezierCurveTo(x, y, x - s * .5, y, x - s * .5, y + s * .3); g.bezierCurveTo(x - s * .5, y + s * .6, x, y + s * .78, x, y + s);
    g.bezierCurveTo(x, y + s * .78, x + s * .5, y + s * .6, x + s * .5, y + s * .3); g.bezierCurveTo(x + s * .5, y, x, y, x, y + s * .3); g.fill(); };
  const giro = ora => {
    const t = ora - inizio;
    g.clearRect(0, 0, W, H);
    const svanisce = Math.max(0, Math.min(1, (durata - t) / 600));
    g.globalAlpha = svanisce;
    if(nome === 'coriandoli') P.forEach(p => { p.y += p.vy; p.x += p.vx + Math.sin(t / 300 + p.f) * .8; p.a += p.va;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.scale(1, Math.cos(t / 160 + p.f)); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); });
    if(nome === 'palloncini') P.forEach(p => { p.y -= p.vy; const x = p.x + Math.sin(t / 600 + p.f) * 18;
      g.strokeStyle = 'rgba(160,160,160,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, p.y + p.r * 1.15); g.quadraticCurveTo(x - 8, p.y + p.r * 1.8, x + 4, p.y + p.r * 2.6); g.stroke();
      g.fillStyle = p.c; g.beginPath(); g.ellipse(x, p.y, p.r * .85, p.r, 0, 0, 6.283); g.fill();
      g.beginPath(); g.moveTo(x - 5, p.y + p.r + 6); g.lineTo(x + 5, p.y + p.r + 6); g.lineTo(x, p.y + p.r - 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x - p.r * .3, p.y - p.r * .35, p.r * .18, p.r * .3, -.5, 0, 6.283); g.fill(); });
    if(nome === 'cuori'){
      const k = Math.min(1, t / 600), batte = 1 + Math.sin(t / 140) * .06;
      if(t < 2600){ g.fillStyle = '#ff2d55'; const s = 160 * k * batte; cuore(cx, cy - s / 2, s); }
      P.forEach(p => { p.y -= p.vy; g.fillStyle = p.c; cuore(p.x + Math.sin(t / 500 + p.f) * 14, p.y, p.s); });
    }
    if(nome === 'festa') P.forEach(p => { if(t < p.t) return; p.x += p.vx; p.y += p.vy; p.vy += .12; p.vx *= .99;
      g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + Math.sin(t / 60 + p.t) * .3), 0, 6.283); g.fill(); });
    if(nome === 'fuochi'){
      razzi.forEach(r => { if(t < r.t || r.fatto) return; r.y -= 9; g.fillStyle = '#fff'; g.fillRect(r.x - 1.5, r.y, 3, 10); if(r.y <= r.ty){ r.fatto = true; scoppia(r.x, r.y); } });
      P.forEach(p => { if(p.vita <= 0) return; p.x += p.vx; p.y += p.vy; p.vy += .05; p.vx *= .985; p.vy *= .985; p.vita -= .012;
        g.globalAlpha = Math.max(0, p.vita) * svanisce; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 2.2, 0, 6.283); g.fill(); });
      g.globalAlpha = svanisce;
    }
    if(nome === 'laser'){
      g.globalCompositeOperation = 'lighter';
      for(let i = 0; i < 6; i++){
        const an = t / 700 + i * 1.05, ox = W / 2, oy = H + 20;
        g.strokeStyle = ['#ff2d95','#00e5ff','#7cff4f','#ffd60a','#9b5cff','#ff6b2d'][i]; g.lineWidth = 6; g.shadowBlur = 25; g.shadowColor = g.strokeStyle;
        g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(an) * W * 1.4, oy - Math.abs(Math.sin(an)) * H * 1.4); g.stroke();
      }
      g.shadowBlur = 0; g.globalCompositeOperation = 'source-over';
    }
    if(nome === 'stella'){
      const k = Math.min(1, t / 1500), x = -60 + (W + 120) * k, y = H * .3 + Math.sin(k * 3.14) * -H * .12;
      for(let i = 0; i < 26; i++){ const kk = Math.max(0, k - i * .012), xx = -60 + (W + 120) * kk, yy = H * .3 + Math.sin(kk * 3.14) * -H * .12;
        g.fillStyle = 'rgba(255,230,140,' + (1 - i / 26) * .8 + ')'; g.beginPath(); g.arc(xx, yy, 8 - i * .28, 0, 6.283); g.fill(); }
      g.fillStyle = '#fff6c8'; stellina(g, x, y, 20, t / 200);
      if(k >= 1 && !P.fatto){ P.fatto = true; for(let i = 0; i < 60; i++){ const an = R() * 6.283, v = 1 + R() * 4; P.push({x: W - 40, y: H * .3, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vita: 1}); } }
      P.forEach(p => { if(!p.vita) return; p.x += p.vx; p.y += p.vy; p.vita = Math.max(0, p.vita - .015); g.fillStyle = 'rgba(255,240,170,' + p.vita + ')'; stellina(g, p.x, p.y, 4, p.vita * 6); });
    }
    g.globalAlpha = 1;
    if(t < durata) requestAnimationFrame(giro);
    else { c.remove(); if(buio) buio.remove(); }
  };
  requestAnimationFrame(giro);
  try{ navigator.vibrate && navigator.vibrate(nome === 'fuochi' ? [30, 60, 30] : 20); }catch(e){}
}
function stellina(g, x, y, r, rot){
  g.beginPath();
  for(let i = 0; i < 10; i++){ const a = rot + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}
function riflettore(bolla){
  const r = bolla && bolla.getBoundingClientRect ? bolla.getBoundingClientRect() : {left: innerWidth / 2 - 60, top: innerHeight / 2 - 30, width: 120, height: 60};
  const d = document.createElement('div'); d.className = 'eff-riflettore';
  const x = r.left + r.width / 2, y = r.top + r.height / 2, rad = Math.max(r.width, r.height) * .75 + 30;
  d.style.background = 'radial-gradient(circle at '+x+'px '+y+'px, transparent '+rad+'px, rgba(0,0,0,.82) '+(rad + 40)+'px)';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3700);
}
function eco(testo, bolla){
  const stile = bolla ? getComputedStyle(bolla) : null;
  const sfondo = stile ? stile.backgroundColor : 'var(--mio)', col = stile ? stile.color : 'var(--testo)';
  const t = String(testo || '').slice(0, 40);
  for(let i = 0; i < 26; i++){
    const n = document.createElement('div'); n.className = 'eff-eco'; n.textContent = t;
    n.style.background = sfondo; n.style.color = col;
    const y = Math.random() * (innerHeight - 40), dir = Math.random() < .5 ? -1 : 1;
    n.style.top = y + 'px'; n.style.left = (dir > 0 ? -300 : innerWidth + 20) + 'px';
    document.body.appendChild(n);
    const dist = (innerWidth + 320) * dir;
    n.animate([{transform: 'translateX(0) scale(' + (.7 + Math.random() * .6) + ')', opacity: 0}, {opacity: 1, offset: .15}, {opacity: 1, offset: .85},
               {transform: 'translateX(' + dist + 'px) scale(1)', opacity: 0}], {duration: 1800 + Math.random() * 1400, delay: i * 70, easing: 'ease-in-out', fill: 'both'})
      .onfinish = () => n.remove();
  }
}
