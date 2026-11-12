/* ======================= MENU, FOGLI, AZIONI, AVVIO ======================= */
function chiudiMenu(){ ['menuPop', 'veloMenu', 'reazBarra'].forEach(id => { const n = el(id); if(n) n.remove(); }); }
/* voci: [testo, icona, funzione, 'rosso'] oppure null (separatore) */
function apriMenu(x, y, voci, tieniBarra, sopra){
  ['menuPop', 'veloMenu'].forEach(id => { const n = el(id); if(n) n.remove(); });
  if(!tieniBarra){ const b = el('reazBarra'); if(b) b.remove(); }
  const velo = document.createElement('div'); velo.className = 'velo'; velo.id = 'veloMenu';
  velo.onclick = chiudiMenu; velo.oncontextmenu = e => { e.preventDefault(); chiudiMenu(); };
  document.body.appendChild(velo);
  const m = document.createElement('div'); m.className = 'menu'; m.id = 'menuPop'; m.setAttribute('role', 'menu');
  const fz = [];
  m.innerHTML = voci.map(v => { if(!v) return '<div class="sep"></div>'; fz.push(v[2]); return '<button role="menuitem" class="'+(v[3] || '')+'" data-i="'+(fz.length - 1)+'">'+svg(v[1], 1.8)+'<span>'+esc(v[0])+'</span></button>'; }).join('');
  document.body.appendChild(m);
  const w = m.offsetWidth, h = m.offsetHeight;
  let l = x - w, t = sopra ? y - h : y;
  if(l < 8) l = Math.min(x, window.innerWidth - w - 8);
  if(t + h > window.innerHeight - 8) t = Math.max(8, y - h);
  if(t < 8) t = 8;
  m.style.left = Math.max(8, l) + 'px'; m.style.top = t + 'px';
  m.onclick = e => { const b = e.target.closest('[data-i]'); if(!b) return; chiudiMenu(); const f = fz[+b.dataset.i]; f && f(); };
}
function chiudiVelo(){ $$('.velo.scuro').forEach(v => { if(!v.classList.contains('blocco-tutto')) v.remove(); }); }
/* foglio: titolo, contenuto (html o testo), bottoni [testo, funzione, 'pieno'|'rosso'] */
function foglio(titolo, corpo, bottoni){
  const v = document.createElement('div'); v.className = 'velo scuro';
  v.innerHTML = '<div class="foglio" role="dialog"><div class="foglio-t">'+esc(titolo)+'</div><div class="foglio-c">'+(/^\s*</.test(corpo) ? corpo : esc(corpo))+'</div>'+
    '<div class="foglio-f">'+(bottoni || [['OK']]).map((b, i) => '<button class="btn '+(b[2] || '')+'" data-b="'+i+'">'+esc(b[0])+'</button>').join('')+'</div></div>';
  document.body.appendChild(v);
  v.addEventListener('click', e => {
    if(e.target === v){ v.remove(); return; }
    const b = e.target.closest('[data-b]'); if(!b) return;
    const f = (bottoni || [])[+b.dataset.b]; v.remove(); if(f && f[1]) f[1]();
  });
  const k = e => { if(e.key === 'Escape'){ v.remove(); document.removeEventListener('keydown', k); } };
  document.addEventListener('keydown', k);
  return v;
}
function conferma(titolo, testo, tasto, ok, rosso, no){
  foglio(titolo, testo, [['Annulla', no], [tasto, ok, rosso ? 'pieno rosso' : 'pieno']]);
}
function chiediTesto(titolo, testo, max, tipo, valore){
  return new Promise(fine => {
    const campo = tipo === 'area' ? '<textarea id="ctIn" rows="4" maxlength="'+(max || 200)+'">'+esc(valore || '')+'</textarea>'
      : '<input id="ctIn" type="'+(tipo === 'password' ? 'password' : 'text')+'" maxlength="'+(max || 200)+'" value="'+esc(valore || '')+'" autocomplete="'+(tipo === 'password' ? 'current-password' : 'off')+'">';
    let fatto = false;
    const v = foglio(titolo, (testo ? '<p style="margin:0 0 6px">'+esc(testo)+'</p>' : '')+'<label class="campo-t">'+campo+'</label>',
      [['Annulla', () => { fatto = true; fine(null); }], ['OK', () => { fatto = true; fine(el('ctIn') ? el('ctIn').value.trim() : null); }, 'pieno']]);
    const i = el('ctIn'); setTimeout(() => { i.focus(); try{ i.setSelectionRange(i.value.length, i.value.length); }catch(e){} }, 50);
    i.addEventListener('keydown', e => { if(e.key === 'Enter' && tipo !== 'area'){ e.preventDefault(); fatto = true; const val = i.value.trim(); v.remove(); fine(val); } });
    new MutationObserver((_, o) => { if(!document.body.contains(v)){ o.disconnect(); if(!fatto) fine(null); } }).observe(document.body, {childList: true});
  });
}

