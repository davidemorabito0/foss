/* ======================= CODICE DI 4 CIFRE ======================= */
/* tastierino: verifica col server (o raccoglie un codice nuovo). Torna il codice, o null */
function tastierino(o){
  return new Promise(fine => {
    const v = document.createElement('div');
    v.className = 'velo scuro' + (o.intero ? ' blocco-tutto' : '');
    if(o.intero){ v.style.background = 'var(--pannello)'; v.style.zIndex = 95; }
    v.innerHTML = '<div class="foglio" style="max-width:360px'+(o.intero ? ';box-shadow:none;background:transparent' : '')+'" role="dialog" aria-label="Codice">'+
      (o.intero ? '<div style="display:flex;justify-content:center;padding-top:10px"><div style="width:64px;height:64px;border-radius:18px;overflow:hidden">'+LOGO+'</div></div>' : '')+
      '<div class="foglio-t" style="justify-content:center;text-align:center">'+esc(o.titolo)+'</div>'+
      '<div class="pin-box">'+(o.intero ? '' : '<span class="lucch">'+svg('lucchetto', 1.8)+'</span>')+
        '<p>'+esc(o.testo || '')+'</p><div class="pin-punti" id="pinPunti"><i></i><i></i><i></i><i></i></div><div class="pin-msg" id="pinMsg"></div>'+
        '<div class="pin-tasti">'+[1,2,3,4,5,6,7,8,9].map(n => '<button data-n="'+n+'">'+n+'</button>').join('')+
          '<button class="'+(o.annulla === false ? 'vuoto' : '')+'" data-x="1" style="font-size:14px">Annulla</button><button data-n="0">0</button><button data-c="1" aria-label="Cancella">'+svg('indietro', 1.8)+'</button></div>'+
        (o.verifica ? '<button class="pin-dimenticato" data-d="1">Hai dimenticato il codice?</button>' : '')+
      '</div></div>';
    document.body.appendChild(v);
    let cod = '', occupato = false;
    const punti = () => $$('#pinPunti i', v).forEach((x, i) => x.classList.toggle('pieno', i < cod.length));
    const msg = t => { el('pinMsg').textContent = t || ''; };
    const sbaglia = t => { const p = el('pinPunti'); p.classList.remove('errore'); void p.offsetWidth; p.classList.add('errore'); cod = ''; punti(); msg(t); try{ navigator.vibrate && navigator.vibrate(120); }catch(e){} };
    const chiudi = r => { document.removeEventListener('keydown', tasti, true); v.remove(); fine(r); };
    const prova = async () => {
      if(!o.verifica){ chiudi(cod); return; }
      occupato = true;
      try{
        const {data, error} = await sb.rpc('chat_verifica_pin', {p_pin: cod});
        if(error) throw error;
        if(data === 'ok') return chiudi(cod);
        if(data === 'nessuno') return chiudi(cod);
        if(String(data).startsWith('fermo')){ const s = +String(data).split(':')[1] || 300; sbaglia('Troppi tentativi: riprova tra ' + Math.ceil(s / 60) + ' minut' + (Math.ceil(s / 60) === 1 ? 'o' : 'i') + '.'); }
        else { const r = +String(data).split(':')[1]; sbaglia('Codice sbagliato.' + (r >= 0 ? ' Ancora ' + r + (r === 1 ? ' tentativo.' : ' tentativi.') : '')); }
      }catch(e){ sbaglia('Non riesco a controllare il codice: sei online?'); }
      finally{ occupato = false; }
    };
    const premi = n => { if(occupato || cod.length >= 4) return; cod += n; punti(); msg(''); if(cod.length === 4) setTimeout(prova, 120); };
    const tasti = e => {
      if(/^[0-9]$/.test(e.key)){ e.preventDefault(); e.stopPropagation(); premi(e.key); }
      else if(e.key === 'Backspace'){ e.preventDefault(); e.stopPropagation(); cod = cod.slice(0, -1); punti(); }
      else if(e.key === 'Escape' && o.annulla !== false){ e.preventDefault(); chiudi(null); }
    };
    document.addEventListener('keydown', tasti, true);
    v.onclick = async e => {
      const n = e.target.closest('[data-n]'); if(n) return premi(n.dataset.n);
      if(e.target.closest('[data-c]')){ cod = cod.slice(0, -1); punti(); return; }
      if(e.target.closest('[data-x]')) return chiudi(null);
      if(e.target.closest('[data-d]')){ const ok = await codiceDimenticato(); if(ok){ msg(''); toast('Codice nuovo impostato.'); chiudi('rifatto'); } }
    };
  });
}
async function chiediPin(titolo, testo, intero){
  const r = await tastierino({titolo, testo, verifica: true, annulla: !intero, intero});
  return r || null;
}
/* sceglie un codice nuovo (due volte); se ce n'e' gia' uno chiede prima quello */
async function impostaNuovoPin(){
  let vecchio = null;
  if(S.haPin){
    vecchio = await chiediPin('Codice attuale', 'Inserisci il codice che usi adesso.');
    if(!vecchio) return false;
    if(vecchio === 'rifatto') return true;
  }
  const a = await tastierino({titolo: 'Scegli un codice', testo: 'Quattro cifre facili da ricordare per te, difficili da indovinare per gli altri.'});
  if(!a) return false;
  const b = await tastierino({titolo: 'Ripeti il codice', testo: 'Scrivilo un’altra volta per conferma.'});
  if(!b) return false;
  if(a !== b){ toast('I due codici non coincidono: riprova.'); return impostaNuovoPin(); }
  try{
    const {data, error} = await sb.rpc('chat_imposta_pin', {p_nuovo: a, p_vecchio: vecchio});
    if(error) throw error;
    if(!data){ toast('Il codice attuale non era giusto.'); return false; }
    S.haPin = true;
    toast('Codice impostato.');
    return true;
  }catch(e){ errore(e, 'Codice non salvato'); return false; }
}
/* codice dimenticato: rientro con la password di FOSS e ne scelgo uno nuovo */
async function codiceDimenticato(){
  const {data: ss} = await sb.auth.getSession();
  const mail = ss && ss.session && ss.session.user && ss.session.user.email;
  if(!mail){ toast('Rientra in FOSS e riprova.'); return false; }
  const pw = await chiediTesto('Password di FOSS', 'Per scegliere un codice nuovo scrivi la password con cui entri in FOSS (' + mail + ').', 200, 'password');
  if(!pw) return false;
  const {error} = await sb.auth.signInWithPassword({email: mail, password: pw});
  if(error){ toast('Password sbagliata.'); return false; }
  const a = await tastierino({titolo: 'Nuovo codice', testo: 'Scegli quattro cifre.'});
  if(!a) return false;
  const b = await tastierino({titolo: 'Ripeti il codice', testo: 'Scrivilo un’altra volta per conferma.'});
  if(!b || a !== b){ toast('I due codici non coincidono.'); return false; }
  const r = await sb.rpc('chat_reimposta_pin', {p_nuovo: a});
  if(r.error){ errore(r.error, 'Codice non salvato'); return false; }
  S.haPin = true;
  return true;
}

