/* ======================= PANNELLI ======================= */
function pannelloSinistra(titolo, corpo, basso){
  chiudiPannelloSinistra();
  const p = document.createElement('div'); p.className = 'scorre'; p.id = 'pannelloSx';
  p.innerHTML = '<div class="scorre-testa'+(basso ? ' basso' : '')+'"><button class="ib" data-a="chiudi-pannello" aria-label="Indietro">'+svg('indietro')+'</button><h2>'+esc(titolo)+'</h2></div>'+
    '<div class="scorre-corpo" id="pannelloSxC">'+corpo+'</div>';
  el('lato').appendChild(p);
  return p;
}
function chiudiPannelloSinistra(){ const p = el('pannelloSx'); if(p) p.remove(); }

/* ---------- nuova chat ---------- */
function nuovaChat(){
  const p = pannelloSinistra('Nuova chat', '');
  const disegna = q => {
    q = (q || '').toLowerCase();
    const pp = S.contatti.filter(id => !q || nomeLungo(id).toLowerCase().includes(q) || ((S.persone.get(id) || {}).ruolo || '').toLowerCase().includes(q));
    el('pannelloSxC').innerHTML = '<div class="cerca" style="padding-top:10px"><label>'+svg('cerca')+'<input id="ncCerca" placeholder="Cerca un nome o un ruolo" value="'+esc(q)+'"></label></div>'+
      (q ? '' : '<button class="voce" data-a="nuovo-gruppo"><span class="ic-tondo">'+svg('gruppo')+'</span><span class="vc"><b>Nuovo gruppo</b></span></button>'+
        '<button class="voce" data-a="scrivi-a" data-id="'+S.io+'">'+avatar(S.io, '', true)+'<span class="vc"><b>'+esc(nomeLungo(S.io))+' (tu)</b><span>Scrivi a te stesso: appunti, link, prove</span></span></button>'+
        '<div class="sez-t grigio" style="padding:20px 30px 10px">Il tuo team su FOSS</div>')+
      (pp.length ? pp.map(id => '<button class="voce" data-a="scrivi-a" data-id="'+id+'">'+avatar(id, '', true)+'<span class="vc"><b>'+esc(nomeLungo(id))+'</b><span>'+
        esc(fraseDi(id) || (S.online.has(id) ? 'online' : (S.persone.get(id) || {}).ruolo || 'Nel tuo team'))+'</span></span></button>').join('')
        : '<div class="vuoto-lista">'+(q ? 'Nessuno con questo nome.' : 'Nel tuo team non c’è ancora nessuno.<br>Invita i collaboratori da FOSS: appena entrano li trovi qui.')+'</div>');
    const i = el('ncCerca'); i.oninput = () => { const pos = i.selectionStart; disegna(i.value); const n = el('ncCerca'); n.focus(); n.setSelectionRange(pos, pos); };
  };
  disegna('');
  if(!tocco()) setTimeout(() => { const i = el('ncCerca'); if(i) i.focus(); }, 200);
}
async function scriviA(id){
  chiudiPannelloSinistra(); chiudiVelo();
  let conv = null;
  S.convs.forEach(c => { if(c.tipo !== 'privata') return;
    const solo = (c.membri || []).every(m => m.id === S.io);
    if(id === S.io ? solo : (!solo && altro(c) === id)) conv = c.id; });
  if(!conv){
    try{
      const {data, error} = await sb.rpc('chat_apri_privata', {p_altro: id});
      if(error) throw error;
      conv = data;
      await caricaElenco();
    }catch(e){ return errore(e, 'Chat non aperta'); }
  }
  const e = memoria('eliminate') || {}; if(e[conv]){ delete e[conv]; memoria('eliminate', e); }
  const c = S.convs.get(conv); if(c && c.archiviata) impostaMembro(c, {archiviata: false});
  S.cerca = ''; const ci = el('cercaIn'); if(ci) ci.value = '';
  disegnaLista();
  apriConv(conv);
}

