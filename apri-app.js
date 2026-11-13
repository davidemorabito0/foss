/* FOSS: i link di foss.team aperti nel browser passano all'app per computer, se c'e'.
   La prima volta l'app apre il sito con #app-collega: da quel momento questo browser sa
   che sul computer c'e' l'app FOSS e le passa i link (foss://apri?u=...).
   Sul telefono, dentro l'app o senza l'app installata non fa nulla: il sito resta com'e'.
   Lo usano index.html e chat.html (sviluppo/chat/head.html). L'app sta in desktop/. */
(function(){
  try{
    if(window.fossDesktop) return;                                   // siamo gia' nell'app
    var ua = navigator.userAgent || '';
    if(/Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return;
    var K = 'foss_app_pc', h = location.hash;
    var leggi = function(){ try{ return localStorage.getItem(K) === '1'; }catch(e){ return false; } };

    if(h === '#app-collega' || h === '#app-scollega'){
      var si = h === '#app-collega';
      try{ if(si) localStorage.setItem(K, '1'); else localStorage.removeItem(K); }catch(e){}
      try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){}
      cartello(si ? 'Fatto: i link di FOSS si aprono nell’app' : 'Fatto: i link di FOSS restano nel browser',
               si ? 'Da ora, quando apri un link di FOSS in questo browser, si apre l’app FOSS sul computer. Puoi chiudere questa scheda.'
                  : 'I link di FOSS aperti in questo browser restano qui. Puoi chiudere questa scheda.',
               [['Ok', function(c){ c.remove(); }]]);
      return;
    }
    if(!leggi()) return;
    try{ if(sessionStorage.getItem('foss_nel_browser') === '1') return; }catch(e){}
    if(/[?&]browser=1(&|$)/.test(location.search)){ try{ sessionStorage.setItem('foss_nel_browser', '1'); }catch(e){} return; }
    try{ if(matchMedia('(display-mode: standalone)').matches) return; }catch(e){}

    var dest = 'foss://apri?u=' + encodeURIComponent(location.href);
    var vai = function(){ location.href = dest; };
    vai();
    cartello('Ti ho aperto FOSS nell’app',
             'Se l’app non si è aperta, puoi riprovare o continuare qui nel browser.',
             [['Continua nel browser', function(c){ try{ sessionStorage.setItem('foss_nel_browser', '1'); }catch(e){} c.remove(); }],
              ['Apri nell’app', function(){ vai(); }, true]],
             ['Non aprire più i link nell’app', function(c){ try{ localStorage.removeItem(K); }catch(e){} c.remove(); }]);
  }catch(e){}

  function cartello(titolo, testo, tasti, link){
    var fai = function(){
      var c = document.createElement('div');
      c.id = 'fossApriApp';
      c.setAttribute('role', 'dialog');
      c.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0D1926;color:#E8EEF7;display:flex;align-items:center;justify-content:center;' +
        'font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:24px;box-sizing:border-box;text-align:center';
      var b = document.createElement('div'); b.style.cssText = 'max-width:420px';
      b.innerHTML = '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" style="margin-bottom:14px"><rect width="64" height="64" rx="15" fill="#13263A"/>' +
        '<rect x="17" y="12" width="11" height="31" rx="5.5" fill="#FFAD01"/><path d="M22.5 42c3.6 4.6 5.6 7.6 5.6 10.1a5.6 5.6 0 0 1-11.2 0c0-2.5 2-5.5 5.6-10.1z" fill="#FFAD01"/>' +
        '<rect x="17" y="12" width="32" height="10" rx="5" fill="#E8EEF7"/><rect x="17" y="27" width="25" height="9.5" rx="4.75" fill="#E8EEF7"/></svg>';
      var t = document.createElement('div'); t.style.cssText = 'font-size:20px;font-weight:700;margin-bottom:6px'; t.textContent = titolo;
      var p = document.createElement('div'); p.style.cssText = 'color:#9FB0C3;margin-bottom:20px'; p.textContent = testo;
      var r = document.createElement('div'); r.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap';
      b.appendChild(t); b.appendChild(p); b.appendChild(r);
      tasti.forEach(function(x){
        var k = document.createElement('button'); k.type = 'button'; k.textContent = x[0];
        k.style.cssText = 'border:0;border-radius:10px;padding:10px 16px;font:600 14px inherit;font-family:inherit;cursor:pointer;' +
          (x[2] ? 'background:#FFAD01;color:#0D1926' : 'background:rgba(232,238,247,.1);color:#E8EEF7');
        k.onclick = function(){ x[1](c); };
        r.appendChild(k);
      });
      if(link){
        var l = document.createElement('button'); l.type = 'button'; l.textContent = link[0];
        l.style.cssText = 'display:block;margin:18px auto 0;border:0;background:none;color:#9FB0C3;text-decoration:underline;font:13px inherit;font-family:inherit;cursor:pointer';
        l.onclick = function(){ link[1](c); };
        b.appendChild(l);
      }
      c.appendChild(b);
      document.body.appendChild(c);
    };
    if(document.body) fai(); else document.addEventListener('DOMContentLoaded', fai, {once: true});
  }
})();