/* ---------- azioni (un solo ascoltatore per tutta la pagina) ---------- */
function vaiAFoss(cosa){
  const u = './' + (cosa || '');
  if(window.opener && !window.opener.closed){ try{ window.opener.focus(); if(cosa) window.opener.location.hash = cosa.replace(/^#?/, '#'); return; }catch(e){} }
  /* sul computer FOSS si apre accanto (sempre la stessa scheda), la chat resta qui */
  if(cosa && !suTelefono() && !aTuttoSchermo()){ const w = window.open(u, 'foss-team'); if(w){ try{ w.focus(); }catch(e){} return; } }
  location.href = u;
}
document.addEventListener('click', async e => {
  /* modalita' selezione: un tocco sceglie o toglie il messaggio */
  if(S.selezione && !e.target.closest('.sel-barra, .sel-testa, .velo, .foglio, #focusMenu')){
    const n = e.target.closest('#msgs .msg[data-id]');
    if(n){ e.preventDefault(); e.stopPropagation(); alternaScelto(n.dataset.id); return; }
  }
  const t = e.target.closest('[data-a]'); if(!t) return;
  const a = t.dataset.a, id = t.dataset.id;
  switch(a){
    case 'sel-chiudi': chiudiSelezione(); break;
    case 'sel-stella': azioneSelezione('stella'); break;
    case 'sel-copia': azioneSelezione('copia'); break;
    case 'sel-inoltra': azioneSelezione('inoltra'); break;
    case 'sel-elimina': azioneSelezione('elimina'); break;
    case 'annulla-modifica': annullaModifica(); { const i = el('testoIn'); if(i && !tocco()) i.focus(); } break;
    case 'info-modifica': e.stopPropagation(); infoModifica(id); break;
    case 'menz': { e.stopPropagation(); const r = t.getBoundingClientRect(); menuMenzione(id, r.left + 200, r.bottom + 4); break; }
    case 'vai-menzione': vaiAMenzione(); break;
    case 'lavoro-chip': e.stopPropagation(); vediLavoro({id, org: t.dataset.org, n: t.dataset.n}); break;
    case 'apri-lavoro': e.stopPropagation(); apriLavoroInFoss({id}); break;
    case 'mappa': e.stopPropagation(); apriMappa(t.dataset.q); break;
    case 'vota': e.stopPropagation(); vota(id, t.dataset.o); break;
    case 'vedi-voti': { e.stopPropagation(); const c = S.convs.get(S.aperta); const m = c && trovaMsg(c.id, id); if(m) vediVoti(m); break; }
    case 'fissato-vai': vaiAlFissato(); break;
    case 'fissati-lista': if(suTelefono() && infoAperta) chiudiInfo(); elencoFissati(); break;
    case 'fissato-togli': togliFissato(id); break;
    case 'programmati': if(suTelefono() && infoAperta) chiudiInfo(); elencoProgrammati(); break;
    case 'tutti-programmati': tuttiProgrammati(); break;
    case 'info-importanti': infoModo = 'importanti'; disegnaInfo(); break;
    case 'info-indietro': infoModo = 'info'; disegnaInfo(); break;
    case 'tutti-importanti': tuttiImportanti(); break;
    case 'crea-lavoro': if(suTelefono() && infoAperta) chiudiInfo(); creaLavoro({}); break;
    case 'colpetto': if(suTelefono() && infoAperta) chiudiInfo(); colpetto(id); break;
    case 'foss': vaiAFoss(); break;
    case 'apri': chiudiInfo(); chiudiPannelloSinistra(); apriConv(id); break;
    case 'chiudi-conv': if(suTelefono() && history.state && history.state.c) history.back(); else chiudiConv(); break;
    case 'nuova': nuovaChat(); break;
    case 'nuovo-gruppo': nuovoGruppo(); break;
    case 'scrivi-a': scriviA(id); break;
    case 'chiudi-pannello': chiudiPannelloSinistra(); break;
    case 'filtro': S.filtro = t.dataset.f; disegnaLista(); break;
    case 'vista-chat': S.vista = 'chat'; chiudiPannelloSinistra(); disegnaLista(); break;
    case 'vista-archiviate': S.vista = 'archiviate'; chiudiPannelloSinistra(); disegnaLista(); break;
    case 'menu-riga': { e.stopPropagation(); const r = t.getBoundingClientRect(); menuRiga(id, r.right, r.bottom); break; }
    case 'menu-lista': { const r = t.getBoundingClientRect(); apriMenu(r.right, r.bottom, [
      ['Nuovo gruppo', 'gruppo', nuovoGruppo], ['Archiviate', 'archivio', () => { S.vista = 'archiviate'; disegnaLista(); }],
      ['Segna tutte come lette', 'spunte', () => { S.convs.forEach(c => { if(c.non_lette) segnaLetto(c.id); }); disegnaLista(); }],
      ['Impostazioni', 'impostazioni', impostazioni], null, ['Torna a FOSS', 'esci', () => vaiAFoss()]]); break; }
    case 'menu-conv': { const c = S.convs.get(S.aperta); if(!c) break; const r = t.getBoundingClientRect();
      const nFis = fissatiDi(c.id).length;
      apriMenu(r.right, r.bottom, [
        [c.tipo === 'gruppo' ? 'Info gruppo' : 'Info contatto', 'info', () => apriInfo()],
        ['Cerca', 'cerca', () => apriInfo('cerca')],
        ['Seleziona messaggi', 'seleziona', () => avviaSelezione()],
        ['Messaggi importanti', 'stella', () => apriInfo('importanti')]].concat(
        nFis ? [['Messaggi fissati', 'spillo', elencoFissati]] : [],
        [['Crea un lavoro di FOSS', 'lavoro', () => creaLavoro({})]],
        S.adminFoss ? [['Importa chat di WhatsApp', 'importa', importaWhatsApp]] : [],
        c.tipo === 'privata' && altro(c) !== S.io ? [['Dai un colpetto', 'mano', () => colpetto(altro(c))]] : [], [
        null,
        [c.silenziata ? 'Riattiva notifiche' : 'Silenzia notifiche', c.silenziata ? 'campana' : 'silenzia', () => impostaMembro(c, {silenziata: !c.silenziata})],
        [c.bloccata ? 'Togli privata' : 'Rendi privata', c.bloccata ? 'lucchettoAperto' : 'lucchetto', () => alternaBlocco(c)],
        ['Svuota chat', 'vietato', svuotaChat],
        null,
        c.tipo === 'gruppo' ? ['Esci dal gruppo', 'esci', () => esciGruppo(c), 'rosso'] : ['Elimina chat', 'cestino', () => eliminaChat(c), 'rosso'],
        ['Chiudi chat', 'chiudi', chiudiConv]])); break; }
    case 'info': apriInfo(); break;
    case 'chiudi-info': chiudiInfo(); break;
    case 'cerca-in-chat': apriInfo('cerca'); break;
    case 'info-toggle': infoToggle(t.dataset.k); break;
    case 'membro': { const r = t.getBoundingClientRect(); menuMembro(id, r.left + 120, r.top + 30); break; }
    case 'aggiungi-membri': aggiungiMembri(); break;
    case 'rinomina-gruppo': rinominaGruppo(); break;
    case 'descr-gruppo': descrGruppo(); break;
    case 'foto-gruppo': fotoGruppo(); break;
    case 'svuota-chat': svuotaChat(); break;
    case 'esci-gruppo': esciGruppo(); break;
    case 'elimina-chat': { const c = S.convs.get(infoAperta); if(c){ chiudiInfo(); eliminaChat(c); } break; }
    case 'in-fondo': primaNonLetta = null; vaiInFondo(false); break;
    case 'menu-msg': { e.stopPropagation(); const r = t.getBoundingClientRect(); menuMessaggio(id, r.right, r.bottom + 4); break; }
    case 'chi-reagisce': chiReagisce(id); break;
    case 'togli-reazione': chiudiVelo(); { const m = S.reazioni.get(id); const em = m && m.get(S.io); if(em) reagisci(id, em); } break;
    case 'vai-msg': if((infoModo === 'cerca' || infoModo === 'importanti') && suTelefono()) chiudiInfo(); vaiAMessaggio(id); break;
    case 'vedi': { const c = S.convs.get(S.aperta); const m = c && trovaMsg(c.id, id); if(m && m._avanza == null && !t.closest('.eff-inchiostro:not(.svelato)')) apriVisore(id); break; }
    case 'apri-doc': apriDocumento(id); break;
    case 'play-voc': suonaVocale(id); break;
    case 'cerca-voc': cercaVocale(id, e); break;
    case 'vel-voc': velocita = velocita === 1 ? 1.5 : velocita === 1.5 ? 2 : 1; if(audio) audio.playbackRate = velocita; disegnaAvanzamento(); break;
    case 'ricarica-media': { const c = S.convs.get(S.aperta); const m = c && trovaMsg(c.id, id); if(m && m.media && m.media.path) firme.delete(m.media.path); ridisegnaMessaggio(id); break; }
    case 'riprova': riprova(id); break;
    case 'svela': svela(t); break;
    case 'rianima': { const an = t.dataset.anim; t.classList.remove('anim-' + an); void t.offsetWidth; t.classList.add('anim-' + an); break; }
    case 'annulla-risposta': S.risposta = null; disegnaScrivi(); break;
    case 'emoji': alternaPannelloEmoji(); break;
    case 'allega': menuAllega(); break;
    case 'fotocamera': fotocamera(); break;
    case 'effetti': apriEffetti(); break;
    case 'reg-annulla': fineRegistrazione(false); break;
    case 'reg-manda': fineRegistrazione(true); break;
    case 'importa-gif': scegliFile('image/gif,video/mp4,video/webm', true, f => f.forEach(x => salvaStickerFile(x, 'gif', false))); break;
    case 'nuovo-sticker': nuovoSticker(); break;
    case 'sticker-disegno': apriDisegno(null, b => salvaStickerFile(b, 'sticker', true), {trasparente: true, titolo: 'Disegna uno sticker', tastoOk: 'ok'}); break;
    case 'ai-chiudi': chiudiAnteprima(); break;
    case 'ai-vai': ai.i = +t.dataset.i; disegnaAnteprima(); break;
    case 'ai-aggiungi': scegliFile('image/*,video/*', true, f => anteprimaInvio(f)); break;
    case 'ai-togli': ai.voci.splice(ai.i, 1); ai.i = Math.max(0, ai.i - 1); disegnaAnteprima(); break;
    case 'ai-manda': mandaAnteprima(); break;
    case 'ai-disegna': { const v = ai.voci[ai.i]; apriDisegno(v.file, b => { const f = new File([b], 'foto.jpg', {type: b.type}); if(v.url) URL.revokeObjectURL(v.url); v.file = f; v.url = URL.createObjectURL(f); disegnaAnteprima(); }, {titolo: 'Disegna sulla foto', tastoOk: 'ok'}); break; }
    case 'ai-sticker': { const v = ai.voci[ai.i]; chiudiAnteprima(); apriStickerEditor(v.file); break; }
    case 'impostazioni': impostazioni(); break;
    case 'profilo': profilo(); break;
    case 'profilo-foss': vaiAFoss('#/profilo'); break;
    case 'proteggi-tutto': await proteggiTutto(!S.tutto); if(el('pannelloSxC')){ if($('.scorre-testa h2', el('pannelloSx')).textContent === 'Profilo') profilo(); else disegnaImpostazioni(); } break;
    case 'cambia-pin': await impostaNuovoPin(); disegnaImpostazioni(); break;
    case 'pin-dimenticato': if(await codiceDimenticato()) toast('Codice nuovo impostato.'); disegnaImpostazioni(); break;
    case 'attiva-push': attivaPush(); break;
    case 'cfg': { const k = t.dataset.k; cambiaCfg(k, t.dataset.v); applicaTema(); disegnaImpostazioni(); break; }
    case 'cfg-suoni': cambiaCfg('suoni', !S.cfg.suoni); disegnaImpostazioni(); break;
    case 'cfg-doodle': cambiaCfg('doodle', S.cfg.doodle === false); applicaTema(); disegnaImpostazioni(); { const M = el('msgs'); if(M) M.classList.toggle('niente-doodle', S.cfg.doodle === false); } break;
    case 'cfg-invio': cambiaCfg('invio', !S.cfg.invio); disegnaImpostazioni(); break;
    case 'cfg-entrati': cambiaCfg('entrati', S.cfg.entrati === false); disegnaImpostazioni(); break;
    case 'cornice': scegliCornice(t.dataset.v); break;
    case 'vivo': cambiaCfg('vivo', t.dataset.v || ''); disegnaImpostazioni(); avviaVivo(); if(t.dataset.v) setTimeout(vivoScossa, 300); break;
    case 'gestisci-sticker': gestisciRaccolta('sticker'); break;
    case 'gestisci-gif': gestisciRaccolta('gif'); break;
    case 'info-file': foglio('Dove stanno i file', MEDIA_NAS
        ? 'Foto, vocali, video e documenti stanno sul NAS dello studio. Se il NAS è spento o senza internet, i messaggi continuano ad arrivare ma i file mostrano «Il server dei media sembra offline» finché non torna acceso.'
        : 'Per ora foto, vocali, video e documenti stanno su Supabase, insieme ai messaggi. Quando il NAS dello studio sarà collegato, i file nuovi andranno lì: per te non cambia niente.', [['Ho capito']]); break;
    case 'rivedi-benvenuto': benvenuto(); break;
    case 'emoji-sticker': if(pannelloEmojiAperto) chiudiPannelloEmoji(); else apriPannelloEmoji('sticker'); break;
    case 'fotocamera-lista': scegliFile('image/*,video/*', false, f => scegliChatPerCondivisi(f, ''), tocco() ? 'environment' : undefined); break;
    case 'sfondo-foto': scegliSfondoFoto(null); break;
    case 'sfondo-colore': scegliSfondoColore(null); break;
    case 'sfondo-togli': { const v = S.cfg.sfondoFoto; cambiaCfg('sfondoFoto', null); if(v && !stessaFotoUsata(v)) sb.storage.from('chat').remove([v]).catch(() => {}); disegnaImpostazioni(); applicaSfondoConv(); break; }
    case 'sfondo-chat': { const r = t.getBoundingClientRect(); menuSfondoChat(r.left + 260, r.bottom - 10); break; }
  }
});
/* le righe dei messaggi importanti portano al messaggio, anche in un'altra chat */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-imp]'); if(!b) return;
  apriImportante(b.dataset.imp, b.dataset.conv);
});
document.addEventListener('input', e => {
  if(e.target.matches && e.target.matches('[data-buio]')){ cambiaCfg('sfondoBuio', (+e.target.value || 0) / 100); riempiAnteprimaSfondo(); applicaSfondoConv(); }
});
/* tasto destro e pressione lunga: i menu delle chat e dei messaggi */
document.addEventListener('contextmenu', e => {
  if(e.target.closest('input, textarea, a')) return;
  const r = e.target.closest('.riga[data-id]');
  if(r){ e.preventDefault(); menuRiga(r.dataset.id, e.clientX + 200, e.clientY); return; }
  const m = e.target.closest('#msgs .msg[data-id]');
  if(m && !e.target.closest('.media-box video')){ e.preventDefault(); menuMessaggio(m.dataset.id, e.clientX + 230, e.clientY); }
  else if(e.target.closest('#msgs, #focusMenu')) e.preventDefault();
});
(function pressioneLunga(){
  let t = null, x0 = 0, y0 = 0, fatto = false;
  document.addEventListener('touchstart', e => {
    const n = e.target.closest('.riga[data-id], #msgs .msg[data-id]'); if(!n || e.touches.length > 1 || e.target.closest('.sond-op, .lav-apri, .lav-luogo, .vocale .onda')) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; fatto = false;
    t = setTimeout(() => {
      fatto = true; try{ navigator.vibrate && navigator.vibrate(18); }catch(err){}
      if(n.classList.contains('riga')) menuRiga(n.dataset.id, Math.min(window.innerWidth - 10, x0 + 100), y0);
      else if(S.selezione) alternaScelto(n.dataset.id);
      else menuMessaggio(n.dataset.id, x0, y0);
    }, 480);
  }, {passive: true});
  document.addEventListener('touchmove', e => { if(t && (Math.abs(e.touches[0].clientX - x0) > 10 || Math.abs(e.touches[0].clientY - y0) > 10)){ clearTimeout(t); t = null; } }, {passive: true});
  document.addEventListener('touchend', e => { clearTimeout(t); t = null; if(fatto){ e.preventDefault(); fatto = false; } });
})();
document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){
    if(el('focusMenu')){ chiudiFocus(); return; }
    if(el('menuPop')){ chiudiMenu(); return; }
    if(S.selezione){ chiudiSelezione(); return; }
    if(el('visore')){ chiudiVisore(); return; }
    if(el('anteprimaInvio')){ chiudiAnteprima(); return; }
    if(infoAperta){ chiudiInfo(); return; }
    if(el('pannelloSx')){ chiudiPannelloSinistra(); return; }
    if(S.aperta && !e.target.closest('textarea, input')){ chiudiConv(); return; }
  }
  if(el('visore') && visoreDati){
    if(e.key === 'ArrowLeft' && visoreDati.i > 0){ visoreDati.i--; disegnaVisore(); }
    if(e.key === 'ArrowRight' && visoreDati.i < visoreDati.lista.length - 1){ visoreDati.i++; disegnaVisore(); }
  }
  if((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'n'){ e.preventDefault(); nuovaChat(); }
});
window.addEventListener('hashchange', seguiIndirizzo);
window.addEventListener('popstate', () => { if(!location.hash && S.aperta && suTelefono()) chiudiConv(); });
function seguiIndirizzo(){
  const m = /#c=([0-9a-f-]{36})/.exec(location.hash || '');
  const mm = /[&?]m=([0-9a-f-]{36})/.exec(location.hash || '');
  if(m && S.pronti){
    if(m[1] !== S.aperta) apriConv(m[1], {daHash: true, msg: mm && mm[1]});
    else if(mm) vaiAMessaggio(mm[1]);
    if(mm) history.replaceState(history.state, '', '#c=' + m[1]);
  }
  if(/#impostazioni/.test(location.hash) && S.pronti) impostazioni();
}

/* ---------- condivisi da altre app (Android: «Condividi» → FOSS) ---------- */
async function prendiCondivisi(){
  if(!/condivisi=1/.test(location.search) || !('caches' in window)) return;
  history.replaceState(null, '', location.pathname + location.hash);
  try{
    const cache = await caches.open('fosschat-condivisi');
    const meta = await cache.match('./condivisi/meta');
    if(!meta) return;
    const info = await meta.json();
    const files = [];
    for(let i = 0; i < (info.n || 0); i++){
      const r = await cache.match('./condivisi/' + i); if(!r) continue;
      const b = await r.blob(); files.push(new File([b], (info.nomi && info.nomi[i]) || 'file', {type: b.type}));
    }
    await Promise.all([cache.delete('./condivisi/meta')].concat(files.map((_, i) => cache.delete('./condivisi/' + i))));
    const testo = [info.title, info.text, info.url].filter(Boolean).join('\n');
    if(!files.length && !testo) return;
    scegliChatPerCondivisi(files, testo);
  }catch(e){ console.warn('condivisi', e); }
}
function scegliChatPerCondivisi(files, testo){
  const convs = convVisibili().filter(c => !c.bloccata);
  const anteprima = files.length ? '<div class="condivisi-anteprima">'+files.slice(0, 6).map(f => /^image/.test(f.type) ? '<img src="'+URL.createObjectURL(f)+'" alt="">' : /^video/.test(f.type) ? '<video src="'+URL.createObjectURL(f)+'" muted></video>' : '<span>'+esc(f.name)+'</span>').join('')+'</div>' : '';
  const v = foglio('Invia a…', anteprima + (testo ? '<p style="white-space:pre-wrap;color:var(--testo)">'+esc(testo)+'</p>' : '')+'<div style="margin:0 -24px">'+
    convs.map(c => '<button class="voce" data-dest="'+c.id+'">'+avatarConv(c)+'<span class="vc"><b>'+esc(nomeConv(c))+'</b></span></button>').join('')+'</div>', [['Annulla']]);
  v.querySelector('.foglio-c').onclick = async e => {
    const b = e.target.closest('[data-dest]'); if(!b) return;
    v.remove();
    await apriConv(b.dataset.dest);
    if(testo){ const t = el('testoIn'); if(t){ t.value = testo; adatta(t); aggiornaTastoManda(); } }
    if(files.length){
      const gif = files.every(f => /gif|mp4/.test(f.type)) && files.some(f => /gif/.test(f.type));
      anteprimaInvio(files, gif ? 'gif' : undefined);
    }
  };
}

/* ---------- avvio ---------- */
function schermataAvvio(testo, bottone){
  let a = el('avvio');
  if(!a){ a = document.createElement('div'); a.className = 'avvio'; a.id = 'avvio'; document.body.appendChild(a); }
  a.innerHTML = '<div class="logo">'+LOGO+'</div>'+(testo ? '<p>'+testo+'</p>' : '<div class="barra"><i></i></div><p>FOSS.chat</p>')+(bottone || '');
}
function togliAvvio(){ const a = el('avvio'); if(a){ a.style.opacity = '0'; setTimeout(() => a.remove(), 300); } }
/* il pannello emoji/GIF/sticker si chiude toccando la chat */
document.addEventListener('pointerdown', e => {
  if(!pannelloEmojiAperto) return;
  const t = e.target;
  if(t.closest && t.closest('.msgs-wrap, #msgs, .conv-testa, .testa-conv')) chiudiPannelloEmoji();
}, true);
async function avvia(){
  applicaTema();
  schermataAvvio();
  if(!sb){ schermataAvvio('Non riesco a collegarmi a FOSS. Controlla la connessione e ricarica la pagina.', '<button class="btn pieno" onclick="location.reload()">Riprova</button>'); return; }
  const u = await sessione();
  if(!u){
    schermataAvvio('Per usare FOSS.chat entra prima in FOSS con il tuo account: poi torna qui, la chat ti riconosce da sola.', '<button class="btn pieno" onclick="location.href=\'./\'">Entra in FOSS</button>');
    return;
  }
  S.io = u.id;
  try{
    await Promise.all([caricaProfilo(), caricaPin()]);
    sb.rpc('e_admin_foss').then(r => { S.adminFoss = !!(r && r.data === true); }, () => {});
    if(S.tutto){ togliAvvio(); const ok = await bloccoTotale(); if(!ok) return; schermataAvvio(); }
    await Promise.all([caricaPersone(), caricaElenco(), caricaNascosti(), caricaRaccolta(), caricaMieCose().catch(e => console.warn('mie cose', e))]);
  }catch(e){
    console.warn(e);
    schermataAvvio('Non riesco a caricare le chat. Controlla la connessione e riprova.', '<button class="btn pieno" onclick="location.reload()">Riprova</button>');
    return;
  }
  disegnaGuscio();
  disegnaLista();
  aggiornaTitolo();
  avviaTempoReale();
  S.pronti = true;
  togliAvvio();
  ping(); setInterval(ping, 60000);
  setInterval(() => { aggiornaTestaConv(); }, 30000);
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible'){ controllaTempoReale(); ping(); scattaPromemoria(); pulisciAvvisi(); const c = S.aperta && S.convs.get(S.aperta); if(c && c.non_lette && vicinoAlFondo() && sbloccata(c)) segnaLetto(c.id); }
  });
  /* torni sulla finestra della chat (per esempio da un altro programma): la chat aperta diventa letta */
  window.addEventListener('focus', () => {
    pulisciAvvisi();
    const c = S.aperta && S.convs.get(S.aperta);
    if(c && c.non_lette && document.visibilityState === 'visible' && vicinoAlFondo() && sbloccata(c)) segnaLetto(c.id);
  });
  window.addEventListener('online', () => riavviaTempoReale(true));
  window.addEventListener('pageshow', e => { if(e.persisted) controllaTempoReale(); });
  /* rete di sicurezza: con la chat davanti controllo ogni 20 secondi che il collegamento sia vivo */
  setInterval(() => { if(document.visibilityState === 'visible') controllaTempoReale(true); }, 20000);
  sveglia();
  sorveglianza();
  /* le persone cambiano nome o foto in FOSS: ogni tanto rileggo */
  setInterval(() => caricaPersone().then(disegnaListaPresto).catch(() => {}), 5 * 60000);
  if(!S.cfg.benvenuto) await benvenuto();
  seguiIndirizzo();
  prendiCondivisi();
  sb.auth.onAuthStateChange((ev, ses) => {
    if(ev === 'SIGNED_OUT' || (ses && ses.user && ses.user.id !== S.io)){ location.reload(); return; }
    /* accesso rinnovato: lo passo anche al tempo reale, sennò dopo un'ora smette di arrivare */
    if(ev === 'TOKEN_REFRESHED' && ses && ses.access_token){ try{ sb.realtime.setAuth(ses.access_token); }catch(e){} if(!canaliVivi()) riavviaTempoReale(true); }
  });
}
if('serviceWorker' in navigator){
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  navigator.serviceWorker.addEventListener('message', e => {
    const d = e.data || {};
    if(d.tipo !== 'apri' || !d.url) return;
    let h = ''; try{ h = new URL(d.url, location.href).hash; }catch(_){}
    if(h && location.hash !== h) location.hash = h; else seguiIndirizzo();
  });
}
/* tastiera su iPhone: Safari non accorcia la pagina, la sposta. Adatto la chat allo spazio
   che resta sopra la tastiera, cosi' messaggi e barra restano sempre visibili (come WhatsApp) */
(function(){
  const vv = window.visualViewport; if(!vv) return;
  const adatta = () => {
    const h = Math.round(vv.height);
    document.documentElement.style.setProperty('--alto', h + 'px');
    if(Math.abs(window.scrollY) > 0 || vv.offsetTop > 0) window.scrollTo(0, 0);
    const app = el('app'); if(app) app.style.transform = vv.offsetTop ? 'translateY(' + vv.offsetTop + 'px)' : '';
    const M = el('msgs');
    if(M && M._eraInFondo !== false) M.scrollTop = M.scrollHeight;
  };
  vv.addEventListener('resize', adatta); vv.addEventListener('scroll', adatta);
  document.addEventListener('focusin', e => { if(e.target.id === 'testoIn'){ const M = el('msgs'); if(M) M._eraInFondo = vicinoAlFondo(); setTimeout(adatta, 60); setTimeout(adatta, 350); } });
  document.addEventListener('focusout', () => setTimeout(adatta, 120));
  adatta();
})();
window.addEventListener('resize', debounce(() => {
  const t = $('.torna-foss'); if(t) t.style.display = suTelefono() ? 'grid' : 'none';
  if(!suTelefono() && !S.aperta) disegnaConvVuota();
}, 200));
