/* FOSS per computer — il «ponte».
   L'app lo mette in cima alle pagine di FOSS (index.html) e di FOSS.chat (chat.html),
   prima di qualsiasi altro script. Nel browser non c'e': il sito resta identico.

   - window.fossDesktop: quello che il sito puo' chiedere all'app (avvisi, trillo...).
   - window.fossApp (lo definisce index.html): quello che l'app chiede a FOSS.
   - window.open, i link esterni, il numero sull'icona, i file trascinati, la colonna della
     chat, le scorciatoie su Windows e l'icona dell'aggiornamento li sistema questo file.

   __VISTA__ (foss | chat | impostazioni), __SITO__, __VERSIONE__ e __OS__ li riempie l'app. */
(function(){
  'use strict';
  if(window.__fossPonte) return;
  var VISTA = '__VISTA__', SITO = '__SITO__', VERSIONE = '__VERSIONE__', OS = '__OS__';
  var ORIGINE;
  try{ ORIGINE = new URL(SITO).origin; }catch(e){ return; }
  var LOCALE = location.protocol === 'tauri:' || location.hostname === 'tauri.localhost';
  if(location.origin !== ORIGINE && !LOCALE) return;      // nessun'altra pagina parla con l'app
  window.__fossPonte = true;

  function invoca(cmd, args){
    try{ return Promise.resolve(window.__TAURI_INTERNALS__.invoke(cmd, args || {})); }
    catch(e){ return Promise.reject(e); }
  }
  function pronto(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once: true});
    else fn();
  }
  function vistaDi(u){ return /\/chat(\.html)?$/.test(u.pathname) ? 'chat' : 'foss'; }

  /* ---------- la foto di chi scrive, tonda, per l'avviso ---------- */
  function iconaDa(url){
    return new Promise(function(ok){
      if(!url || !/^(https:|data:image\/)/.test(url)) return ok('');
      var fatto = false, fine = function(v){ if(!fatto){ fatto = true; ok(v); } };
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function(){
        try{
          var c = document.createElement('canvas'); c.width = c.height = 128;
          var g = c.getContext('2d');
          g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.closePath(); g.clip();
          var s = Math.min(img.naturalWidth, img.naturalHeight);
          g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 128, 128);
          fine(c.toDataURL('image/png').split(',')[1] || '');
        }catch(e){ fine(''); }
      };
      img.onerror = function(){ fine(''); };
      setTimeout(function(){ fine(''); }, 3000);
      img.src = url;
    });
  }

  /* ---------- quello che il sito puo' chiedere all'app ---------- */
  var SILENZIO = false;
  var api = {
    versione: VERSIONE, os: OS, vista: VISTA, sito: SITO,
    /* un avviso di sistema. o = {titolo, testo, foto, hash (chat), notifica (FOSS), azione, suono} */
    avviso: function(o){
      o = o || {};
      var dove = {vista: String(o.vista || VISTA), hash: String(o.hash || ''), notifica: String(o.notifica || ''), azione: String(o.azione || '')};
      return iconaDa(o.foto).then(function(ic){
        return invoca('avviso', {a: {titolo: String(o.titolo || 'FOSS'), testo: String(o.testo || ''), dove: dove, icona: ic, suono: !!o.suono, risposta: !!o.risposta}});
      }).catch(function(){});
    },
    /* il trillo: l'icona dell'app salta (Mac) o lampeggia (Windows) */
    attenzione: function(){ invoca('attenzione').catch(function(){}); },
    impostazioni: function(){ return invoca('impostazioni'); },
    imposta: function(k, v){ return invoca('imposta', {chiave: k, valore: v}); },
    cercaAggiornamenti: function(){ return invoca('cerca_aggiornamenti'); },
    aggiorna: function(){ return invoca('aggiorna'); },
    collegaBrowser: function(si){ return invoca('collega_browser', {collega: si !== false}); },
    provaAvviso: function(){ return invoca('prova_avviso'); },
    mostraChat: function(si){ return invoca('chat_mostra', {mostra: si == null ? null : !!si}); },
    /* «Non disturbare» attivo: la chat non suona */
    silenzio: function(){ return SILENZIO; }
  };
  try{ Object.defineProperty(window, 'fossDesktop', {value: Object.freeze(api), writable: false, configurable: false, enumerable: false}); }
  catch(e){ window.fossDesktop = api; }

  /* ---------- quello che l'app manda alla pagina ---------- */
  window.__fossDesktopRicevi = function(d){
    if(!d || typeof d !== 'object') return;
    switch(d.tipo){
      case 'hash': vaiHash(String(d.hash || '')); break;
      case 'apri': apriInFoss(d); break;
      case 'scorciatoia': scorciatoia(String(d.k || '')); break;
      case 'aggiornamento': mostraAggiornamento(String(d.versione || '')); break;
      case 'aggiornamento-progresso': progresso(+d.pct); break;
      case 'aggiornamento-errore': erroreAggiornamento(String(d.testo || '')); break;
      case 'disposizione': disposizione(d); break;
      case 'impostazioni': if(window.__fossPannello) window.__fossPannello.apri(); break;
      case 'silenzio': SILENZIO = !!d.attivo; break;
      case 'rispondi': rispondiQui(String(d.hash || ''), String(d.testo || '')); break;
    }
    if(window.__fossPannello) try{ window.__fossPannello.evento(d); }catch(e){}
    if(typeof window.__fossDesktopEvento === 'function') try{ window.__fossDesktopEvento(d); }catch(e){}
  };
  function vaiHash(h){
    if(!h || LOCALE) return;
    if(h.charAt(0) !== '#') h = '#' + h;
    /* lo stesso indirizzo non farebbe nulla: prima lo tolgo, poi lo rimetto */
    if(location.hash === h) history.replaceState(null, '', location.pathname + location.search);
    location.hash = h;
  }
  /* una risposta scritta nell'avviso: la manda la chat (26-desktop.js), senza aprire niente */
  function rispondiQui(h, testo){
    if(VISTA !== 'chat') return;
    var c = /[#&]c=([0-9a-f-]{36})/.exec(h), m = /[#&]m=([0-9a-f-]{36})/.exec(h);
    var fai = function(n){
      if(typeof window.__fossChatRispondi === 'function'){ window.__fossChatRispondi(c && c[1], m && m[1], testo); return; }
      if(n < 40) setTimeout(function(){ fai(n + 1); }, 250);
    };
    if(c && testo) fai(0);
  }
  function apriInFoss(d){
    var A = window.fossApp;
    if(!A) return;
    try{
      if(d.notifica && A.apriNotifica) A.apriNotifica(String(d.notifica));
      else if(d.azione === 'mie' && A.apriMie) A.apriMie();
    }catch(e){}
  }

  /* ---------- un avviso breve dentro la pagina ---------- */
  var tNota = 0;
  function nota(t){
    pronto(function(){
      var n = document.getElementById('fdNota');
      if(!n){ n = document.createElement('div'); n.id = 'fdNota'; n.setAttribute('role', 'status'); document.body.appendChild(n); }
      n.textContent = t; n.classList.add('su');
      clearTimeout(tNota); tNota = setTimeout(function(){ n.classList.remove('su'); }, 2800);
    });
  }

  /* ---------- lo stile delle poche cose che aggiunge il ponte ---------- */
  pronto(function(){
    var s = document.createElement('style');
    s.id = 'fdStile';
    s.textContent =
      '#fdNota{position:fixed;left:50%;bottom:26px;transform:translate(-50%,8px);max-width:min(440px,86vw);background:#0D1926;color:#E8EEF7;' +
        'padding:10px 16px;border-radius:12px;font:500 13.5px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
        'box-shadow:0 10px 30px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);z-index:2147483646;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s}' +
      '#fdNota.su{opacity:1;transform:translate(-50%,0)}' +
      '#fdVelo{position:fixed;inset:10px;border:2px dashed #FFAD01;border-radius:16px;background:rgba(13,25,38,.72);z-index:2147483645;' +
        'display:flex;align-items:center;justify-content:center;pointer-events:none;color:#fff;font:600 17px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;text-align:center;padding:30px}' +
      '#fdVelo small{display:block;font-weight:500;font-size:13px;opacity:.75;margin-top:6px}' +
      '#fdAggiorna{position:fixed;right:14px;bottom:14px;width:40px;height:40px;border-radius:50%;border:1.5px solid rgba(255,173,1,.55);background:#0D1926;' +
        'color:#FFAD01;display:grid;place-items:center;cursor:pointer;z-index:2147483644;box-shadow:0 6px 20px rgba(0,0,0,.35);padding:0;animation:fdSu 2.4s ease-in-out infinite}' +
      '#fdAggiorna svg{width:22px;height:22px}' +
      '#fdAggiorna:hover{transform:scale(1.07)}' +
      '#fdAggiorna .pc{font:700 11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#FFAD01}' +
      '#fdAggiorna.va{animation:none;background:conic-gradient(#FFAD01 var(--pc,0%),#1A3149 0)}' +
      '#fdAggiorna.va::before{content:"";position:absolute;inset:3px;border-radius:50%;background:#0D1926}' +
      '#fdAggiorna.va > *{position:relative}' +
      '@keyframes fdSu{0%,100%{box-shadow:0 6px 20px rgba(0,0,0,.35),0 0 0 0 rgba(255,173,1,.45)}50%{box-shadow:0 6px 20px rgba(0,0,0,.35),0 0 0 7px rgba(255,173,1,0)}}' +
      '#fdManiglia{position:fixed;left:0;top:0;bottom:0;width:6px;cursor:col-resize;z-index:2147483640;background:transparent}' +
      '#fdManiglia::before{content:"";position:absolute;left:0;top:0;bottom:0;width:1px;background:rgba(127,127,127,.28)}' +
      '#fdManiglia:hover::before,html.fd-tiro #fdManiglia::before{width:3px;background:#FFAD01}' +
      '#fdManiglia button{position:absolute;left:4px;top:50%;width:16px;height:44px;margin-top:-22px;border:0;border-radius:0 8px 8px 0;background:rgba(13,25,38,.85);' +
        'color:#E8EEF7;font:700 13px sans-serif;cursor:pointer;opacity:0;transition:opacity .15s;padding:0}' +
      '#fdManiglia:hover button{opacity:1}' +
      '#fdManiglia.a-destra{left:auto;right:0}' +
      '#fdManiglia.a-destra::before{left:auto;right:0}' +
      '#fdManiglia.a-destra button{left:auto;right:4px;border-radius:8px 0 0 8px}' +
      '#fdAppBtn.on{background:var(--surface-2,#1A3149);color:var(--text,#E9F0F8)}' +
      '#fdPannello{position:fixed;z-index:2147483643;width:300px;max-width:calc(100vw - 16px);max-height:calc(100vh - 70px);overflow:auto;padding:8px 8px 10px;' +
        'background:var(--surface,#13263A);color:var(--text,#E9F0F8);border:1px solid var(--line,#25415E);border-radius:14px;box-shadow:var(--shadow,0 10px 34px rgba(0,0,0,.42));' +
        'font:13.5px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;animation:fpSu .14s ease-out}' +
      '@keyframes fpSu{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}' +
      '#fdPannello button{font:inherit;color:inherit;cursor:pointer}' +
      '#fdPannello .fp-t{display:flex;align-items:baseline;justify-content:space-between;padding:4px 6px 8px}' +
      '#fdPannello .fp-t b{font-size:14.5px}#fdPannello .fp-t span{color:var(--mute,#6A8299);font-size:12px}' +
      '#fdPannello .fp-sez{color:var(--dim,#9BB0C6);font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;padding:8px 6px 6px}' +
      '#fdPannello .fp-scelta{display:flex;gap:3px;padding:3px;background:var(--surface-2,#1A3149);border-radius:10px;margin:0 2px}' +
      '#fdPannello .fp-scelta button{flex:1;border:0;background:none;border-radius:8px;padding:7px 4px;font-weight:600;font-size:12.5px;color:var(--dim,#9BB0C6)}' +
      '#fdPannello .fp-scelta button.on{background:var(--surface,#13263A);color:var(--text,#E9F0F8);box-shadow:0 1px 3px rgba(0,0,0,.25),inset 0 0 0 1px var(--amber,#FFAD01)}' +
      '#fdPannello .fp-nota{color:var(--mute,#6A8299);font-size:12px;padding:6px 6px 2px}' +
      '#fdPannello .fp-linea{height:1px;background:var(--line-soft,#1B3149);margin:10px 4px}' +
      '#fdPannello .fp-riga{display:flex;align-items:center;gap:10px;width:100%;border:0;background:none;text-align:left;padding:7px 6px;border-radius:9px}' +
      '#fdPannello .fp-riga:hover{background:var(--surface-2,#1A3149)}' +
      '#fdPannello .fp-riga > span:first-child{flex:1;min-width:0}#fdPannello .fp-riga b{display:block;font-weight:600}' +
      '#fdPannello .fp-riga i{display:block;font-style:normal;color:var(--mute,#6A8299);font-size:12px}' +
      '#fdPannello .fp-interr{width:34px;height:20px;border-radius:10px;background:var(--surface-3,#21405C);position:relative;flex:none;transition:background .15s}' +
      '#fdPannello .fp-interr::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}' +
      '#fdPannello .fp-interr.on{background:var(--ok,#3FBF8F)}#fdPannello .fp-interr.on::after{left:16px}' +
      '#fdPannello .fp-tasti{display:flex;gap:6px;padding:6px 4px 0}' +
      '#fdPannello .fp-sez em{font-style:normal;text-transform:none;letter-spacing:0;color:var(--amber-ink,#FFAD01)}' +
      '#fdPannello .fp-tasti .fp-riprendi{border-color:var(--amber,#FFAD01)}' +
      '#fdPannello .fp-orario{cursor:default}#fdPannello .fp-orario:hover{background:none}' +
      '#fdPannello .fp-orario i{display:flex;align-items:center;gap:5px;margin-top:3px}' +
      '#fdPannello .fp-orario input{font:inherit;font-size:12.5px;color:var(--text,#E9F0F8);background:var(--surface-2,#1A3149);border:1px solid var(--line,#25415E);border-radius:7px;padding:2px 5px;color-scheme:dark light}' +
      '#fdPannello button.fp-interr{border:0;padding:0}' +
      '#fdPannello .fp-tasti button,#fdPannello .fp-agg button{flex:1;border:1px solid var(--line,#25415E);background:var(--surface-2,#1A3149);border-radius:9px;padding:7px 8px;font-weight:600;font-size:12.5px}' +
      '#fdPannello .fp-agg{display:flex;align-items:center;gap:8px;padding:0 4px}#fdPannello .fp-agg span{flex:1;color:var(--mute,#6A8299);font-size:12px}#fdPannello .fp-agg button{flex:none}' +
      '#fdPannello .fp-aggiorna{display:flex;align-items:center;justify-content:center;gap:8px;width:calc(100% - 8px);margin:0 4px;border:0;border-radius:10px;padding:9px;background:var(--amber,#FFAD01);color:var(--on-amber,#1A1305);font-weight:700}' +
      '#fdPannello .fp-aggiorna span{display:grid;width:18px;height:18px}#fdPannello .fp-aggiorna svg{width:18px;height:18px}' +
      'html.fd-tiro,html.fd-tiro *{cursor:col-resize!important;user-select:none!important}';
    (document.head || document.documentElement).appendChild(s);
  });

  if(LOCALE){
    /* le pagine dell'app (avvio e impostazioni) vogliono solo fossDesktop */
    window.__fossDestinazione = SITO + (VISTA === 'chat' ? 'chat.html' : '');
    /*__PROVA__*/
    return;
  }

  /* ---------- window.open: FOSS nell'app, il resto nel browser ---------- */
  var apriOriginale = window.open;
  function finestraFinta(){
    /* FOSS a volte apre una finestra vuota e poi ci mette l'indirizzo (la chat del lavoro) */
    var w = {closed: false, opener: null, focus: function(){}, blur: function(){}, close: function(){ w.closed = true; }, postMessage: function(){}};
    var loc = {assign: function(v){ apriUrl(v); }, replace: function(v){ apriUrl(v); }, toString: function(){ return ''; }};
    Object.defineProperty(loc, 'href', {get: function(){ return ''; }, set: function(v){ apriUrl(v); }});
    Object.defineProperty(w, 'location', {get: function(){ return loc; }, set: function(v){ apriUrl(v); }});
    w.document = {write: function(){}, close: function(){}, title: ''};
    return w;
  }
  function apriUrl(v){
    var u;
    try{ u = new URL(String(v), location.href); }catch(e){ return false; }
    if(u.origin === ORIGINE){
      if(vistaDi(u) === VISTA){ location.href = u.href; return true; }
      invoca('apri', {url: u.href});
      return true;
    }
    if(/^(https?|mailto|tel):$/.test(u.protocol)){ invoca('apri_fuori', {url: u.href}); return true; }
    return false;
  }
  window.open = function(u){
    if(u == null || String(u) === '' || String(u) === 'about:blank') return finestraFinta();
    var x;
    try{ x = new URL(String(u), location.href); }catch(e){ return null; }
    if(x.protocol === 'blob:' || x.protocol === 'data:') return apriOriginale.apply(window, arguments);
    return apriUrl(x.href) ? finestraFinta() : null;
  };

  /* ---------- i link: FOSS e la chat restano nell'app, il resto va nel browser ---------- */
  document.addEventListener('click', function(e){
    if(e.button !== 0 || e.defaultPrevented) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if(!a || a.hasAttribute('download')) return;
    var u;
    try{ u = new URL(a.href, location.href); }catch(_){ return; }
    if(!/^(https?|mailto|tel):$/.test(u.protocol)) return;
    if(u.origin === ORIGINE){
      var verso = vistaDi(u), nuova = (a.target && a.target !== '_self') || e.metaKey || e.ctrlKey;
      if(verso === VISTA && !nuova) return;                 // un link normale dentro la stessa pagina
      e.preventDefault();
      if(verso === VISTA){ location.href = u.href; return; }
      invoca('apri', {url: u.href});
      return;
    }
    e.preventDefault();
    invoca('apri_fuori', {url: u.href});
  }, false);

  /* ---------- il numero delle chat da leggere (lo calcola la chat) ---------- */
  function badge(n){ if(VISTA === 'chat') invoca('conta', {n: Math.max(0, Math.floor(+n || 0))}).catch(function(){}); return Promise.resolve(); }
  try{
    Object.defineProperty(navigator, 'setAppBadge', {configurable: true, value: function(n){ return badge(n == null ? 0 : n); }});
    Object.defineProperty(navigator, 'clearAppBadge', {configurable: true, value: function(){ return badge(0); }});
  }catch(e){}

  /* ---------- scorciatoie su Windows (sul Mac le fa il menu in alto) ---------- */
  if(OS !== 'mac'){
    document.addEventListener('keydown', function(e){
      if(!e.ctrlKey || e.altKey || e.metaKey) return;
      var k = (e.key || '').toLowerCase();
      var cosa = {k: 'cerca', n: 'nuova-task', j: 'chat', ',': 'impostazioni', r: 'ricarica', '1': 'foss-davanti', '2': 'chat-davanti', '\\': 'modo'}[k];
      if(!cosa || (cosa === 'ricarica' && e.shiftKey)) return;
      e.preventDefault(); e.stopPropagation();
      invoca('scorciatoia', {k: cosa});
    }, true);
  }
  function scorciatoia(k){
    var A = window.fossApp;
    if(VISTA !== 'foss') return;
    if(!A || !A.pronto || !A.pronto()){ nota('Accedi a FOSS per usare questa scorciatoia.'); return; }
    try{
      if(k === 'cerca') A.cerca();
      else if(k === 'nuova-task'){
        var r = A.nuovaTask();
        if(r === 'serve-progetto') nota('Apri un progetto per creare una task.');
        else if(r === 'non-puoi') nota('In questo progetto non puoi aggiungere task.');
      }
    }catch(e){}
  }

  /* ---------- FOSS: i file trascinati dal computer diventano allegati del progetto ---------- */
  if(VISTA === 'foss'){
    var tVelo = 0;
    var haFile = function(e){ var t = e.dataTransfer && e.dataTransfer.types; return !!t && Array.prototype.indexOf.call(t, 'Files') >= 0; };
    var togliVelo = function(){ var v = document.getElementById('fdVelo'); if(v) v.remove(); };
    var mostraVelo = function(){
      var v = document.getElementById('fdVelo');
      if(!v){ v = document.createElement('div'); v.id = 'fdVelo'; document.body.appendChild(v); }
      var A = window.fossApp, d = A && A.dove ? A.dove() : null;
      var h = d && d.progetto ? '<div>Rilascia per allegare a «' + d.progetto + '»<small>I file finiscono negli allegati del progetto</small></div>'
                              : '<div>Apri un progetto per allegare i file<small>Poi trascinali di nuovo qui</small></div>';
      if(v.getAttribute('data-h') !== h){ v.setAttribute('data-h', h); v.innerHTML = h.replace(/«([^»]*)»/, function(_, n){ var s = document.createElement('span'); s.textContent = n; return '«' + s.innerHTML + '»'; }); }
    };
    window.addEventListener('dragover', function(e){
      if(!haFile(e)) return;
      e.preventDefault();
      try{ e.dataTransfer.dropEffect = 'copy'; }catch(_){}
      mostraVelo();
      clearTimeout(tVelo); tVelo = setTimeout(togliVelo, 300);
    }, true);
    window.addEventListener('drop', function(e){
      if(!haFile(e)) return;
      e.preventDefault(); e.stopPropagation();
      clearTimeout(tVelo); togliVelo();
      var files = Array.prototype.slice.call(e.dataTransfer.files || []);
      if(!files.length) return;
      var A = window.fossApp;
      if(!A || !A.allega){ nota('Accedi a FOSS per allegare i file.'); return; }
      var r = A.allega(files);
      if(r === 'serve-progetto') nota('Apri un progetto e trascina lì i file da allegare.');
      else if(r === 'non-puoi') nota('In questo progetto non puoi allegare file.');
      else if(typeof r === 'number' && r > 0) nota(r === 1 ? 'Allego «' + files[0].name + '»…' : 'Allego ' + r + ' file…');
    }, true);
  }

  /* ---------- la chat: appena fai l'accesso in FOSS (colonna accanto) si ricollega da sola ---------- */
  if(VISTA === 'chat'){
    var conAccesso = function(){
      try{ for(var i = 0; i < localStorage.length; i++) if(/^sb-.+-auth-token$/.test(localStorage.key(i) || '')) return true; }catch(e){}
      return false;
    };
    var accessoPrima = conAccesso();
    setInterval(function(){
      var ora = conAccesso();
      if(ora && !accessoPrima) location.reload();
      accessoPrima = ora;
    }, 2000);
  }

  /* ---------- la chat: la si allarga o stringe tirando il bordo verso FOSS ----------
     La chat puo' stare a destra o a sinistra di FOSS; a tutta finestra la maniglia non c'e'. */
  var DISP = {lato: 'destra', modo: 'accanto', accanto: true};
  function disposizione(d){
    DISP = {lato: d.lato === 'sinistra' ? 'sinistra' : 'destra', modo: d.modo === 'pieno' ? 'pieno' : 'accanto', accanto: d.accanto !== false};
    var m = document.getElementById('fdManiglia'); if(!m) return;
    var sx = DISP.lato === 'sinistra';
    m.classList.toggle('a-destra', sx);
    m.style.display = DISP.modo === 'pieno' || !DISP.accanto ? 'none' : '';
    var b = m.querySelector('button'); if(b) b.textContent = sx ? '‹' : '›';
  }
  if(VISTA === 'chat'){
    pronto(function(){
      var m = document.createElement('div'); m.id = 'fdManiglia'; m.title = 'Trascina per allargare la chat';
      var b = document.createElement('button'); b.type = 'button'; b.textContent = '›'; b.title = 'Nascondi la chat (' + (OS === 'mac' ? '⌘J' : 'Ctrl+J') + ')';
      m.appendChild(b);
      var x0 = 0, w0 = 0, tiro = false, ultimo = 0, raf = 0;
      m.addEventListener('pointerdown', function(e){
        if(e.target === b) return;
        tiro = true; x0 = e.screenX; w0 = window.innerWidth; ultimo = w0;
        try{ m.setPointerCapture(e.pointerId); }catch(_){}
        document.documentElement.classList.add('fd-tiro');
        e.preventDefault();
      });
      m.addEventListener('pointermove', function(e){
        if(!tiro) return;
        /* a destra si allarga tirando verso sinistra, a sinistra tirando verso destra */
        var dx = e.screenX - x0;
        ultimo = Math.round(DISP.lato === 'sinistra' ? w0 + dx : w0 - dx);
        if(!raf) raf = requestAnimationFrame(function(){ raf = 0; invoca('chat_larghezza', {w: ultimo, fine: false}); });
      });
      var fine = function(){ if(!tiro) return; tiro = false; document.documentElement.classList.remove('fd-tiro'); invoca('chat_larghezza', {w: ultimo, fine: true}); };
      m.addEventListener('pointerup', fine);
      m.addEventListener('pointercancel', fine);
      b.addEventListener('click', function(e){ e.stopPropagation(); invoca('chat_mostra', {mostra: false}); });
      document.body.appendChild(m);
      disposizione(DISP);
    });
  }

  /* ---------- l'aggiornamento: un'icona con la freccia gialla, clic = aggiorna ---------- */
  var FRECCIA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
  function mostraAggiornamento(v){
    if(VISTA !== 'foss' || !v) return;
    pronto(function(){
      var b = document.getElementById('fdAggiorna');
      if(!b){
        b = document.createElement('button'); b.id = 'fdAggiorna'; b.type = 'button'; b.innerHTML = FRECCIA;
        b.setAttribute('aria-label', 'Aggiorna FOSS');
        b.addEventListener('click', function(){
          if(b.classList.contains('va')) return;
          b.classList.add('va'); b.innerHTML = '<span class="pc">…</span>'; b.title = 'Aggiorno FOSS…';
          api.aggiorna().catch(function(){});
        });
        document.body.appendChild(b);
        /* sta sopra alle barre in basso di FOSS (fasi del lavoro, menu del telefono) */
        var alza = function(){
          var su = 14;
          ['phasebar', 'tabbar'].forEach(function(id){
            var n = document.getElementById(id);
            if(!n || n.hidden) return;
            var r = n.getBoundingClientRect();
            if(r.height > 0 && r.top < window.innerHeight) su = Math.max(su, window.innerHeight - r.top + 12);
          });
          b.style.bottom = su + 'px';
        };
        alza(); setInterval(alza, 700); window.addEventListener('resize', alza);
      }
      b.title = 'È pronta la versione ' + v + ' di FOSS: clicca per aggiornare (l’app si riapre da sola)';
    });
  }
  function progresso(pct){
    var b = document.getElementById('fdAggiorna'); if(!b) return;
    if(!b.classList.contains('va')){ b.classList.add('va'); }
    var p = pct >= 0 ? Math.min(100, pct) : 0;
    b.style.setProperty('--pc', p + '%');
    b.innerHTML = '<span class="pc">' + (pct >= 0 ? p + '%' : '…') + '</span>';
    if(pct >= 100) b.title = 'Fatto: FOSS si riapre…';
  }
  function erroreAggiornamento(t){
    var b = document.getElementById('fdAggiorna');
    if(b){ b.classList.remove('va'); b.style.removeProperty('--pc'); b.innerHTML = FRECCIA; }
    if(t) nota(t);
  }

  /* ---------- FOSS: il tasto delle impostazioni dell'app, accanto alla foto del profilo ----------
     Apre un pannellino sotto il tasto (come i menu di FOSS): FOSS e la chat separate o affiancate,
     dove sta la chat, avvio all'accensione, avvisi, prova, browser collegato, aggiornamenti. */
  if(VISTA === 'foss'){
    var ICONA_APP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M14.5 4.5v15"/></svg>';
    var PANN = null, IMP = null;
    var mettiTasto = function(){
      var me = document.getElementById('meBtn');
      if(!me || !me.parentNode || document.getElementById('fdAppBtn')) return;
      var b = document.createElement('button');
      b.id = 'fdAppBtn'; b.className = 'iconbtn'; b.type = 'button'; b.innerHTML = ICONA_APP;
      b.title = 'FOSS per computer: FOSS e chat, avvisi, aggiornamenti';
      b.setAttribute('aria-label', 'Impostazioni di FOSS per computer');
      b.addEventListener('click', function(e){ e.stopPropagation(); if(PANN) chiudiPannello(); else apriPannello(); });
      me.parentNode.insertBefore(b, me);
    };
    pronto(function(){ mettiTasto(); setInterval(mettiTasto, 1500); });
    var chiudiPannello = function(){ if(PANN){ PANN.remove(); PANN = null; } var b = document.getElementById('fdAppBtn'); if(b) b.classList.remove('on'); };
    var posiziona = function(){
      var b = document.getElementById('fdAppBtn'); if(!PANN) return;
      if(!b){ PANN.style.top = '56px'; PANN.style.right = '12px'; return; }
      var r = b.getBoundingClientRect();
      PANN.style.top = Math.round(r.bottom + 8) + 'px';
      PANN.style.right = Math.max(8, Math.round(window.innerWidth - r.right - 4)) + 'px';
    };
    var e2 = function(t){ var d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
    var disegna = function(){
      if(!PANN || !IMP) return;
      var s = IMP, pieno = s.modo === 'pieno', lato = !s.chat_accanto ? 'nascosta' : (s.lato === 'sinistra' ? 'sinistra' : 'destra');
      var m = s.os === 'mac' ? '⌘' : 'Ctrl+';
      var scelta = function(k, voci, ora){ return '<div class="fp-scelta" data-k="' + k + '">' + voci.map(function(v){ return '<button type="button" data-v="' + v[0] + '"' + (v[0] === ora ? ' class="on"' : '') + '>' + v[1] + '</button>'; }).join('') + '</div>'; };
      var interr = function(k, t, x){ return '<button type="button" class="fp-riga" data-i="' + k + '"><span><b>' + t + '</b><i>' + x + '</i></span><span class="fp-interr' + (s[k] ? ' on' : '') + '"></span></button>'; };
      PANN.innerHTML =
        '<div class="fp-t"><b>FOSS per computer</b><span>versione ' + e2(s.versione || '') + '</span></div>' +
        '<div class="fp-sez">FOSS e la chat</div>' +
        scelta('modo', [['pieno', 'Separate'], ['accanto', 'Affiancate']], pieno ? 'pieno' : 'accanto') +
        '<div class="fp-nota">' + (pieno ? 'Una alla volta, a tutta finestra: passi dall’una all’altra col tasto FOSS.chat e col logo di FOSS (' + m + '1 · ' + m + '2).'
                                          : 'Insieme nella stessa finestra: allarghi la chat tirando il suo bordo.') + '</div>' +
        (pieno ? '' : '<div class="fp-sez">Dove sta la chat</div>' + scelta('lato', [['sinistra', 'A sinistra'], ['destra', 'A destra'], ['nascosta', 'Nascosta']], lato)) +
        '<div class="fp-linea"></div>' +
        interr('avvio', 'Avvia all’accensione', 'Parte da sola, chiusa ' + (s.os === 'mac' ? 'nella barra in alto' : 'vicino all’orologio')) +
        interr('notifiche', 'Avvisi sul computer', 'Chat, task assegnate, menzioni, scadenze') +
        '<div class="fp-linea"></div>' +
        '<div class="fp-sez">Non disturbare' + (s.silenzio ? ' <em>· attivo ' + e2(s.silenzio_fino || '') + '</em>' : '') + '</div>' +
        '<div class="fp-tasti"><button type="button" data-f="pausa" data-v="60">Per 1 ora</button><button type="button" data-f="pausa" data-v="domani">Fino a domani</button>' +
          (s.silenzio ? '<button type="button" data-f="pausa" data-v="0" class="fp-riprendi">Riprendi</button>' : '') + '</div>' +
        '<div class="fp-riga fp-orario"><span><b>Ogni giorno</b><i>dalle <input type="time" data-o="silenzio_da" value="' + e2(s.silenzio_da || '20:00') + '"> alle <input type="time" data-o="silenzio_a" value="' + e2(s.silenzio_a || '08:00') + '"></i></span>' +
          '<button type="button" class="fp-interr' + (s.silenzio_orario ? ' on' : '') + '" data-i="silenzio_orario" aria-label="Non disturbare ogni giorno"></button></div>' +
        '<div class="fp-nota">Niente avvisi e niente suoni della chat; il numero sull’icona resta.</div>' +
        '<div class="fp-tasti"><button type="button" data-f="prova">Prova un avviso</button><button type="button" data-f="collega">Collega il browser</button></div>' +
        '<div class="fp-linea"></div>' +
        (s.nuova ? '<button type="button" class="fp-aggiorna" data-f="aggiorna"><span>' + FRECCIA + '</span>Aggiorna alla versione ' + e2(s.nuova) + '</button>'
                 : '<div class="fp-agg"><span id="fpAggT">FOSS controlla da solo gli aggiornamenti</span><button type="button" data-f="controlla">Controlla</button></div>');
      posiziona();
    };
    var carica = function(){ return api.impostazioni().then(function(s){ IMP = s; disegna(); }); };
    var apriPannello = function(){
      chiudiPannello();
      PANN = document.createElement('div'); PANN.id = 'fdPannello'; PANN.setAttribute('role', 'dialog'); PANN.setAttribute('aria-label', 'FOSS per computer');
      PANN.innerHTML = '<div class="fp-t"><b>FOSS per computer</b></div>';
      document.body.appendChild(PANN); posiziona();
      var b = document.getElementById('fdAppBtn'); if(b) b.classList.add('on');
      PANN.addEventListener('click', function(e){
        e.stopPropagation();
        var t = e.target.closest ? e.target.closest('button') : null; if(!t) return;
        var g = t.parentNode && t.parentNode.dataset ? t.parentNode.dataset.k : '';
        if(g === 'modo') api.imposta('modo', t.dataset.v).then(function(s){ IMP = s; disegna(); });
        else if(g === 'lato'){
          var v = t.dataset.v;
          (v === 'nascosta' ? api.imposta('chat_accanto', false) : api.imposta('lato', v).then(function(){ return api.imposta('chat_accanto', true); }))
            .then(function(s){ IMP = s; disegna(); });
        }
        else if(t.dataset.i) api.imposta(t.dataset.i, !IMP[t.dataset.i]).then(function(s){ IMP = s; disegna(); });
        else if(t.dataset.f === 'pausa') api.imposta('pausa', t.dataset.v).then(function(s){ IMP = s; disegna(); if(s.silenzio) nota('Non disturbare: ' + (s.silenzio_fino || 'attivo') + '.'); else nota('Gli avvisi sono di nuovo attivi.'); });
        else if(t.dataset.f === 'prova'){ api.provaAvviso(); nota('Ti mando un avviso di prova…'); }
        else if(t.dataset.f === 'collega'){ api.collegaBrowser(true); nota('Ti apro FOSS nel browser per collegarlo all’app.'); }
        else if(t.dataset.f === 'controlla'){ var x = document.getElementById('fpAggT'); if(x) x.textContent = 'Controllo…'; api.cercaAggiornamenti(); }
        else if(t.dataset.f === 'aggiorna'){ t.disabled = true; t.lastChild.textContent = 'Aggiorno…'; api.aggiorna().catch(function(){}); }
      });
      PANN.addEventListener('change', function(e){
        var o = e.target && e.target.dataset ? e.target.dataset.o : '';
        if(o && /^\d{2}:\d{2}$/.test(e.target.value)) api.imposta(o, e.target.value).then(function(s){ IMP = s; disegna(); });
      });
      carica();
    };
    document.addEventListener('click', function(e){ if(PANN && !PANN.contains(e.target)) chiudiPannello(); }, true);
    document.addEventListener('keydown', function(e){ if(PANN && e.key === 'Escape') chiudiPannello(); }, true);
    window.addEventListener('resize', posiziona);
    window.__fossPannello = {apri: function(){ pronto(function(){ mettiTasto(); apriPannello(); }); },
      evento: function(d){
        if(!PANN) return;
        var x = document.getElementById('fpAggT');
        if(d.tipo === 'aggiornato' && x) x.textContent = 'Hai già l’ultima versione (' + (d.versione || '') + ').';
        else if(d.tipo === 'aggiornamento-errore' && x) x.textContent = d.testo || 'Non riesco a controllare adesso.';
        else if(d.tipo === 'aggiornamento') carica();
        else if(d.tipo === 'aggiornamento-progresso'){ var a = PANN.querySelector('.fp-aggiorna'); if(a){ a.disabled = true; a.lastChild.textContent = d.pct >= 0 ? 'Aggiorno… ' + d.pct + '%' : 'Aggiorno…'; } }
      }};
  }

  /* ---------- FOSS: le scadenze del giorno, una volta al giorno (dalle 9) ---------- */
  if(VISTA === 'foss'){
    var controllaScadenze = function(){
      var A = window.fossApp;
      if(!A || !A.pronto || !A.pronto() || !A.scadenze) return;
      var d = new Date();
      if(d.getHours() < 9) return;
      var oggi = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      var k = 'foss_desktop_scadenze';
      try{ if(localStorage.getItem(k) === oggi) return; localStorage.setItem(k, oggi); }catch(e){ return; }
      var s = null;
      try{ s = A.scadenze(); }catch(e){}
      if(s && s.testo) api.avviso({vista: 'foss', azione: 'mie', titolo: s.titolo || 'Scadenze', testo: s.testo});
    };
    setTimeout(controllaScadenze, 25000);
    setInterval(controllaScadenze, 10 * 60 * 1000);
  }

  /*__PROVA__*/
})();
