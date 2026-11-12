/* ---------- SUPER NOTIFICA ----------
   Solo per l'amministratore di FOSS: un tuo messaggio arriva anche per email
   a tutte le persone della chat. Una volta sola per messaggio. */
function superNotifica(m, c){
  const n = (c.membri || []).filter(x => x.id !== S.io).length;
  conferma('Super notifica', 'Il messaggio arriva anche per email ' + (n === 1 ? 'a ' + nomeDi(altro(c)) : 'alle ' + n + ' persone della chat') + '. Si può mandare una volta sola.', 'Manda la mail', async () => {
    toast('Mando la super notifica…');
    try{
      const {data, error} = await sb.functions.invoke('chat-supernotifica', {body: {messaggio: m.id}});
      if(error){
        let d = null; try{ d = await error.context.json(); }catch(e){}
        const k = d && d.errore;
        if(k === 'gia') return toast('La super notifica per questo messaggio è già partita.');
        if(k === 'troppi') return toast('Hai mandato troppe super notifiche oggi: riprova domani.');
        if(k === 'admin') return toast('La super notifica è solo per l’amministratore di FOSS.');
        throw error;
      }
      const ok = (data && data.inviate || []).length;
      toast(ok ? 'Super notifica mandata per email a ' + (ok === 1 ? '1 persona' : ok + ' persone') + '.' : 'Nessuna email mandata: nessuno della chat ha un indirizzo valido.');
    }catch(e){ errore(e, 'Super notifica non mandata'); }
  });
}
