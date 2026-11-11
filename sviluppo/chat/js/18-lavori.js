/* ======================= I LAVORI DI FOSS DENTRO LA CHAT =======================
   #nome nel testo diventa un collegamento; un lavoro condiviso arriva come scheda viva
   (date, location, fase, avanzamento, squadra) che si aggiorna da sola quando cambia su FOSS.
   Dalla chat si crea anche la base di un lavoro nuovo: titolo, cliente, data, location, squadra.
   Ognuno vede solo i lavori che vede su FOSS. */
const TIPI_FOSS = {
  video: {ic: 'camera', fasi: ['Brief','Piano','Produzione','Revisione','Consegna'], giorno: ['Giorno delle riprese','Riprese'], luogo: 'Dove si gira', cons: ['Consegna','Consegna']},
  foto: {ic: 'foto', fasi: ['Brief','Piano','Shooting','Selezione','Consegna'], giorno: ['Giorno dello shooting','Shooting'], luogo: 'Dove si scatta', cons: ['Consegna delle foto','Consegna foto']},
  design: {ic: 'disegno', fasi: ['Brief','Concept','Proposte','Revisioni','Esecutivi'], giorno: ['Presentazione delle proposte','Presentazione'], luogo: 'Indirizzo del cliente', cons: ['Consegna','Consegna']},
  social: {ic: 'chatTab', fasi: ['Brief','Piano editoriale','Produzione','Approvazione','Pubblicazione'], giorno: ['Prima uscita','Prima uscita'], luogo: 'Dove si producono i contenuti', cons: ['Fine del periodo','Fine periodo']},
  web: {ic: 'link', fasi: ['Brief','Design','Sviluppo','Test','Online'], giorno: ['Presentazione della grafica','Presentazione grafica'], luogo: 'Indirizzo del cliente', cons: ['Messa online','Online']},
  evento: {ic: 'effetti', fasi: ['Brief','Pianificazione','Allestimento','Evento','Chiusura'], giorno: ['Sopralluogo','Sopralluogo'], luogo: 'Location dell’evento', cons: ['Data dell’evento','Evento']},
  legale: {ic: 'doc', fasi: ['Primo incontro','Studio','Attività','Esito','Chiusura'], giorno: ['Prossima udienza','Udienza'], luogo: 'Tribunale o ufficio', cons: ['Prossima scadenza','Scadenza']},
  fiscale: {ic: 'doc', fasi: ['Incarico','Documenti','Elaborazione','Verifica','Invio'], giorno: ['Appuntamento con il cliente','Appuntamento'], luogo: 'Sede del cliente', cons: ['Scadenza','Scadenza']},
  moda: {ic: 'disegno', fasi: ['Concept','Design','Prototipi','Produzione','Presentazione'], giorno: ['Prima prova','Prova'], luogo: 'Laboratorio o atelier', cons: ['Consegna','Consegna']},
  architettura: {ic: 'lavoro', fasi: ['Rilievo','Concept','Progetto','Pratiche','Cantiere','Fine lavori'], giorno: ['Sopralluogo','Sopralluogo'], luogo: 'Indirizzo dell’immobile', cons: ['Fine lavori prevista','Fine lavori']},
  consulenza: {ic: 'persona', fasi: ['Analisi','Proposta','Strategia','Esecuzione','Report'], giorno: ['Primo incontro','Incontro'], luogo: 'Sede del cliente', cons: ['Consegna','Consegna']},
  copy: {ic: 'testo', fasi: ['Brief','Ricerca','Stesura','Revisione','Consegna'], giorno: ['Giorno del lavoro','Lavoro'], luogo: 'Indirizzo del cliente', cons: ['Consegna','Consegna']},
  generico: {ic: 'lista', fasi: ['Da fare','In corso','Revisione','Chiuso'], giorno: ['Giorno del lavoro','Lavoro'], luogo: 'Indirizzo del lavoro', cons: ['Scadenza','Scadenza']}
};
const ICONE_FOSS = {camera: 'camera', foto: 'foto', palette: 'disegno', chat: 'chatTab', code: 'link', spark: 'effetti', scale: 'doc', calc: 'doc', shirt: 'disegno',
  casa: 'lavoro', briefcase: 'lavoro', type: 'testo', list: 'lista', review: 'occhio', deliver: 'inoltra', pin: 'luogo', calendar: 'calendario', brief: 'doc', grid: 'lista', clip: 'allega'};
