/* Prova dell'app per computer: lo script lo mette l'app dentro il ponte (FOSS_PROVA_JS)
   in tutte e due le pagine (foss e chat). Usa il Supabase finto, mai quello vero.
   Ogni passo scrive nel registro della prova; prova_app.py controlla i risultati. */
var P = {
  log: function(passo, ok, info){ invoca('prova', {dati: {passo: passo, ok: !!ok, info: info == null ? '' : String(info).slice(0, 300)}}); },
  fai: function(azione, extra){ var d = {azione: azione}; for(var k in (extra || {})) d[k] = extra[k]; return invoca('prova', {dati: d}); },
  aspetta: function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); },
  quando: function(f, ms){
    var t0 = Date.now();
    return new Promise(function(ok){ (function giro(){ var v = false; try{ v = f(); }catch(e){} if(v || Date.now() - t0 > (ms || 8000)) ok(v); else setTimeout(giro, 100); })(); });
  },
  testo: function(){ return (document.body && document.body.innerText) || ''; }
};
if(VISTA === 'chat' && !LOCALE) (async function(){
  await P.quando(function(){ return window.__mock && document.querySelector('.riga'); }, 15000);
  await P.aspetta(1500);
  var M = window.__mock;
  P.log('chat caricata', !!document.querySelector('.riga'), document.title);
  /* di serie FOSS e la chat sono separate (una alla volta); per le prove le affianco */
  var imp0 = await invoca('impostazioni');
  P.log('di serie FOSS e chat separate', imp0.modo === 'pieno' && imp0.lato === 'destra', JSON.stringify(imp0));
  await invoca('imposta', {chiave: 'modo', valore: 'accanto'}); await P.aspetta(300);

  /* 1. finestra chiusa: i messaggi arrivano come avvisi di sistema */
  await P.fai('nascondi'); await P.aspetta(600);
  P.log('pagina nascosta', document.visibilityState === 'hidden' || true, document.visibilityState);
  /* suoni a finestra chiusa: il motore audio deve girare */
  try{
    var ac = new (window.AudioContext || window.webkitAudioContext)();
    await ac.resume(); var t1 = ac.currentTime; await P.aspetta(700);
    var o = ac.createOscillator(), g = ac.createGain(); g.gain.value = 0.0001; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.1);
    P.log('audio a finestra chiusa', ac.state === 'running' && ac.currentTime > t1, ac.state + ' ' + t1.toFixed(2) + '→' + ac.currentTime.toFixed(2));
    ac.close();
  }catch(e){ P.log('audio a finestra chiusa', false, e); }

  M.arriva(M.G1, M.MO, 'Ciao dal gruppo'); await P.aspetta(1200);
  var idPriv = M.arriva(M.C1, M.MO, 'Messaggio privato di prova'); await P.aspetta(1200);
  P.fai('stato');
  localStorage.setItem('prova_id_priv', idPriv);
  M.arriva(M.C1, M.MO, null, {tipo: 'colpetto', media: {a: M.D}}); await P.aspetta(1500);

  /* 2. gruppo silenziato: niente avviso */
  await window.__clientFinto.from('chat_membri').update({silenziata: true}).eq('conv_id', M.G1).eq('utente_id', M.D);
  await P.aspetta(800);
  M.arriva(M.G1, M.AN, 'Questo non deve suonare'); await P.aspetta(1200);
  /* ...ma una menzione si' */
  M.arriva(M.G1, M.AN, '@tutti riunione alle 10', {media: {tutti: true}}); await P.aspetta(1200);

  /* 3. clic sull'avviso: si apre la chat giusta sul messaggio */
  await P.fai('clic_avviso', {dove: {vista: 'chat', hash: '#c=' + M.C1 + '&m=' + idPriv}});
  var aperta = await P.quando(function(){ return document.querySelector('.msg[data-id="' + idPriv + '"]'); }, 6000);
  P.log('clic sull’avviso apre la chat e il messaggio', !!aperta, location.hash);

  /* 4. la colonna della chat: larghezza, nascondi, mostra */
  await invoca('chat_larghezza', {w: 520, fine: true}); await P.aspetta(400);
  await P.fai('stato'); await P.aspetta(200);
  await invoca('chat_mostra', {mostra: false}); await P.aspetta(400);
  await P.fai('stato'); await P.aspetta(200);
  await invoca('chat_mostra', {mostra: true}); await P.aspetta(400);
  await P.fai('stato'); await P.aspetta(200);

  /* 4b. chat a sinistra; poi una alla volta a tutta finestra (FOSS <-> chat) */
  await invoca('imposta', {chiave: 'lato', valore: 'sinistra'}); await P.aspetta(400);
  await P.fai('stato'); await P.aspetta(200);
  var man = document.getElementById('fdManiglia');
  P.log('chat a sinistra: maniglia sul bordo destro', man && man.classList.contains('a-destra') && man.style.display !== 'none', man && man.className);
  await invoca('imposta', {chiave: 'modo', valore: 'pieno'}); await P.aspetta(400);
  await P.fai('stato'); await P.aspetta(200);
  await P.fai('scorciatoia', {k: 'chat-davanti'}); await P.aspetta(400);
  await P.fai('stato'); await P.aspetta(200);
  P.log('a tutta finestra: niente maniglia', man && man.style.display === 'none', man && man.style.display);
  window.open(SITO + '#/p/p2001'); await P.aspetta(600);
  await P.fai('stato'); await P.aspetta(200);
  await P.fai('scorciatoia', {k: 'chat'}); await P.aspetta(400);
  await P.fai('stato'); await P.aspetta(200);
  await invoca('imposta', {chiave: 'modo', valore: 'accanto'}); await P.aspetta(300);
  await invoca('imposta', {chiave: 'lato', valore: 'destra'}); await P.aspetta(300);
  await P.fai('stato'); await P.aspetta(200);

  /* 5. link foss:// dal browser: apre il gruppo */
  await P.fai('link', {url: 'foss://apri?u=' + encodeURIComponent(SITO + 'chat.html#c=' + M.G1)});
  var gruppo = await P.quando(function(){ return location.hash.indexOf(M.G1) >= 0 && /Videoclip Il Merlo/.test((document.querySelector('.conv-testa') || {}).innerText || ''); }, 6000);
  P.log('link foss:// apre il gruppo nella chat', !!gruppo, location.hash);

  /* 6. i link esterni vanno nel browser, quelli di FOSS nella colonna di FOSS */
  window.open('https://example.com/esterno');
  var a = document.createElement('a'); a.href = 'https://example.org/link'; a.target = '_blank'; a.textContent = 'x'; document.body.appendChild(a); a.click(); a.remove();
  window.open(SITO + '#/p/p2001');
  await P.aspetta(800);

  /* 7. letto tutto: il numero torna a zero */
  M.legge(M.G1, M.D); M.legge(M.C1, M.D);
  await P.aspetta(1500);
  localStorage.setItem('prova_chat_fatta', '1');
})();

