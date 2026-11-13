/* ======================= FOSS.chat 2.6: i colori del gruppo =======================
   Chi crea il gruppo sceglie il colore primario (tasti, link, accenti), il secondario
   (le bolle dei propri messaggi, per tutti) e una delle 10 palette di dettagli dello sfondo.
   Valgono per tutti i partecipanti, sopra al tema di ognuno. */
const PALETTE = [
  {id:'notte',    nome:'Notte',    fondo:'#121A2F', c:['#FFD166', '#7C83FD', '#96BAFF', '#F1F5F9']},
  {id:'mare',     nome:'Mare',     fondo:'#0B3142', c:['#2EC4B6', '#CBF3F0', '#FFBF69', '#FF9F1C']},
  {id:'bosco',    nome:'Bosco',    fondo:'#16241B', c:['#7FB069', '#E6AA68', '#CA3C25', '#F4E8C1']},
  {id:'tramonto', nome:'Tramonto', fondo:'#2B1B2F', c:['#FF6B6B', '#FFD93D', '#FF9A8B', '#C084FC']},
  {id:'cinema',   nome:'Cinema',   fondo:'#141414', c:['#E50914', '#F5C518', '#FFFFFF', '#8A8A8A']},
  {id:'neon',     nome:'Neon',     fondo:'#0D0221', c:['#FF2A6D', '#05D9E8', '#D1F7FF', '#F9C80E']},
  {id:'agrumi',   nome:'Agrumi',   fondo:'#FFF6E0', c:['#F59E0B', '#16A34A', '#EA580C', '#FACC15']},
  {id:'pastello', nome:'Pastello', fondo:'#F6EFFA', c:['#F9A8D4', '#A5B4FC', '#86EFAC', '#FDE68A']},
  {id:'sabbia',   nome:'Sabbia',   fondo:'#EFE6D8', c:['#C2410C', '#0E7490', '#A16207', '#57534E']},
  {id:'ghiaccio', nome:'Ghiaccio', fondo:'#E8F1F8', c:['#0EA5E9', '#6366F1', '#94A3B8', '#22D3EE']}
];
const COLORI_GRUPPO = ['#FFAD01', '#FF6B6B', '#E50914', '#FF2A6D', '#C084FC', '#7C83FD', '#3EA6FF', '#2EC4B6', '#22C55E', '#7FB069', '#F59E0B', '#94A3B8'];
const COLORI_BOLLE = ['#1A3149', '#123524', '#2A1F3D', '#3B2A20', '#4A1F2A', '#0B3142', '#2B2B2B', '#FFF3D6', '#DCF8C6', '#E0E7FF', '#FCE7F3', '#FFFFFF'];

