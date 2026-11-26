/* 2.9.14 — MISURA TEMPORANEA del «rimbalzo» all'invio sull'iPhone (app dalla Home).
   Solo per l'account del titolare, solo a tutto schermo su dispositivo touch: per 1,5 secondi dopo l'invio
   annota a ogni fotogramma le misure della pagina (solo numeri, nessun testo dei messaggi) e le manda
   in errori_app con dove = 'misura-rimbalzo'. Da togliere appena trovata la causa. */
(function(){
  const TITOLARE = '4eed8596-7067-4cbb-aa2e-d60047930450';
  const attiva = () => S.io === TITOLARE && aTuttoSchermo() && tocco();
  let n = 0, inCorso = false;
  function registra(perche){
    if(inCorso || !attiva()) return; inCorso = true; n++;
    const R = document.documentElement, vv = window.visualViewport, t0 = performance.now();
    const serie = {}, eventi = [];
    let fot = 0;
    const metti = (k, v) => { const s = serie[k] || (serie[k] = []); const u = s[s.length - 1]; if(!u || u[1] !== v) s.push([fot, v]); };
    const ev = nome => () => eventi.push(nome + '@' + fot);
    const asc = [['vvr', vv, 'resize'], ['vvs', vv, 'scroll'], ['fin', document, 'focusin'], ['fout', document, 'focusout']];
    const fn = asc.map(([nome, o, tipo]) => { const f = ev(nome); if(o) o.addEventListener(tipo, f); return [o, tipo, f]; });
    const giro = () => {
      const M = el('msgs'), F = el('scrivi'), T = el('testoIn'), A = el('app');
      const bolle = M ? M.querySelectorAll('.msg') : [], ult = bolle.length ? bolle[bolle.length - 1] : null;
      metti('vvH', vv ? Math.round(vv.height) : -1);
      metti('vvT', vv ? Math.round(vv.offsetTop) : -1);
      metti('inH', window.innerHeight);
      metti('scY', Math.round(window.scrollY));
      metti('alto', R.style.getPropertyValue('--alto') || '-');
      metti('tast', R.classList.contains('tastiera') ? 1 : 0);
      metti('mTop', M ? Math.round(M.scrollTop) : -1);
      metti('mSH', M ? M.scrollHeight : -1);
      metti('mCH', M ? M.clientHeight : -1);
      metti('mY', M ? Math.round(M.getBoundingClientRect().top) : -1);
      metti('ultB', ult ? Math.round(ult.getBoundingClientRect().bottom) : -1);
      { const tr = ult ? getComputedStyle(ult).transform : 'none'; metti('ultT', !tr || tr === 'none' ? 0 : Math.round(parseFloat(tr.split(',')[5]) * 10) / 10); }
      metti('scrH', F ? F.offsetHeight : -1);
      metti('taH', T ? T.offsetHeight : -1);
      metti('foc', document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : '-');
      metti('appT', A ? (A.style.transform || '-') : '-');
      fot++;
      if(performance.now() - t0 < 1800) requestAnimationFrame(giro);
      else {
        fn.forEach(([o, tipo, f]) => { if(o) o.removeEventListener(tipo, f); });
        const testo = perche + ' fot=' + fot + ' ms=' + Math.round(performance.now() - t0) + '\n' +
          Object.keys(serie).map(k => k + ': ' + serie[k].map(([f, v]) => f + '=' + v).join(' ')).join('\n') +
          '\nev: ' + eventi.join(' ');
        inCorso = false;
        sb.rpc('segnala_errore', {p_dove: 'misura-rimbalzo', p_messaggio: 'misura ' + n + ' ' + Date.now(),
          p_dettaglio: testo.slice(0, 2000), p_versione: VERSIONE, p_dispositivo: navigator.userAgent.slice(0, 200)}).then(() => {}, () => {});
      }
    };
    giro();
  }
  /* parto un attimo PRIMA dell'invio: tocco sul tasto o Invio nella casella */
  document.addEventListener('pointerdown', e => { if(e.target.closest && e.target.closest('#mandaB') && el('testoIn') && el('testoIn').value.trim()) registra('tocco'); }, true);
  document.addEventListener('keydown', e => { if(e.key === 'Enter' && e.target && e.target.id === 'testoIn') registra('invio'); }, true);
})();