/* ---------- nuovo gruppo ---------- */
function nuovoGruppo(scelti){
  scelti = scelti || new Set();
  pannelloSinistra('Aggiungi partecipanti', '');
  const disegna = q => {
    q = (q || '').toLowerCase();
    const pp = S.contatti.filter(id => !q || nomeLungo(id).toLowerCase().includes(q));
    el('pannelloSxC').innerHTML = '<div class="chips">'+Array.from(scelti).map(id => '<span class="chip">'+avatar(id)+esc(nomeDi(id))+'<button data-togli="'+id+'">'+svg('chiudi')+'</button></span>').join('')+'</div>'+
      '<div class="cerca"><label>'+svg('cerca')+'<input id="ngCerca" placeholder="Cerca un nome" value="'+esc(q)+'"></label></div>'+
      pp.map(id => '<button class="voce'+(scelti.has(id) ? ' scelto' : '')+'" data-sce="'+id+'">'+avatar(id)+'<span class="vc"><b>'+esc(nomeLungo(id))+'</b><span>'+esc((S.persone.get(id) || {}).ruolo || '')+'</span></span><span class="spunta">'+svg('ok', 3)+'</span></button>').join('')+
      (pp.length ? '' : '<div class="vuoto-lista">Nessuno da aggiungere.</div>')+
      '<div style="height:90px"></div>'+
      (scelti.size ? '<button class="fab" style="display:grid" data-a="gruppo-avanti" aria-label="Avanti">'+svg('indietro').replace('<svg', '<svg style="transform:scaleX(-1)"')+'</button>' : '');
    const i = el('ngCerca'); i.oninput = () => { const pos = i.selectionStart; disegna(i.value); const n = el('ngCerca'); n.focus(); n.setSelectionRange(pos, pos); };
  };
  disegna('');
  el('pannelloSxC').onclick = e => {
    const s = e.target.closest('[data-sce]'); if(s){ const id = s.dataset.sce; scelti.has(id) ? scelti.delete(id) : scelti.add(id); disegna((el('ngCerca') || {}).value); return; }
    const t = e.target.closest('[data-togli]'); if(t){ scelti.delete(t.dataset.togli); disegna((el('ngCerca') || {}).value); return; }
    if(e.target.closest('[data-a="gruppo-avanti"]')){ e.stopPropagation(); gruppoNome(scelti); }
  };
}
function gruppoNome(scelti){
  let foto = null;
  pannelloSinistra('Nuovo gruppo', '<div class="profilo-big"><button class="av gruppo" id="ngFoto" style="width:160px;height:160px;font-size:14px;flex-direction:column;gap:6px;display:flex;align-items:center;justify-content:center">'+
    svg('camera', 1.6).replace('<svg', '<svg style="width:40px;height:40px"')+'<span style="font-size:12px;max-width:110px;line-height:1.3">AGGIUNGI L’IMMAGINE DEL GRUPPO</span></button></div>'+
    '<div style="padding:0 30px"><label class="campo-t"><span>Nome del gruppo</span><input id="ngNome" maxlength="80" placeholder="Es. Videoclip Il Merlo"></label>'+
    '<label class="campo-t"><span>Descrizione (facoltativa)</span><textarea id="ngDescr" rows="2" maxlength="500"></textarea></label>'+
    '<div style="color:var(--testo-2);font-size:13px;margin-top:14px">'+scelti.size+' partecipanti più te</div></div>'+
    '<div style="display:flex;justify-content:center;padding:26px"><button class="ai-manda" id="ngCrea" aria-label="Crea il gruppo">'+svg('ok', 2.6)+'</button></div>');
  el('ngFoto').onclick = () => scegliFile('image/*', false, async f => {
    try{ foto = await fotoQuadrata(f[0]); el('ngFoto').innerHTML = '<img src="'+URL.createObjectURL(foto)+'" alt="">'; }catch(e){ toast('Immagine non valida.'); }
  });
  setTimeout(() => { const n = el('ngNome'); if(n) n.focus(); }, 200);
  el('ngCrea').onclick = async () => {
    const nome = el('ngNome').value.trim();
    if(!nome){ toast('Scrivi il nome del gruppo.'); el('ngNome').focus(); return; }
    el('ngCrea').disabled = true;
    try{
      const {data: id, error} = await sb.rpc('chat_crea_gruppo', {p_nome: nome, p_membri: Array.from(scelti), p_foto: null, p_descrizione: el('ngDescr').value.trim()});
      if(error) throw error;
      if(foto){
        const nomeF = 'gruppo-' + uuid() + '.jpg';
        try{ await caricaFile(id + '/' + nomeF, foto); await sb.rpc('chat_modifica_gruppo', {p_conv: id, p_foto: nomeF}); }catch(e){ toast('Gruppo creato, ma l’immagine non è partita.'); }
      }
      await caricaElenco();
      chiudiPannelloSinistra(); disegnaLista(); apriConv(id);
    }catch(e){ el('ngCrea').disabled = false; errore(e, 'Gruppo non creato'); }
  };
}
async function fotoQuadrata(file){
  const im = await decodifica(file); const [w, h] = lato(im), l = Math.min(w, h), n = Math.min(640, l);
  const c = document.createElement('canvas'); c.width = c.height = n;
  c.getContext('2d').drawImage(im, (w - l) / 2, (h - l) / 2, l, l, 0, 0, n, n);
  return versoBlob(c, 'image/jpeg', .86);
}