/* ---------- blocco della singola chat ---------- */
async function alternaBlocco(c){
  if(!c.bloccata){
    if(!S.haPin){
      const ok = await new Promise(r => conferma('Rendi privata questa chat', 'Per rendere private le chat serve un codice di 4 cifre: lo scegli adesso e vale per tutte le tue chat private.', 'Scegli il codice', () => r(true), false, () => r(false)));
      if(!ok || !await impostaNuovoPin()) return;
    } else {
      /* v2.3: anche con il codice già scelto, per renderla privata te lo chiedo */
      const pin = await chiediPin('Rendi privata', 'Inserisci il tuo codice per rendere privata «' + nomeConv(c) + '».');
      if(!pin) return;
      if(pin === 'rifatto') return alternaBlocco(c);
    }
    const {data, error} = await sb.rpc('chat_blocca', {p_conv: c.id, p_si: true});
    if(error || data !== 'ok') return errore(error || data, 'Chat non resa privata');
    c.bloccata = true; S.sbloccate.add(c.id);
    toast('Chat privata: per aprirla servirà il codice.');
  } else {
    const pin = await chiediPin('Togli privata', 'Inserisci il codice per rendere di nuovo normale «' + nomeConv(c) + '».');
    if(!pin) return;
    if(pin === 'rifatto') return alternaBlocco(c);
    const {data, error} = await sb.rpc('chat_blocca', {p_conv: c.id, p_si: false, p_pin: pin});
    if(error || data !== 'ok') return errore(error || data, 'Blocco non tolto');
    c.bloccata = false;
    toast('La chat non è più privata.');
  }
  disegnaLista(); if(S.aperta === c.id) aggiornaTestaConv(); if(infoAperta === c.id) disegnaInfo();
}

