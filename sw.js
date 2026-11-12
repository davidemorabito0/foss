/* Service worker di FOSS.
   Strategia: rete per prima sulla pagina, così un aggiornamento arriva subito;
   la copia in cache serve solo quando sei offline. I DATI non stanno qui:
   vivono nel database e nella memoria del browser, quindi un aggiornamento
   dell'app non può cancellarli. */
const CACHE = 'foss-guscio-v88';
const GUSCIO = ['./', './index.html', './manifest.json',
                './icone/icona-192-v2.png', './icone/icona-512-v2.png'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(GUSCIO.map(u=>new Request(u, {cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(
    k.filter(n=>n!==CACHE).map(n=>caches.delete(n))
  )).then(()=>self.clients.claim()));
});
/* FOSS.chat riceve foto, video e GIF condivisi da altre app (Android: Condividi → FOSS).
   Li tengo un attimo in una cache a parte e apro la chat, che chiede a chi mandarli. */
async function riceviCondivisi(req){
  try{
    const dati = await req.formData();
    const files = dati.getAll('file').filter(f => f && typeof f !== 'string').slice(0, 30);
    const c = await caches.open('fosschat-condivisi');
    await Promise.all(files.map((f, i) => c.put('./condivisi/' + i, new Response(f, {headers: {'Content-Type': f.type || 'application/octet-stream'}}))));
    await c.put('./condivisi/meta', new Response(JSON.stringify({n: files.length, nomi: files.map(f => f.name || 'file'),
      title: dati.get('title') || '', text: dati.get('text') || '', url: dati.get('url') || ''}), {headers: {'Content-Type': 'application/json'}}));
  }catch(_){}
  return Response.redirect('./chat.html?condivisi=1', 303);
}
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method === 'POST'){
    const u = new URL(req.url);
    if(u.origin === location.origin && /\/chat(\.html)?$/.test(u.pathname) && u.searchParams.has('condividi')) e.respondWith(riceviCondivisi(req));
    return;
  }
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;         /* database e font passano diretti */
  /* la pagina la chiedo sempre fresca al server, saltando anche la cache del
     browser: cosi' un aggiornamento caricato su GitHub arriva alla prima apertura */
  const pagina = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  e.respondWith(
    /* una richiesta di navigazione non si puo' ricopiare con altre opzioni: chiedo l'indirizzo */
    (pagina ? fetch(req.url, {cache:'no-store', credentials:'same-origin'}) : fetch(req)).then(r=>{
      /* il server a volte toglie il «.html» (chat.html -> chat) con un rinvio: Safari rifiuta
         una pagina arrivata dal service worker dopo un rinvio, quindi la ricopio pulita */
      if(r.redirected) r = new Response(r.body, {status: r.status, statusText: r.statusText, headers: r.headers});
      const copia = r.clone();
      caches.open(CACHE).then(c=>c.put(req, copia)).catch(()=>{});
      return r;
    }).catch(()=> caches.match(req).then(r=> r || caches.match('./index.html')))
  );
});

/* avvisi sul telefono: il servizio push (Apple, Google, Mozilla) consegna il
   messaggio cifrato, il browser lo decifra e qui diventa una notifica.
   Va mostrata sempre: un push senza notifica visibile fa revocare l'iscrizione.
   Unica eccezione: FOSS.chat davanti a te (finestra attiva e visibile) su Chrome, Edge
   e Firefox, che in quel caso non la pretendono. Come su WhatsApp Web il messaggio lo
   vedi gia', col suono e il numero nella lista. Safari (anche su iPhone e iPad) la vuole
   sempre, se no smette di mandarli: li' resta sempre. */