/* lo sfondo di una palette: piccoli dettagli disegnati (cerchi, anelli, triangoli, croci, onde, stelle) ripetuti */
function sfondoPalette(id){
  const p = PALETTE.find(x => x.id === id); if(!p) return null;
  const col = i => p.c[i % p.c.length];
  const pezzi = [
    [22, 30, 'cerchio'], [96, 18, 'croce'], [170, 40, 'anello'], [214, 102, 'triangolo'], [140, 98, 'onda'],
    [52, 92, 'stella'], [18, 160, 'triangolo'], [80, 150, 'anello'], [150, 172, 'cerchio'], [210, 196, 'croce'],
    [110, 220, 'stella'], [40, 214, 'onda'], [190, 140, 'cerchio'], [120, 60, 'triangolo']
  ];
  const forma = (x, y, f, c, k) => {
    const r = `transform="rotate(${(k * 37) % 360} ${x} ${y})"`;
    if(f === 'cerchio') return `<circle cx="${x}" cy="${y}" r="4.5" fill="${c}"/>`;
    if(f === 'anello') return `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${c}" stroke-width="2.4"/>`;
    if(f === 'croce') return `<path ${r} d="M${x - 6} ${y}h12M${x} ${y - 6}v12" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`;
    if(f === 'triangolo') return `<path ${r} d="M${x} ${y - 7}l7 12h-14z" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/>`;
    if(f === 'onda') return `<path ${r} d="M${x - 12} ${y}q4-6 8 0t8 0t8 0" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`;
    return `<path ${r} d="M${x} ${y - 7}l2.1 4.6 5 .5-3.8 3.3 1.1 4.9-4.4-2.6-4.4 2.6 1.1-4.9-3.8-3.3 5-.5z" fill="${c}"/>`;
  };
  const svgT = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><g opacity=".55">${pezzi.map(([x, y, f], k) => forma(x, y, f, col(k), k)).join('')}</g></svg>`;
  return {fondo: p.fondo, img: 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgT) + '")'};
}
/* colori leggibili: testo chiaro o scuro a seconda dello sfondo */
function luce(h){ const n = parseInt(h.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
function sopra(h){ return luce(h) > .36 ? '#111111' : '#FFFFFF'; }
function stileDi(c){ return c && c.tipo === 'gruppo' && c.stile && typeof c.stile === 'object' ? c.stile : null; }
function puoiColori(c){
  if(!c || c.tipo !== 'gruppo') return false;
  if(c.creata_da === S.io) return true;
  const creatoreC_e = (c.membri || []).some(m => m.id === c.creata_da);
  return !creatoreC_e && c.ruolo === 'admin';
}
/* applica i colori del gruppo alla conversazione aperta */
function applicaStileGruppo(){
  const cv = el('conv'); if(!cv) return;
  const c = S.convs.get(S.aperta), st = stileDi(c);
  const v = ['--pieno', '--su-pieno', '--verde', '--verde-forte', '--verde-chiaro', '--verde-ios', '--su-verde', '--link', '--cit-mio', '--mio', '--testo-mio', '--testo-mio-2'];
  v.forEach(k => cv.style.removeProperty(k));
  cv.classList.toggle('con-stile', !!st);
  if(!st) return;
  if(st.primario){
    const p = st.primario, su = sopra(p);
    [['--pieno', p], ['--su-pieno', su], ['--verde', p], ['--verde-forte', p], ['--verde-chiaro', p], ['--verde-ios', p], ['--su-verde', su], ['--link', p], ['--cit-mio', p]]
      .forEach(([k, x]) => cv.style.setProperty(k, x));
  }
  if(st.secondario){
    const s = st.secondario, t = sopra(s);
    cv.style.setProperty('--mio', s); cv.style.setProperty('--testo-mio', t);
    cv.style.setProperty('--testo-mio-2', t === '#FFFFFF' ? 'rgba(255,255,255,.68)' : 'rgba(0,0,0,.55)');
  }
}
/* la scheda per scegliere: primario, secondario, palette */
function scegliColoriGruppo(convId){
  const c = S.convs.get(convId); if(!c || !puoiColori(c)) return;
  const st = Object.assign({}, stileDi(c) || {});
  const tondo = (gruppo, col, on) => '<button class="colore'+(on ? ' on' : '')+'" data-g="'+gruppo+'" data-col="'+col+'" style="background:'+col+'"></button>';
  const html = () =>
    '<div class="cg">'+
    '<div class="cg-t">Colore primario <span>tasti, link e accenti</span></div><div class="opz cg-opz">'+
      COLORI_GRUPPO.map(x => tondo('primario', x, (st.primario || '').toLowerCase() === x.toLowerCase())).join('')+
      '<label class="colore libero" title="Un altro colore"><input type="color" data-g="primario" value="'+(st.primario || '#ffad01')+'">+</label></div>'+
    '<div class="cg-t">Colore secondario <span>le bolle dei messaggi di ognuno</span></div><div class="opz cg-opz">'+
      COLORI_BOLLE.map(x => tondo('secondario', x, (st.secondario || '').toLowerCase() === x.toLowerCase())).join('')+
      '<label class="colore libero" title="Un altro colore"><input type="color" data-g="secondario" value="'+(st.secondario || '#1a3149')+'">+</label></div>'+
    '<div class="cg-t">Dettagli dello sfondo</div><div class="cg-pal">'+
      PALETTE.map(p => { const s = sfondoPalette(p.id);
        return '<button class="cg-p'+(st.palette === p.id ? ' on' : '')+'" data-pal="'+p.id+'" style="background-color:'+s.fondo+';background-image:'+s.img.replace(/"/g, '&quot;')+'">'+
          '<span class="cg-pc">'+p.c.map(x => '<i style="background:'+x+'"></i>').join('')+'</span><b>'+esc(p.nome)+'</b></button>'; }).join('')+'</div>'+
    '<div class="cg-ant" id="cgAnt"><div class="sf-bolla suo">Domani alle 9 sul set?</div><div class="sf-bolla mio">Ci sono! Porto le luci 🎬</div><span class="cg-tasto">Invia</span></div>'+
    '</div>';
  const ant = v => {
    const a = $('#cgAnt', v); if(!a) return;
    const s = st.palette ? sfondoPalette(st.palette) : null;
    a.style.backgroundColor = s ? s.fondo : 'var(--sfondo-chat)'; a.style.backgroundImage = s ? s.img : 'var(--doodle-img)';
    const mio = $('.sf-bolla.mio', a); if(st.secondario){ mio.style.background = st.secondario; mio.style.color = sopra(st.secondario); } else { mio.style.background = ''; mio.style.color = ''; }
    const t = $('.cg-tasto', a); t.style.background = st.primario || 'var(--pieno)'; t.style.color = st.primario ? sopra(st.primario) : 'var(--su-pieno)';
  };
  const v = foglio('Colori del gruppo', html(), [
    ['Annulla'],
    stileDi(c) ? ['Togli i colori', () => salvaColoriGruppo(c, null)] : null,
    ['Salva per tutti', () => salvaColoriGruppo(c, st), 'pieno']
  ].filter(Boolean));
  v.querySelector('.foglio').classList.add('largo');
  const fc = v.querySelector('.foglio-c');
  fc.addEventListener('click', e => {
    const b = e.target.closest('[data-col]'), p = e.target.closest('[data-pal]');
    if(b){ const g = b.dataset.g; st[g] = st[g] === b.dataset.col ? null : b.dataset.col;
      $$('[data-g="'+g+'"][data-col]', fc).forEach(x => x.classList.toggle('on', x.dataset.col === st[g])); }
    if(p){ st.palette = st.palette === p.dataset.pal ? null : p.dataset.pal; $$('[data-pal]', fc).forEach(x => x.classList.toggle('on', x.dataset.pal === st.palette)); }
    ant(v);
  });
  fc.addEventListener('input', e => {
    const i = e.target.closest('input[type=color]'); if(!i) return;
    st[i.dataset.g] = i.value; $$('[data-g="'+i.dataset.g+'"][data-col]', fc).forEach(x => x.classList.remove('on')); ant(v);
  });
  ant(v);
}
async function salvaColoriGruppo(c, st){
  const pulito = st ? Object.fromEntries(Object.entries(st).filter(([, x]) => x)) : null;
  try{
    const {error} = await sb.rpc('chat_stile_gruppo', {p_conv: c.id, p_stile: pulito && Object.keys(pulito).length ? pulito : null});
    if(error) throw error;
    c.stile = pulito && Object.keys(pulito).length ? pulito : null;
    applicaSfondoConv(); if(infoAperta) disegnaInfo();
    toast(c.stile ? 'Colori del gruppo salvati: li vedono tutti' : 'Colori del gruppo tolti');
  }catch(e){ errore(e, 'Colori non salvati'); }
}
/* il suono: i browser lo tengono spento finché non tocchi la pagina. Al primo tocco preparo il motore
   come «audio di contorno» (non ferma la musica) e lo rimetto subito a riposo */
['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, function sblocca(){
  try{ audioDiContorno(); if(!audioCtx){ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); spegniAudioPresto(300); } }catch(e){}
}, {passive: true, once: true}));
