/* ======================= @MENZIONI E #LAVORI MENTRE SCRIVO =======================
   @ in un gruppo: l'elenco di chi c'e' (e @tutti). # ovunque: i lavori di FOSS che vedo.
   Chi viene menzionato riceve l'avviso anche se ha silenziato il gruppo. */
function bozzaExtra(){
  if(S.modifica && S.extraModifica) return S.extraModifica;
  S.bozzeExtra = S.bozzeExtra || memoria('bozze_extra') || {};
  const k = S.aperta || '_';
  if(!S.bozzeExtra[k]) S.bozzeExtra[k] = {menz: [], lav: []};
  return S.bozzeExtra[k];
}
function salvaBozzeExtra(){
  if(!S.bozzeExtra) return;
  Object.keys(S.bozzeExtra).forEach(k => { const x = S.bozzeExtra[k]; if(!x.menz.length && !x.lav.length) delete S.bozzeExtra[k]; });
  memoria('bozze_extra', S.bozzeExtra);
}
function pulisciBozzaExtra(conv){
  if(S.bozzeExtra && S.bozzeExtra[conv]){ delete S.bozzeExtra[conv]; memoria('bozze_extra', S.bozzeExtra); }
}
function nomeMenzione(id){
  const p = S.persone.get(id) || {};
  const k = (p.nick || '').trim();
  if(k) return k.replace(/\s+/g, ' ').slice(0, 40);
  return ((p.nome || '').trim().split(/\s+/)[0] || 'Utente').slice(0, 40);
}
function senzaAccenti(t){ return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
/* dal testo che sto mandando: le menzioni e i lavori che ci sono davvero */
function raccogliExtra(testo, c, ex){
  ex = ex || bozzaExtra();
  const o = {};
  const menz = [], visti = new Set();
  ex.menz.forEach(x => { if(!visti.has(x.id) && testo.indexOf('@' + x.n) >= 0){ visti.add(x.id); menz.push({id: x.id, n: x.n}); } });
  if(menz.length) o.menzioni = menz.slice(0, 50);
  if(c && c.tipo === 'gruppo' && /(^|[\s(])@tutti(?![\p{L}\p{N}])/iu.test(testo)) o.tutti = true;
  const lav = [], vl = new Set();
  ex.lav.forEach(x => { if(!vl.has(x.id) && testo.indexOf('#' + x.n) >= 0){ vl.add(x.id); lav.push({id: x.id, org: x.org, n: x.n.slice(0, 120)}); } });
  if(lav.length) o.lavori = lav.slice(0, 10);
  return o;
}
function menzionaMe(m){
  if(!m || m.tipo !== 'testo' || m.autore === S.io || m.eliminato) return false;
  const md = m.media || {};
  return !!(md.tutti || (md.menzioni || []).some(x => x.id === S.io));
}

/* ---------- l'elenco che compare sopra la barra ---------- */
let pk = null;
function chiudiPicker(){ pk = null; const P = el('picker'); if(P){ P.innerHTML = ''; P.classList.add('nascosto'); } }
function controllaPicker(){
  const t = el('testoIn'); const c = S.convs.get(S.aperta);
  if(!t || !c || S.selezione){ chiudiPicker(); return; }
  const pos = t.selectionStart;
  if(pos == null || t.selectionStart !== t.selectionEnd){ chiudiPicker(); return; }
  const prima = t.value.slice(0, pos);
  const m = /(^|[\s(])([@#])([^\s@#]{0,40})$/.exec(prima);
  if(!m){ chiudiPicker(); return; }
  const tipo = m[2], q = m[3];
  if(tipo === '@' && c.tipo !== 'gruppo'){ chiudiPicker(); return; }
  const stesso = pk && pk.tipo === tipo && pk.da === pos - q.length - 1;
  pk = {tipo, da: pos - q.length - 1, q, i: stesso ? Math.min(pk.i, 99) : 0};
  if(tipo === '@'){
    pk.lista = candidatiMenzione(c, q);
    if(!pk.lista.length){ chiudiPicker(); return; }
  } else {
    if(!elencoLavori.dati){
      pk.lista = [{carica: true}];
      caricaElencoLavori().then(() => { if(pk && pk.tipo === '#') controllaPicker(); });
    } else {
      pk.lista = candidatiLavoro(q);
      if(doveCreare.dati && doveCreare.dati.archivi.some(a => a.spazi.length)) pk.lista.push({crea: true, nome: q});
      else if(!doveCreare.dati) caricaDoveCreare().then(() => { if(pk && pk.tipo === '#') controllaPicker(); }).catch(() => {});
      if(!pk.lista.length){ chiudiPicker(); return; }
    }
  }
  pk.i = Math.max(0, Math.min(pk.i, pk.lista.length - 1));
  disegnaPicker();
}
function candidatiMenzione(c, q){
  const qq = senzaAccenti(q);
  const l = (c.membri || []).map(x => x.id).filter(id => id !== S.io).map(id => ({id, n: nomeMenzione(id), lungo: nomeLungo(id), ruolo: (S.persone.get(id) || {}).ruolo || ''}))
    .filter(x => !qq || senzaAccenti(x.n).startsWith(qq) || senzaAccenti(x.lungo).split(/[\s()]+/).some(p => p.startsWith(qq)))
    .sort((a, b) => a.n.localeCompare(b.n));
  if((c.membri || []).length > 2 && (!qq || 'tutti'.startsWith(qq))) l.unshift({tutti: true, n: 'tutti'});
  return l.slice(0, 30);
}
function candidatiLavoro(q){
  const qq = senzaAccenti(q);
  return (elencoLavori.dati || []).filter(x => !qq || senzaAccenti(x.nome).includes(qq) || senzaAccenti(x.cliente).includes(qq))
    .sort((a, b) => (a.completato - b.completato) || (qq ? senzaAccenti(a.nome).indexOf(qq) - senzaAccenti(b.nome).indexOf(qq) : 0))
    .slice(0, 30).map(x => Object.assign({}, x, {n: String(x.nome || 'Lavoro').replace(/\s+/g, ' ').trim().slice(0, 60)}));
}
function disegnaPicker(){
  const P = el('picker'); if(!P || !pk) return;
  P.classList.remove('nascosto');
  P.innerHTML = '<div class="pk-scorre">'+pk.lista.map((x, i) => {
    const on = i === pk.i ? ' on' : '';
    if(x.carica) return '<div class="pk-voce carica"><span class="giro"></span><span class="pk-t"><b>Carico i lavori di FOSS…</b></span></div>';
    if(x.crea) return '<button class="pk-voce crea'+on+'" data-pk="'+i+'"><span class="pk-ic verde">'+svg('piu', 2.4)+'</span><span class="pk-t"><b>'+(x.nome ? 'Crea il lavoro «'+esc(x.nome)+'»' : 'Crea un nuovo lavoro')+'</b><span>Con data e location: i dettagli li completi su FOSS</span></span></button>';
    if(pk.tipo === '@'){
      if(x.tutti) return '<button class="pk-voce'+on+'" data-pk="'+i+'"><span class="pk-ic tutti">'+svg('squadra', 2)+'</span><span class="pk-t"><b>@tutti</b><span>Avvisa tutto il gruppo, anche chi l’ha silenziato</span></span></button>';
      return '<button class="pk-voce'+on+'" data-pk="'+i+'">'+avatar(x.id)+'<span class="pk-t"><b>'+esc(x.lungo)+'</b><span>'+esc(x.ruolo || '@' + x.n)+'</span></span></button>';
    }
    return '<button class="pk-voce'+on+'" data-pk="'+i+'"><span class="pk-ic lav" style="--col:'+esc(coloreLavoro(x))+'">'+svg(iconaLavoro(x), 2)+'</span>'+
      '<span class="pk-t"><b>'+esc(x.nome || 'Senza titolo')+'</b><span>'+esc([x.cliente, x.completato ? 'Consegnato' : x.prossimo ? giornoBreve(x.prossimo) : ''].filter(Boolean).join(' · '))+'</span></span></button>';
  }).join('')+'</div>';
  const on = P.querySelector('.pk-voce.on'); if(on) on.scrollIntoView({block: 'nearest'});
}
function scegliPicker(i){
  if(!pk) return;
  const x = pk.lista[i]; const t = el('testoIn'); if(!x || x.carica || !t) return;
  if(x.crea){ const nome = x.nome; togliTokenPicker(); chiudiPicker(); creaLavoro({nome}); return; }
  const tok = pk.tipo + x.n.replace(/\s+$/, '') + ' ';
  const fine = t.selectionStart;
  t.value = t.value.slice(0, pk.da) + tok + t.value.slice(fine);
  const p = pk.da + tok.length;
  const ex = bozzaExtra();
  if(pk.tipo === '@' && !x.tutti) ex.menz.push({id: x.id, n: x.n});
  if(pk.tipo === '#') ex.lav.push({id: x.id, org: x.org, n: x.n});
  salvaBozzeExtra();
  chiudiPicker();
  adatta(t); aggiornaTastoManda(); salvaBozzaPresto();
  t.focus(); try{ t.setSelectionRange(p, p); }catch(e){}
}
function togliTokenPicker(){
  const t = el('testoIn'); if(!t || !pk) return;
  const fine = t.selectionStart;
  t.value = t.value.slice(0, pk.da) + t.value.slice(fine);
  adatta(t); aggiornaTastoManda();
}
/* tasti mentre l'elenco e' aperto: su, giu', invio, tab, esc */
function tastiPicker(e){
  if(!pk || !pk.lista || !pk.lista.length) return false;
  if(e.key === 'ArrowDown'){ e.preventDefault(); pk.i = (pk.i + 1) % pk.lista.length; disegnaPicker(); return true; }
  if(e.key === 'ArrowUp'){ e.preventDefault(); pk.i = (pk.i - 1 + pk.lista.length) % pk.lista.length; disegnaPicker(); return true; }
  if((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab'){ e.preventDefault(); scegliPicker(pk.i); return true; }
  if(e.key === 'Escape'){ e.preventDefault(); chiudiPicker(); return true; }
  return false;
}

/* ---------- nel messaggio: @nomi e #lavori evidenziati ---------- */
function decoraTesto(s, md, metti){
  if(!md) return s;
  const voci = [];
  (md.menzioni || []).forEach(x => voci.push({tok: esc('@' + x.n), html: '<span class="menz'+(x.id === S.io ? ' io' : '')+'" data-a="menz" data-id="'+esc(x.id)+'">@'+esc(x.n)+'</span>'}));
  (md.lavori || []).forEach(x => voci.push({tok: esc('#' + x.n), html: '<span class="lav-chip" data-a="lavoro-chip" data-id="'+esc(x.id)+'" data-org="'+esc(x.org)+'" data-n="'+esc(x.n)+'">'+svg('lavoro', 2)+esc(x.n)+'</span>'}));
  voci.sort((a, b) => b.tok.length - a.tok.length);
  voci.forEach(v => { if(s.indexOf(v.tok) >= 0) s = s.split(v.tok).join(metti(v.html)); });
  if(md.tutti) s = s.replace(/(^|[\s(])@tutti(?![\p{L}\p{N}])/giu, (_, a) => a + metti('<span class="menz tutti'+(S.io ? ' io' : '')+'">@tutti</span>'));
  return s;
}
function menuMenzione(id, x, y){
  const c = S.convs.get(S.aperta);
  if(!id || id === S.io){ return; }
  const voci = [['Scrivi a ' + nomeDi(id), 'nuova', () => scriviA(id)]];
  if(c && (c.membri || []).some(z => z.id === id)) voci.push(['Dai un colpetto a ' + nomeDi(id), 'mano', () => colpetto(id)]);
  apriMenu(x, y, voci);
}

/* ---------- il tasto «@»: porta alle menzioni non ancora viste ---------- */
let menzDaVedere = [];
function preparaMenzioni(c){
  menzDaVedere = [];
  if(!c || !c.letto_fino) return;
  const da = new Date(c.letto_fino);
  msgVisibili(c.id).forEach(m => { if(menzionaMe(m) && new Date(m.creato_il) > da) menzDaVedere.push(m.id); });
  mostraMenz();
}
function mostraMenz(){
  const b = el('menzB'); if(!b) return;
  /* quelle gia' sullo schermo non contano piu' */
  const M = el('msgs');
  if(M && menzDaVedere.length){
    const r = M.getBoundingClientRect();
    menzDaVedere = menzDaVedere.filter(id => { const n = $('.msg[data-id="'+id+'"]', M); if(!n) return true; const q = n.getBoundingClientRect(); return !(q.top < r.bottom - 40 && q.bottom > r.top + 60); });
  }
  b.classList.toggle('nascosto', !menzDaVedere.length);
  b.innerHTML = svg('chiocciola', 2.2) + (menzDaVedere.length > 1 ? '<span class="contatore">'+menzDaVedere.length+'</span>' : '');
}
function vaiAMenzione(){
  const id = menzDaVedere.shift(); mostraMenz();
  if(id) vaiAMessaggio(id);
}
