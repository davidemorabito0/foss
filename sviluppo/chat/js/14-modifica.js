/* ======================= MODIFICARE UN MESSAGGIO (entro 15 minuti) =======================
   Come WhatsApp: il testo torna nella barra, sopra compare «Modifica messaggio», il tasto
   diventa una spunta. Il messaggio resta al suo posto con «modificato» e l'ora vicino. */
function avviaModifica(m){
  if(!puoModificare(m)){ toast('Un messaggio si può modificare solo nei primi 15 minuti.'); return; }
  const t = el('testoIn');
  if(!S.modifica && t) S.bozzaPrimaModifica = {conv: S.aperta, testo: t.value};
  S.modifica = m; S.risposta = null; S.effettoScelto = null;
  const md = m.media || {};
  S.extraModifica = {menz: (md.menzioni || []).slice(), lav: (md.lavori || []).slice()};
  chiudiPannelloEmoji();
  disegnaScrivi();
  const i = el('testoIn'); if(!i) return;
  i.value = m.tipo === 'testo' ? (m.testo || '') : (md.did || '');
  adatta(i); aggiornaTastoManda();
  i.focus(); try{ i.setSelectionRange(i.value.length, i.value.length); }catch(e){}
}
function annullaModifica(){
  if(!S.modifica) return;
  S.modifica = null; S.extraModifica = null;
  const b = S.bozzaPrimaModifica; S.bozzaPrimaModifica = null;
  disegnaScrivi();
  const i = el('testoIn');
  if(i){ i.value = b && b.conv === S.aperta ? b.testo : (S.bozze[S.aperta] || ''); adatta(i); aggiornaTastoManda(); }
}
/* freccia su nella barra vuota (computer): modifico il mio ultimo messaggio, come Telegram */
function modificaUltimo(){
  const c = S.convs.get(S.aperta); if(!c) return false;
  const l = msgVisibili(c.id);
  for(let i = l.length - 1; i >= 0 && i >= l.length - 30; i--){
    const m = l[i];
    if(m.autore === S.io && m.tipo === 'testo' && puoModificare(m)){ avviaModifica(m); return true; }
  }
  return false;
}
async function salvaModifica(){
  const m = S.modifica; const t = el('testoIn'); if(!m || !t) return;
  const testo = t.value.replace(/\s+$/, '').replace(/^\n+/, '');
  if(m.tipo === 'testo' && !testo.trim()){ toast('Il messaggio non può restare vuoto: per toglierlo usa «Elimina».'); return; }
  if(testo.length > (m.tipo === 'testo' ? 6000 : 1024)){ toast('Il testo è troppo lungo.'); return; }
  const c = S.convs.get(m.conv_id);
  const extra = m.tipo === 'testo' ? raccogliExtra(testo, c, S.extraModifica) : {};
  const md = m.media || {};
  const vecchio = m.tipo === 'testo' ? (m.testo || '') : (md.did || '');
  const extraPrima = JSON.stringify({menzioni: md.menzioni || null, tutti: md.tutti || null, lavori: md.lavori || null});
  const extraOra = JSON.stringify({menzioni: extra.menzioni || null, tutti: extra.tutti || null, lavori: extra.lavori || null});
  annullaModifica();
  if(testo === vecchio && (m.tipo !== 'testo' || extraPrima === extraOra)) return;
  if(!puoModificare(m)){ toast('Sono passati più di 15 minuti: il messaggio non si può più modificare.'); return; }
  const prima = {testo: m.testo, media: m.media ? JSON.parse(JSON.stringify(m.media)) : null, modificato_il: m.modificato_il};
  if(m.tipo === 'testo'){
    const nm = Object.assign({}, md); delete nm.menzioni; delete nm.tutti; delete nm.lavori;
    Object.assign(nm, extra);
    m.testo = testo; m.media = Object.keys(nm).length ? nm : null;
  } else {
    m.media = Object.assign({}, md); if(testo.trim()) m.media.did = testo; else delete m.media.did;
  }
  m.modificato_il = new Date().toISOString();
  ridisegnaMessaggio(m.id); disegnaLista();
  try{
    const {data, error} = await sb.rpc('chat_modifica', {p_id: m.id, p_testo: testo, p_extra: m.tipo === 'testo' ? extra : null});
    if(error) throw error;
    if(data) Object.assign(m, data);
    ridisegnaMessaggio(m.id);
    const cc = S.convs.get(m.conv_id); if(cc && cc.ultimo && cc.ultimo.id === m.id){ cc.ultimo.testo = (m.testo || '').slice(0, 140); cc.ultimo.media = m.media; disegnaLista(); }
  }catch(e){
    Object.assign(m, prima); ridisegnaMessaggio(m.id); disegnaLista();
    errore(e, 'Modifica non salvata');
  }
}
/* tocco su «modificato»: quando */
function infoModifica(id){
  const c = S.convs.get(S.aperta); const m = c && trovaMsg(c.id, id);
  if(m && m.modificato_il) toast('Modificato ' + quando(m.modificato_il) + '.');
}
