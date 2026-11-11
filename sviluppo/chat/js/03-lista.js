/* ======================= GUSCIO E ELENCO DELLE CHAT ======================= */
function applicaTema(){
  let t = S.cfg.tema || 'sistema';
  if(t === 'sistema') t = matchMedia('(prefers-color-scheme: light)').matches ? 'chiaro' : 'scuro';
  document.documentElement.setAttribute('data-tema', t);
  const col = TEMI_COLORE.some(x => x.id === S.cfg.colori) ? S.cfg.colori : 'brand';
  document.documentElement.setAttribute('data-colori', col);
  document.documentElement.setAttribute('data-testo', S.cfg.testo || 'medio');
  const scuro = t === 'scuro';
  document.documentElement.style.setProperty('--doodle-img', S.cfg.doodle === false ? 'none' : doodle(scuro));
  if(S.cfg.sfondo) document.documentElement.style.setProperty('--sfondo-chat', S.cfg.sfondo);
  else document.documentElement.style.removeProperty('--sfondo-chat');
  const m = document.querySelector('meta[name="theme-color"]'); if(m){ const v = getComputedStyle(document.documentElement).getPropertyValue('--testa').trim(); m.content = v || (scuro ? '#111b21' : '#f0f2f5'); }
}
try{ matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if(S.cfg.tema === 'sistema') applicaTema(); }); }catch(e){}

function disegnaGuscio(){
  const app = el('app');
  app.innerHTML =
    '<nav class="rail" aria-label="Menu">'+
      '<button class="rail-foss" data-a="foss" title="Torna a FOSS">'+LOGO+'</button>'+
      '<div style="height:8px"></div>'+
      '<button class="rail-b on" data-a="vista-chat" id="railChat" title="Chat">'+svg('nuova',1.8)+'</button>'+
      '<button class="rail-b" data-a="vista-archiviate" id="railArch" title="Archiviate">'+svg('archivio',1.8)+'</button>'+
      '<div class="spazio"></div>'+
      '<button class="rail-b" data-a="impostazioni" title="Impostazioni">'+svg('impostazioni',1.8)+'</button>'+
      '<button class="rail-b" data-a="profilo" title="Il tuo profilo" id="railMe">'+avatar(S.io)+'</button>'+
    '</nav>'+
    '<aside class="lato" id="lato">'+
      '<div class="ios-testa">'+
        '<div class="ios-riga"><button class="ios-tondo" data-a="menu-lista" aria-label="Menu">'+svg('puntini')+'</button><span class="sp"></span>'+
          '<button class="ios-tondo" data-a="fotocamera-lista" aria-label="Fotocamera">'+svg('camera', 1.9)+'</button>'+
          '<button class="ios-tondo verde" data-a="nuova" aria-label="Nuova chat">'+svg('piu', 2.4)+'</button></div>'+
        '<h1 class="ios-titolo">Chat</h1></div>'+
      '<div class="lato-testa">'+
        '<button class="ib torna-foss" data-a="foss" title="Torna a FOSS" style="display:none">'+svg('indietro')+'</button>'+
        '<h1>FOSS.chat</h1>'+
        '<button class="ib" data-a="nuova" title="Nuova chat">'+svg('nuova',1.9)+'</button>'+
        '<button class="ib" data-a="menu-lista" title="Menu">'+svg('menu')+'</button>'+
      '</div>'+
      '<div class="cerca"><label>'+svg('cerca')+'<input id="cercaIn" type="search" placeholder="Cerca" autocomplete="off" enterkeyhint="search"></label></div>'+
      '<div class="filtri" id="filtri"></div>'+
      '<div class="lista" id="lista"></div>'+
      '<button class="fab" data-a="nuova" title="Nuova chat" aria-label="Nuova chat">'+svg('nuova',1.9)+'</button>'+
      '<nav class="ios-tab" aria-label="Sezioni">'+
        '<button data-a="foss"><span class="ic logo">'+LOGO+'</span><span>FOSS</span></button>'+
        '<button class="on" data-a="vista-chat"><span class="ic">'+svg('chatTab', 1.8)+'<b class="ios-badge nascosto" id="tabBadge"></b></span><span>Chat</span></button>'+
        '<button data-a="impostazioni"><span class="ic">'+avatar(S.io, 'tab-av')+'</span><span>Tu</span></button>'+
      '</nav>'+
    '</aside>'+
    '<main class="conv" id="conv"></main>'+
    '<div id="info" class="pannello-info nascosto"></div>';
  if(suTelefono() || aTuttoSchermo()) $('.torna-foss').style.display = suTelefono() ? 'grid' : 'none';
  el('cercaIn').addEventListener('input', e => { S.cerca = e.target.value.trim().toLowerCase(); disegnaLista(); });
  disegnaConvVuota();
}
function disegnaConvVuota(){
  if(S.aperta) return;
  el('conv').innerHTML = '<div class="conv-vuota"><div class="logo">'+LOGO+'</div><h2>FOSS.chat</h2>'+
    '<p>Scrivi a chi lavora con te, crea i gruppi dei tuoi lavori, manda vocali, foto, sticker e GIF.<br>'+
    'Il tuo account è quello di FOSS: niente da registrare.</p>'+
    '<div class="piede">'+svg('lucchetto')+'Le chat sono visibili solo a chi ne fa parte</div></div>';
}

