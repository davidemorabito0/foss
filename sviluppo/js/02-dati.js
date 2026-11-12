/* ======================= DATI ======================= */

/* ---------- indirizzi firmati per i file privati ---------- */
const firme = new Map();         // path -> {url, scade}
const firmeInCorso = new Map();
function urlFirmataSubito(path){
  const f = firme.get(path);
  if(f && f.scade > Date.now()) return f.url;
  urlFirmata(path).then(u => {
    if(!u) return;
    $$('[data-foto-gruppo="'+CSS.escape(path)+'"]').forEach(n => { n.innerHTML = '<img src="'+esc(u)+'" alt="">'; });
  });
  return '';
}
async function urlFirmata(path){
  if(!path) return '';
  if(/^foss:/.test(path)) return stickerFoss(path.slice(5));
  const f = firme.get(path);
  if(f && f.scade > Date.now() + 60000) return f.url;
  if(firmeInCorso.has(path)) return firmeInCorso.get(path);
  const p = (async () => {
    try{
      const {data, error} = await sb.storage.from('chat').createSignedUrl(path, 3600 * 6);
      if(error || !data) throw error || new Error('nessun indirizzo');
      const url = /^(https?:|blob:)/.test(data.signedUrl) ? data.signedUrl : SUPA_URL + '/storage/v1' + data.signedUrl;
      firme.set(path, {url, scade: Date.now() + 3600 * 6 * 1000 - 120000});
      return url;
    }catch(e){ return ''; }
    finally{ firmeInCorso.delete(path); }
  })();
  firmeInCorso.set(path, p);
  return p;
}
/* l'indirizzo di un file di un messaggio: NAS (url) o Supabase (path) */
async function urlMedia(m){
  if(!m) return '';
  if(m.locale) return m.locale;
  if(m.url) return m.url;
  return urlFirmata(m.path);
}