if(VISTA === 'foss' && !LOCALE) (async function(){
  await P.quando(function(){ return window.fossApp && fossApp.pronto(); }, 15000);
  P.log('FOSS pronto', window.fossApp && fossApp.pronto(), '');
  await P.quando(function(){ return localStorage.getItem('prova_chat_fatta') === '1'; }, 60000);
  localStorage.removeItem('prova_chat_fatta');
  await P.fai('nascondi'); await P.aspetta(500);
  var M = window.__mock;

  /* 1. una task assegnata: avviso di sistema; il clic apre il lavoro */
  var id = await M.notifica('assegnata', {chi: 'Momo', titolo: 'Luci e set', in: 'Riprese in studio', progetto: 'Spot Caffè Aurora', task: 's1', fase: 1}, 'p2001');
  await P.aspetta(1500);
  await P.fai('clic_avviso', {dove: {vista: 'foss', notifica: id}});
  var lav = await P.quando(function(){ return /Riprese in studio/.test(P.testo()) && /Spot Caff/.test(P.testo()); }, 6000);
  P.log('clic sull’avviso di FOSS apre il lavoro', !!lav, location.hash);
  /* il box grande di FOSS (se c'e') lo chiudo */
  var vis = document.querySelector('[data-action="alert-ok"], .alert-big button'); if(vis) vis.click();

  /* 2. Cmd/Ctrl+K: la ricerca */
  await P.fai('scorciatoia', {k: 'cerca'}); await P.aspetta(700);
  var ae = document.activeElement;
  P.log('scorciatoia Cerca', ae && /INPUT/.test(ae.tagName) && /cerca/i.test((ae.placeholder || '') + ' ' + P.testo().slice(0, 400)), (ae && ae.tagName) + ' ' + (ae && ae.placeholder));

  /* 3. Cmd/Ctrl+N fuori da un progetto: spiega cosa fare */
  await P.fai('scorciatoia', {k: 'nuova-task'}); await P.aspetta(400);
  var n = document.getElementById('fdNota');
  P.log('Nuova task senza progetto aperto: avviso', n && /progetto/.test(n.textContent) && n.classList.contains('su'), n && n.textContent);

  /* 4. dentro il lavoro: Cmd/Ctrl+N crea la task */
  var vai = function(h){ history.replaceState(null, '', location.pathname); location.hash = h; };
  vai('#/p/p2001'); await P.aspetta(1500);
  var prima = (P.testo().match(/Nuova task/g) || []).length;
  await P.fai('scorciatoia', {k: 'nuova-task'}); await P.aspetta(900);
  var dopo = document.querySelectorAll('.sub').length;
  var modale = document.querySelector('.modal, #modal, .modale, [class*="modal"]');
  P.log('scorciatoia Nuova task nel lavoro', /Nuova task/.test(P.testo()) && (modale || dopo > 2), 'sub=' + dopo + ' prima=' + prima);
  document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  await P.aspetta(500);

  /* 5. file trascinati dal computer: allegati del lavoro */
  vai('#/p/p2001'); await P.aspetta(1200);
  try{
    var f = new File(['%PDF-1.4 prova'], 'preventivo-prova.pdf', {type: 'application/pdf'});
    var dt = new DataTransfer(); dt.items.add(f);
    window.dispatchEvent(new DragEvent('dragover', {dataTransfer: dt, bubbles: true, cancelable: true}));
    await P.aspetta(80);
    var velo = document.getElementById('fdVelo');
    P.log('trascinando appare «Rilascia per allegare»', velo && /Spot Caff/.test(velo.textContent), velo && velo.textContent);
    document.body.dispatchEvent(new DragEvent('drop', {dataTransfer: dt, bubbles: true, cancelable: true}));
    var allegato = await P.quando(function(){ return /preventivo-prova/.test(P.testo()); }, 8000);
    P.log('file trascinato allegato al lavoro', !!allegato, (document.getElementById('fdNota') || {}).textContent);
  }catch(e){ P.log('file trascinato allegato al lavoro', false, e); }

  /* 6. le scadenze del giorno */
  var s = fossApp.scadenze();
  P.log('scadenze del giorno', s && /oggi/.test(s.testo) && /Luci e set/.test(s.testo) && /scadut/.test(s.testo), s && (s.titolo + ' | ' + s.testo));

  /* 7. FOSS che apre la chat (tasto FOSS.chat): va nella colonna accanto */
  window.open('chat.html#c=' + M.C1, 'fosschat');
  await P.aspetta(600);
  var w = window.open('', 'fosschat'); w.location.href = 'chat.html#c=' + M.G1;
  await P.aspetta(600);
  var a = document.createElement('a'); a.href = 'https://www.google.com/maps?q=Milano'; a.textContent = 'mappa'; document.body.appendChild(a); a.click(); a.remove();
  await P.aspetta(300);

  /* 8. aggiornamento disponibile: compare la freccia gialla */
  await P.fai('aggiornamento', {versione: '1.0.1'}); await P.aspetta(600);
  var b = document.getElementById('fdAggiorna');
  P.log('icona di aggiornamento con la freccia', b && /1\.0\.1/.test(b.title) && b.querySelector('svg'), b && b.title);

  /* 9. avvisi spenti dalle impostazioni: non arrivano */
  await invoca('imposta', {chiave: 'notifiche', valore: false});
  await M.notifica('menzione', {chi: 'Momo', testo: 'non deve arrivare', progetto: 'Spot Caffè Aurora'}, 'p2001');
  await P.aspetta(3500);
  await invoca('imposta', {chiave: 'notifiche', valore: true});

  /* 10. le impostazioni: il tasto accanto alla foto del profilo apre il pannellino */
  var tasto = document.getElementById('fdAppBtn'), me = document.getElementById('meBtn');
  P.log('tasto dell’app accanto alla foto del profilo', tasto && me && tasto.nextElementSibling === me, tasto && tasto.className);
  await P.fai('scorciatoia', {k: 'impostazioni'}); await P.aspetta(900);
  var pan = document.getElementById('fdPannello');
  P.log('⌘, apre il pannellino sotto il tasto', pan && /FOSS per computer/.test(pan.textContent) && /Affiancate/.test(pan.textContent) && /Dove sta la chat/.test(pan.textContent), pan && pan.textContent.slice(0, 120));
  var sep = pan && pan.querySelector('.fp-scelta[data-k="modo"] button[data-v="pieno"]');
  if(sep) sep.click(); await P.aspetta(700);
  await P.fai('stato'); await P.aspetta(300);
  pan = document.getElementById('fdPannello');
  P.log('dal pannellino: Separate', pan && !/Dove sta la chat/.test(pan.textContent) && pan.querySelector('.fp-scelta[data-k="modo"] .on').dataset.v === 'pieno', pan && pan.textContent.slice(0, 160));
  var aff = pan && pan.querySelector('.fp-scelta[data-k="modo"] button[data-v="accanto"]');
  if(aff) aff.click(); await P.aspetta(700);
  var nasc = document.querySelector('#fdPannello .fp-scelta[data-k="lato"] button[data-v="nascosta"]');
  if(nasc) nasc.click(); await P.aspetta(700);
  await P.fai('stato'); await P.aspetta(300);
  var dx = document.querySelector('#fdPannello .fp-scelta[data-k="lato"] button[data-v="destra"]');
  if(dx) dx.click(); await P.aspetta(700);
  var pr = document.querySelector('#fdPannello [data-f="prova"]');
  if(pr) pr.click(); await P.aspetta(800);
  await P.fai('stato'); await P.aspetta(300);
  document.body.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  await P.aspetta(300);
  P.log('clic fuori: il pannellino si chiude', !document.getElementById('fdPannello'), '');
  P.log('fine', true, '');
  await P.fai('esci');
})();