/* ---------- info contatto / gruppo (a destra) ---------- */
let infoAperta = null, infoModo = 'info';
function apriInfo(modo){
  infoAperta = S.aperta; infoModo = modo || 'info';
  el('info').classList.remove('nascosto');
  disegnaInfo();
}
function chiudiInfo(){ infoAperta = null; const i = el('info'); if(i){ i.classList.add('nascosto'); i.innerHTML = ''; } }
async function disegnaInfo(){
  const I2 = el('info'); const c = S.convs.get(infoAperta); if(!I2 || !c){ chiudiInfo(); return; }
  if(infoModo === 'cerca') return disegnaCerca();
  if(infoModo === 'importanti') return disegnaImportanti();
  const gr = c.tipo === 'gruppo', a = gr ? null : altro(c), p = a ? S.persone.get(a) || {} : {};
  const admin = c.ruolo === 'admin';
  const toggle = (k, t, ic, on) => '<button class="voce" data-a="info-toggle" data-k="'+k+'"><span class="ic-sem">'+svg(ic, 1.8)+'</span><span class="vc"><b>'+t+'</b></span><span class="interr'+(on ? ' on' : '')+'"></span></button>';
  const media = msgVisibili(c.id).filter(m => !m.eliminato && (m.tipo === 'foto' || m.tipo === 'video')).slice(-9).reverse();
  let h = '<div class="scorre destra" style="position:absolute"><div class="scorre-testa basso"><button class="ib" data-a="chiudi-info" aria-label="Chiudi">'+svg('chiudi')+'</button>'+
    '<h2>'+(gr ? 'Info gruppo' : 'Info contatto')+'</h2></div><div class="scorre-corpo grigio">';
  h += '<div class="blocco profilo-big">'+(gr ? '<span data-a="'+(true ? 'foto-gruppo' : '')+'" role="button" title="Cambia immagine">'+avatarConv(c)+'</span>' : avatar(a))+
    '<h3>'+esc(nomeConv(c))+(gr ? '<button class="ib" data-a="rinomina-gruppo" title="Cambia nome">'+svg('matita', 1.8)+'</button>' : '')+'</h3>'+
    '<p>'+(gr ? 'Gruppo · ' + (c.membri || []).length + ' partecipanti' : esc(p.ruolo || ''))+'</p>'+
    (!gr && fraseDi(a) ? '<p class="frase-big">«'+esc(fraseDi(a))+'»</p>' : '')+
    (!gr ? '<p style="font-size:14px;margin-top:4px">'+esc(S.online.has(a) ? 'online' : ultimoAccesso(p.visto))+'</p>' : '')+'</div>';
  if(gr){
    h += '<div class="blocco"><div class="sez-t grigio" style="padding:16px 20px 6px;display:flex;align-items:center">Descrizione<span style="flex:1"></span>'+
      '<button class="ib piccolo" data-a="descr-gruppo" title="Modifica">'+svg('matita', 1.8)+'</button></div>'+
      '<div class="descr'+(c.descrizione ? '' : ' vuota')+'">'+(c.descrizione ? formatta(c.descrizione) : 'Aggiungi una descrizione del gruppo')+'</div>'+
      '<div style="padding:0 20px 14px;font-size:13px;color:var(--testo-2)">Creato da '+esc(c.creata_da === S.io ? 'te' : nomeDi(c.creata_da))+' il '+new Date(c.creata_il).toLocaleDateString('it-IT')+'</div></div>';
  }
  h += '<div class="blocco"><div class="sez-t grigio" style="padding:16px 20px 10px">Media e file</div>'+
    (media.length ? '<div class="grid-media">'+media.map(m => '<button data-a="vedi" data-id="'+m.id+'">'+(m.media && m.media.mini ? '<img src="'+esc(m.media.mini)+'" data-mid-g="'+m.id+'" alt="">' : '')+'</button>').join('')+'</div>'
      : '<div style="padding:0 20px 16px;color:var(--testo-2);font-size:14px">Ancora niente: foto e video della chat compariranno qui.</div>')+'</div>';
  const nFis = fissatiDi(c.id).length, nProg = S.programmati.filter(x => x.conv_id === c.id).length;
  h += '<div class="blocco">'+
    '<button class="voce" data-a="info-importanti"><span class="ic-sem">'+svg('stella', 1.8)+'</span><span class="vc"><b>Messaggi importanti</b><span>Quelli che hai segnato con la stella</span></span><span class="freccia-d">'+svg('avanti', 2)+'</span></button>'+
    (nFis ? '<button class="voce" data-a="fissati-lista"><span class="ic-sem">'+svg('spillo', 1.8)+'</span><span class="vc"><b>Messaggi fissati</b><span>'+nFis+(nFis === 1 ? ' messaggio' : ' messaggi')+'</span></span><span class="freccia-d">'+svg('avanti', 2)+'</span></button>' : '')+
    (nProg ? '<button class="voce" data-a="programmati"><span class="ic-sem">'+svg('programma', 1.8)+'</span><span class="vc"><b>Messaggi programmati</b><span>'+nProg+' in attesa</span></span><span class="freccia-d">'+svg('avanti', 2)+'</span></button>' : '')+
    (gr ? '<button class="voce" data-a="colori-gruppo"'+(puoiColori(c) ? '' : ' disabled')+'><span class="ic-sem">'+svg('sfondo', 1.8)+'</span><span class="vc"><b>Colori del gruppo</b><span>'+
      (stileDi(c) ? 'Scelti per tutti' : 'Quelli di ognuno')+(puoiColori(c) ? ' · li scegli tu' : ' · li sceglie chi ha creato il gruppo')+'</span></span>'+
      (stileDi(c) ? '<span class="cg-mini">'+[stileDi(c).primario, stileDi(c).secondario].filter(Boolean).map(x => '<i style="background:'+x+'"></i>').join('')+'</span>' : '')+'</button>' : '')+
    '<button class="voce" data-a="sfondo-chat"><span class="ic-sem">'+svg('sfondo', 1.8)+'</span><span class="vc"><b>Sfondo di questa chat</b><span>'+
      (sfondoPer(c.id).proprio ? 'Personalizzato (solo per te)' : (gr && stileDi(c) && stileDi(c).palette ? 'Quello del gruppo' : 'Come le altre chat'))+'</span></span></button></div>';
  h += '<div class="blocco">'+
    '<button class="voce" data-a="crea-lavoro"><span class="ic-sem">'+svg('lavoro', 1.8)+'</span><span class="vc"><b>Crea un lavoro di FOSS</b><span>'+(gr ? 'Con la squadra di questo gruppo' : 'Con ' + esc(nomeDi(a)))+'</span></span></button>'+
    (!gr && a !== S.io ? '<button class="voce" data-a="colpetto" data-id="'+a+'"><span class="ic-sem">'+svg('mano', 1.8)+'</span><span class="vc"><b>Dai un colpetto</b><span>Per farti notare (anche col doppio tocco sulla foto)</span></span></button>' : '')+'</div>';
  h += '<div class="blocco">'+toggle('silenziata', 'Silenzia notifiche', 'silenzia', c.silenziata)+toggle('bloccata', 'Chat privata con codice', 'lucchetto', c.bloccata)+
    toggle('fissata', 'Fissa in alto', 'fissa', c.fissata)+toggle('archiviata', 'Archiviata', 'archivio', c.archiviata)+'</div>';
  if(gr){
    const mm = (c.membri || []).slice().sort((x, y) => (x.id === S.io ? -1 : y.id === S.io ? 1 : 0) || (y.ruolo === 'admin') - (x.ruolo === 'admin') || nomeDi(x.id).localeCompare(nomeDi(y.id)));
    h += '<div class="blocco"><div class="sez-t grigio" style="padding:16px 20px 6px">'+mm.length+' partecipanti</div>'+
      (admin ? '<button class="voce" data-a="aggiungi-membri"><span class="ic-tondo">'+svg('personaPiu')+'</span><span class="vc"><b>Aggiungi partecipanti</b></span></button>' : '')+
      mm.map(x => '<button class="voce" data-a="membro" data-id="'+x.id+'">'+avatar(x.id, '', true)+'<span class="vc"><b>'+esc(x.id === S.io ? 'Tu' : nomeLungo(x.id))+'</b><span>'+
        esc((S.persone.get(x.id) || {}).ruolo || '')+'</span></span>'+(x.ruolo === 'admin' ? '<span class="tag">Amministratore</span>' : '')+'</button>').join('')+'</div>';
  } else {
    const comuni = Array.from(S.convs.values()).filter(g => g.tipo === 'gruppo' && (g.membri || []).some(x => x.id === a));
    if(comuni.length) h += '<div class="blocco"><div class="sez-t grigio" style="padding:16px 20px 6px">'+comuni.length+(comuni.length === 1 ? ' gruppo' : ' gruppi')+' in comune</div>'+
      comuni.map(g => '<button class="voce" data-a="apri" data-id="'+g.id+'">'+avatarConv(g)+'<span class="vc"><b>'+esc(nomeConv(g))+'</b><span>'+esc((g.membri || []).map(x => x.id === S.io ? 'Tu' : nomeDi(x.id)).join(', '))+'</span></span></button>').join('')+'</div>';
  }
  h += '<div class="blocco">'+
    '<button class="voce rossa" data-a="svuota-chat"><span class="ic-sem">'+svg('vietato', 1.8)+'</span><span class="vc"><b>Svuota chat</b></span></button>'+
    (gr ? '<button class="voce rossa" data-a="esci-gruppo"><span class="ic-sem">'+svg('esci', 1.8)+'</span><span class="vc"><b>Esci dal gruppo</b></span></button>'
        : '<button class="voce rossa" data-a="elimina-chat"><span class="ic-sem">'+svg('cestino', 1.8)+'</span><span class="vc"><b>Elimina chat</b></span></button>')+'</div>';
  h += '<div style="height:30px"></div></div></div>';
  I2.innerHTML = h;
  $$('img[data-mid-g]', I2).forEach(async n => { const m = trovaMsg(c.id, n.dataset.midG); const u = m && await urlMedia(m.media); if(u && m.tipo === 'foto') n.src = u; });
}
async function infoToggle(k){
  const c = S.convs.get(infoAperta); if(!c) return;
  if(k === 'bloccata') return alternaBlocco(c);
  await impostaMembro(c, {[k]: !c[k]});
  disegnaInfo();
}
function menuMembro(id, x, y){
  const c = S.convs.get(infoAperta); if(!c) return;
  const m = (c.membri || []).find(z => z.id === id); if(!m || id === S.io) return;
  const admin = c.ruolo === 'admin';
  const voci = [['Scrivi a ' + nomeDi(id), 'nuova', () => scriviA(id)], ['Dai un colpetto', 'mano', () => { if(S.aperta !== c.id) return; colpetto(id); }]];
  if(admin){
    voci.push(m.ruolo === 'admin' ? ['Togli da amministratore', 'persona', () => cambiaAdmin(c, id, false)] : ['Rendi amministratore', 'persona', () => cambiaAdmin(c, id, true)]);
    voci.push(['Rimuovi dal gruppo', 'esci', () => conferma('Rimuovere ' + nomeDi(id) + '?', 'Non vedrà più i nuovi messaggi del gruppo.', 'Rimuovi', async () => {
      const {error} = await sb.rpc('chat_togli', {p_conv: c.id, p_utente: id}); if(error) return errore(error, 'Non rimosso');
      c.membri = c.membri.filter(z => z.id !== id); disegnaInfo(); aggiornaTestaConv();
    }, true), 'rosso']);
  }
  apriMenu(x, y, voci);
}
async function cambiaAdmin(c, id, si){
  const {error} = await sb.rpc('chat_admin_si', {p_conv: c.id, p_utente: id, p_si: si}); if(error) return errore(error, 'Non cambiato');
  const m = c.membri.find(z => z.id === id); if(m) m.ruolo = si ? 'admin' : 'membro'; disegnaInfo();
}
function aggiungiMembri(){
  const c = S.convs.get(infoAperta); if(!c) return;
  const gia = new Set((c.membri || []).map(x => x.id));
  const pp = S.contatti.filter(id => !gia.has(id));
  if(!pp.length){ toast('Tutto il tuo team è già nel gruppo.'); return; }
  const scelti = new Set();
  const corpo = () => '<div style="margin:0 -24px">'+pp.map(id => '<button class="voce'+(scelti.has(id) ? ' scelto' : '')+'" data-sce="'+id+'">'+avatar(id)+'<span class="vc"><b>'+esc(nomeLungo(id))+'</b><span>'+esc((S.persone.get(id) || {}).ruolo || '')+'</span></span><span class="spunta">'+svg('ok', 3)+'</span></button>').join('')+'</div>';
  const v = foglio('Aggiungi partecipanti', corpo(), [['Annulla'], ['Aggiungi', async () => {
    if(!scelti.size) return;
    const {error} = await sb.rpc('chat_aggiungi', {p_conv: c.id, p_utenti: Array.from(scelti)}); if(error) return errore(error, 'Non aggiunti');
    await caricaElenco(); disegnaInfo(); aggiornaTestaConv();
  }, 'pieno']]);
  v.querySelector('.foglio-c').onclick = e => { const s = e.target.closest('[data-sce]'); if(!s) return; const id = s.dataset.sce; scelti.has(id) ? scelti.delete(id) : scelti.add(id); s.classList.toggle('scelto'); };
}
async function rinominaGruppo(){
  const c = S.convs.get(infoAperta); if(!c) return;
  const n = await chiediTesto('Nome del gruppo', '', 80, 'text', c.nome); if(!n || n === c.nome) return;
  const {error} = await sb.rpc('chat_modifica_gruppo', {p_conv: c.id, p_nome: n}); if(error) return errore(error, 'Nome non cambiato');
  c.nome = n; disegnaInfo(); aggiornaTestaConv(); disegnaLista();
}
async function descrGruppo(){
  const c = S.convs.get(infoAperta); if(!c) return;
  const n = await chiediTesto('Descrizione del gruppo', 'Di cosa si parla qui, link utili, date importanti.', 500, 'area', c.descrizione); if(n === null || n === c.descrizione) return;
  const {error} = await sb.rpc('chat_modifica_gruppo', {p_conv: c.id, p_descrizione: n}); if(error) return errore(error, 'Descrizione non cambiata');
  c.descrizione = n; disegnaInfo();
}
function fotoGruppo(){
  const c = S.convs.get(infoAperta); if(!c) return;
  const voci = [['Carica una foto', 'foto', () => scegliFile('image/*', false, async f => {
    try{
      const b = await fotoQuadrata(f[0]); const nomeF = 'gruppo-' + uuid() + '.jpg';
      toast('Carico l’immagine…');
      await caricaFile(c.id + '/' + nomeF, b);
      firme.set(c.id + '/' + nomeF, {url: URL.createObjectURL(b), scade: Date.now() + 864e5});
      const {error} = await sb.rpc('chat_modifica_gruppo', {p_conv: c.id, p_foto: nomeF}); if(error) throw error;
      c.foto = c.id + '/' + nomeF; disegnaInfo(); aggiornaTestaConv(); disegnaLista();
    }catch(e){ errore(e, 'Immagine non cambiata'); }
  })]];
  if(c.foto) voci.push(['Togli l’immagine', 'cestino', async () => {
    const {error} = await sb.rpc('chat_modifica_gruppo', {p_conv: c.id, p_togli_foto: true}); if(error) return errore(error);
    c.foto = null; disegnaInfo(); aggiornaTestaConv(); disegnaLista();
  }, 'rosso']);
  const r = $('.profilo-big .av', el('info')).getBoundingClientRect();
  apriMenu(r.left + r.width / 2, r.bottom - 20, voci);
}
function svuotaChat(){
  const c = S.convs.get(S.aperta || infoAperta); if(!c) return;
  conferma('Svuotare questa chat?', 'I messaggi spariscono solo per te, su tutti i tuoi dispositivi. Gli altri continuano a vederli.', 'Svuota', async () => {
    const t = new Date().toISOString();
    const {error} = await sb.from('chat_membri').update({svuotata_il: t}).eq('conv_id', c.id).eq('utente_id', S.io);
    if(error) return errore(error, 'Chat non svuotata');
    c.svuotata_il = t; c.ultimo = null; S.msgs.delete(c.id);
    if(S.aperta === c.id){ statoMsgs(c.id).tutti = true; statoMsgs(c.id).caricato = true; disegnaMessaggi(); }
    disegnaLista(); if(infoAperta) disegnaInfo();
  }, true);
}
function esciGruppo(c){
  c = c || S.convs.get(infoAperta || S.aperta); if(!c) return;
  conferma('Uscire da «' + nomeConv(c) + '»?', 'Non riceverai più i messaggi del gruppo. Un amministratore potrà aggiungerti di nuovo.', 'Esci', async () => {
    const {error} = await sb.rpc('chat_togli', {p_conv: c.id, p_utente: S.io}); if(error) return errore(error, 'Non sei uscito');
    S.convs.delete(c.id); S.msgs.delete(c.id);
    if(S.aperta === c.id) chiudiConv();
    chiudiInfo(); disegnaLista();
  }, true);
}

