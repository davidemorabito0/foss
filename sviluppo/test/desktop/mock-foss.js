/* Prove dell'app per computer: aggiunge al Supabase finto della chat (../app/mock-supabase.js)
   le tabelle che servono a FOSS (index.html) per partire con un archivio, uno spazio e un
   lavoro con task e scadenze. I lavori sono nel formato vecchio: FOSS li mostra senza
   salvarli, che per queste prove va benissimo. */
(function(){
  const M = window.__mock; if(!M) return;
  const db = M.db, D = M.D, MO = M.MO, O1 = M.O1;
  const giorno = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const dmy = n => giorno(n).split('-').reverse().join('/');
  db.membri_org = [{org_id: O1, utente_id: D, ruolo: 'titolare', permessi: {}}, {org_id: O1, utente_id: MO, ruolo: 'membro', permessi: {}}];
  db.organizzazioni = [{id: O1, titolare: D, nome: 'Studio Davide'}];
  db.spazio_lavoro = [];
  db.spazi = [{org_id: O1, id: 'sp1', ordine: 0, dati: {nome: 'Il mio lavoro', tipo: 'video', col: '#FFAD01', icona: 'camera', membri: [D, MO]}}];
  db.conti = []; db.modelli = []; db.inviti = []; db.notifiche = []; db.membri_progetto = [];
  db.iscrizioni_push = [];
  /* i lavori della chat finta diventano lavori di FOSS dello spazio sp1, piu' uno completo */
  db.progetti.forEach(p => { p.spazio_id = 'sp1'; });
  db.progetti.unshift({org_id: O1, id: 'p2001', spazio_id: 'sp1', aggiornato_il: new Date().toISOString(), dati: {
    nome: 'Spot Caffè Aurora', cliente: 'Aurora', tipo: 'video', prio: 'alta', fase: 1, spazio: 'sp1',
    fasi: [{nome: 'Brief'}, {nome: 'Produzione'}, {nome: 'Montaggio'}, {nome: 'Consegna'}],
    team: [D, MO], consegna: dmy(5), indirizzo: 'Milano', allegati: [],
    subs: [
      {id: 's1', fase: 1, titolo: 'Riprese in studio', assegnato: D, aperto: true,
       items: [{t: 'Luci e set', done: false, d: giorno(0)}, {t: 'Scaletta', done: false, d: giorno(1)}, {t: 'Permessi', done: false, d: giorno(-2)}]},
      {id: 's2', fase: 1, titolo: 'Casting', assegnato: MO, items: [{t: 'Provini', done: false}]}
    ]}});
  /* l'upload degli allegati: il caricamento finto va bene per qualsiasi percorso */
  const crea = window.supabase.createClient;
  window.supabase.createClient = function(){
    const c = crea.apply(this, arguments);
    const da = c.storage.from;
    c.storage.from = b => Object.assign(da(b), {
      upload: async () => ({data: {}, error: null}),
      createSignedUrl: async () => ({data: {signedUrl: 'data:text/plain,ok'}, error: null}),
    });
    const rpc = c.rpc;
    c.rpc = async (n, a) => {
      if(n === 'chat_non_lette') return {data: 0, error: null};
      if(n === 'migra_progetti') return {data: null, error: null};
      return rpc(n, a);
    };
    window.__clientFinto = c;
    return c;
  };
  /* una notifica nuova per me, come la crea il database */
  M.notifica = function(tipo, dati, pid){
    const r = {id: crypto.randomUUID(), utente_id: D, progetto_id: pid || 'p2001', tipo, da: MO, dati: dati || {}, letta: false,
               creata_il: new Date().toISOString(), aggiornata_il: new Date().toISOString()};
    return window.__clientFinto.from('notifiche').insert(r).then(() => r.id);
  };
})();
