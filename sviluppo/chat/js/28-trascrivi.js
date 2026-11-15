/* ---------- 2.9.4: trascrizione dei vocali ----------
   Due tocchi su un vocale (senza farlo partire) aprono in basso il testo del messaggio.
   La trascrizione la fa la funzione «trascrivi» sul server e resta salvata (chat_trascrizioni):
   si fa una volta sola per vocale. Se di solito ci mette più di 5 secondi, la si comincia
   già quando il vocale arriva. Oltre i 2 minuti non si trascrive. */
const TRASCR_MAX = 120;
const trascritti = new Map();        // id -> testo
const trascrInCorso = new Map();     // id -> promessa
function vocaleTroppoLungo(m){ return (+((m && m.media) || {}).dur || 0) > TRASCR_MAX; }

/* quanto ci mette, in base alle volte precedenti (millisecondi per secondo di audio) */
function stimaTrascrizione(dur){
  const r = (memoria('trascrRitmo') || []).filter(x => x && x.dur > 0 && x.ms > 0);
  if(!r.length) return 1500 + 60 * dur;
  const q = r.map(x => x.ms / x.dur).sort((a, b) => a - b), med = q[Math.floor(q.length / 2)];
  return med * dur;
}
function notaRitmo(ms, dur){
  if(!(dur > 0) || !(ms > 0)) return;
  const r = (memoria('trascrRitmo') || []).concat([{ms: Math.round(ms), dur}]).slice(-10);
  memoria('trascrRitmo', r);
}

async function trascrivi(m, inAnticipo){
  if(trascritti.has(m.id)) return {testo: trascritti.get(m.id)};
  if(trascrInCorso.has(m.id)) return trascrInCorso.get(m.id);
  const lavoro = (async () => {
    /* già fatta da qualcuno? */
    try{
      const {data} = await sb.from('chat_trascrizioni').select('stato,testo').eq('msg_id', m.id).maybeSingle();
      if(data && data.stato === 'fatta'){ trascritti.set(m.id, data.testo || ''); return {testo: data.testo || ''}; }
    }catch(e){}
    const t0 = Date.now();
    const {data, error} = await sb.functions.invoke('trascrivi', {body: {messaggio: m.id}});
    if(error) return {errore: 'rete'};
    if(data && typeof data.testo === 'string'){
      trascritti.set(m.id, data.testo);
      if(!data.pronta) notaRitmo(Date.now() - t0, +((m.media || {}).dur) || 0);
      return {testo: data.testo};
    }
    return {errore: (data && (data.errore || data.stato)) || 'servizio'};
  })();
  trascrInCorso.set(m.id, lavoro);
  try{ return await lavoro; } finally { trascrInCorso.delete(m.id); }
}

/* appena arriva un vocale: se la trascrizione di solito è lenta, la comincio subito */
function anticipaTrascrizione(m){
  if(!m || m.tipo !== 'vocale' || m.eliminato || vocaleTroppoLungo(m)) return;
  const dur = +((m.media || {}).dur) || 0; if(!dur) return;
  if(stimaTrascrizione(dur) <= 5000) return;
  /* la fa chi l'ha mandato; gli altri aspettano un attimo e la fanno solo se nessuno ha cominciato */
  setTimeout(() => trascrivi(m, true).catch(() => {}), m.autore === S.io ? 300 : 4000 + Math.random() * 3000);
}

/* due tocchi su un vocale = trascrizione; un tocco solo fa quello di sempre (con un attimo di attesa,
   per capire se arriva il secondo), ma mentre suona risponde subito */
let tapVoc = {id: null, t: 0}, tapVocAttesa = null;
function toccoVocale(id, singolo){
  const ora = Date.now();
  if(tapVoc.id === id && ora - tapVoc.t < 350){
    clearTimeout(tapVocAttesa); tapVocAttesa = null; tapVoc = {id: null, t: 0};
    apriTrascrizione(id); return;
  }
  tapVoc = {id, t: ora};
  if(!singolo) return;
  if(audioId === id && audio && !audio.paused){ singolo(); return; }
  clearTimeout(tapVocAttesa);
  tapVocAttesa = setTimeout(() => { tapVocAttesa = null; singolo(); }, 300);
}

function chiudiTrascrizione(){
  const v = el('trascrVelo'); if(!v) return;
  v.classList.remove('su'); setTimeout(() => v.remove(), 220);
}
async function apriTrascrizione(id){
  const c = S.convs.get(S.aperta); const m = c && trovaMsg(c.id, id); if(!m) return;
  chiudiTrascrizione();
  const v = document.createElement('div'); v.className = 'trascr-velo'; v.id = 'trascrVelo';
  v.innerHTML = '<div class="trascr" role="dialog" aria-label="Trascrizione del vocale">'+
    '<div class="trascr-t"><span class="ic">'+svg('testo', 1.8)+'</span><b>Trascrizione</b><span class="trascr-d">'+esc(nomeMsg(m))+' · '+fmtDur((m.media || {}).dur)+'</span>'+
    '<button class="ib" data-x="1" aria-label="Chiudi">'+svg('chiudi')+'</button></div>'+
    '<div class="trascr-c" id="trascrC"><span class="trascr-att"><span class="giro"></span>Trascrivo il vocale…</span></div>'+
    '<div class="trascr-f" id="trascrF"></div></div>';
  document.body.appendChild(v);
  requestAnimationFrame(() => v.classList.add('su'));
  v.addEventListener('click', e => {
    if(e.target === v || e.target.closest('[data-x]')) chiudiTrascrizione();
    if(e.target.closest('[data-copia]')){ copia(trascritti.get(id) || ''); }
  });
  const C = () => el('trascrC');
  if(vocaleTroppoLungo(m)){
    C().innerHTML = '<p class="trascr-no">'+svg('mic', 2)+'L’audio supera i 2 minuti: la trascrizione è disponibile solo per i vocali fino a 2 minuti.</p>';
    return;
  }
  const r = await trascrivi(m);
  if(!el('trascrVelo') || !C()) return;
  if(r.testo != null){
    C().innerHTML = r.testo ? '<p class="trascr-testo">'+esc(r.testo)+'</p>' : '<p class="trascr-no">Non ho sentito parole in questo vocale.</p>';
    if(r.testo) el('trascrF').innerHTML = '<button class="btn" data-copia="1">'+svg('copia', 1.8)+'Copia il testo</button>';
    return;
  }
  const msg = {
    lungo: 'L’audio supera i 2 minuti: la trascrizione è disponibile solo per i vocali fino a 2 minuti.',
    chiave: 'La trascrizione non è ancora attiva: l’amministratore deve collegare il servizio.',
    in_corso: 'La sta già preparando qualcun altro: riprova tra qualche secondo.',
    file: 'Non riesco a prendere il file del vocale (il server dei media è acceso?).',
    rete: 'Non riesco a collegarmi: controlla la connessione e riprova.',
  }[r.errore] || 'La trascrizione non è riuscita: riprova tra poco.';
  C().innerHTML = '<p class="trascr-no">'+esc(msg)+'</p>';
}
document.addEventListener('keydown', e => { if(e.key === 'Escape' && el('trascrVelo')) chiudiTrascrizione(); });