/* ---------- cerca nella chat ---------- */
function disegnaCerca(){
  const I2 = el('info'); const c = S.convs.get(infoAperta); if(!c) return;
  I2.innerHTML = '<div class="scorre destra" style="position:absolute"><div class="scorre-testa basso"><button class="ib" data-a="chiudi-info">'+svg('chiudi')+'</button><h2>Cerca messaggi</h2></div>'+
    '<div class="cerca" style="padding-top:10px"><label>'+svg('cerca')+'<input id="cmIn" placeholder="Cerca in questa chat" autocomplete="off"></label></div>'+
    '<div class="scorre-corpo" id="cmRis"><div class="vuoto-lista">Cerca tra i messaggi di '+esc(nomeConv(c))+'.</div></div></div>';
  const i = el('cmIn'); setTimeout(() => i.focus(), 100);
  const vai = debounce(async () => {
    const q = i.value.trim(); const R = el('cmRis'); if(!R) return;
    if(q.length < 2){ R.innerHTML = '<div class="vuoto-lista">Scrivi almeno due lettere.</div>'; return; }
    const pulito = q.replace(/[%_\\]/g, m => '\\' + m);
    let qq = sb.from('chat_messaggi').select('id,autore,testo,creato_il,tipo,media').eq('conv_id', c.id).eq('eliminato', false).ilike('testo', '%' + pulito + '%').order('creato_il', {ascending: false}).limit(60);
    if(c.svuotata_il) qq = qq.gt('creato_il', c.svuotata_il);
    const {data, error} = await qq;
    if(error){ R.innerHTML = '<div class="vuoto-lista">Ricerca non riuscita.</div>'; return; }
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    const l = (data || []).filter(m => !S.nascosti.has(m.id));
    R.innerHTML = l.length ? l.map(m => '<button class="voce" data-a="vai-msg" data-id="'+m.id+'" style="align-items:flex-start"><span class="vc" style="border-bottom:1px solid var(--linea)">'+
      '<span style="font-size:12.5px">'+dataBreve(m.creato_il)+' · '+esc(m.autore === S.io ? 'Tu' : nomeMsg(m))+'</span>'+
      '<b style="white-space:normal;font-size:14.5px">'+esc(testoSemplice(m.testo)).replace(re, '<mark style="background:color-mix(in srgb,var(--verde) 30%,transparent);color:inherit;border-radius:3px">$1</mark>')+'</b></span></button>').join('')
      : '<div class="vuoto-lista">Nessun messaggio con «'+esc(q)+'».</div>';
  }, 300);
  i.oninput = vai;
}