/* ---------- caricamento di un file, con la barra che avanza ---------- */
async function token(){
  const {data} = await sb.auth.getSession();
  return data && data.session ? data.session.access_token : '';
}
function caricaFile(path, blob, avanza){
  /* prima il NAS dello studio; se non risponde (spento, senza rete) il file va su Supabase come prima */
  if(!MEDIA_NAS) return inviaFile(path, blob, avanza, false);
  return inviaFile(path, blob, avanza, true).catch(e => {
    if(!e || !e.rete || blob.size > MAX_SUPA) throw e;
    if(avanza) avanza(0);
    return inviaFile(path, blob, avanza, false);
  });
}
function inviaFile(path, blob, avanza, nas){
  return new Promise(async (ok, ko) => {
    let tk = '';
    try{ tk = await token(); }catch(e){}
    if(!tk) return ko(new Error('sessione scaduta: rientra in FOSS'));
    const xhr = new XMLHttpRequest();
    const dest = nas ? MEDIA_NAS.replace(/\/$/, '') + '/carica/' + path
                     : SUPA_URL + '/storage/v1/object/chat/' + path.split('/').map(encodeURIComponent).join('/');
    xhr.open('POST', dest);
    xhr.setRequestHeader('Authorization', 'Bearer ' + tk);
    if(!nas){ xhr.setRequestHeader('apikey', SUPA_KEY); xhr.setRequestHeader('x-upsert', 'false'); }
    xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
    xhr.setRequestHeader('Cache-Control', 'max-age=31536000');
    xhr.upload.onprogress = e => { if(e.lengthComputable && avanza) avanza(e.loaded / e.total); };
    const errore = (m, rete) => { const e = new Error(m); e.rete = !!rete; ko(e); };
    xhr.onload = () => {
      if(xhr.status >= 200 && xhr.status < 300){
        let r = {}; try{ r = JSON.parse(xhr.responseText || '{}'); }catch(e){}
        if(nas && !(r.url && /^https:\/\//.test(r.url))) return errore('Il server dei media non ha risposto bene', true);
        ok(nas ? {url: r.url} : {path});
      } else {
        let m = 'caricamento non riuscito (' + xhr.status + ')';
        try{ const j = JSON.parse(xhr.responseText); if(j && (j.message || j.error)) m = j.message || j.error; }catch(e){}
        if(!nas && /exceeded|too large|payload/i.test(m)) m = 'il file è troppo grande (massimo 50 MB)';
        errore(m, nas && (xhr.status >= 500 || xhr.status === 0));
      }
    };
    xhr.onerror = () => errore(nas ? 'Il server dei media sembra offline' : 'connessione assente', nas);
    xhr.send(blob);
  });
}

/* ---------- avvio: chi sono, le mie chat, le persone ---------- */
async function sessione(){
  if(!sb) return null;
  try{
    const {data} = await sb.auth.getSession();
    return data && data.session ? data.session.user : null;
  }catch(e){ return null; }
}
async function caricaProfilo(){
  const {data, error} = await sb.from('profili').select('id,nome,cognome,nickname,foto_url,ruolo,chat_cfg').eq('id', S.io).maybeSingle();
  if(error) throw error;
  S.me = data || {id: S.io};
  S.persone.set(S.io, {id: S.io, nome: ((data && data.nome) || '') + ' ' + ((data && data.cognome) || ''), nick: (data && data.nickname) || '',
                       foto: data && data.foto_url, ruolo: (data && data.ruolo) || ''});
  const c = data && data.chat_cfg;
  if(c && typeof c === 'object'){ Object.assign(S.cfg, c); memoria('cfg', S.cfg); applicaTema(); }
  aggiornaMe();
}
async function caricaPersone(extra){
  const [a, b] = await Promise.all([
    sb.rpc('chat_contatti'),
    extra && extra.length ? sb.rpc('chat_persone', {p_ids: extra}) : Promise.resolve({data: []})
  ]);
  if(a.error) throw a.error;
  S.contatti = [];
  (a.data || []).forEach(p => { S.persone.set(p.id, p); S.contatti.push(p.id); });
  (b.data || []).forEach(p => { if(!S.persone.has(p.id) || p.id !== S.io) S.persone.set(p.id, Object.assign(S.persone.get(p.id) || {}, p)); });
  aggiornaMe();
}
async function caricaElenco(){
  const {data, error} = await sb.rpc('chat_elenco');
  if(error) throw error;
  const vecchie = S.convs;
  S.convs = new Map();
  (data || []).forEach(c => {
    const v = vecchie.get(c.id);
    if(v && v._locale) c._locale = v._locale;
    S.convs.set(c.id, c);
  });
  const ids = new Set();
  S.convs.forEach(c => (c.membri || []).forEach(m => { if(!S.persone.has(m.id)) ids.add(m.id); }));
  if(ids.size){
    const {data: pp} = await sb.rpc('chat_persone', {p_ids: Array.from(ids)});
    (pp || []).forEach(p => S.persone.set(p.id, p));
  }
  pulisciAvvisi();
}
async function caricaNascosti(){
  const {data} = await sb.from('chat_nascosti').select('msg_id').limit(5000);
  S.nascosti = new Set((data || []).map(r => r.msg_id));
}
async function caricaRaccolta(){
  const {data} = await sb.from('chat_sticker').select('id,path,tipo,creato_il').order('creato_il', {ascending: false}).limit(500);
  S.sticker = (data || []).filter(x => x.tipo !== 'gif');
  S.gif = (data || []).filter(x => x.tipo === 'gif');
}
async function caricaPin(){
  const {data, error} = await sb.rpc('chat_protezione');
  if(error) throw error;
  S.haPin = !!(data && data.pin); S.tutto = !!(data && data.tutto);
}

/* ---------- messaggi di una conversazione ---------- */
const PAGINA = 50;
function statoMsgs(id){
  let s = S.msgs.get(id);
  if(!s){ s = {lista: [], tutti: false, caricando: false, ids: new Set(), caricato: false}; S.msgs.set(id, s); }
  return s;
}
async function caricaMessaggi(conv, prima){
  const s = statoMsgs(conv);
  if(s.caricando || (prima && s.tutti)) return [];
  s.caricando = true;
  try{
    const c = S.convs.get(conv);
    let q = sb.from('chat_messaggi').select('*').eq('conv_id', conv).order('creato_il', {ascending: false}).limit(PAGINA);
    if(prima && s.lista.length) q = q.lt('creato_il', s.lista[0].creato_il);
    if(c && c.svuotata_il) q = q.gt('creato_il', c.svuotata_il);
    const {data, error} = await q;
    if(error) throw error;
    const nuovi = (data || []).reverse().filter(m => !s.ids.has(m.id));
    if((data || []).length < PAGINA) s.tutti = true;
    nuovi.forEach(m => s.ids.add(m.id));
    s.lista = prima ? nuovi.concat(s.lista) : mescola(s.lista, nuovi);
    s.caricato = true;
    await caricaReazioni(nuovi.map(m => m.id));
    await caricaVoti(nuovi.filter(m => m.tipo === 'sondaggio').map(m => m.id));
    if(!prima && !S.fissati.has(conv)) caricaFissati(conv);
    /* i messaggi citati che non sono ancora caricati */
    const mancano = nuovi.filter(m => m.risponde_a && !trovaMsg(conv, m.risponde_a)).map(m => m.risponde_a);
    if(mancano.length){
      const {data: cc} = await sb.from('chat_messaggi').select('*').in('id', mancano.slice(0, 50));
      s.citati = s.citati || new Map();
      (cc || []).forEach(m => s.citati.set(m.id, m));
    }
    return nuovi;
  } finally { s.caricando = false; }
}
function mescola(a, b){
  const m = new Map();
  a.forEach(x => m.set(x.id, x));
  b.forEach(x => { const v = m.get(x.id); if(v && v !== x){ Object.assign(v, x); } else m.set(x.id, x); });
  return Array.from(m.values()).sort((x, y) => new Date(x.creato_il) - new Date(y.creato_il));
}
function trovaMsg(conv, id){
  const s = S.msgs.get(conv); if(!s) return null;
  return s.lista.find(m => m.id === id) || (s.citati && s.citati.get(id)) || null;
}
async function caricaReazioni(ids){
  if(!ids.length) return;
  for(let i = 0; i < ids.length; i += 100){
    const {data} = await sb.from('chat_reazioni').select('msg_id,utente_id,emoji').in('msg_id', ids.slice(i, i + 100));
    (data || []).forEach(r => { if(!S.reazioni.has(r.msg_id)) S.reazioni.set(r.msg_id, new Map()); S.reazioni.get(r.msg_id).set(r.utente_id, r.emoji); });
  }
}

/* ---------- voti dei sondaggi ---------- */
async function caricaVoti(ids){
  if(!ids.length) return;
  for(let i = 0; i < ids.length; i += 100){
    const pezzo = ids.slice(i, i + 100);
    const {data, error} = await sb.from('chat_voti').select('msg_id,utente_id,opzione').in('msg_id', pezzo);
    if(error) return;
    pezzo.forEach(id => S.voti.set(id, new Map()));
    (data || []).forEach(r => mettiVoto(r.msg_id, r.utente_id, r.opzione));
  }
}
function mettiVoto(msg, u, o){
  if(!S.voti.has(msg)) S.voti.set(msg, new Map());
  const v = S.voti.get(msg); if(!v.has(u)) v.set(u, new Set());
  v.get(u).add(o);
}
function togliVoto(msg, u, o){
  const v = S.voti.get(msg); if(!v || !v.has(u)) return;
  v.get(u).delete(o); if(!v.get(u).size) v.delete(u);
}
/* ---------- messaggi fissati di una chat ---------- */
async function caricaFissati(conv){
  const {data, error} = await sb.from('chat_messaggi').select('*').eq('conv_id', conv).not('fissato_il', 'is', null).order('fissato_il', {ascending: false}).limit(10);
  if(error) return;
  S.fissati.set(conv, (data || []).filter(m => !m.eliminato));
  if(conv === S.aperta) disegnaFissati();
}
function aggiornaFissato(m){
  const l = S.fissati.get(m.conv_id); if(!l) return;
  const i = l.findIndex(x => x.id === m.id);
  if(m.fissato_il && !m.eliminato){ if(i >= 0) l[i] = Object.assign(l[i], m); else l.unshift(m); }
  else if(i >= 0) l.splice(i, 1);
  l.sort((a, b) => new Date(b.fissato_il) - new Date(a.fissato_il));
  if(m.conv_id === S.aperta) disegnaFissati();
}
/* ---------- le mie cose personali: stelle, promemoria, programmati ---------- */
async function caricaMieCose(){
  const [a, b, c] = await Promise.all([
    sb.from('chat_importanti').select('msg_id,conv_id').limit(3000),
    sb.from('chat_promemoria').select('id,msg_id,conv_id,quando').limit(1000),
    sb.from('chat_programmati').select('*').order('quando').limit(500)
  ]);
  if(!a.error) S.importanti = new Set((a.data || []).map(r => r.msg_id));
  if(!b.error){ S.promemoria = new Map(); (b.data || []).forEach(r => S.promemoria.set(r.msg_id, r)); }
  if(!c.error) S.programmati = c.data || [];
  orologioPromemoria();
}

/* ---------- spunte: inviato, arrivato, letto ---------- */
function statoSpunte(m, c){
  if(m._stato === 'invio') return 'invio';
  if(m._stato === 'errore') return 'errore';
  const altri = (c.membri || []).filter(x => x.id !== S.io);
  if(!altri.length) return 'letto';
  const t = new Date(m.creato_il).getTime();
  if(altri.every(x => new Date(x.letto).getTime() >= t)) return 'letto';
  if(altri.every(x => new Date(x.ricevuto).getTime() >= t)) return 'arrivato';
  return 'inviato';
}

/* ---------- tempo reale ---------- */
let canaleDb = null, canaleOnline = null, canaleScrive = null;
/* v2.2: il tempo reale si rimette in piedi da solo. Se il collegamento cade (telefono in tasca,
   scheda in secondo piano, rete che cambia, accesso rinnovato) ricreo i canali e rimetto in pari
   la chat, senza dover ricaricare la pagina. */
let tRiavvio = null, tentativiRiavvio = 0, giroCanali = 0, avviatoIl = 0;
function chiudiCanali(){
  giroCanali++;
  [canaleDb, canaleOnline, canaleScrive].forEach(c => { if(c) try{ sb.removeChannel(c); }catch(e){} });
  canaleDb = canaleOnline = canaleScrive = null;
}
function riavviaTempoReale(subito){
  clearTimeout(tRiavvio);
  const attesa = subito ? 0 : Math.min(30000, 1500 * Math.pow(2, tentativiRiavvio++));
  tRiavvio = setTimeout(() => { chiudiCanali(); avviaTempoReale(); }, attesa);
}
function canaliVivi(){
  if(canaleDb && canaleDb.state === 'joining' && Date.now() - avviatoIl < 12000) return true;   /* si sta collegando */
  return !!(canaleDb && canaleDb.state === 'joined' && sb.realtime && sb.realtime.isConnected && sb.realtime.isConnected());
}
/* torni sulla chat, la rete torna, o ogni tanto: controllo il collegamento e rimetto in pari */
const firmaElenco = l => l.map(c => c.id + ':' + ((c.ultimo && c.ultimo.id) || '') + ':' + (c.non_lette || 0)).sort().join('|');
async function controllaTempoReale(periodico){
  if(!S.pronti) return;
  if(!canaliVivi()){ riavviaTempoReale(true); recupera(); return; }
  if(!periodico){ recupera(); return; }
  /* collegamento in piedi: controllo leggero, rimetto in pari solo se manca qualcosa */
  try{
    const {data, error} = await sb.rpc('chat_elenco');
    if(error) return;
    if(firmaElenco(data || []) !== firmaElenco(Array.from(S.convs.values()))) recupera();
  }catch(e){}
}
function avviaTempoReale(){
  const giro = ++giroCanali; avviatoIl = Date.now();
  const st0 = st => {
    if(giro !== giroCanali) return;   /* un canale vecchio che ho chiuso io: non conta */
    if(st === 'SUBSCRIBED'){ tentativiRiavvio = 0; if(S.pronti) recupera(); }
    else if(st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') riavviaTempoReale();
  };
  canaleDb = sb.channel('fosschat-db')
    .on('postgres_changes', {event: 'INSERT', schema: 'public', table: 'chat_messaggi'}, p => arrivaMessaggio(p.new))
    .on('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'chat_messaggi'}, p => cambiaMessaggio(p.new))
    .on('postgres_changes', {event: '*', schema: 'public', table: 'chat_membri'}, p => cambiaMembro(p))
    .on('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'chat_conversazioni'}, p => cambiaConv(p.new))
    .on('postgres_changes', {event: '*', schema: 'public', table: 'chat_reazioni'}, p => cambiaReazione(p))
    .on('postgres_changes', {event: '*', schema: 'public', table: 'chat_voti'}, p => cambiaVoto(p))
    .on('postgres_changes', {event: '*', schema: 'public', table: 'chat_programmati'}, p => cambiaProgrammato(p))
    .on('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'progetti'}, p => lavoroCambiato(p.new && p.new.id))
    .on('postgres_changes', {event: '*', schema: 'public', table: 'elementi'}, p => { const r = p.new && p.new.progetto_id ? p.new : p.old; if(r && (!r.tipo || r.tipo === 'evento' || r.tipo === 'voce')) lavoroCambiato(r.progetto_id); })
    .subscribe(st0);

  canaleOnline = sb.channel('fosschat-online', {config: {presence: {key: S.io}}});
  canaleOnline.on('presence', {event: 'sync'}, () => {
    const st = canaleOnline.presenceState();
    const prima = S.online;
    S.online = new Set(Object.keys(st));
    notaEntrati(prima, S.online);
    aggiornaTestaConv(); disegnaListaPresto();
  }).subscribe(async st => { if(st === 'SUBSCRIBED') onlinePronto = Date.now(); if(st === 'SUBSCRIBED') try{ await canaleOnline.track({id: S.io, dal: Date.now()}); }catch(e){} });

  canaleScrive = sb.channel('fosschat-scrive');
  canaleScrive.on('broadcast', {event: 'scrive'}, ({payload}) => {
    if(!payload || payload.chi === S.io || !S.convs.has(payload.conv)) return;
    if(!S.scrive.has(payload.conv)) S.scrive.set(payload.conv, new Map());
    S.scrive.get(payload.conv).set(payload.chi, {fino: Date.now() + 4500, cosa: payload.cosa || 'scrive'});
    aggiornaTestaConv(); disegnaListaPresto();
    setTimeout(() => { aggiornaTestaConv(); disegnaListaPresto(); }, 4700);
  }).subscribe();
}
let ultimoScrivo = 0;
function dicoCheScrivo(cosa){
  if(!S.aperta || !canaleScrive) return;
  const t = Date.now(); if(t - ultimoScrivo < 2500) return; ultimoScrivo = t;
  canaleScrive.send({type: 'broadcast', event: 'scrive', payload: {conv: S.aperta, chi: S.io, cosa: cosa || 'scrive'}}).catch(() => {});
}
function chiScrive(conv){
  const m = S.scrive.get(conv); if(!m) return [];
  const t = Date.now(), r = [];
  m.forEach((v, k) => { if(v.fino > t) r.push({id: k, cosa: v.cosa}); else m.delete(k); });
  return r;
}
/* dopo una disconnessione rimetto in pari l'elenco e la chat aperta */
let recuperoInCorso = null;
function recupera(){
  if(recuperoInCorso) return recuperoInCorso;
  recuperoInCorso = recuperaOra().finally(() => { recuperoInCorso = null; });
  return recuperoInCorso;
}
async function recuperaOra(){
  try{
    await caricaElenco();
    if(S.aperta && S.convs.has(S.aperta)){
      const nuovi = await caricaMessaggi(S.aperta);
      if(nuovi.length) disegnaMessaggi(true);
    }
    disegnaLista();
  }catch(e){}
}

function arrivaMessaggio(m){
  const c = S.convs.get(m.conv_id);
  if(!c){ recupera(); return; }
  if(m.media && m.media.importato){ arrivaImportato(m); return; }
  const s = statoMsgs(m.conv_id);
  const gia = s.ids.has(m.id);
  if(s.caricato || m.conv_id === S.aperta){
    s.ids.add(m.id);
    s.lista = mescola(s.lista, [m]);
  }
  if(!c.ultimo || new Date(m.creato_il) >= new Date(c.ultimo.creato_il)){
    c.ultimo = {id: m.id, autore: m.autore, tipo: m.tipo, testo: c.bloccata ? null : (m.testo || '').slice(0, 140), creato_il: m.creato_il,
                eliminato: m.eliminato, media: c.bloccata ? null : m.media};
    c.ultimo_il = m.creato_il;
  }
  const mio = m.autore === S.io;
  if(!gia && !mio && m.tipo !== 'sistema'){
    S.scrive.get(m.conv_id) && S.scrive.get(m.conv_id).delete(m.autore);
    /* letto solo se lo stai davvero guardando: chat aperta, finestra davanti a te, in fondo ai messaggi */
    const guardo = m.conv_id === S.aperta && document.visibilityState === 'visible' && finestraAttiva() && vicinoAlFondo() && sbloccata(c);
    const menz = menzionaMe(m), muto = m.media && m.media.silenzioso;
    if(guardo){ segnaLetto(m.conv_id); }
    else {
      c.non_lette = (c.non_lette || 0) + 1;
      if(menz) c.menzioni = (c.menzioni || 0) + 1;
      if((!c.silenziata || menz) && !muto && (m.tipo !== 'colpetto' || m.media.a === S.io)) suono('arrivo');
    }
    if(m.tipo === 'colpetto' && m.media && m.media.a === S.io) colpettoRicevuto(m, guardo);
    aggiornaTitolo();
  }
  if(m.conv_id === S.aperta && !gia){
    aggiungiMessaggioAlFondo(m, !mio);
    if(!mio && m.media && m.media.schermo && !S.visti.has(m.id) && sbloccata(c)) eseguiEffettoSchermo(m);
  }
  disegnaLista();
}
function cambiaMessaggio(m){
  const s = S.msgs.get(m.conv_id);
  if(s){
    const i = s.lista.findIndex(x => x.id === m.id);
    if(i >= 0){ s.lista[i] = Object.assign(s.lista[i], m); ridisegnaMessaggio(m.id); }
    else if(s.citati && s.citati.has(m.id)) Object.assign(s.citati.get(m.id), m);
  }
  if('fissato_il' in m) aggiornaFissato(m);
  if(m.eliminato){ S.importanti.delete(m.id); S.promemoria.delete(m.id); }
  if(S.modifica && S.modifica.id === m.id && m.eliminato) annullaModifica();
  const c = S.convs.get(m.conv_id);
  if(c && c.ultimo && c.ultimo.id === m.id){
    c.ultimo.eliminato = m.eliminato;
    if(m.eliminato){ c.ultimo.testo = null; c.ultimo.media = null; }
    else if(!c.bloccata){ c.ultimo.testo = (m.testo || '').slice(0, 140); c.ultimo.media = m.media; c.ultimo.modificato_il = m.modificato_il; }
    disegnaLista();
  }
}
function cambiaVoto(p){
  const r = p.eventType === 'DELETE' ? p.old : p.new;
  if(!r || !r.msg_id || !r.utente_id) return;
  if(p.eventType === 'DELETE') togliVoto(r.msg_id, r.utente_id, r.opzione);
  else mettiVoto(r.msg_id, r.utente_id, r.opzione);
  if(S.aperta) ridisegnaMessaggio(r.msg_id);
}
function cambiaProgrammato(p){
  if(p.eventType === 'DELETE'){ const id = p.old && p.old.id; S.programmati = S.programmati.filter(x => x.id !== id); }
  else if(p.new && p.new.id && p.new.autore === S.io){
    const i = S.programmati.findIndex(x => x.id === p.new.id);
    if(i >= 0) S.programmati[i] = p.new; else S.programmati.push(p.new);
    S.programmati.sort((a, b) => new Date(a.quando) - new Date(b.quando));
  }
  disegnaBarraProgrammati();
}
function cambiaMembro(p){
  const n = p.new && p.new.conv_id ? p.new : null, o = p.old || {};
  const conv = (n && n.conv_id) || o.conv_id;
  if(p.eventType === 'DELETE'){
    if(o.utente_id === S.io || !o.utente_id){ recupera(); return; }
    const c = S.convs.get(conv); if(c){ c.membri = (c.membri || []).filter(x => x.id !== o.utente_id); aggiornaTestaConv(); }
    return;
  }
  if(!n) return;
  const c = S.convs.get(conv);
  if(!c){ if(n.utente_id === S.io) recupera(); return; }
  if(n.utente_id === S.io){
    const prima = c.letto_fino;
    ['silenziata','archiviata','fissata','svuotata_il','bloccata','letto_fino','ruolo'].forEach(k => { if(k in n) c[k] = n[k]; });
    /* letta su un altro dispositivo (per esempio sul telefono): qui spariscono il numero e gli avvisi */
    if(n.letto_fino && (c.non_lette || c.menzioni) && (!prima || new Date(n.letto_fino) > new Date(prima))
       && (!c.ultimo || new Date(n.letto_fino) >= new Date(c.ultimo.creato_il))){
      c.non_lette = 0; c.menzioni = 0; aggiornaTitolo(); chiudiAvvisi(conv);
    }
  }
  let mm = (c.membri || []).find(x => x.id === n.utente_id);
  if(!mm){ mm = {id: n.utente_id}; c.membri = (c.membri || []).concat([mm]); if(!S.persone.has(n.utente_id)) caricaPersone([n.utente_id]).then(() => aggiornaTestaConv()); }
  mm.ruolo = n.ruolo; mm.letto = n.letto_fino; mm.ricevuto = n.ricevuto_fino;
  if(conv === S.aperta) aggiornaSpunte();
  disegnaListaPresto();
}
function cambiaConv(n){
  const c = S.convs.get(n.id); if(!c) return;
  ['nome','descrizione','foto','ultimo_il'].forEach(k => { c[k] = n[k]; });
  if(n.id === S.aperta) aggiornaTestaConv();
  disegnaListaPresto();
  if(infoAperta === n.id) disegnaInfo();
}
function cambiaReazione(p){
  const r = p.eventType === 'DELETE' ? p.old : p.new;
  if(!r || !r.msg_id) return;
  if(p.eventType === 'DELETE'){ const m = S.reazioni.get(r.msg_id); if(m && r.utente_id) m.delete(r.utente_id); }
  else { if(!S.reazioni.has(r.msg_id)) S.reazioni.set(r.msg_id, new Map()); S.reazioni.get(r.msg_id).set(r.utente_id, r.emoji); }
  ridisegnaMessaggio(r.msg_id);
}

/* ---------- letto ---------- */
const letturaInCoda = new Set();
const segnaLettoPresto = debounce(async () => {
  const ids = Array.from(letturaInCoda); letturaInCoda.clear();
  for(const id of ids){ try{ await sb.rpc('chat_letto', {p_conv: id}); }catch(e){} }
}, 500);
function segnaLetto(conv){
  const c = S.convs.get(conv); if(!c) return;
  c.non_lette = 0; c.menzioni = 0; c.letto_fino = new Date().toISOString();
  letturaInCoda.add(conv); segnaLettoPresto(); aggiornaTitolo(); chiudiAvvisi(conv);
}

/* ---------- avvisi sul dispositivo: letta una chat, i suoi spariscono (come su WhatsApp) ---------- */
function finestraAttiva(){ try{ return document.hasFocus(); }catch(e){ return true; } }
function avvisiSW(fai){
  try{
    if(!('serviceWorker' in navigator) || !navigator.serviceWorker.getRegistration) return;
    navigator.serviceWorker.getRegistration().then(reg => { if(reg && reg.getNotifications) return fai(reg); }).catch(() => {});
  }catch(e){}
}
function chiudiAvvisi(conv){
  avvisiSW(reg => reg.getNotifications().then(ns => ns.forEach(n => {
    if(n.tag === 'fosschat-' + conv || n.tag === 'fosschat-colpetto-' + conv) n.close();
  })));
}
/* all'apertura e quando torno sulla chat: via gli avvisi delle chat gia' lette (anche su un altro dispositivo) */
function pulisciAvvisi(){
  avvisiSW(reg => reg.getNotifications().then(ns => ns.forEach(n => {
    const m = /^fosschat-(?:colpetto-)?([0-9a-f-]{36})$/.exec(n.tag || '');
    const c = m && S.convs.get(m[1]);
    if(c && !c.non_lette) n.close();
  })));
}
function aggiornaTitolo(){
  let n = 0; S.convs.forEach(c => { if(!c.silenziata && !c.archiviata && c.non_lette) n++; });
  document.title = (n ? '(' + n + ') ' : '') + 'FOSS.chat';
  const tb = el('tabBadge'); if(tb){ tb.textContent = n > 99 ? '99+' : n; tb.classList.toggle('nascosto', !n); }
  try{ if(navigator.setAppBadge) n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); }catch(e){}
}

/* ---------- presenza: sono qui, i messaggi mi arrivano ---------- */
async function ping(){ if(document.visibilityState === 'visible') try{ await sb.rpc('chat_ping'); }catch(e){} }

/* ---------- impostazioni dell'account (salvate nel profilo FOSS) ---------- */
const salvaCfgPresto = debounce(async () => {
  try{ await sb.from('profili').update({chat_cfg: S.cfg}).eq('id', S.io); }catch(e){}
}, 800);
function cambiaCfg(k, v){
  S.cfg[k] = v; memoria('cfg', S.cfg); salvaCfgPresto();
}
