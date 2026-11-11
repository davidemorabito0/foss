/* ======================= MESSAGGI IMPORTANTI (la stella) =======================
   Una stella sul messaggio, solo per me. Li ritrovo nelle info della chat e nelle impostazioni. */
async function importante(m, si, zitto){
  if(si) S.importanti.add(m.id); else S.importanti.delete(m.id);
  ridisegnaMessaggio(m.id);
  const r = si ? await sb.from('chat_importanti').insert({utente_id: S.io, msg_id: m.id, conv_id: m.conv_id})
               : await sb.from('chat_importanti').delete().eq('msg_id', m.id).eq('utente_id', S.io);
  if(r.error && !/duplicate/i.test(r.error.message)){
    if(si) S.importanti.delete(m.id); else S.importanti.add(m.id);
    ridisegnaMessaggio(m.id); errore(r.error, 'Stella non salvata'); return;
  }
  if(!zitto) toast(si ? 'Segnato come importante.' : 'Non è più importante.');
  if(infoAperta && infoModo === 'importanti') disegnaImportanti();
}
async function messaggiImportanti(conv){
  const ids = Array.from(S.importanti); if(!ids.length) return [];
  const out = [];
  for(let i = 0; i < ids.length; i += 150){
    let q = sb.from('chat_messaggi').select('*').in('id', ids.slice(i, i + 150)).eq('eliminato', false);
    if(conv) q = q.eq('conv_id', conv);
    const {data} = await q; (data || []).forEach(m => out.push(m));
  }
  return out.filter(m => !S.nascosti.has(m.id)).sort((a, b) => new Date(b.creato_il) - new Date(a.creato_il));
}
function rigaImportante(m, conNome){
  const c = S.convs.get(m.conv_id);
  return '<button class="voce imp-voce" data-imp="'+m.id+'" data-conv="'+m.conv_id+'">'+avatar(m.autore)+'<span class="vc">'+
    '<span class="imp-chi">'+esc(m.autore === S.io ? 'Tu' : nomeMsg(m))+(conNome && c ? ' <i>›</i> ' + esc(nomeConv(c)) : '')+'<em>'+esc(dataBreve(m.creato_il))+'</em></span>'+
    '<b>'+esc(testoAnteprima(m))+'</b></span><span class="imp-stella">'+svg('stellaPiena', 1.6)+'</span></button>';
}
/* nelle info della chat */
async function disegnaImportanti(){
  const I2 = el('info'); const c = S.convs.get(infoAperta); if(!I2 || !c) return;
  I2.innerHTML = '<div class="scorre destra" style="position:absolute"><div class="scorre-testa basso"><button class="ib" data-a="info-indietro" aria-label="Indietro">'+svg('indietro')+'</button>'+
    '<h2>Messaggi importanti</h2></div><div class="scorre-corpo" id="impLista"><div class="vuoto-lista">Carico…</div></div></div>';
  const l = await messaggiImportanti(c.id);
  const L = el('impLista'); if(!L) return;
  L.innerHTML = l.length ? l.map(m => rigaImportante(m)).join('') : '<div class="vuoto-lista">'+svg('stella', 1.6).replace('<svg', '<svg style="width:46px;height:46px;margin:0 auto 12px;opacity:.5"')+
    'Nessun messaggio importante.<br>Tieni premuto un messaggio, «Altro…» e poi «Importante».</div>';
}
/* tutte le chat (dalle impostazioni) */
async function tuttiImportanti(){
  pannelloSinistra('Messaggi importanti', '<div id="impTutti"><div class="vuoto-lista">Carico…</div></div>', false);
  const l = await messaggiImportanti(null);
  const L = el('impTutti'); if(!L) return;
  L.innerHTML = l.length ? l.map(m => rigaImportante(m, true)).join('') : '<div class="vuoto-lista">Nessun messaggio importante.</div>';
}
async function apriImportante(id, conv){
  chiudiPannelloSinistra();
  if(S.aperta !== conv) await apriConv(conv);
  if(suTelefono() && infoAperta) chiudiInfo();
  vaiAMessaggio(id);
}