/* ---------- inoltra ---------- */
function inoltra(msgs){
  const scelte = new Set();
  const convs = convVisibili().filter(c => !c.bloccata || S.sbloccate.has(c.id));
  const corpo = q => {
    q = (q || '').toLowerCase();
    return '<div class="cerca" style="padding:4px 0 8px"><label>'+svg('cerca')+'<input id="inoCerca" placeholder="Cerca" value="'+esc(q)+'"></label></div><div style="margin:0 -24px">'+
      convs.filter(c => !q || nomeConv(c).toLowerCase().includes(q)).map(c => '<button class="voce'+(scelte.has(c.id) ? ' scelto' : '')+'" data-sce="'+c.id+'">'+avatarConv(c)+
        '<span class="vc"><b>'+esc(nomeConv(c))+'</b><span>'+(c.tipo === 'gruppo' ? 'Gruppo' : esc((S.persone.get(altro(c)) || {}).ruolo || ''))+'</span></span><span class="spunta">'+svg('ok', 3)+'</span></button>').join('')+'</div>';
  };
  const v = foglio('Inoltra a…', corpo(''), [['Annulla'], ['Inoltra', async () => {
    for(const id of scelte) for(const m of msgs) await inoltraUno(m, id);
    toast(scelte.size === 1 ? 'Inoltrato' : 'Inoltrato a ' + scelte.size + ' chat');
    if(scelte.size === 1){ const id = Array.from(scelte)[0]; if(id !== S.aperta) apriConv(id); }
  }, 'pieno']]);
  const C = v.querySelector('.foglio-c');
  C.onclick = e => { const s = e.target.closest('[data-sce]'); if(!s) return; const id = s.dataset.sce; if(scelte.has(id)) scelte.delete(id); else if(scelte.size < 5) scelte.add(id); else toast('Al massimo 5 chat alla volta.'); s.classList.toggle('scelto', scelte.has(id)); };
  C.oninput = e => { if(e.target.id === 'inoCerca'){ const val = e.target.value; C.innerHTML = corpo(val); const n = el('inoCerca'); n.focus(); n.setSelectionRange(val.length, val.length); } };
}
async function inoltraUno(m, conv){
  const md = m.media ? Object.assign({}, m.media) : null;
  if(md){ delete md.locale; delete md.bolla; delete md.schermo; delete md.anim; delete md.silenzioso; delete md.chiuso; delete md.menzioni; delete md.tutti; }
  if(m.tipo === 'lavoro' && md) md.nuovo = false;
  if(m.tipo === 'colpetto') return;
  if(md && md.path && !/^foss:|^sticker\//.test(md.path)){
    const dest = conv + '/' + uuid() + '.' + (estensione(md.path) || 'bin');
    const {error} = await sb.storage.from('chat').copy(md.path, dest);
    if(error){ errore(error, 'File non inoltrato'); return; }
    const u = firme.get(md.path); if(u) firme.set(dest, u);
    md.path = dest;
  }
  const mediaTesto = md && md.lavori ? {lavori: md.lavori} : null;
  const n = nuovoLocale(m.tipo, {testo: m.testo, media: m.tipo === 'testo' ? mediaTesto : (md && Object.keys(md).length ? md : null), risponde_a: null}, conv);
  if(conv === S.aperta) mettiInLista(n); else { const s = S.msgs.get(conv); if(s && s.caricato){ s.ids.add(n.id); s.lista = mescola(s.lista, [n]); } }
  try{ await salvaMessaggio(n); }catch(e){ n._stato = 'errore'; ridisegnaMessaggio(n.id); errore(e, 'Non inoltrato'); }
}