const SAFARI = (()=>{ try{ const u = String(self.navigator && self.navigator.userAgent || '');
  return /AppleWebKit/.test(u) && !/(Chrome|Chromium|Edg)\//.test(u); }catch(_){ return true; } })();
function chatDavanti(){
  if(SAFARI) return Promise.resolve(false);
  return self.clients.matchAll({type:'window', includeUncontrolled:true}).then(lista=>lista.some(c=>{
    try{ return /\/chat(\.html)?$/.test(new URL(c.url).pathname) && c.focused === true && c.visibilityState === 'visible'; }
    catch(_){ return false; }
  })).catch(()=>false);
}
self.addEventListener('push', e=>{
  let d = null;
  try { d = e.data ? e.data.json() : null; }
  catch(_){ try { d = {testo: e.data.text()}; } catch(__){ d = null; } }
  if(!d || typeof d !== 'object') d = {testo: d == null ? '' : String(d)};
  const tag = String(d.tag || 'foss');
  const chat = tag.indexOf('fosschat-') === 0;      // anche i promemoria: la chat aperta li mostra gia' da se'
  /* FOSS.chat: la faccia di chi scrive al posto del logo, e l'anteprima di una foto */
  const https = v => typeof v === 'string' && /^https:\/\/\S+$/.test(v) && v.length < 1200 ? v : '';
  const icona = https(d.icona), immagine = https(d.immagine);
  const opzioni = {
    body: String(d.testo || ''),
    tag,
    renotify: !d.silenzioso && !d.muto,   // una notifica che si somma aggiorna quella di prima senza suonare
    silent: !!d.muto,                     // FOSS.chat: un messaggio mandato «senza suono»
    icon: icona || './icone/icona-192-v2.png',
    data: {url: d.url || './', nid: tag.indexOf('foss-') === 0 ? tag.slice(5) : ''}
  };
  if(immagine) opzioni.image = immagine;
  e.waitUntil((chat ? chatDavanti() : Promise.resolve(false)).then(davanti=>{
    if(davanti) return;
    return self.registration.showNotification(String(d.titolo || 'FOSS'), opzioni)
      /* se la foto non si carica, l'avviso arriva lo stesso col logo */
      .catch(()=>self.registration.showNotification(String(d.titolo || 'FOSS'),
        Object.assign({}, opzioni, {icon: './icone/icona-192-v2.png', image: undefined})));
  }));
});
/* tocco sulla notifica: porto FOSS davanti sul lavoro giusto (se e' gia'
   aperto glielo dico, se no lo apro). ?n= dice quale notifica segnare letta */
self.addEventListener('notificationclick', e=>{
  e.notification.close();
  const d = e.notification.data || {};
  const scope = self.registration.scope;
  let url = scope;
  try {
    const u = new URL(d.url || './', scope);
    if(u.href.indexOf(scope) === 0){
      if(d.nid && /^#\/(p\/|guida)/.test(u.hash)) u.hash = u.hash + (u.hash.indexOf('?') >= 0 ? '&' : '?') + 'n=' + encodeURIComponent(d.nid);
      url = u.href;
    }
  } catch(_){ url = scope; }
  /* un messaggio di FOSS.chat: apro (o porto davanti) la finestra della chat */
  if(/\/chat\.html/.test(url)){
    e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(lista=>{
      /* il server a volte toglie il «.html»: la chat aperta puo' essere /chat o /chat.html */
      const chat = lista.find(c=>{ try{ return /\/chat(\.html)?$/.test(new URL(c.url).pathname); }catch(_){ return false; } });
      if(chat){ chat.postMessage({tipo:'apri', url}); return chat.focus ? chat.focus().catch(()=>{}) : null; }
      return self.clients.openWindow ? self.clients.openWindow(url) : null;
    }));
    return;
  }
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(lista=>{
    /* solo una finestra di FOSS (non un altro sito sullo stesso dominio, non la pagina di un cliente) */
    const di = lista.filter(c=>{ try { return c.url.indexOf(scope) === 0 && new URL(c.url).hash.indexOf('#/c/') !== 0; } catch(_){ return false; } });
    const aperto = di.find(c=>c.focused) || di[0];
    if(aperto){
      aperto.postMessage({tipo:'apri', url});
      return aperto.focus ? aperto.focus().catch(()=>{}) : null;
    }
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});