function convVisibili(){
  const elim = memoria('eliminate') || {};
  const arr = Array.from(S.convs.values()).filter(c => {
    if(elim[c.id] && (!c.ultimo || new Date(c.ultimo.creato_il) <= new Date(elim[c.id]))) return false;
    return true;
  });
  arr.sort((a, b) => (b.fissata ? 1 : 0) - (a.fissata ? 1 : 0) || new Date(b.ultimo_il) - new Date(a.ultimo_il));
  return arr;
}
let tLista = null;
function disegnaListaPresto(){ clearTimeout(tLista); tLista = setTimeout(disegnaLista, 120); }
function disegnaLista(){
  const L = el('lista'); if(!L) return;
  const tutte = convVisibili();
  const arch = tutte.filter(c => c.archiviata);
  let v = S.vista === 'archiviate' ? arch : tutte.filter(c => !c.archiviata);
  const bloccate = tutte.some(c => c.bloccata);
  /* filtri */
  const F = [['tutte','Tutte'],['nonlette','Da leggere'],['gruppi','Gruppi']].concat(bloccate ? [['bloccate','Bloccate']] : []);
  if(S.filtro === 'bloccate' && !bloccate) S.filtro = 'tutte';
  el('filtri').innerHTML = S.vista === 'archiviate' ? '' : F.map(f => '<button class="filtro'+(S.filtro === f[0] ? ' on' : '')+'" data-a="filtro" data-f="'+f[0]+'">'+f[1]+'</button>').join('');
  if(S.filtro === 'nonlette') v = v.filter(c => c.non_lette > 0 || c._nonLetta);
  if(S.filtro === 'gruppi') v = v.filter(c => c.tipo === 'gruppo');
  if(S.filtro === 'bloccate') v = v.filter(c => c.bloccata);
  if(S.cerca) v = v.filter(c => nomeConv(c).toLowerCase().includes(S.cerca) ||
    (!c.bloccata && c.ultimo && c.ultimo.testo && c.ultimo.testo.toLowerCase().includes(S.cerca)));
  let h = '';
  if(S.vista === 'archiviate'){
    h += '<button class="archivio-riga" data-a="vista-chat">'+svg('indietro')+'<span>Archiviate</span></button>';
  } else if(arch.length && !S.cerca && S.filtro === 'tutte'){
    const n = arch.reduce((x, c) => x + (c.non_lette ? 1 : 0), 0);
    h += '<button class="archivio-riga" data-a="vista-archiviate">'+svg('archivio')+'<span>Archiviate</span>'+(n ? '<b>'+n+'</b>' : '')+'</button>';
  }
  h += v.map(rigaHTML).join('');
  /* cercando: anche le persone del team con cui non ho ancora una chat */
  if(S.cerca){
    const gia = new Set(); S.convs.forEach(c => { if(c.tipo === 'privata') gia.add(altro(c)); });
    const pp = S.contatti.filter(id => !gia.has(id) && nomeLungo(id).toLowerCase().includes(S.cerca));
    if(pp.length) h += '<div class="sez-t" style="padding:16px 20px 8px">Contatti</div>' + pp.map(id =>
      '<button class="voce" data-a="scrivi-a" data-id="'+id+'">'+avatar(id, '', true)+'<span class="vc"><b>'+esc(nomeLungo(id))+'</b><span>'+esc((S.persone.get(id)||{}).ruolo || 'Nel tuo team')+'</span></span></button>').join('');
    if(!v.length && !pp.length) h += '<div class="vuoto-lista">Nessun risultato per «'+esc(S.cerca)+'».</div>';
  } else if(!v.length){
    h += S.vista === 'archiviate' ? '<div class="vuoto-lista">Nessuna chat archiviata.</div>'
      : S.filtro !== 'tutte' ? '<div class="vuoto-lista">Nessuna chat qui.<br><button class="btn" data-a="filtro" data-f="tutte">Vedi tutte le chat</button></div>'
      : '<div class="vuoto-lista"><b>Inizia a chattare</b>Scrivi a qualcuno del tuo team o crea un gruppo per un lavoro.<br><button class="btn pieno" data-a="nuova">Nuova chat</button></div>';
  }
  if(v.length) h += '<div class="cifrato-nota">'+svg('lucchetto')+'Visibili solo a chi è nella chat</div>';
  const sc = L.scrollTop;
  L.innerHTML = h;
  L.scrollTop = sc;
  const pr = el('railArch'), pc = el('railChat');
  if(pr && pc){ pr.classList.toggle('on', S.vista === 'archiviate'); pc.classList.toggle('on', S.vista !== 'archiviate'); }
}
function anteprimaTipo(u){
  const md = u.media || {};
  if(u.tipo === 'foto') return svg('foto', 1.8) + '<span class="tx">' + (md.gif ? 'GIF' : esc(md.did || 'Foto')) + '</span>';
  if(u.tipo === 'video') return svg('video', 1.8) + '<span class="tx">' + (md.gif ? 'GIF' : esc(md.did || 'Video')) + '</span>';
  if(u.tipo === 'vocale') return svg('mic', 1.8) + '<span class="tx">' + fmtDur(md.dur) + '</span>';
  if(u.tipo === 'sticker') return svg('sticker', 1.8) + '<span class="tx">Sticker</span>';
  if(u.tipo === 'file') return svg('doc', 1.8) + '<span class="tx">' + esc(md.nome || 'Documento') + '</span>';
  if(u.tipo === 'sondaggio') return svg('sondaggio', 2) + '<span class="tx">' + esc(u.testo || 'Sondaggio') + '</span>';
  if(u.tipo === 'lavoro') return svg('lavoro', 1.8) + '<span class="tx">' + (md.nuovo ? 'Nuovo lavoro: ' : '') + esc(md.lavoro ? md.lavoro.n : 'Lavoro di FOSS') + '</span>';
  if(u.tipo === 'colpetto') return svg('mano', 1.8) + '<span class="tx">' + esc(testoColpetto(u)) + '</span>';
  return '<span class="tx">' + esc(testoSemplice(u.testo || '')) + '</span>';
}
function testoSemplice(t){ return String(t || '').replace(/```([\s\S]*?)```/g, '$1').replace(/([*_~`])(\S(?:.*?\S)?)\1/g, '$2').replace(/\s+/g, ' '); }
function rigaHTML(c){
  const u = c.ultimo;
  const sc = chiScrive(c.id);
  let ant = '';
  if(sc.length){
    ant = '<span class="scrive">'+(c.tipo === 'gruppo' ? esc(nomeDi(sc[0].id)) + ' ' : '')+(sc[0].cosa === 'registra' ? 'sta registrando un vocale…' : 'sta scrivendo…')+'</span>';
  } else if(c.bloccata){
    ant = svg('lucchetto', 1.8) + '<span class="tx">Chat bloccata</span>';
  } else if(u){
    if(u.eliminato) ant = svg('vietato', 1.8) + '<span class="tx" style="font-style:italic">'+(u.autore === S.io ? 'Hai eliminato questo messaggio' : 'Questo messaggio è stato eliminato')+'</span>';
    else if(u.tipo === 'sistema') ant = '<span class="tx">'+esc(u.media && u.media.fissato ? (u.autore === S.io ? 'Hai fissato un messaggio' : nomeMsg(u) + ' ha fissato un messaggio') : (u.testo || ''))+'</span>';
    else if(u.tipo === 'colpetto') ant = anteprimaTipo(u);
    else {
      if(u.autore === S.io){ const st = statoSpunte(u, c); ant += spunteHTML(st, true); }
      else if(c.tipo === 'gruppo') ant += '<span class="chi">'+esc(nomeMsg(u))+':&nbsp;</span>';
      ant += anteprimaTipo(u);
    }
  } else if(c.tipo === 'gruppo') ant = '<span class="tx">Gruppo creato</span>';
  else ant = '<span class="tx">'+esc((S.persone.get(altro(c)) || {}).ruolo || 'Nuova chat')+'</span>';
  const nl = c.non_lette > 0 || c._nonLetta;
  const icone = (c.silenziata ? svg('silenzia', 1.8) : '') + (c.fissata ? svg('fissa', 1.8) : '') +
    (c.menzioni > 0 ? '<span class="contatore menz" title="Ti hanno menzionato">@</span>' : '') +
    (nl ? '<span class="contatore">'+(c.non_lette > 0 ? (c.non_lette > 99 ? '99+' : c.non_lette) : '')+'</span>' : '');
  return '<div class="riga'+(S.aperta === c.id ? ' on' : '')+(nl ? ' da-leggere' : '')+'" role="button" tabindex="0" data-a="apri" data-id="'+c.id+'">'+avatarConv(c)+
    '<span class="corpo"><span class="r1"><span class="nome">'+esc(nomeConv(c))+'</span>'+
      '<span class="ora'+(nl && !c.silenziata ? ' nuovo' : '')+'">'+(u ? dataBreve(u.creato_il) : dataBreve(c.creata_il))+'</span></span>'+
    '<span class="r2"><span class="anteprima">'+ant+'</span><span class="icone">'+icone+
      '<button class="giu" data-a="menu-riga" data-id="'+c.id+'" aria-label="Opzioni">'+svg('giu')+'</button></span></span></span></div>';
}
function spunteHTML(st, piccole){
  if(st === 'invio') return '<span class="sp">'+svg('orologio', 2)+'</span>';
  if(st === 'errore') return '<span class="sp" style="color:var(--rosso)">'+svg('info', 2)+'</span>';
  const w = piccole ? 2.2 : 2;
  if(st === 'inviato') return '<span class="sp">'+svg('spunta', w)+'</span>';
  return '<span class="sp'+(st === 'letto' ? ' spunta-letta' : '')+'"'+(st === 'letto' ? ' style="color:var(--blu-spunta)"' : '')+'>'+svg('spunte', w)+'</span>';
}

/* menu di una chat (freccina o pressione lunga) */
function menuRiga(id, x, y){
  const c = S.convs.get(id); if(!c) return;
  const nl = c.non_lette > 0 || c._nonLetta;
  apriMenu(x, y, [
    [c.archiviata ? 'Togli dall’archivio' : 'Archivia chat', 'archivio', () => impostaMembro(c, {archiviata: !c.archiviata})],
    [c.silenziata ? 'Riattiva notifiche' : 'Silenzia notifiche', c.silenziata ? 'campana' : 'silenzia', () => impostaMembro(c, {silenziata: !c.silenziata})],
    [c.fissata ? 'Sgancia chat' : 'Fissa in alto', 'fissa', () => impostaMembro(c, {fissata: !c.fissata})],
    [nl ? 'Segna come letta' : 'Segna come da leggere', 'spunte', () => {
      if(nl){ c._nonLetta = false; segnaLetto(c.id); }
      else { c._nonLetta = true; impostaMembro(c, {letto_fino: new Date(new Date(c.ultimo_il).getTime() - 1000).toISOString()}); }
      disegnaLista();
    }],
    [c.bloccata ? 'Sblocca chat' : 'Blocca chat', c.bloccata ? 'lucchettoAperto' : 'lucchetto', () => alternaBlocco(c)],
    null,
    c.tipo === 'gruppo' ? ['Esci dal gruppo', 'esci', () => esciGruppo(c), 'rosso'] : ['Elimina chat', 'cestino', () => eliminaChat(c), 'rosso'],
  ]);
}
async function impostaMembro(c, campi){
  Object.assign(c, campi);
  disegnaLista(); if(S.aperta === c.id) aggiornaTestaConv();
  const {error} = await sb.from('chat_membri').update(campi).eq('conv_id', c.id).eq('utente_id', S.io);
  if(error){ errore(error, 'Non salvato'); recupera(); }
  else if('archiviata' in campi) toast(campi.archiviata ? 'Chat archiviata' : 'Chat tolta dall’archivio', 'Annulla', () => impostaMembro(c, {archiviata: !campi.archiviata}));
}
function eliminaChat(c){
  conferma('Eliminare questa chat?', 'I messaggi spariscono da questo elenco e dalla chat solo per te. Se ti scrivono di nuovo, la chat ricompare.', 'Elimina chat', async () => {
    const t = new Date().toISOString();
    const e = memoria('eliminate') || {}; e[c.id] = t; memoria('eliminate', e);
    c.svuotata_il = t; c.archiviata = false;
    const {error} = await sb.from('chat_membri').update({svuotata_il: t, archiviata: false}).eq('conv_id', c.id).eq('utente_id', S.io);
    if(error) return errore(error, 'Non eliminata');
    S.msgs.delete(c.id);
    if(S.aperta === c.id) chiudiConv();
    disegnaLista();
  }, true);
}