/* ---------- impostazioni ---------- */
function impostazioni(){
  pannelloSinistra('Impostazioni', '', false);
  disegnaImpostazioni();
}
function disegnaImpostazioni(){
  const C = el('pannelloSxC'); if(!C) return;
  const me = S.persone.get(S.io) || {};
  const voce = (a, ic, t, d, destra) => '<button class="voce" data-a="'+a+'"><span class="ic-sem">'+svg(ic, 1.8)+'</span><span class="vc"><b>'+t+'</b>'+(d ? '<span>'+d+'</span>' : '')+'</span>'+(destra || '')+'</button>';
  const interr = on => '<span class="interr'+(on ? ' on' : '')+'"></span>';
  const opz = (k, lista) => '<div class="opz">'+lista.map(x => '<button class="'+(S.cfg[k] === x[0] ? 'on' : '')+'" data-a="cfg" data-k="'+k+'" data-v="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>';
  C.innerHTML =
    '<div class="blocco"><button class="voce" data-a="profilo" style="min-height:96px">'+avatar(S.io, '', false, 'width:82px;height:82px;font-size:30px')+
      '<span class="vc"><b style="font-size:18px">'+esc(nomeLungo(S.io))+'</b><span>'+esc(me.ruolo || 'Il tuo profilo FOSS')+'</span></span></button></div>'+
    '<div class="blocco"><div class="sez-t">Come ti vedono gli altri</div>'+
      '<div class="sez-t grigio" style="padding:4px 20px 8px">Messaggio personale</div>'+
      '<div class="frase-campo"><input id="fraseIn" maxlength="140" placeholder="Una frase sotto il tuo nome (es. sul set fino alle 18)" value="'+esc(S.cfg.frase || '')+'"><span id="fraseN">'+(S.cfg.frase || '').length+'/140</span></div>'+
      '<div class="sez-t grigio" style="padding:10px 20px 8px">Cornice della foto</div>'+corniciHTML()+'</div>'+
    '<div class="blocco"><div class="sez-t">Privacy e sicurezza</div>'+
      voce('proteggi-tutto', 'lucchetto', 'Proteggi FOSS.chat con un codice', 'Ogni volta che la apri ti chiede 4 cifre', interr(S.tutto))+
      voce('cambia-pin', 'matita', S.haPin ? 'Cambia il codice' : 'Scegli il codice', S.haPin ? 'Lo stesso codice apre le chat private' : 'Serve per rendere private le chat')+
      (S.haPin ? voce('pin-dimenticato', 'info', 'Ho dimenticato il codice', 'Lo cambi con la password di FOSS') : '')+'</div>'+
    '<div class="blocco"><div class="sez-t">Notifiche</div>'+
      voce('attiva-push', 'campana', 'Avvisi su questo dispositivo', 'Anche quando FOSS.chat è chiusa', '<span id="statoPush" style="font-size:13px;color:var(--testo-2)"></span>')+
      voce('cfg-suoni', 'nuova', 'Suoni nella chat', 'Un suono quando arriva un messaggio', interr(S.cfg.suoni))+
      voce('cfg-entrati', 'persona', 'Avvisami quando qualcuno entra', 'Un avviso in basso quando un collega apre FOSS.chat', interr(S.cfg.entrati !== false))+'</div>'+
    '<div class="blocco"><div class="sez-t">Chat</div>'+
      '<div class="sez-t grigio" style="padding:4px 20px 8px">Colori</div>'+
      '<div class="colori-griglia">'+TEMI_COLORE.map(x => '<button class="colore-tema'+((S.cfg.colori || 'brand') === x.id ? ' on' : '')+'" data-a="cfg" data-k="colori" data-v="'+x.id+'">'+
        '<span class="pall3">'+x.c.map(c => '<i style="background:'+c+'"></i>').join('')+'</span><b>'+esc(x.nome)+'</b><span>'+esc(x.ds)+'</span></button>').join('')+'</div>'+
      '<div class="sez-t grigio" style="padding:4px 20px 8px">Chiaro o scuro</div>'+opz('tema', [['sistema','Come il dispositivo'],['chiaro','Chiaro'],['scuro','Scuro']])+
      '<div class="sez-t grigio" style="padding:4px 20px 8px">Dimensione del testo</div>'+opz('testo', [['piccolo','Piccolo'],['medio','Medio'],['grande','Grande']])+
      '<div class="sez-t grigio" style="padding:4px 20px 8px">Sfondo delle chat</div>'+anteprimaSfondoHTML()+
      '<div class="opz"><button data-a="sfondo-foto">'+svg('foto', 1.8).replace('<svg', '<svg style="width:16px;height:16px;display:inline;vertical-align:-3px;margin-right:6px"')+'Scegli una foto</button>'+
        '<button data-a="sfondo-colore">Un colore</button>'+(S.cfg.sfondoFoto ? '<button data-a="sfondo-togli">Togli la foto</button>' : '')+'</div>'+
      (S.cfg.sfondoFoto ? '<div class="opz" style="color:var(--testo-2);font-size:14px">Oscura la foto <input type="range" min="0" max="70" step="5" data-buio value="'+Math.round((S.cfg.sfondoBuio == null ? .25 : S.cfg.sfondoBuio) * 100)+'" style="flex:1;accent-color:var(--verde)"></div>' : '')+
      (S.cfg.sfondoFoto ? '' : voce('cfg-doodle', 'foto', 'Disegni sullo sfondo', 'Camere, ciak e gocce di FOSS', interr(S.cfg.doodle !== false)))+
      '<div class="sez-t grigio" style="padding:4px 20px 8px">Sfondo animato</div>'+vivoHTML()+
      '<div style="padding:0 20px 12px;font-size:13px;color:var(--testo-2)">Ogni chat può avere il suo sfondo: aprila, tocca il nome in alto e scegli «Sfondo di questa chat».</div>'+
      voce('cfg-invio', 'manda', 'Invio manda il messaggio', 'Sulla tastiera del computer', interr(S.cfg.invio))+'</div>'+
    '<div class="blocco"><div class="sez-t">Messaggi</div>'+
      voce('tutti-importanti', 'stella', 'Messaggi importanti', 'Tutti quelli con la stella, in ogni chat')+
      (S.programmati.length ? voce('tutti-programmati', 'programma', 'Messaggi programmati', S.programmati.length + ' in attesa di partire') : '')+'</div>'+
    '<div class="blocco"><div class="sez-t">Sticker e GIF</div>'+
      voce('gestisci-sticker', 'sticker', 'I tuoi sticker', S.sticker.length + ' salvati')+
      voce('gestisci-gif', 'gif', 'Le tue GIF', S.gif.length + ' salvate')+'</div>'+
    '<div class="blocco"><div class="sez-t">File</div>'+
      voce('info-file', 'server', 'Dove stanno foto, vocali e file', MEDIA_NAS ? 'Sul NAS dello studio' : 'Per ora su Supabase, poi sul NAS')+'</div>'+
    '<div class="blocco">'+voce('rivedi-benvenuto', 'info', 'Come funziona FOSS.chat', 'Rivedi la presentazione')+
      voce('foss', 'esci', 'Torna a FOSS', '')+'</div>'+
    '<div style="padding:18px 20px 40px;text-align:center;font-size:12.5px;color:var(--testo-3)">FOSS.chat · '+VERSIONE+'</div>';
  riempiAnteprimaSfondo();
  const fi = el('fraseIn');
  if(fi){ fi.oninput = () => { const n = el('fraseN'); if(n) n.textContent = fi.value.length + '/140'; };
    fi.onchange = () => salvaFrase(fi.value); fi.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); fi.blur(); } }; }
  statoPush().then(s => { const n = el('statoPush'); if(n) n.textContent = {si: 'Attivi', no: 'Spenti', bloccati: 'Bloccati', 'ios-home': 'Da Home', 'no-supporto': 'Non disponibili'}[s] || ''; });
}
function gestisciRaccolta(tipo){
  const lista = tipo === 'gif' ? S.gif : S.sticker;
  const corpo = () => lista.length ? '<div class="pe-griglia stk'+(tipo === 'gif' ? ' gif' : '')+'" id="grRacc">'+lista.map(x => '<button data-id="'+x.id+'" title="Togli">'+
    (/\.mp4$/.test(x.path) ? '<video data-path="'+esc(x.path)+'" muted autoplay loop playsinline></video>' : '<img data-path="'+esc(x.path)+'" alt="">')+'<span class="togli" style="display:grid">'+svg('chiudi')+'</span></button>').join('')+'</div>'
    : '<div class="pe-vuoto">Ancora niente qui.</div>';
  const v = foglio(tipo === 'gif' ? 'Le tue GIF' : 'I tuoi sticker', corpo(), [['Chiudi']]);
  const C = v.querySelector('.foglio-c');
  const riempi = () => $$('[data-path]', C).forEach(async n => { n.src = await urlFirmata(n.dataset.path); });
  riempi();
  C.onclick = e => {
    const b = e.target.closest('[data-id]'); if(!b) return;
    const x = lista.find(z => z.id === b.dataset.id); if(!x) return;
    conferma('Togliere dalla raccolta?', 'Nelle chat dove l’hai già mandato resta visibile.', 'Togli', async () => {
      const {error} = await sb.from('chat_sticker').delete().eq('id', x.id); if(error) return errore(error);
      lista.splice(lista.indexOf(x), 1); C.innerHTML = corpo(); riempi(); disegnaImpostazioni();
    }, true);
  };
}
function profilo(){
  const me = S.persone.get(S.io) || {};
  pannelloSinistra('Profilo', '<div class="profilo-big">'+avatar(S.io, '', false, 'width:200px;height:200px;font-size:72px')+'</div>'+
    '<div style="padding:0 30px"><div class="sez-t" style="padding:10px 0 4px">Nome</div><div style="font-size:17px;color:var(--testo)">'+esc((me.nome || '').trim() || '—')+'</div>'+
    '<div class="sez-t" style="padding:22px 0 4px">Nickname</div><div style="font-size:17px;color:var(--testo)">'+esc(me.nick || '—')+'</div>'+
    '<div class="sez-t" style="padding:22px 0 4px">Ruolo</div><div style="font-size:17px;color:var(--testo)">'+esc(me.ruolo || '—')+'</div>'+
    '<p style="color:var(--testo-2);font-size:13.5px;line-height:1.5;margin:26px 0 12px">Il profilo è lo stesso di FOSS: nome, nickname, ruolo e foto si cambiano lì e qui si aggiornano da soli.</p>'+
    '<button class="btn pieno" data-a="profilo-foss">Modifica il profilo in FOSS</button>'+
    '<div style="margin-top:26px"><button class="voce" data-a="proteggi-tutto" style="padding-left:0"><span class="ic-sem">'+svg('lucchetto', 1.8)+'</span>'+
      '<span class="vc"><b>Proteggi FOSS.chat con un codice</b><span>'+(S.tutto ? 'Attiva: tocca per toglierla' : 'Spenta: tocca per attivarla')+'</span></span><span class="interr'+(S.tutto ? ' on' : '')+'"></span></button></div></div>');
}