function tipoFoss(t){ return TIPI_FOSS[t] || TIPI_FOSS.video; }
function iconaLavoro(x){ return (x && ICONE_FOSS[x.icona]) || tipoFoss(x && x.tipo).ic; }
function coloreLavoro(x){ const c = x && x.col; return /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#FFAD01'; }
const MESI3 = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const GIORNI3 = ['dom','lun','mar','mer','gio','ven','sab'];
function giornoBreve(iso, ora_){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if(!m) return '';
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  const g = giorniFa(d);
  const base = g === 0 ? 'Oggi' : g === -1 ? 'Domani' : g === 1 ? 'Ieri' : GIORNI3[d.getDay()] + ' ' + d.getDate() + ' ' + MESI3[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
  return base + (ora_ ? ', ' + ora_ : '');
}

/* ---------- dati: cache e caricamento a gruppi ---------- */
let lavDaCaricare = new Set(), lavTimer = null;
function datiLavoro(id){
  const x = S.lavori.get(id);
  if(!x || Date.now() - x.t > 5 * 60000){ lavDaCaricare.add(id); clearTimeout(lavTimer); lavTimer = setTimeout(caricaLavoriInCoda, 40); }
  return x ? x.d : undefined;
}
async function caricaLavoriInCoda(){
  const ids = Array.from(lavDaCaricare); lavDaCaricare.clear();
  for(let i = 0; i < ids.length; i += 30){
    const pezzo = ids.slice(i, i + 30);
    try{
      const {data, error} = await sb.rpc('chat_lavori', {p_ids: pezzo});
      if(error) throw error;
      const per = new Map((data || []).map(x => [x.id, x]));
      pezzo.forEach(id => S.lavori.set(id, {d: per.get(id) || null, t: Date.now()}));
    }catch(e){
      pezzo.forEach(id => { if(!S.lavori.has(id)) S.lavori.set(id, {d: null, t: Date.now() - 4 * 60000, errore: true}); });
    }
    aggiornaSchede(pezzo);
  }
}
const lavoriCambiati = new Set(); let lavCambTimer = null;
function lavoroCambiato(id){
  if(!id || !S.lavori.has(id)) return;
  lavoriCambiati.add(id);
  clearTimeout(lavCambTimer);
  lavCambTimer = setTimeout(() => {
    const ids = Array.from(lavoriCambiati); lavoriCambiati.clear();
    ids.forEach(x => { const v = S.lavori.get(x); if(v) v.t = 0; });
    const visibili = ids.filter(x => $('[data-lav="'+x+'"]'));
    visibili.forEach(x => datiLavoro(x));
    if(elencoLavori.dati) elencoLavori.t = 0;
  }, 1500);
}
function aggiornaSchede(ids){
  ids.forEach(id => {
    $$('.lav-scheda[data-lav="'+id+'"]').forEach(n => {
      const d = document.createElement('div');
      d.innerHTML = schedaLavoroHTML({id, org: n.dataset.org, n: n.dataset.n}, {nuovo: n.classList.contains('nuovo'), compatta: n.classList.contains('compatta')});
      n.replaceWith(d.firstChild);
    });
  });
}

/* ---------- la scheda ---------- */
function schedaLavoroHTML(ref, opz){
  opz = opz || {};
  const x = datiLavoro(ref.id);
  const base = 'class="lav-scheda'+(opz.nuovo ? ' nuovo' : '')+(opz.compatta ? ' compatta' : '')+'" data-lav="'+esc(ref.id)+'" data-org="'+esc(ref.org || '')+'" data-n="'+esc(ref.n || '')+'"';
  if(x === undefined){
    return '<div '+base+' style="--col:#8696a0"><div class="lav-cop vuota"><span class="lav-tag">'+svg('lavoro', 2)+'Lavoro di FOSS</span></div>'+
      '<div class="lav-corpo"><b class="lav-nome">'+esc(ref.n || 'Lavoro')+'</b><span class="lav-attesa"><i></i><i></i><i></i></span></div></div>';
  }
  if(x === null){
    return '<div '+base+' style="--col:#8696a0"><div class="lav-corpo chiusa"><span class="lav-lucc">'+svg('lucchetto', 2)+'</span>'+
      '<span><b class="lav-nome">'+esc(ref.n || 'Lavoro di FOSS')+'</b><span class="lav-cli">Non fai parte di questo lavoro: lo vede solo la sua squadra.</span></span></div></div>';
  }
  const T = tipoFoss(x.tipo), col = coloreLavoro(x);
  const fasi = (x.fasi && x.fasi.length ? x.fasi : T.fasi);
  const fase = Math.max(0, Math.min(fasi.length - 1, x.fase || 0));
  const oggi = new Date(); const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const ev = (x.eventi || []).slice().sort((a, b) => (a.d + (a.ora || '')).localeCompare(b.d + (b.ora || '')));
  const prossimo = ev.find(e => e.d >= iso(oggi)) || null;
  const ultimo = !prossimo && ev.length ? ev[ev.length - 1] : null;
  const evShow = prossimo || ultimo;
  const pc = x.voci && x.voci.tot ? Math.round(x.voci.fatte / x.voci.tot * 100) : null;
  const team = (x.team || []).filter(u => /^[0-9a-f-]{36}$/.test(u));
  const cop = x.copertina ? '<img src="'+esc(x.copertina)+'" alt="" style="object-position:'+(x.posizione && x.posizione.x != null ? (+x.posizione.x) + '% ' + (+x.posizione.y || 50) + '%' : 'center')+'">' : '<span class="lav-ic-grande">'+svg(iconaLavoro(x), 1.6)+'</span>';
  const righe = [];
  if(!x.protetto){
    if(evShow) righe.push('<span class="lav-riga">'+svg('calendario', 2)+'<span><b>'+esc(evShow.t || 'Data')+'</b> · '+esc(giornoBreve(evShow.d, evShow.ora))+(ultimo ? ' (passato)' : '')+'</span></span>');
    else if(x.consegna) righe.push('<span class="lav-riga">'+svg('calendario', 2)+'<span><b>Consegna</b> · '+esc(x.consegna)+'</span></span>');
    if(x.indirizzo) righe.push('<button class="lav-riga lav-luogo" data-a="mappa" data-q="'+esc(x.indirizzo)+'">'+svg('luogo', 2)+'<span>'+esc(x.indirizzo)+'</span></button>');
  }
  const stato = x.completato ? '<span class="lav-fatto">'+svg('ok', 3)+'Consegnato</span>'
    : '<span>Fase '+(fase + 1)+' di '+fasi.length+' · <b>'+esc(fasi[fase] || '')+'</b></span>'+(pc != null ? '<span>'+pc+'%</span>' : '');
  return '<div '+base+' style="--col:'+esc(col)+'">'+
    '<div class="lav-cop'+(x.copertina ? ' foto' : '')+'">'+cop+'<span class="lav-tag">'+svg('lavoro', 2)+'Lavoro di FOSS</span>'+
      (opz.nuovo ? '<span class="lav-nuovo">Nuovo</span>' : '')+(x.protetto ? '<span class="lav-nuovo scuro">'+svg('lucchetto', 2.2)+'Protetto</span>' : '')+'</div>'+
    '<div class="lav-corpo"><b class="lav-nome">'+esc(x.nome || ref.n || 'Senza titolo')+'</b>'+(x.cliente ? '<span class="lav-cli">'+esc(x.cliente)+'</span>' : '')+
      (righe.length ? '<div class="lav-righe">'+righe.join('')+'</div>' : '')+
      (!x.protetto ? '<div class="lav-fasi">'+fasi.map((f, i) => '<i class="'+(x.completato || i < fase ? 'fatta' : i === fase ? 'ora' : '')+'" title="'+esc(f)+'"></i>').join('')+'</div>'+
        '<div class="lav-stato">'+stato+'</div>' : '')+
      (team.length ? '<div class="lav-team">'+team.slice(0, 6).map(u => avatar(u, 'mini')).join('')+(team.length > 6 ? '<span class="piu">+'+(team.length - 6)+'</span>' : '')+'</div>' : '')+
    '</div>'+
    '<button class="lav-apri" data-a="apri-lavoro" data-id="'+esc(x.id)+'">Apri in FOSS'+svg('apri', 2)+'</button></div>';
}
function lavoroHTML(m){
  const md = m.media || {};
  return schedaLavoroHTML(md.lavoro || {}, {nuovo: md.nuovo}) + (m.testo ? '<div class="testo didascalia">'+formatta(m.testo)+'</div>' : '');
}
/* sotto un testo con #lavori: la scheda del primo (gli altri restano come collegamenti) */
function schedeInTesto(md){
  const l = (md && md.lavori) || [];
  if(!l.length) return '';
  return schedaLavoroHTML(l[0], {compatta: true});
}
function apriLavoroInFoss(ref){
  if(!ref || !ref.id) return;
  vaiAFoss('#/p/' + encodeURIComponent(ref.id));
}
function apriMappa(q){
  if(!q) return;
  const u = suIOS() ? 'https://maps.apple.com/?q=' + encodeURIComponent(q) : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  window.open(u, '_blank', 'noopener');
}
/* tocco su #lavoro nel testo: la scheda in grande */
function vediLavoro(ref){
  const v = foglio('Lavoro di FOSS', '<div class="lav-grande">'+schedaLavoroHTML(ref, {})+'</div>', [['Chiudi'], ['Condividi qui', () => mandaLavoro(ref)]]);
  v.querySelector('.foglio').classList.add('foglio-lav');
}
async function mandaLavoro(ref, testo){
  const c = S.convs.get(S.aperta); if(!c || !ref || !ref.id) return;
  const m = nuovoLocale('lavoro', {testo: testo || null, media: {lavoro: {id: ref.id, org: ref.org, n: String(ref.n || ref.nome || 'Lavoro').slice(0, 120)}}});
  S.risposta = null; disegnaScrivi(); mettiInLista(m); suono('invio');
  try{ await salvaMessaggio(m); }catch(e){ m._stato = 'errore'; ridisegnaMessaggio(m.id); errore(e, 'Lavoro non condiviso'); }
}

/* ---------- elenco dei lavori (per # e per «Condividi un lavoro») ---------- */
const elencoLavori = {dati: null, t: 0, p: null};
function caricaElencoLavori(){
  if(elencoLavori.p) return elencoLavori.p;
  if(elencoLavori.dati && Date.now() - elencoLavori.t < 60000) return Promise.resolve(elencoLavori.dati);
  elencoLavori.p = sb.rpc('chat_lavori_elenco').then(({data, error}) => {
    elencoLavori.p = null;
    if(error) throw error;
    elencoLavori.dati = data || []; elencoLavori.t = Date.now();
    return elencoLavori.dati;
  }).catch(e => { elencoLavori.p = null; elencoLavori.dati = elencoLavori.dati || []; throw e; });
  return elencoLavori.p;
}
const doveCreare = {dati: null, t: 0};
async function caricaDoveCreare(forza){
  if(!forza && doveCreare.dati && Date.now() - doveCreare.t < 120000) return doveCreare.dati;
  const {data, error} = await sb.rpc('chat_dove_creare');
  if(error) throw error;
  doveCreare.dati = data || {archivi: []}; doveCreare.dati.archivi = doveCreare.dati.archivi || []; doveCreare.t = Date.now();
  return doveCreare.dati;
}
async function foglioLavori(){
  const c = S.convs.get(S.aperta); if(!c) return;
  const v = document.createElement('div'); v.className = 'velo scuro basso';
  v.innerHTML = '<div class="foglio lav-foglio" role="dialog"><div class="foglio-t">Lavori di FOSS<button class="ib" data-x="1">'+svg('chiudi')+'</button></div>'+
    '<div class="foglio-c"><button class="lav-crea-b" data-crea="1">'+svg('piuCerchio', 1.9)+'<span><b>Crea un nuovo lavoro</b><i>Titolo, data e location ora; il resto su FOSS</i></span></button>'+
    '<div class="cerca" style="padding:6px 0 8px"><label>'+svg('cerca')+'<input id="lfCerca" placeholder="Cerca un lavoro o un cliente" autocomplete="off"></label></div>'+
    '<div id="lfLista"><div class="vuoto-lista">Carico i lavori…</div></div></div></div>';
  document.body.appendChild(v);
  const L = el('lfLista'), Q = el('lfCerca');
  const disegna = () => {
    if(!elencoLavori.dati){ return; }
    const q = senzaAccenti(Q.value.trim());
    const l = elencoLavori.dati.filter(x => !q || senzaAccenti(x.nome).includes(q) || senzaAccenti(x.cliente).includes(q));
    L.innerHTML = l.length ? l.slice(0, 80).map(x => '<button class="lav-voce" data-id="'+esc(x.id)+'"><span class="pk-ic lav" style="--col:'+esc(coloreLavoro(x))+'">'+svg(iconaLavoro(x), 2)+'</span>'+
        '<span class="pk-t"><b>'+esc(x.nome || 'Senza titolo')+'</b><span>'+esc([x.cliente, x.completato ? 'Consegnato' : x.prossimo ? giornoBreve(x.prossimo) : ''].filter(Boolean).join(' · '))+'</span></span>'+
        '<span class="lav-manda">'+svg('manda', 1.8)+'</span></button>').join('')
      : '<div class="vuoto-lista">'+(q ? 'Nessun lavoro con «'+esc(Q.value.trim())+'».' : 'Non vedi ancora nessun lavoro su FOSS.')+'</div>';
  };
  caricaElencoLavori().then(disegna).catch(() => { L.innerHTML = '<div class="vuoto-lista">Non riesco a caricare i lavori. Riprova tra poco.</div>'; });
  caricaDoveCreare().then(d => { const b = $('[data-crea]', v); if(b && !d.archivi.some(a => a.spazi.length)) b.classList.add('spento'); }).catch(() => {});
  Q.addEventListener('input', disegna);
  if(!tocco()) setTimeout(() => Q.focus(), 80);
  v.addEventListener('click', e => {
    if(e.target === v || e.target.closest('[data-x]')){ v.remove(); return; }
    if(e.target.closest('[data-crea]')){ v.remove(); creaLavoro({}); return; }
    const b = e.target.closest('.lav-voce[data-id]');
    if(b){ const x = (elencoLavori.dati || []).find(z => z.id === b.dataset.id); v.remove(); if(x) mandaLavoro({id: x.id, org: x.org, n: x.nome}); }
  });
}

/* ---------- creare la base di un lavoro ---------- */
async function creaLavoro(pre){
  pre = pre || {};
  const c = S.convs.get(S.aperta); if(!c) return;
  let dove;
  try{ dove = await caricaDoveCreare(true); }catch(e){ errore(e, 'Non riesco a parlare con FOSS'); return; }
  const archivi = dove.archivi.filter(a => a.spazi.length);
  if(!archivi.length){
    foglio('Creare un lavoro', dove.archivi.length
      ? 'Per creare un lavoro serve uno spazio di lavoro su FOSS. Aprilo su FOSS (o chiedilo all’amministratore), poi torna qui.'
      : 'Non hai il permesso di creare lavori. Chiedilo all’amministratore del tuo team su FOSS.', [['Ho capito']]);
    return;
  }
  /* lo spazio di partenza: l'ultimo usato su FOSS, se posso */
  let org = archivi[0].org, spazio = archivi[0].spazi[0].id;
  archivi.forEach(a => a.spazi.forEach(s => { if(s.id === dove.ultimo){ org = a.org; spazio = s.id; } }));
  const membriChat = (c.membri || []).map(x => x.id);
  const squadra = new Set(membriChat.filter(id => id !== S.io));
  const v = document.createElement('div'); v.className = 'velo scuro basso'; v.id = 'veloCreaLavoro';
  const oggi = new Date(); const isoOggi = oggi.getFullYear() + '-' + String(oggi.getMonth() + 1).padStart(2, '0') + '-' + String(oggi.getDate()).padStart(2, '0');
  v.innerHTML = '<div class="foglio cl-foglio" role="dialog" aria-label="Nuovo lavoro"><div class="foglio-t">'+svg('lavoro', 2)+'Nuovo lavoro<button class="ib" data-x="1">'+svg('chiudi')+'</button></div>'+
    '<div class="foglio-c" id="clCorpo"></div><div class="foglio-f"><span class="cl-nota">I dettagli li completi su FOSS</span><button class="btn" data-x="1">Annulla</button><button class="btn pieno" data-crea="1" id="clCrea">Crea lavoro</button></div></div>';
  document.body.appendChild(v);
  const stato = {nome: pre.nome || '', cliente: pre.cliente || '', giorno: '', ora: '', consegna: '', luogo: '', nota: ''};
  const leggi = () => { ['nome','cliente','giorno','ora','consegna','luogo','nota'].forEach(k => { const i = el('cl_' + k); if(i) stato[k] = i.value; }); };
  const disegna = () => {
    const A = archivi.find(a => a.org === org) || archivi[0];
    const S2 = A.spazi.find(s => s.id === spazio) || A.spazi[0]; spazio = S2.id;
    const T = tipoFoss(S2.tipo);
    const nelArchivio = new Set(A.membri || []);
    const scelte = membriChat.filter(id => id !== S.io && nelArchivio.has(id));
    const fuori = membriChat.filter(id => id !== S.io && !nelArchivio.has(id));
    const tutti = [];
    archivi.forEach(a => a.spazi.forEach(s => tutti.push([a, s])));
    el('clCorpo').innerHTML =
      '<label class="cl-campo grande"><span>Titolo</span><input id="cl_nome" maxlength="120" placeholder="Es. Videoclip Il Merlo" value="'+esc(stato.nome)+'" autocomplete="off"></label>'+
      '<label class="cl-campo"><span>Cliente</span><input id="cl_cliente" maxlength="120" list="cl_clienti" placeholder="Per chi è il lavoro" value="'+esc(stato.cliente)+'" autocomplete="off">'+
        '<datalist id="cl_clienti">'+(dove.clienti || []).slice(0, 200).map(x => '<option value="'+esc(x)+'">').join('')+'</datalist></label>'+
      '<div class="cl-due"><label class="cl-campo"><span>'+esc(T.giorno[0])+'</span><input id="cl_giorno" type="date" min="'+isoOggi.slice(0, 4)+'-01-01" value="'+esc(stato.giorno)+'"></label>'+
        '<label class="cl-campo ora"><span>Ora</span><input id="cl_ora" type="time" value="'+esc(stato.ora)+'"></label></div>'+
      '<label class="cl-campo"><span>'+svg('luogo', 2)+'Location</span><input id="cl_luogo" maxlength="300" placeholder="'+esc(T.luogo)+'" value="'+esc(stato.luogo)+'" autocomplete="off"></label>'+
      '<label class="cl-campo"><span>'+esc(T.cons[0])+' <i>facoltativa</i></span><input id="cl_consegna" type="date" value="'+esc(stato.consegna)+'"></label>'+
      (tutti.length > 1 ? '<label class="cl-campo"><span>Spazio di FOSS</span><select id="cl_spazio">'+tutti.map(([a, s]) => '<option value="'+esc(a.org + '|' + s.id)+'"'+(a.org === org && s.id === spazio ? ' selected' : '')+'>'+
          esc(s.nome + (archivi.length > 1 ? ' · ' + a.nome : ''))+'</option>').join('')+'</select></label>' : '')+
      '<div class="cl-campo"><span>Squadra</span>'+
        (A.squadra ? (scelte.length ? '<div class="cl-squadra">'+scelte.map(id => '<button class="cl-pers'+(squadra.has(id) ? ' on' : '')+'" data-pers="'+id+'">'+avatar(id)+'<span>'+esc(nomeDi(id))+'</span><i>'+svg('ok', 3)+'</i></button>').join('')+'</div>'
                     : '<div class="cl-info">Nessun altro di questa chat lavora in questo archivio: il lavoro lo vedi tu.</div>')+
          (fuori.length ? '<div class="cl-info">'+esc(fuori.map(nomeDi).join(', '))+(fuori.length === 1 ? ' non è' : ' non sono')+' in questo archivio di FOSS.</div>' : '')
        : '<div class="cl-info">Il lavoro lo vedi tu (e l’amministratore). Chi altro lo vede lo decide l’amministratore su FOSS.</div>')+'</div>'+
      '<label class="cl-campo"><span>Note <i>facoltative</i></span><textarea id="cl_nota" rows="2" maxlength="4000" placeholder="Indicazioni, contatti, cosa portare…">'+esc(stato.nota)+'</textarea></label>';
    const s = el('cl_spazio'); if(s) s.onchange = () => { leggi(); const [o, sp] = s.value.split('|'); org = o; spazio = sp; disegna(); };
    controlla();
  };
  const controlla = () => { const n = (el('cl_nome') || {}).value || '', cl = (el('cl_cliente') || {}).value || ''; el('clCrea').disabled = !(n.trim() || cl.trim()); };
  disegna();
  setTimeout(() => { const i = el('cl_nome'); if(i){ i.focus(); try{ i.setSelectionRange(i.value.length, i.value.length); }catch(e){} } }, 80);
  v.addEventListener('input', controlla);
  v.addEventListener('click', async e => {
    if(e.target === v || e.target.closest('[data-x]')){ v.remove(); return; }
    const p = e.target.closest('[data-pers]');
    if(p){ const id = p.dataset.pers; if(squadra.has(id)) squadra.delete(id); else squadra.add(id); p.classList.toggle('on', squadra.has(id)); return; }
    if(e.target.closest('[data-crea]')){
      leggi();
      if(!stato.nome.trim() && !stato.cliente.trim()){ toast('Scrivi almeno il titolo o il cliente.'); return; }
      const A = archivi.find(a => a.org === org); const S2 = A.spazi.find(s => s.id === spazio); const T = tipoFoss(S2.tipo);
      const b = el('clCrea'); b.disabled = true; b.innerHTML = '<span class="giro bianco"></span>Creo…';
      try{
        const {data, error} = await sb.rpc('chat_crea_lavoro', {
          p_org: org, p_spazio: spazio, p_nome: stato.nome.trim(), p_cliente: stato.cliente.trim(),
          p_giorno: stato.giorno || null, p_ora: stato.giorno && stato.ora ? stato.ora : null, p_giorno_t: T.giorno[1],
          p_consegna: stato.consegna || null, p_consegna_t: T.cons[1],
          p_luogo: stato.luogo.trim(), p_nota: stato.nota.trim(),
          p_team: A.squadra ? Array.from(squadra).filter(id => (A.membri || []).includes(id)) : [], p_conv: c.id});
        if(error) throw error;
        v.remove();
        elencoLavori.t = 0;
        if(data && data.msg){ const m = data.msg; if(!trovaMsg(c.id, m.id)) arrivaMessaggio(m); }
        toast('«' + (data && data.nome || 'Lavoro') + '» creato su FOSS.', 'Apri', () => apriLavoroInFoss({id: data.id}));
      }catch(err){
        b.disabled = false; b.textContent = 'Crea lavoro';
        errore(err, 'Lavoro non creato');
      }
    }
  });
}
