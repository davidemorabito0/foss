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
  var api = {
    versione: VERSIONE, os: OS, vista: VISTA, sito: SITO,
    /* un avviso di sistema. o = {titolo, testo, foto, hash (chat), notifica (FOSS), azione, suono} */
    avviso: function(o){
      o = o || {};
      var dove = {vista: String(o.vista || VISTA), hash: String(o.hash || ''), notifica: String(o.notifica || ''), azione: String(o.azione || '')};
      return iconaDa(o.foto).then(function(ic){
        return invoca('avviso', {a: {titolo: String(o.titolo || 'FOSS'), testo: String(o.testo || ''), dove: dove, icona: ic, suono: !!o.suono}});
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
    mostraChat: function(si){ return invoca('chat_mostra', {mostra: si == null ? null : !!si}); }
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
    }
    if(typeof window.__fossDesktopEvento === 'function') try{ window.__fossDesktopEvento(d); }catch(e){}
  };
  function vaiHash(h){
    if(!h || LOCALE) return;
    if(h.charAt(0) !== '#') h = '#' + h;
    /* lo stesso indirizzo non farebbe nulla: prima lo tolgo, poi lo rimetto */
    if(location.hash === h) history.replaceState(null, '', location.pathname + location.search);
    location.hash = h;
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
      var cosa = {k: 'cerca', n: 'nuova-task', j: 'chat', ',': 'impostazioni', r: 'ricarica'}[k];
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

  /* ---------- la chat: la si allarga o stringe tirando il bordo sinistro ---------- */
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
        ultimo = Math.round(w0 - (e.screenX - x0));
        if(!raf) raf = requestAnimationFrame(function(){ raf = 0; invoca('chat_larghezza', {w: ultimo, fine: false}); });
      });
      var fine = function(){ if(!tiro) return; tiro = false; document.documentElement.classList.remove('fd-tiro'); invoca('chat_larghezza', {w: ultimo, fine: true}); };
      m.addEventListener('pointerup', fine);
      m.addEventListener('pointercancel', fine);
      b.addEventListener('click', function(e){ e.stopPropagation(); invoca('chat_mostra', {mostra: false}); });
      document.body.appendChild(m);
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
