/* ---------- 2.9: lo stato di ognuno, come su MSN ----------
   Chi è online ha un cerchio verde intorno alla foto; chi si è messo «occupato» un cerchio rosso;
   «invisibile» non si fa vedere online (e non aggiorna «ultimo accesso»).
   Il proprio stato sta in profili.chat_cfg.stato ('online' | 'occupato' | 'invisibile') e passa
   agli altri dentro la presenza del tempo reale (canaleOnline.track): nessuna tabella nuova. */
const STATI = [
  {id: 'online', nome: 'Online', ds: 'Gli altri ti vedono col cerchio verde'},
  {id: 'occupato', nome: 'Occupato', ds: 'Cerchio rosso: si vede che hai da fare'},
  {id: 'invisibile', nome: 'Invisibile', ds: 'Nessuno ti vede online'},
];
function mioStato(){ const s = S.cfg && S.cfg.stato; return STATI.some(x => x.id === s) ? s : 'online'; }
/* lo stato di un altro: 'online', 'occupato' o '' se non c'è */
function statoDi(id){
  if(!S.online.has(id)) return '';
  if(id === S.io) return mioStato() === 'invisibile' ? '' : mioStato();
  return S.stati.get(id) === 'occupato' ? 'occupato' : 'online';
}
function testoStato(id){ const s = statoDi(id); return s === 'occupato' ? 'occupato' : s === 'online' ? 'online' : ''; }
/* letti dalla presenza: chi è occupato */
function leggiStati(st){
  S.stati = new Map();
  Object.keys(st || {}).forEach(id => { const l = st[id] || []; if(l.some(x => x && x.stato === 'occupato')) S.stati.set(id, 'occupato'); });
}
/* mi faccio vedere (o no) secondo il mio stato */
async function annunciaStato(){
  if(!canaleOnline) return;
  try{
    if(mioStato() === 'invisibile') await canaleOnline.untrack();
    else await canaleOnline.track({id: S.io, dal: Date.now(), stato: mioStato()});
  }catch(e){}
}
function sceltaStatoHTML(){
  const ora = mioStato();
  return '<div class="stati-scelta">'+STATI.map(x => '<button class="'+(x.id === ora ? 'on' : '')+'" data-a="scegli-stato" data-v="'+x.id+'">'+
    '<span class="st-pallino st-'+x.id+'"></span><b>'+esc(x.nome)+'</b><span>'+esc(x.ds)+'</span></button>').join('')+'</div>';
}
function scegliStato(v){
  if(!STATI.some(x => x.id === v)) return;
  cambiaCfg('stato', v);
  annunciaStato();
  disegnaImpostazioni(); disegnaListaPresto(); aggiornaTestaConv();
  toast(v === 'invisibile' ? 'Sei invisibile: nessuno ti vede online.' : v === 'occupato' ? 'Sei occupato: gli altri vedono il cerchio rosso.' : 'Sei online: gli altri vedono il cerchio verde.');
}