/* ---------- avvisi push (gli stessi di FOSS) ---------- */
function chiaveServer(){ const b = atob(VAPID_PUBBLICA.replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(b.length); for(let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
function registrazioneSW(){ if(!('serviceWorker' in navigator)) return Promise.resolve(null); return Promise.race([navigator.serviceWorker.ready, new Promise(ok => setTimeout(() => ok(null), 5000))]); }
async function statoPush(){
  if(suIOS() && !aTuttoSchermo()) return 'ios-home';
  if(!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'no-supporto';
  if(Notification.permission === 'denied') return 'bloccati';
  const reg = await registrazioneSW(); if(!reg || !reg.pushManager) return 'no-supporto';
  const iscr = await reg.pushManager.getSubscription();
  return iscr && Notification.permission === 'granted' ? 'si' : 'no';
}
function nomeDispositivo(){
  const ua = navigator.userAgent || '';
  const cosa = /iPhone/.test(ua) ? 'iPhone' : suIOS() ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Dispositivo';
  const br = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return cosa + (br ? ' · ' + br : '');
}
async function attivaPush(){
  const st = await statoPush();
  if(st === 'si'){ toast('Gli avvisi sono già attivi su questo dispositivo.'); return; }
  if(st === 'ios-home'){ foglio('Avvisi su iPhone e iPad', 'Su iPhone gli avvisi arrivano solo se FOSS è sulla schermata Home: in Safari tocca Condividi → «Aggiungi alla schermata Home», apri FOSS da lì e attiva gli avvisi.', [['Ho capito']]); return; }
  if(st === 'no-supporto'){ toast('Questo browser non riceve avvisi.'); return; }
  if(st === 'bloccati'){ toast('Gli avvisi sono bloccati nelle impostazioni del browser.'); return; }
  let perm;
  try{ perm = await Notification.requestPermission(); }catch(e){ perm = Notification.permission; }
  if(perm !== 'granted'){ toast('Senza permesso gli avvisi non arrivano.'); return; }
  try{
    const reg = await registrazioneSW(); if(!reg) throw new Error('service worker non pronto');
    let iscr = await reg.pushManager.getSubscription();
    if(!iscr) iscr = await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: chiaveServer()});
    const j = iscr.toJSON();
    const {error} = await sb.rpc('iscrivi_push', {p_endpoint: j.endpoint, p_p256dh: (j.keys || {}).p256dh, p_auth: (j.keys || {}).auth, p_dispositivo: nomeDispositivo()});
    if(error) throw error;
    toast('Avvisi attivi: i messaggi arrivano anche a chat chiusa.');
    disegnaImpostazioni();
  }catch(e){ errore(e, 'Avvisi non attivati'); }
}
