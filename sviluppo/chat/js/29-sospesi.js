/* ---------- 2.9.6: i vocali non si perdono più ----------
   Un vocale compare subito nella chat, ma finché il file non è salito e il messaggio non è salvato esiste
   solo nella memoria della pagina: chiudendo l'app (o ricaricando) in quel momento spariva per sempre.
   Ora il vocale in invio viene anche messo da parte sul dispositivo (IndexedDB); a invio riuscito si toglie.
   Alla riapertura quelli rimasti indietro ricompaiono nella loro chat e ripartono da soli. */
const SOSPESI_GIORNI = 7;
function dbSospesi(){
  return new Promise((ok, ko) => {
    try{
      const r = indexedDB.open('fosschat', 1);
      r.onupgradeneeded = () => { if(!r.result.objectStoreNames.contains('sospesi')) r.result.createObjectStore('sospesi', {keyPath: 'id'}); };
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); r.onblocked = () => ko(new Error('bloccato'));
    }catch(e){ ko(e); }
  });
}
async function sospesiFai(modo, fai){
  const db = await dbSospesi();
  try{
    return await new Promise((ok, ko) => {
      const tx = db.transaction('sospesi', modo); let esito;
      const r = fai(tx.objectStore('sospesi')); if(r) r.onsuccess = () => { esito = r.result; };
      tx.oncomplete = () => ok(esito); tx.onerror = tx.onabort = () => ko(tx.error);
    });
  } finally { db.close(); }
}
function sospesoMetti(m, p){
  if(!m || m.tipo !== 'vocale' || !p || !p.blob) return;
  sospesiFai('readwrite', s => s.put({id: m.id, io: S.io, conv_id: m.conv_id, tipo: m.tipo, risponde_a: m.risponde_a || null,
    creato_il: m.creato_il, media: pulisciMedia(Object.assign({}, m.media, {url: null, path: null})), ext: p.ext || 'm4a', blob: p.blob, messo: Date.now()})).catch(() => {});
}
function sospesoTogli(id){ if(id) sospesiFai('readwrite', s => s.delete(id)).catch(() => {}); }

let sospesiRipresi = false;
async function riprendiSospesi(){
  if(sospesiRipresi) return; sospesiRipresi = true;
  let voci = [];
  try{ voci = await sospesiFai('readonly', s => s.getAll()) || []; }catch(e){ return; }
  for(const v of voci){
    try{
      if(v.io !== S.io) continue;                                   /* di un altro account su questo dispositivo */
      if(Date.now() - (v.messo || 0) > SOSPESI_GIORNI * 86400000 || !v.blob || !S.convs.get(v.conv_id)){ sospesoTogli(v.id); continue; }
      const st = S.msgs.get(v.conv_id);
      if(st && st.lista.some(x => x.id === v.id)) continue;         /* è già qui (sta salendo adesso) */
      /* era arrivato in fondo e mancava solo di toglierlo da parte? */
      const {data, error} = await sb.from('chat_messaggi').select('id').eq('id', v.id).maybeSingle();
      if(error) continue;                                           /* senza rete: riprovo alla prossima apertura */
      if(data){ sospesoTogli(v.id); continue; }
      const m = {id: v.id, conv_id: v.conv_id, autore: S.io, tipo: v.tipo, testo: null, risponde_a: v.risponde_a || null,
        media: Object.assign({}, v.media || {}, {locale: URL.createObjectURL(v.blob)}), creato_il: v.creato_il, eliminato: false, _stato: 'invio', _avanza: 0};
      m._file = {blob: v.blob, ext: v.ext, media: v.media};
      mettiInLista(m);
      inviaFilePronto(m, m._file);
    }catch(e){ console.warn('vocale in sospeso', e); }
  }
}
/* chiudere mentre un vocale sale: sul computer il browser chiede conferma */
window.addEventListener('beforeunload', e => {
  let inInvio = false;
  S.msgs.forEach(st => { if((st.lista || []).some(m => m._stato === 'invio' && m._file)) inInvio = true; });
  if(inInvio){ e.preventDefault(); e.returnValue = ''; }
});
