/* ======================= SFONDO DELLE CHAT ======================= */
const COLORI_SFONDO = ['#0b141a','#000000','#1f2c34','#123524','#2a1f3d','#13263a','#3b2a20','#4a1f2a','#efeae2','#dfe9f3','#f7e7d4','#e3f1e1','#f3e1ef','#ffffff'];
/* lo sfondo di una chat: il suo (se l'hai scelto), altrimenti quello di tutte */
function sfondoPer(conv){
  const x = conv && (S.cfg.sfondiChat || {})[conv];
  if(x && (x.f || x.c)) return {f: x.f || null, c: x.c || null, proprio: true};
  return {f: S.cfg.sfondoFoto || null, c: S.cfg.sfondo || null, proprio: false};
}
async function applicaSfondoConv(){
  const w = $('.msgs-wrap', el('conv')), M = el('msgs'); if(!w || !S.aperta) return;
  applicaStileGruppo();
  const conv = S.aperta, sf = sfondoPer(conv);
  /* v2.6: la palette del gruppo vale per tutti (salvo uno sfondo che ti sei scelto tu per questa chat) */
  const st = stileDi(S.convs.get(conv)), pal = !sf.proprio && st && st.palette ? sfondoPalette(st.palette) : null;
  if(M){ M.style.backgroundImage = pal ? pal.img : ''; M.style.backgroundSize = pal ? '240px' : ''; }
  w.style.backgroundColor = pal ? pal.fondo : (sf.c || '');
  w.classList.toggle('con-foto', !pal && !!sf.f);
  if(M) M.classList.toggle('niente-doodle', !pal && (S.cfg.doodle === false || !!sf.f));
  if(pal){ w.style.backgroundImage = ''; w.style.setProperty('--buio', '0'); avviaVivo(); return; }
  avviaVivo();
  w.style.setProperty('--buio', sf.f ? String(S.cfg.sfondoBuio == null ? .25 : S.cfg.sfondoBuio) : '0');
  if(sf.f){
    const u = await urlFirmata(sf.f);
    if(S.aperta === conv) w.style.backgroundImage = u ? 'url("' + u + '")' : '';
  } else w.style.backgroundImage = '';
}
function scegliSfondoFoto(conv){
  scegliFile('image/*', false, async f => {
    try{
      const im = await decodifica(f[0]); const [w, h] = lato(im), k = Math.min(1, 2000 / Math.max(w, h));
      const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      const b = await versoBlob(c, 'image/jpeg', .86);
      const path = 'sticker/' + S.io + '/sfondo-' + uuid() + '.jpg';
      toast('Imposto lo sfondo…');
      await caricaFile(path, b);
      firme.set(path, {url: URL.createObjectURL(b), scade: Date.now() + 864e5});
      const vecchia = conv ? ((S.cfg.sfondiChat || {})[conv] || {}).f : S.cfg.sfondoFoto;
      if(conv){ const sc = Object.assign({}, S.cfg.sfondiChat || {}); sc[conv] = {f: path}; cambiaCfg('sfondiChat', sc); }
      else cambiaCfg('sfondoFoto', path);
      if(vecchia && !stessaFotoUsata(vecchia)) sb.storage.from('chat').remove([vecchia]).catch(() => {});
      applicaSfondoConv(); disegnaImpostazioni(); if(infoAperta) disegnaInfo();
      toast(conv ? 'Sfondo di questa chat cambiato' : 'Sfondo cambiato per tutte le chat');
    }catch(e){ errore(e, 'Sfondo non cambiato'); }
  });
}
function stessaFotoUsata(p){ return S.cfg.sfondoFoto === p || Object.values(S.cfg.sfondiChat || {}).some(x => x && x.f === p); }
function scegliSfondoColore(conv){
  const att = sfondoPer(conv).c;
  const v = foglio(conv ? 'Colore di questa chat' : 'Colore delle chat', '<div class="opz" style="padding:6px 0">'+
    '<button class="colore'+(!att ? ' on' : '')+'" data-col="" title="Predefinito" style="background:var(--sfondo-chat)"><span style="font-size:10px">Auto</span></button>'+
    COLORI_SFONDO.map(c => '<button class="colore'+(att === c ? ' on' : '')+'" data-col="'+c+'" style="background:'+c+'"></button>').join('')+'</div>', [['Chiudi']]);
  v.querySelector('.foglio-c').onclick = e => {
    const b = e.target.closest('[data-col]'); if(!b) return;
    const c = b.dataset.col;
    if(conv){ const sc = Object.assign({}, S.cfg.sfondiChat || {}); sc[conv] = c ? {c} : {}; if(!c) delete sc[conv]; cambiaCfg('sfondiChat', sc); }
    else { cambiaCfg('sfondo', c); cambiaCfg('sfondoFoto', null); applicaTema(); }
    $$('[data-col]', v).forEach(x => x.classList.toggle('on', x === b));
    applicaSfondoConv(); disegnaImpostazioni(); if(infoAperta) disegnaInfo();
  };
}
function menuSfondoChat(x, y){
  const conv = infoAperta || S.aperta; if(!conv) return;
  const sf = sfondoPer(conv);
  apriMenu(x, y, [
    ['Scegli una foto', 'foto', () => scegliSfondoFoto(conv)],
    ['Un colore', 'sfondo', () => scegliSfondoColore(conv)],
    sf.proprio ? ['Come le altre chat', 'aggiorna', () => { const sc = Object.assign({}, S.cfg.sfondiChat || {}); const v = sc[conv]; delete sc[conv]; cambiaCfg('sfondiChat', sc);
      if(v && v.f && !stessaFotoUsata(v.f)) sb.storage.from('chat').remove([v.f]).catch(() => {}); applicaSfondoConv(); if(infoAperta) disegnaInfo(); }] : null,
  ].filter(Boolean));
}
/* l'anteprima nelle impostazioni */
function anteprimaSfondoHTML(){
  const sf = sfondoPer(null);
  return '<div class="sf-ant" id="sfAnt" style="'+(sf.c ? 'background-color:' + sf.c + ';' : '')+'">'+
    '<div class="sf-bolla suo">Ciao! Com’è venuto il montaggio?</div><div class="sf-bolla mio">Benissimo, te lo mando 🎬</div></div>';
}
async function riempiAnteprimaSfondo(){
  const a = el('sfAnt'); if(!a) return;
  const sf = sfondoPer(null);
  if(sf.f){ const u = await urlFirmata(sf.f); a.style.backgroundImage = u ? 'linear-gradient(rgba(0,0,0,' + (S.cfg.sfondoBuio == null ? .25 : S.cfg.sfondoBuio) + '),rgba(0,0,0,' + (S.cfg.sfondoBuio == null ? .25 : S.cfg.sfondoBuio) + ')),url("' + u + '")' : ''; }
  else a.style.backgroundImage = S.cfg.doodle === false ? 'none' : 'var(--doodle-img)';
}
