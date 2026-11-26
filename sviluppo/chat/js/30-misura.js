/* 2.9.17 — MISURA TEMPORANEA del «rimbalzo» del tasto «vai in fondo» sul computer.
   Solo per l'account del titolare e solo su schermi senza tocco: dal clic sulla freccia annota per 1,6 secondi,
   a ogni fotogramma, le misure della lista (solo numeri, nessun testo) e le manda in errori_app
   con dove = 'misura-fondo'. Da togliere appena trovata la causa. */
(function(){
  const TITOLARE = '4eed8596-7067-4cbb-aa2e-d60047930450';
  const attiva = () => S.io === TITOLARE && !tocco();
  let n = 0, inCorso = false;
  function registra(perche){
    if(inCorso || !attiva()) return; inCorso = true; n++;
    const M0 = el('msgs'), t0 = performance.now();
    /* un messaggio di riferimento: quello in fondo alla lista, per vedere se il contenuto si muove da solo */
    const serie = {}, eventi = [];
    let fot = 0;
    const metti = (k, v) => { const s = serie[k] || (serie[k] = []); const u = s[s.length - 1]; if(!u || u[1] !== v) s.push([fot, v]); };
    const ev = nome => () => eventi.push(nome + '@' + fot);
    const asc = [['wheel', M0, 'wheel'], ['sc', M0, 'scroll'], ['fin', document, 'focusin'], ['rs', window, 'resize']];
    let scorsi = 0;
    const fn = asc.map(([nome, o, tipo]) => { const f = nome === 'sc' ? () => { scorsi++; } : ev(nome); if(o) o.addEventListener(tipo, f, {passive: true}); return [o, tipo, f]; });
    const giro = () => {
      const M = el('msgs');
      const bolle = M ? M.querySelectorAll('.msg') : [], ult = bolle.length ? bolle[bolle.length - 1] : null;
      metti('mTop', M ? Math.round(M.scrollTop) : -1);
      metti('mSH', M ? M.scrollHeight : -1);
      metti('mCH', M ? M.clientHeight : -1);
      metti('mY', M ? Math.round(M.getBoundingClientRect().top) : -1);
      metti('nMsg', bolle.length);
      metti('ultB', ult ? Math.round(ult.getBoundingClientRect().bottom) : -1);
      /* il contenuto si è spostato da solo? fondo dell'ultima bolla + scrollTop deve restare costante */
      metti('ultAss', ult && M ? Math.round(ult.getBoundingClientRect().bottom + M.scrollTop) : -1);
      metti('anim', scorrendo ? 1 : 0);
      metti('giu', el('giuB') ? (el('giuB').classList.contains('nascosto') ? 0 : 1) : -1);
      metti('sep', el('sepNonLette') ? 1 : 0);
      metti('inH', window.innerHeight);
      metti('foc', document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : '-');
      metti('scev', scorsi);
      fot++;
      if(performance.now() - t0 < 1600) requestAnimationFrame(giro);
      else {
        fn.forEach(([o, tipo, f]) => { if(o) o.removeEventListener(tipo, f); });
        const testo = perche + ' fot=' + fot + ' ms=' + Math.round(performance.now() - t0) + '\n' +
          Object.keys(serie).map(k => k + ': ' + serie[k].map(([f, v]) => f + '=' + v).join(' ')).join('\n') +
          '\nev: ' + eventi.join(' ');
        inCorso = false;
        sb.rpc('segnala_errore', {p_dove: 'misura-fondo', p_messaggio: 'misura ' + n + ' ' + Date.now(),
          p_dettaglio: testo.slice(0, 2000), p_versione: VERSIONE, p_dispositivo: navigator.userAgent.slice(0, 200)}).then(() => {}, () => {});
      }
    };
    giro();
  }
  /* parto un attimo PRIMA dello scorrimento: alla pressione sulla freccia */
  document.addEventListener('pointerdown', e => { if(e.target.closest && e.target.closest('#giuB')) registra('freccia'); }, true);
})();
