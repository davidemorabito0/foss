/* Service worker di FOSS.
   Strategia: rete per prima sulla pagina, così un aggiornamento arriva subito;
   la copia in cache serve solo quando sei offline. I DATI non stanno qui:
   vivono nel database e nella memoria del browser, quindi un aggiornamento
   dell'app non può cancellarli. */
const CACHE = 'foss-guscio-v49';
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
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;         /* database e font passano diretti */
  /* la pagina la chiedo sempre fresca al server, saltando anche la cache del
     browser: cosi' un aggiornamento caricato su GitHub arriva alla prima apertura */
  const pagina = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  e.respondWith(
    /* una richiesta di navigazione non si puo' ricopiare con altre opzioni: chiedo l'indirizzo */
    (pagina ? fetch(req.url, {cache:'no-store', credentials:'same-origin'}) : fetch(req)).then(r=>{
      const copia = r.clone();
      caches.open(CACHE).then(c=>c.put(req, copia)).catch(()=>{});
      return r;
    }).catch(()=> caches.match(req).then(r=> r || caches.match('./index.html')))
  );
});

/* avvisi sul telefono: il servizio push (Apple, Google, Mozilla) consegna il
   messaggio cifrato, il browser lo decifra e qui diventa una notifica.
   Va mostrata SEMPRE: un push senza notifica visibile fa revocare l'iscrizione. */
self.addEventListener('push', e=>{
  let d = null;
  try { d = e.data ? e.data.json() : null; }
  catch(_){ try { d = {testo: e.data.text()}; } catch(__){ d = null; } }
  if(!d || typeof d !== 'object') d = {testo: d == null ? '' : String(d)};
  const tag = String(d.tag || 'foss');
  e.waitUntil(self.registration.showNotification(String(d.titolo || 'FOSS'), {
    body: String(d.testo || ''),
    tag,
    renotify: !d.silenzioso,          // una notifica che si somma aggiorna quella di prima senza suonare
    icon: './icone/icona-192-v2.png',
    data: {url: d.url || './', nid: tag.indexOf('foss-') === 0 ? tag.slice(5) : ''}
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
