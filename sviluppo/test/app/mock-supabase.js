/* Finto Supabase per provare FOSS.chat senza rete. Database in memoria, tempo reale simulato. */
(function(){
  const D = '4eed8596-7067-4cbb-aa2e-d60047930450', MO = '1f8e0e39-d7e4-4a67-b3f0-e71d8a71ab17', AN = '6f8c402a-4b36-4c97-80cf-e6c1d538623a', SE = '2ee54db8-9fba-45ea-9719-75fdeb4e4759';
  const io = (window.__IO || D);
  const ora = () => new Date().toISOString();
  const uid = () => crypto.randomUUID();
  const t0 = Date.now();
  const fa = m => new Date(t0 - m * 60000).toISOString();
  const db = {
    profili: [
      {id: D, nome: 'Davide', cognome: 'Morabito', nickname: 'davidemorabito', foto_url: null, ruolo: 'Regia · Montaggio', tema: 'dark', cfg: {}, chat_cfg: (window.__CFG || {}).chat || {}},
      {id: MO, nome: 'Monica', cognome: 'Mancini', nickname: 'Momo', foto_url: null, ruolo: 'Operatrice video'},
      {id: AN, nome: 'Antonio', cognome: 'Del Latte', nickname: '', foto_url: null, ruolo: 'Fonico'},
      {id: SE, nome: 'Sergio', cognome: 'Pellino', nickname: '', foto_url: null, ruolo: 'Colorist'},
    ],
    chat_conversazioni: [], chat_membri: [], chat_messaggi: [], chat_reazioni: [], chat_nascosti: [], chat_sticker: [], chat_presenza: [{utente_id: MO, visto_il: fa(12)}],
    chat_voti: [], chat_programmati: [], chat_promemoria: [], chat_importanti: [], chat_letture: [],
    progetti: [], elementi: [],
    pin: window.__PIN || null, tutto: !!window.__TUTTO,
  };
  const C1 = uid(), G1 = uid();
  db.chat_conversazioni.push({id: C1, tipo: 'privata', nome: null, descrizione: '', foto: null, coppia: 'x', creata_da: D, creata_il: fa(3000), ultimo_il: fa(5)});
  db.chat_conversazioni.push({id: G1, tipo: 'gruppo', nome: 'Videoclip Il Merlo', descrizione: 'Riprese 13 ottobre', foto: null, creata_da: D, creata_il: fa(2000), ultimo_il: fa(2)});
  const mem = (c, u, r, letto) => db.chat_membri.push({conv_id: c, utente_id: u, ruolo: r || 'membro', aggiunto_il: fa(3000), letto_fino: letto || ora(), ricevuto_fino: letto || ora(), silenziata: false, archiviata: false, fissata: false, svuotata_il: null, bloccata: false});
  mem(C1, D, 'admin', fa(30)); mem(C1, MO, 'admin', fa(1));
  mem(G1, D, 'admin', fa(10)); mem(G1, MO); mem(G1, AN, 'membro', fa(60));
  const msg = (c, a, testo, min, extra) => db.chat_messaggi.push(Object.assign({id: uid(), conv_id: c, autore: a, tipo: 'testo', testo, media: null, risponde_a: null, creato_il: fa(min), eliminato: false}, extra || {}));
  msg(C1, MO, 'Ciao Davide! Domani alle 9 in studio?', 1500);
  msg(C1, D, 'Sì, porto le luci Zhiyun e il Ronin 👍', 1490);
  msg(C1, MO, 'Perfetto *grazie*! Ti mando la scaletta', 40);
  msg(C1, MO, 'https://foss.team è il link del progetto', 20);
  msg(C1, MO, '😂', 5);
  msg(G1, D, 'Davide ha creato il gruppo «Videoclip Il Merlo»', 2000, {tipo: 'sistema'});
  msg(G1, AN, 'Ho controllato i microfoni, tutto ok', 300);
  msg(G1, MO, 'Ecco la location', 200, {tipo: 'foto', testo: null, media: {path: G1 + '/loc.jpg', w: 1600, h: 1067, mini: ''}});
  msg(G1, AN, 'Vocale per te', 150, {tipo: 'vocale', testo: null, media: {path: G1 + '/v.m4a', dur: 14.2, onda: 'BDHLPTXbfjnrvzzvrnjfbXTPLHDBDHLPTXbfjnrvz'}});
  msg(G1, MO, 'Questa sta sul NAS', 100, {tipo: 'foto', testo: null, media: {url: 'https://nas-spento.invalid/media/x.jpg', w: 800, h: 600}});
  msg(G1, MO, 'Ok ragazzi a domani!', 2, {media: {schermo: 'coriandoli'}});

  /* ---- lavori di FOSS finti ---- */
  const O1 = '9ee833a0-d3bc-47ca-b838-0bbf8c1d113b';
  const giorno = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const cop = (function(){ const c = document.createElement('canvas'); c.width = 320; c.height = 180; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 320, 180);
    gr.addColorStop(0, '#2b1a3d'); gr.addColorStop(1, '#ff9a5c'); g.fillStyle = gr; g.fillRect(0, 0, 320, 180); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(240, 60, 26, 0, 7); g.fill();
    g.fillStyle = '#120a1c'; g.fillRect(0, 130, 320, 50); return c.toDataURL('image/jpeg', .8); })();
  db.progetti.push({org_id: O1, id: 'p1001', aggiornato_il: fa(30), dati: {nome: 'Videoclip Il Merlo', cliente: 'Carolina Benvegna', tipo: 'video', col: '#C3B1F0', icona: 'camera', fase: 1,
    fasi: [{nome: 'Brief'}, {nome: 'Piano'}, {nome: 'Produzione'}, {nome: 'Revisione'}, {nome: 'Consegna'}], team: [D, MO, AN], indirizzo: 'Milano, Via Berna 15', consegna: '20/12/2026',
    copertina: cop, copRit: {bacheca: {x: 50, y: 40, z: 1}}, completato: false}});
  db.progetti.push({org_id: O1, id: 'p1002', aggiornato_il: fa(300), dati: {nome: 'Aftermovie Piano City', cliente: 'Piano City Milano', tipo: 'video', col: '#FFAD01', icona: 'camera', fase: 4,
    fasi: [{nome: 'Brief'}, {nome: 'Piano'}, {nome: 'Produzione'}, {nome: 'Revisione'}, {nome: 'Consegna'}], team: [D, MO], indirizzo: 'Cortili di Brera, Milano', completato: true}});
  db.progetti.push({org_id: O1, id: 'p1003', aggiornato_il: fa(900), dati: {nome: 'Spot interno Q4', cliente: 'Esselunga', tipo: 'video', col: '#7FC8F8', fase: 2, team: [D], completato: false}});
  db.progetti.push({org_id: O1, id: 'p9999', segreto: true, aggiornato_il: fa(10), dati: {nome: 'Lavoro segreto', cliente: 'X', team: ['altro']}});
  [['p1001', 'evento', {d: giorno(3), t: 'Riprese', ora: '09:00'}], ['p1001', 'evento', {d: giorno(12), t: 'Consegna Videoclip Il Merlo', c: 1}],
   ['p1001', 'voce', {t: 'a', done: true}], ['p1001', 'voce', {t: 'b', done: true}], ['p1001', 'voce', {t: 'c', done: false}], ['p1001', 'voce', {t: 'd', done: false}], ['p1001', 'voce', {t: 'e', done: false}],
   ['p1002', 'evento', {d: giorno(-40), t: 'Riprese'}], ['p1003', 'evento', {d: giorno(1), t: 'Riprese giornata 2'}]]
    .forEach((x, i) => db.elementi.push({org_id: O1, progetto_id: x[0], id: 'e' + i, tipo: x[1], dati: x[2]}));
  const vedeLavoro = pr => !pr.segreto;
  const schedaLavoro = pr => {
    const ev = db.elementi.filter(e => e.progetto_id === pr.id && e.tipo === 'evento').map(e => ({d: e.dati.d, t: e.dati.t, ora: e.dati.ora || null, c: e.dati.c || null})).sort((a, b) => a.d < b.d ? -1 : 1);
    const vv = db.elementi.filter(e => e.progetto_id === pr.id && e.tipo === 'voce');
    const d = pr.dati;
    return {id: pr.id, org: pr.org_id, spazio: 'sp1', nome: d.nome || '', cliente: d.cliente || '', col: d.col || null, icona: d.icona || null, tipo: d.tipo || 'video', fase: d.fase || 0,
      fasi: d.fasi ? d.fasi.map(f => f.nome) : null, completato: !!d.completato, consegna: d.consegna || null, indirizzo: d.indirizzo || null, team: d.team || [], protetto: false,
      copertina: d.copertina || null, posizione: d.copRit ? d.copRit.bacheca : null, eventi: ev.length ? ev : null, voci: {fatte: vv.filter(v => v.dati.done).length, tot: vv.length}, aggiornato: pr.aggiornato_il, da_chat: d.daChat || null};
  };
  window.__lavoriChiesti = [];

  const storage = new Map();
  /* un'immagine finta per la location */
  (function(){ const c = document.createElement('canvas'); c.width = 400; c.height = 267; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 400, 267); gr.addColorStop(0, '#ff9a5c'); gr.addColorStop(1, '#3b6ea8'); g.fillStyle = gr; g.fillRect(0, 0, 400, 267); g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.fillText('Location', 110, 145); c.toBlob(b => storage.set(G1 + '/loc.jpg', b), 'image/jpeg'); })();
  storage.set(G1 + '/v.m4a', new Blob([new Uint8Array(100)], {type: 'audio/mp4'}));

  /* ---- tempo reale ---- */
  const canali = [];
  function emetti(table, eventType, nuovo, vecchio){
    setTimeout(() => canali.forEach(ch => ch.h.forEach(h => {
      if(h.tipo !== 'postgres_changes') return;
      if(h.f.table !== table) return;
      if(h.f.event !== '*' && h.f.event !== eventType) return;
      /* RLS: vedo solo le conversazioni di cui faccio parte */
      const r = nuovo || vecchio || {};
      const conv = table === 'chat_conversazioni' ? r.id : r.conv_id;
      if(conv && !db.chat_membri.some(m => m.conv_id === conv && m.utente_id === io) && !(eventType === 'DELETE')) return;
      h.cb({eventType, new: nuovo || {}, old: vecchio || {}, table});
    })), 30);
  }
  function Canale(nome){ this.nome = nome; this.h = []; this.stato = {}; canali.push(this); }
  Canale.prototype.on = function(tipo, f, cb){ this.h.push({tipo, f, cb}); return this; };
  Canale.prototype.subscribe = function(cb){ setTimeout(() => cb && cb('SUBSCRIBED'), 10); return this; };
  Canale.prototype.presenceState = function(){ return {[io]: [{}], [MO]: [{}]}; };
  Canale.prototype.track = async function(){ setTimeout(() => this.h.filter(x => x.tipo === 'presence').forEach(x => x.cb()), 20); };
  Canale.prototype.send = async function(){ return 'ok'; };

  /* ---- interrogazioni ---- */
  function Q(tab){ this.tab = tab; this.f = []; this.ord = null; this.lim = null; this.op = 'select'; this.uno = false; this.rit = false; }
  const filtri = {
    eq: (k, v) => r => r[k] === v, lt: (k, v) => r => r[k] < v, gt: (k, v) => r => r[k] > v,
    in: (k, v) => r => v.includes(r[k]), ilike: (k, v) => { const re = new RegExp('^' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i'); return r => re.test(r[k] || ''); },
  };
  Object.keys(filtri).forEach(n => { Q.prototype[n] = function(k, v){ this.f.push(filtri[n](k, v)); return this; }; });
  Q.prototype.not = function(k, op, v){ if(op === 'is' && v === null) this.f.push(r => percorso(r, k) != null); else this.f.push(r => r[k] !== v); return this; };
  Q.prototype.is = function(k, v){ this.f.push(r => (r[k] == null) === (v === null)); return this; };
  const percorso = (r, k) => k.split(/->>?/).reduce((o, x) => o == null ? o : o[x], r);
  Q.prototype.select = function(c){ if(this.op !== 'select') this.rit = true; else if(c && /->/.test(c)){ const m = /^(\w+):(.+)$/.exec(c); this.proj = m ? [m[1], m[2]] : null; } return this; };
  Q.prototype.range = function(a, b){ this.da = a; this.lim = b - a + 1; return this; };
  Q.prototype.order = function(k, o){ this.ord = [k, o && o.ascending === false ? -1 : 1]; return this; };
  Q.prototype.limit = function(n){ this.lim = n; return this; };
  Q.prototype.maybeSingle = function(){ this.uno = true; return this; };
  Q.prototype.single = function(){ this.uno = true; return this; };
  Q.prototype.insert = function(r){ this.op = 'insert'; this.dati = Array.isArray(r) ? r : [r]; return this; };
  Q.prototype.upsert = function(r){ this.op = 'upsert'; this.dati = Array.isArray(r) ? r : [r]; return this; };
  Q.prototype.update = function(r){ this.op = 'update'; this.dati = r; return this; };
  Q.prototype.delete = function(){ this.op = 'delete'; return this; };
  Q.prototype.then = function(ok, ko){ return new Promise(r => setTimeout(r, 25)).then(() => this.esegui()).then(ok, ko); };
  Q.prototype.esegui = function(){
    const T = db[this.tab]; if(!T) return {data: null, error: {message: 'tabella ' + this.tab}};
    let righe = T.filter(r => this.f.every(f => f(r)));
    if(this.tab === 'chat_messaggi' && this.op === 'select') righe = righe.filter(r => db.chat_membri.some(m => m.conv_id === r.conv_id && m.utente_id === io));
    if(this.tab === 'chat_voti' && this.op === 'select') righe = righe.filter(r => db.chat_membri.some(m => m.conv_id === r.conv_id && m.utente_id === io));
    if(['chat_programmati'].includes(this.tab)) righe = righe.filter(r => r.autore === io);
    if(['chat_promemoria','chat_importanti'].includes(this.tab)) righe = righe.filter(r => r.utente_id === io);
    if(this.tab === 'chat_letture' && this.op === 'select') righe = righe.filter(r => { const m = db.chat_messaggi.find(x => x.id === r.msg_id); return m && m.autore === io; });
    if(this.op === 'select'){
      if(this.ord) righe.sort((a, b) => (a[this.ord[0]] > b[this.ord[0]] ? 1 : -1) * this.ord[1]);
      if(this.lim) righe = righe.slice(this.da || 0, (this.da || 0) + this.lim);
      righe = righe.map(r => JSON.parse(JSON.stringify(r)));
      if(this.proj) righe = righe.map(r => ({[this.proj[0]]: percorso(r, this.proj[1])}));
      return {data: this.uno ? righe[0] || null : righe, error: null};
    }
    if(this.op === 'insert' || this.op === 'upsert'){
      const fatte = [];
      for(const d of this.dati){
        const r = Object.assign({}, d);
        if(this.tab === 'chat_messaggi'){
          if(!db.chat_membri.some(m => m.conv_id === r.conv_id && m.utente_id === io)) return {data: null, error: {message: 'new row violates row-level security policy'}};
          r.id = r.id || uid(); r.autore = io; r.creato_il = ora(); r.eliminato = false; r.testo = r.testo || null; r.media = r.media || null; r.risponde_a = r.risponde_a || null;
          r.modificato_il = null; r.fissato_il = null; r.fissato_da = null;
          if(r.tipo === 'testo' && r.media && Object.keys(r.media).some(k => !['bolla','schermo','anim','menzioni','tutti','lavori','silenzioso'].includes(k))) return {data: null, error: {message: 'effetto non valido'}};
          if(r.tipo === 'sondaggio' && (!r.media || !Array.isArray(r.media.opzioni) || r.media.opzioni.length < 2)) return {data: null, error: {message: 'sondaggio non valido'}};
          if(r.tipo === 'lavoro' && (!r.media || !r.media.lavoro || !/^[0-9a-f-]{36}$/.test(r.media.lavoro.org || ''))) return {data: null, error: {message: 'lavoro non valido'}};
          if(r.tipo === 'colpetto'){
            if(!r.media || !r.media.a || r.media.a === io || !db.chat_membri.some(m => m.conv_id === r.conv_id && m.utente_id === r.media.a)) return {data: null, error: {message: 'colpetto non valido'}};
            if(db.chat_messaggi.some(x => x.tipo === 'colpetto' && x.conv_id === r.conv_id && x.autore === io && x.media.a === r.media.a && Date.now() - new Date(x.creato_il) < 10000)) return {data: null, error: {message: 'aspetta qualche secondo prima di un altro colpetto'}};
            r.testo = null;
          }
          if(r.tipo !== 'testo' && r.media && r.media.path && !r.media.path.startsWith(r.conv_id + '/') && !/^sticker\/|^foss:/.test(r.media.path)) return {data: null, error: {message: 'percorso del file non valido'}};
          const c = db.chat_conversazioni.find(x => x.id === r.conv_id); c.ultimo_il = r.creato_il;
          const m = db.chat_membri.find(x => x.conv_id === r.conv_id && x.utente_id === io); m.letto_fino = m.ricevuto_fino = r.creato_il;
          setTimeout(() => emetti('chat_membri', 'UPDATE', Object.assign({}, m)), 5);
        }
        if(this.tab === 'chat_sticker'){ r.id = uid(); r.utente_id = io; r.creato_il = ora(); r.tipo = r.tipo || 'sticker'; }
        if(this.tab === 'chat_programmati'){
          if(!db.chat_membri.some(m => m.conv_id === r.conv_id && m.utente_id === io)) return {data: null, error: {message: 'new row violates row-level security policy'}};
          if(new Date(r.quando) < Date.now() - 60000) return {data: null, error: {message: 'new row violates row-level security policy'}};
          r.id = r.id || uid(); r.autore = io; r.creato_il = ora(); r.media = r.media || null; r.risponde_a = r.risponde_a || null;
        }
        if(this.tab === 'chat_promemoria'){
          r.id = r.id || uid(); r.utente_id = io; r.creato_il = ora();
          const i = T.findIndex(x => x.utente_id === io && x.msg_id === r.msg_id);
          if(i >= 0){ if(this.op !== 'upsert') return {data: null, error: {message: 'duplicate key'}}; r.id = T[i].id; T[i] = r; fatte.push(r); continue; }
        }
        if(this.tab === 'chat_importanti'){
          r.utente_id = io; r.creato_il = ora();
          if(T.some(x => x.utente_id === io && x.msg_id === r.msg_id)) return {data: null, error: {message: 'duplicate key'}};
        }
        if(this.op === 'upsert' && this.tab === 'chat_reazioni'){
          const i = T.findIndex(x => x.msg_id === r.msg_id && x.utente_id === r.utente_id);
          if(i >= 0){ T[i] = r; emetti(this.tab, 'UPDATE', r); fatte.push(r); continue; }
        }
        if(this.tab === 'chat_nascosti' && T.some(x => x.msg_id === r.msg_id && x.utente_id === r.utente_id)) return {data: null, error: {message: 'duplicate key'}};
        T.push(r); fatte.push(r);
        emetti(this.tab, 'INSERT', r);
      }
      return {data: this.uno ? fatte[0] : fatte, error: null};
    }
    if(this.op === 'update'){
      righe.forEach(r => { Object.assign(r, this.dati); emetti(this.tab, 'UPDATE', Object.assign({}, r)); });
      return {data: righe, error: null};
    }
    if(this.op === 'delete'){
      righe.forEach(r => { T.splice(T.indexOf(r), 1); emetti(this.tab, 'DELETE', null, this.tab === 'chat_reazioni' ? {msg_id: r.msg_id, utente_id: r.utente_id} : this.tab === 'chat_programmati' ? {id: r.id} : r); });
      return {data: null, error: null};
    }
  };

  const persona = p => ({id: p.id, nome: (p.nome + ' ' + p.cognome).trim(), nick: p.nickname || '', foto: p.foto_url, ruolo: p.ruolo, visto: (db.chat_presenza.find(v => v.utente_id === p.id) || {}).visto_il});
  const sistema = (c, t) => { const r = {id: uid(), conv_id: c, autore: io, tipo: 'sistema', testo: t, media: null, risponde_a: null, creato_il: ora(), eliminato: false}; db.chat_messaggi.push(r); emetti('chat_messaggi', 'INSERT', r); };
  const nomeP = id => { const p = db.profili.find(x => x.id === id); return p ? (p.nickname || p.nome) : 'Qualcuno'; };
  const RPC = {
    e_admin_foss: () => !window.__NON_ADMIN,
    chat_importa: a => {
      const me = db.chat_membri.find(m => m.conv_id === a.p_conv && m.utente_id === io);
      if(!me) throw new Error('non puoi');
      if(window.__NON_ADMIN) throw new Error('solo l\'amministratore di FOSS può importare una chat');
      if(!Array.isArray(a.p_msgs) || a.p_msgs.length > 500) throw new Error('dati non validi');
      let n = 0;
      for(const x of a.p_msgs){
        if(!/^[A-Za-z0-9_-]{8,64}$/.test(x.k || '') || !x.n || !['testo','foto','video','vocale','file'].includes(x.t)) throw new Error('dati non validi');
        if(new Date(x.il) > new Date()) throw new Error('data non valida');
        if(x.a && !db.chat_membri.some(m => m.conv_id === a.p_conv && m.utente_id === x.a)) throw new Error('si può collegare solo a chi è in questa chat');
        if(x.t === 'testo' && !(x.x || '').trim()) throw new Error('messaggio vuoto');
        if(x.t !== 'testo' && !(x.m && (x.m.url || x.m.path))) throw new Error('manca il file');
        if(db.chat_messaggi.some(m => m.conv_id === a.p_conv && m.media && m.media.importato && m.media.importato.k === x.k)) continue;
        const r = {id: uid(), conv_id: a.p_conv, autore: x.a || null, tipo: x.t, testo: x.x || null, media: Object.assign({}, x.m || {}, {importato: {n: x.n, k: x.k, da: io, l: a.p_lotto}}),
                   risponde_a: null, creato_il: new Date(x.il).toISOString(), eliminato: false, modificato_il: null, fissato_il: null, fissato_da: null};
        db.chat_messaggi.push(r); n++;
        setTimeout(() => emetti('chat_messaggi', 'INSERT', r), 5);
      }
      return n;
    },
    chat_importa_annulla: a => {
      const via = db.chat_messaggi.filter(m => m.conv_id === a.p_conv && m.media && m.media.importato && m.media.importato.l === a.p_lotto && m.media.importato.da === io);
      via.forEach(m => db.chat_messaggi.splice(db.chat_messaggi.indexOf(m), 1));
      return via.length;
    },
    chat_contatti: () => db.profili.filter(p => p.id !== io).map(persona),
    chat_persone: a => db.profili.filter(p => a.p_ids.includes(p.id)).map(persona),
    chat_elenco: () => db.chat_membri.filter(m => m.utente_id === io).map(m => {
      const c = db.chat_conversazioni.find(x => x.id === m.conv_id);
      const msgs = db.chat_messaggi.filter(x => x.conv_id === c.id && (!m.svuotata_il || x.creato_il > m.svuotata_il)).sort((a, b) => a.creato_il < b.creato_il ? 1 : -1);
      const u = msgs[0];
      return Object.assign({}, c, {silenziata: m.silenziata, archiviata: m.archiviata, fissata: m.fissata, svuotata_il: m.svuotata_il, bloccata: m.bloccata, letto_fino: m.letto_fino, ruolo: m.ruolo,
        membri: db.chat_membri.filter(x => x.conv_id === c.id).map(x => ({id: x.utente_id, ruolo: x.ruolo, letto: x.letto_fino, ricevuto: x.ricevuto_fino})),
        ultimo: u ? {id: u.id, autore: u.autore, tipo: u.tipo, testo: m.bloccata ? null : u.testo, creato_il: u.creato_il, eliminato: u.eliminato, media: m.bloccata ? null : u.media} : null,
        non_lette: msgs.filter(x => x.creato_il > m.letto_fino && x.autore !== io && x.tipo !== 'sistema').length,
        menzioni: msgs.filter(x => x.creato_il > m.letto_fino && x.autore !== io && x.tipo === 'testo' && x.media && (x.media.tutti || (x.media.menzioni || []).some(z => z.id === io))).length});
    }).sort((a, b) => (b.fissata - a.fissata) || (a.ultimo_il < b.ultimo_il ? 1 : -1)),
    chat_apri_privata: a => {
      const k = [io, a.p_altro].sort().join(':');
      let c = db.chat_conversazioni.find(x => x.coppia === k);
      if(!c){ c = {id: uid(), tipo: 'privata', nome: null, descrizione: '', foto: null, coppia: k, creata_da: io, creata_il: ora(), ultimo_il: ora()}; db.chat_conversazioni.push(c); mem(c.id, io, 'admin'); mem(c.id, a.p_altro, 'admin'); }
      return c.id;
    },
    chat_crea_gruppo: a => { const c = {id: uid(), tipo: 'gruppo', nome: a.p_nome, descrizione: a.p_descrizione || '', foto: null, creata_da: io, creata_il: ora(), ultimo_il: ora()}; db.chat_conversazioni.push(c);
      mem(c.id, io, 'admin'); a.p_membri.forEach(u => mem(c.id, u)); sistema(c.id, nomeP(io) + ' ha creato il gruppo «' + a.p_nome + '»'); return c.id; },
    chat_modifica_gruppo: a => { const c = db.chat_conversazioni.find(x => x.id === a.p_conv); if(a.p_nome) c.nome = a.p_nome; if(a.p_descrizione != null) c.descrizione = a.p_descrizione; if(a.p_foto) c.foto = c.id + '/' + a.p_foto; if(a.p_togli_foto) c.foto = null; emetti('chat_conversazioni', 'UPDATE', Object.assign({}, c)); return null; },
    chat_aggiungi: a => { a.p_utenti.forEach(u => { mem(a.p_conv, u); sistema(a.p_conv, nomeP(io) + ' ha aggiunto ' + nomeP(u)); }); return a.p_utenti.length; },
    chat_togli: a => { const i = db.chat_membri.findIndex(x => x.conv_id === a.p_conv && x.utente_id === a.p_utente); if(i >= 0){ const r = db.chat_membri.splice(i, 1)[0]; emetti('chat_membri', 'DELETE', null, {conv_id: r.conv_id, utente_id: r.utente_id}); } return null; },
    chat_admin_si: a => { const m = db.chat_membri.find(x => x.conv_id === a.p_conv && x.utente_id === a.p_utente); m.ruolo = a.p_si ? 'admin' : 'membro'; return null; },
    chat_elimina: a => { const m = db.chat_messaggi.find(x => x.id === a.p_id); const md = m.media; m.eliminato = true; m.testo = null; m.media = null; emetti('chat_messaggi', 'UPDATE', Object.assign({}, m)); return md; },
    chat_letto: a => { const m = db.chat_membri.find(x => x.conv_id === a.p_conv && x.utente_id === io); if(m){ m.letto_fino = m.ricevuto_fino = ora(); emetti('chat_membri', 'UPDATE', Object.assign({}, m)); } return null; },
    chat_ping: () => null,
    chat_non_lette: () => 0,
    chat_protezione: () => ({pin: !!db.pin, tutto: db.tutto}),
    chat_ha_pin: () => !!db.pin,
    chat_imposta_pin: a => { if(db.pin && a.p_vecchio !== db.pin) return false; db.pin = a.p_nuovo; return true; },
    chat_verifica_pin: a => !db.pin ? 'nessuno' : a.p_pin === db.pin ? 'ok' : 'no:3',
    chat_blocca: a => { if(!db.pin) return 'nessuno'; if(!a.p_si && a.p_pin !== db.pin) return 'no:3'; const m = db.chat_membri.find(x => x.conv_id === a.p_conv && x.utente_id === io); m.bloccata = a.p_si; return 'ok'; },
    chat_reimposta_pin: a => { db.pin = a.p_nuovo; return true; },
    chat_proteggi_tutto: a => { if(!db.pin) return 'nessuno'; if(!a.p_si && a.p_pin !== db.pin) return 'no:3'; db.tutto = a.p_si; return 'ok'; },
    iscrivi_push: () => null,
    chat_modifica: a => {
      const m = db.chat_messaggi.find(x => x.id === a.p_id);
      if(!m || m.autore !== io || m.eliminato) throw 'non puoi';
      if(Date.now() - new Date(m.creato_il) > 15 * 60000) throw 'un messaggio si può modificare solo nei primi 15 minuti';
      if(m.tipo === 'testo'){
        const md = Object.assign({}, m.media || {}); delete md.menzioni; delete md.tutti; delete md.lavori;
        Object.assign(md, a.p_extra || {});
        m.testo = a.p_testo; m.media = Object.keys(md).length ? md : null;
      } else { m.media = Object.assign({}, m.media); if(a.p_testo) m.media.did = a.p_testo; else delete m.media.did; }
      m.modificato_il = ora();
      emetti('chat_messaggi', 'UPDATE', Object.assign({}, m));
      return JSON.parse(JSON.stringify(m));
    },
    chat_fissa: a => {
      const m = db.chat_messaggi.find(x => x.id === a.p_id);
      if(a.p_si){
        if(m.fissato_il) return null;
        if(db.chat_messaggi.filter(x => x.conv_id === m.conv_id && x.fissato_il).length >= 10) throw 'puoi fissare al massimo 10 messaggi: togline uno prima';
        m.fissato_il = ora(); m.fissato_da = io; emetti('chat_messaggi', 'UPDATE', Object.assign({}, m));
        const r = {id: uid(), conv_id: m.conv_id, autore: io, tipo: 'sistema', testo: nomeP(io) + ' ha fissato un messaggio', media: {fissato: m.id}, risponde_a: null, creato_il: ora(), eliminato: false};
        db.chat_messaggi.push(r); emetti('chat_messaggi', 'INSERT', r);
      } else { m.fissato_il = null; m.fissato_da = null; emetti('chat_messaggi', 'UPDATE', Object.assign({}, m)); }
      return null;
    },
    chat_vota: a => {
      const m = db.chat_messaggi.find(x => x.id === a.p_msg);
      if(m.media.chiuso) throw 'il sondaggio è chiuso';
      if(!m.media.multi && a.p_opzioni.length > 1) throw 'puoi scegliere una sola risposta';
      db.chat_voti.filter(v => v.msg_id === m.id && v.utente_id === io && !a.p_opzioni.includes(v.opzione)).forEach(v => { db.chat_voti.splice(db.chat_voti.indexOf(v), 1); emetti('chat_voti', 'DELETE', null, {msg_id: v.msg_id, utente_id: v.utente_id, opzione: v.opzione}); });
      a.p_opzioni.forEach(o => { if(!db.chat_voti.some(v => v.msg_id === m.id && v.utente_id === io && v.opzione === o)){ const v = {msg_id: m.id, conv_id: m.conv_id, utente_id: io, opzione: o, creato_il: ora()}; db.chat_voti.push(v); emetti('chat_voti', 'INSERT', v); } });
      return null;
    },
    chat_chiudi_sondaggio: a => { const m = db.chat_messaggi.find(x => x.id === a.p_msg); m.media = Object.assign({}, m.media, {chiuso: true}); emetti('chat_messaggi', 'UPDATE', Object.assign({}, m)); return null; },
    chat_lavori: a => { window.__lavoriChiesti.push(a.p_ids); return db.progetti.filter(pr => a.p_ids.includes(pr.id) && vedeLavoro(pr)).map(schedaLavoro); },
    chat_lavori_elenco: () => db.progetti.filter(vedeLavoro).map(pr => ({id: pr.id, org: pr.org_id, nome: pr.dati.nome, cliente: pr.dati.cliente || '', col: pr.dati.col || null, icona: pr.dati.icona || null,
      tipo: pr.dati.tipo || 'video', completato: !!pr.dati.completato, aggiornato: pr.aggiornato_il,
      prossimo: (db.elementi.filter(e => e.progetto_id === pr.id && e.tipo === 'evento' && e.dati.d >= giorno(0)).map(e => e.dati.d).sort()[0]) || null}))
      .sort((x, y) => (x.completato - y.completato) || (x.aggiornato < y.aggiornato ? 1 : -1)),
    chat_dove_creare: () => window.__NIENTE_LAVORI ? {archivi: [], ultimo: null, clienti: []} : ({archivi: [{org: O1, nome: 'Studio Davide', titolare: true, squadra: true, membri: [D, MO, AN],
      spazi: [{id: 'sp1', nome: 'Il mio lavoro', tipo: 'video', col: '#FFAD01'}, {id: 'sp2', nome: 'Fotografia', tipo: 'foto', col: '#F6A8C0'}]}], ultimo: 'sp1', clienti: ['Carolina Benvegna', 'Esselunga', 'Piano City Milano']}),
    chat_crea_lavoro: a => {
      window.__creato = a;
      const id = 'p' + Date.now();
      const nome = (a.p_nome || '').trim() || 'Lavoro ' + a.p_cliente;
      db.progetti.unshift({org_id: a.p_org, id, aggiornato_il: ora(), dati: {nome, cliente: a.p_cliente, tipo: a.p_spazio === 'sp2' ? 'foto' : 'video', col: '#9AE6B4', fase: 0, team: [io].concat(a.p_team || []),
        indirizzo: a.p_luogo, consegna: a.p_consegna ? a.p_consegna.split('-').reverse().join('/') : '', daChat: {conv: a.p_conv, da: io, completo: false}}});
      if(a.p_giorno) db.elementi.push({org_id: a.p_org, progetto_id: id, id: 'e' + id, tipo: 'evento', dati: {d: a.p_giorno, t: a.p_giorno_t, ora: a.p_ora}});
      let msg = null;
      if(a.p_conv){
        msg = {id: uid(), conv_id: a.p_conv, autore: io, tipo: 'lavoro', testo: null, media: {lavoro: {id, org: a.p_org, n: nome}, nuovo: true}, risponde_a: null, creato_il: ora(), eliminato: false, modificato_il: null, fissato_il: null};
        db.chat_messaggi.push(msg); emetti('chat_messaggi', 'INSERT', msg);
      }
      return {id, org: a.p_org, nome, msg};
    },
  };

  /* ---- caricamenti (XHR verso lo storage) ---- */
  const XO = window.XMLHttpRequest;
  function FakeXHR(){ this.upload = {}; this.status = 0; this.responseText = ''; }
  FakeXHR.prototype.open = function(m, u){ this.u = u; };
  FakeXHR.prototype.setRequestHeader = function(){};
  FakeXHR.prototype.send = function(b){
    const path = decodeURIComponent(this.u.split('/object/chat/')[1] || '');
    let k = 0; const giro = setInterval(() => {
      k += .25; this.upload.onprogress && this.upload.onprogress({lengthComputable: true, loaded: k * b.size, total: b.size});
      if(k >= 1){ clearInterval(giro); storage.set(path, b); this.status = 200; this.responseText = JSON.stringify({Key: 'chat/' + path}); this.onload && this.onload(); }
    }, 120);
  };
  window.XMLHttpRequest = function(){ return new FakeXHR(); };

  const client = {
    auth: {
      getSession: async () => ({data: {session: window.__SENZA_SESSIONE ? null : {access_token: 'tok', user: {id: io, email: 'davide@example.com'}}}}),
      signInWithPassword: async a => a.password === 'giusta' ? {data: {}, error: null} : {data: null, error: {message: 'Invalid login'}},
      onAuthStateChange: () => ({data: {subscription: {unsubscribe(){}}}}),
    },
    from: t => new Q(t),
    rpc: async (n, a) => { await new Promise(r => setTimeout(r, 20)); if(!RPC[n]) return {data: null, error: {message: 'rpc ' + n}}; try{ return {data: RPC[n](a || {}), error: null}; }catch(e){ return {data: null, error: {message: String(e)}}; } },
    storage: {from: () => ({
      createSignedUrl: async p => { const b = storage.get(p); if(!b) return {data: null, error: {message: 'Object not found'}}; return {data: {signedUrl: URL.createObjectURL(b)}, error: null}; },
      copy: async (a, b) => { if(!storage.has(a)) return {error: {message: 'not found'}}; storage.set(b, storage.get(a)); return {error: null}; },
      remove: async p => { p.forEach(x => storage.delete(x)); return {error: null}; },
    })},
    functions: {invoke: async (n, o) => { await new Promise(r => setTimeout(r, 60)); window.__gifChiamate = (window.__gifChiamate||[]).concat([o && o.body]);
      if(n !== 'gif') return {data: null, error: {message: 'no'}};
      const q = (o.body && o.body.q) || ''; const off = (o.body && o.body.offset) || 0;
      const lista = Array.from({length: 24}, (_, i) => ({id: 'g' + q + (off + i), anteprima: 'https://media.giphy.test/media/x/a.gif', mp4: 'https://media.giphy.test/media/x/a.mp4', w: 200, h: 150 + (i % 3) * 30, titolo: q + ' ' + (off + i)}));
      return {data: {lista, prossimo: off + 24, fine: off >= 48}, error: null}; }},
    channel: n => new Canale(n),
  };
  /* aiutanti per le prove */
  window.__mock = {db, storage, MO, AN, D, C1, G1,
    arriva(conv, autore, testo, extra){ const r = Object.assign({id: uid(), conv_id: conv, autore, tipo: 'testo', testo, media: null, risponde_a: null, creato_il: ora(), eliminato: false}, extra || {});
      db.chat_messaggi.push(r); db.chat_conversazioni.find(c => c.id === conv).ultimo_il = r.creato_il; emetti('chat_messaggi', 'INSERT', r); return r.id; },
    legge(conv, chi){ const m = db.chat_membri.find(x => x.conv_id === conv && x.utente_id === chi); m.letto_fino = m.ricevuto_fino = ora(); emetti('chat_membri', 'UPDATE', Object.assign({}, m)); },
    O1,
    vota(msg, chi, o){ const m = db.chat_messaggi.find(x => x.id === msg); const v = {msg_id: msg, conv_id: m.conv_id, utente_id: chi, opzione: o, creato_il: ora()}; db.chat_voti.push(v); emetti('chat_voti', 'INSERT', v); },
    cambiaLavoro(id, dati){ const pr = db.progetti.find(x => x.id === id); Object.assign(pr.dati, dati); emetti('progetti', 'UPDATE', {org_id: pr.org_id, id: pr.id}); },
    programmatoParte(id){ const i = db.chat_programmati.findIndex(x => x.id === id); const x = db.chat_programmati.splice(i, 1)[0];
      emetti('chat_programmati', 'DELETE', null, {id: x.id});
      const r = {id: uid(), conv_id: x.conv_id, autore: x.autore, tipo: 'testo', testo: x.testo, media: x.media, risponde_a: x.risponde_a, creato_il: ora(), eliminato: false};
      db.chat_messaggi.push(r); emetti('chat_messaggi', 'INSERT', r); },
    reagisce(msg, chi, e){ const m = db.chat_messaggi.find(x => x.id === msg); const r = {msg_id: msg, utente_id: chi, conv_id: m.conv_id, emoji: e}; db.chat_reazioni.push(r); emetti('chat_reazioni', 'INSERT', r); },
  };
  window.supabase = {createClient: () => client};
})();
