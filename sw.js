/* Service worker di FOSS.
   Strategia: rete per prima sulla pagina, così un aggiornamento arriva subito;
   la copia in cache serve solo quando sei offline. I DATI non stanno qui:
   vivono nel database e nella memoria del browser, quindi un aggiornamento
   dell'app non può cancellarli. */
const CACHE = 'foss-guscio-v9';
const GUSCIO = ['./', './index.html', './manifest.json',
                './icone/icona-192.png', './icone/icona-512.png'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(GUSCIO)).then(()=>self.skipWaiting()));
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
  e.respondWith(
    fetch(req).then(r=>{
      const copia = r.clone();
      caches.open(CACHE).then(c=>c.put(req, copia)).catch(()=>{});
      return r;
    }).catch(()=> caches.match(req).then(r=> r || caches.match('./index.html')))
  );
});