/* ---------- tutta FOSS.chat protetta ---------- */
let bloccoTotaleAperto = false, nascostaDa = 0, ultimoGesto = Date.now();
async function bloccoTotale(){
  if(!S.tutto || bloccoTotaleAperto) return true;
  bloccoTotaleAperto = true;
  fermaAudio();
  const r = await chiediPin('FOSS.chat è protetta', 'Inserisci il codice per entrare.', true);
  bloccoTotaleAperto = false;
  ultimoGesto = Date.now();
  return !!r;
}
async function proteggiTutto(si){
  if(si){
    if(!S.haPin && !await impostaNuovoPin()) return false;
    const {data, error} = await sb.rpc('chat_proteggi_tutto', {p_si: true});
    if(error || data !== 'ok'){ errore(error || data, 'Protezione non attivata'); return false; }
    S.tutto = true; toast('FOSS.chat ora si apre solo col codice.');
    return true;
  }
  const pin = await chiediPin('Togli la protezione', 'Inserisci il codice per togliere la protezione a FOSS.chat.');
  if(!pin) return false;
  if(pin === 'rifatto') return proteggiTutto(false);
  const {data, error} = await sb.rpc('chat_proteggi_tutto', {p_si: false, p_pin: pin});
  if(error || data !== 'ok'){ errore(error || data, 'Protezione non tolta'); return false; }
  S.tutto = false; toast('Protezione tolta.');
  return true;
}
/* chi lascia lo schermo acceso: dopo un po' tutto si richiude */
function sorveglianza(){
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { ultimoGesto = Date.now(); }, {passive: true, capture: true}));
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'hidden'){ nascostaDa = Date.now(); return; }
    const via = Date.now() - nascostaDa;
    if(nascostaDa && via > 60000) richiudi();
    nascostaDa = 0;
  });
  setInterval(() => { if(Date.now() - ultimoGesto > 5 * 60000) richiudi(); }, 30000);
}
function richiudi(){
  const c = S.aperta && S.convs.get(S.aperta);
  if(c && c.bloccata && S.sbloccate.has(c.id)){
    S.sbloccate.delete(c.id);
    const id = c.id;
    chiudiConv();
    if(!S.tutto) toast('La chat privata si è richiusa.', 'Riapri', () => apriConv(id));
  }
  S.sbloccate.clear();
  if(S.tutto && !bloccoTotaleAperto) bloccoTotale();
}

/* ---------- benvenuto, la prima volta ---------- */
function benvenuto(){
  return new Promise(fine => {
    const v = document.createElement('div'); v.className = 'velo scuro';
    const p = (ic, t, d) => '<div style="display:flex;gap:14px;align-items:flex-start;margin:12px 0"><span style="width:38px;height:38px;border-radius:50%;background:color-mix(in srgb,var(--verde) 14%,transparent);color:var(--verde);display:grid;place-items:center;flex:none">'+
      '<span style="width:20px;height:20px;display:block">'+svg(ic, 1.9)+'</span></span><span><b style="color:var(--testo);font-weight:500;display:block">'+t+'</b>'+d+'</span></div>';
    v.innerHTML = '<div class="foglio" style="max-width:520px"><div class="foglio-c" style="padding-top:26px">'+
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:8px"><div style="width:56px;height:56px;border-radius:16px;overflow:hidden;flex:none">'+LOGO+'</div>'+
        '<div><div style="font-size:22px;color:var(--testo);font-weight:500">Benvenuto in FOSS.chat</div><div>La chat del tuo team, dentro FOSS.</div></div></div>'+
      '<p style="margin:10px 0 0;line-height:1.55">Funziona come WhatsApp: chat, gruppi, vocali, foto, sticker e GIF. Tieni premuto il tasto invia per gli effetti. Il tuo account è quello di FOSS.</p>'+
      '<div style="margin-top:18px;padding:14px 16px;border-radius:10px;background:var(--testa);color:var(--testo)">'+
        '<b style="font-weight:500">Proteggere la chat con un codice di 4 cifre?</b><div style="color:var(--testo-2);font-size:13.5px;margin-top:4px">'+
        'Si toglie quando vuoi dalle impostazioni.</div></div>'+
      '</div><div class="foglio-f"><button class="btn" data-b="no">No, grazie</button><button class="btn pieno" data-b="si">Sì, proteggila</button></div></div>';
    document.body.appendChild(v);
    v.onclick = async e => {
      const b = e.target.closest('[data-b]'); if(!b) return;
      v.remove();
      cambiaCfg('benvenuto', true);
      if(b.dataset.b === 'si') await proteggiTutto(true);
      fine();
    };
  });
}
