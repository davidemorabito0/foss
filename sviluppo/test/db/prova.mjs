import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const db = new PGlite();
const D = '4eed8596-7067-4cbb-aa2e-d60047930450', M = '1f8e0e39-d7e4-4a67-b3f0-e71d8a71ab17', A = '6f8c402a-4b36-4c97-80cf-e6c1d538623a', X = '2ee54db8-9fba-45ea-9719-75fdeb4e4759';
const O1 = '9ee833a0-d3bc-47ca-b838-0bbf8c1d113b';
let ok = 0, ko = 0;
const vero = (cond, cosa) => { if(cond){ ok++; } else { ko++; console.log('  ✗ ' + cosa); } };

async function q(sql, params){ return (await db.query(sql, params)).rows; }
async function come(u, sql, params){
  await db.exec(`reset role; select set_config('request.jwt.claims', '${JSON.stringify({sub: u, role: 'authenticated', iat: Math.floor(Date.now()/1000)})}', false); set role authenticated;`);
  try { return (await db.query(sql, params)).rows; }
  finally { await db.exec('reset role'); }
}
async function errore(u, sql, params){
  try { await come(u, sql, params); return null; } catch(e){ return e.message; }
}

await db.exec(fs.readFileSync('prelude.sql', 'utf8'));
let mig = fs.readFileSync(new URL('../../sql/fosschat_2_funzioni.sql', import.meta.url), 'utf8');
try { await db.exec(mig); } catch(e){ console.log('MIGRAZIONE FALLITA:', e.message); process.exit(1); }
console.log('migrazione applicata');
/* la seconda volta deve passare lo stesso (idempotente) */
try { await db.exec(mig); console.log('migrazione ripetuta: ok'); } catch(e){ console.log('MIGRAZIONE RIPETUTA FALLITA:', e.message); ko++; }
await db.exec('grant select, insert, update, delete on all tables in schema public to authenticated; grant execute on all functions in schema public to authenticated;');
/* le revoche della migrazione restano: le rimetto come in produzione */
await db.exec('revoke execute on function public.chat_registra_letture(uuid, uuid, timestamptz, timestamptz) from authenticated; revoke execute on function public.chat_orologio() from authenticated;');

/* ---------- dati ---------- */
await db.exec(`
insert into auth.users values ('${D}'), ('${M}'), ('${A}'), ('${X}');
insert into profili (id, nome, cognome, nickname) values ('${D}','Davide','Morabito','davidemorabito'), ('${M}','Monica','Mancini','Momo'), ('${A}','Antonio','Del Latte',''), ('${X}','Xeno','Fuori','');
insert into organizzazioni (id, nome, titolare) values ('${O1}', 'Studio Davide', '${D}');
insert into membri_org (org_id, utente_id, ruolo, permessi) values ('${O1}','${D}','titolare','{}'), ('${O1}','${M}','collaboratore','{}'),
  ('${O1}','${A}','collaboratore','{"crea_lavori":false,"visibilita":false}');
insert into spazi (org_id, id, dati, ordine) values ('${O1}', 'sp1', '{"nome":"Il mio lavoro","tipo":"video","col":"#FFAD01"}', 0);
insert into push_iscrizioni (endpoint, utente_id, p256dh, auth) values ('https://fcm.googleapis.com/m', '${M}', 'x', 'y'), ('https://fcm.googleapis.com/a', '${A}', 'x', 'y'), ('https://fcm.googleapis.com/d', '${D}', 'x', 'y');
`);
const C1 = (await q(`insert into chat_conversazioni (tipo, coppia, creata_da) values ('privata', 'k', '${D}') returning id`))[0].id;
const G1 = (await q(`insert into chat_conversazioni (tipo, nome, creata_da) values ('gruppo', 'Videoclip Il Merlo', '${D}') returning id`))[0].id;
await db.exec(`insert into chat_membri (conv_id, utente_id, ruolo, letto_fino, ricevuto_fino) values
  ('${C1}','${D}','admin', now() - interval '1 hour', now() - interval '1 hour'), ('${C1}','${M}','admin', now() - interval '1 hour', now() - interval '1 hour'),
  ('${G1}','${D}','admin', now() - interval '1 hour', now() - interval '1 hour'), ('${G1}','${M}','membro', now() - interval '1 hour', now() - interval '1 hour'),
  ('${G1}','${A}','membro', now() - interval '1 hour', now() - interval '1 hour');
  update chat_membri set silenziata = true where conv_id = '${G1}' and utente_id = '${M}';`);
const push = async () => (await q('select body from net.chiamate order by id')).map(r => r.body);
const azzeraPush = () => db.exec('delete from net.chiamate');

console.log('— testo, menzioni, avvisi');
const ins = (u, conv, tipo, testo, media) => come(u, `insert into chat_messaggi (conv_id, tipo, testo, media) values ($1, $2, $3, $4) returning *`, [conv, tipo, testo, media == null ? null : JSON.stringify(media)]);
await azzeraPush();
let m1 = (await ins(D, G1, 'testo', '@Momo domani alle 9', {menzioni: [{id: M, n: 'Momo'}]}))[0];
vero(m1.autore === D, 'autore messo dal database');
let p = await push();
vero(p.length === 2, 'menzione: avvisa Momo (silenziata ma menzionata) e Antonio, non chi scrive (' + p.length + ')');
vero(p.some(b => b.iscrizioni[0].endpoint.endsWith('/m') && b.notifica.dati.menzione === true), 'Momo: avviso con menzione');
vero(p.filter(b => b.notifica.dati.menzione).every(b => b.notifica.dati.msg === m1.id) && p.filter(b => !b.notifica.dati.menzione).every(b => !b.notifica.dati.msg), 'menzione: l\'avviso di Momo porta al messaggio, quello di Antonio apre la chat');
await azzeraPush();
await ins(D, G1, 'testo', 'senza menzione', null);
p = await push();
vero(p.length === 1 && p[0].iscrizioni[0].endpoint.endsWith('/a'), 'senza menzione: Momo silenziata non riceve');
vero(!p[0].notifica.dati.msg, 'senza menzione: l\'avviso apre solo la chat');
await azzeraPush();
await ins(D, G1, 'testo', '@tutti si parte', {tutti: true, silenzioso: true});
p = await push();
vero(p.length === 2, '@tutti: arriva anche a chi ha silenziato');
vero(p.every(b => b.notifica.dati.muto === true), 'senza suono: avviso muto');
vero(!!await errore(D, `insert into chat_messaggi (conv_id, tipo, testo, media) values ($1, 'testo', 'x', '{"strano":1}')`, [G1]), 'chiave strana rifiutata');
vero(!!await errore(D, `insert into chat_messaggi (conv_id, tipo, testo, media) values ($1, 'testo', 'x', '{"menzioni":[{"id":"no","n":"x"}]}')`, [G1]), 'menzione rotta rifiutata');
vero(!!await errore(D, `insert into chat_messaggi (conv_id, tipo, testo, media) values ($1, 'testo', 'x', '{"lavori":[{"id":"p1","org":"x","n":"a"}]}')`, [G1]), 'lavoro rotto rifiutato');
await ins(D, G1, 'testo', 'vedi #Merlo', {lavori: [{id: 'p123', org: O1, n: 'Merlo'}], bolla: 'slam'});
vero(!!await errore(X, `insert into chat_messaggi (conv_id, tipo, testo) values ($1, 'testo', 'intruso')`, [G1]), 'chi non e\' nella chat non scrive');

console.log('— modifica');
let mod = (await come(D, `select chat_modifica($1, $2, $3) r`, [m1.id, '@Momo domani alle 10', JSON.stringify({menzioni: [{id: M, n: 'Momo'}]})]))[0].r;
vero(mod.testo === '@Momo domani alle 10' && mod.modificato_il, 'modificato con l\'ora');
vero(mod.media && mod.media.menzioni && mod.media.menzioni.length === 1, 'menzioni tenute');
vero(/non puoi/.test(await errore(M, `select chat_modifica($1, 'hack')`, [m1.id]) || ''), 'gli altri non modificano');
await q(`update chat_messaggi set creato_il = now() - interval '20 minutes' where id = $1`, [m1.id]);
vero(/15 minuti/.test(await errore(D, `select chat_modifica($1, 'tardi')`, [m1.id]) || ''), 'dopo 15 minuti no');
const mfx = (await ins(D, G1, 'testo', 'con effetto', {bolla: 'slam'}))[0];
mod = (await come(D, `select chat_modifica($1, 'cambiato', null) r`, [mfx.id]))[0].r;
vero(mod.media && mod.media.bolla === 'slam', 'l\'effetto resta dopo la modifica');

console.log('— fissati');
await come(M, `select chat_fissa($1, true)`, [mfx.id]);
let r = (await q(`select fissato_il, fissato_da from chat_messaggi where id = $1`, [mfx.id]))[0];
vero(r.fissato_il && r.fissato_da === M, 'fissato da Momo');
r = (await q(`select * from chat_messaggi where tipo = 'sistema' and media->>'fissato' = $1`, [mfx.id]));
vero(r.length === 1 && r[0].autore === M, 'riga di sistema «ha fissato»');
await come(M, `select chat_fissa($1, true)`, [mfx.id]);
vero((await q(`select count(*)::int n from chat_messaggi where tipo = 'sistema' and media->>'fissato' = $1`, [mfx.id]))[0].n === 1, 'fissare due volte non duplica');
vero(!!await errore(X, `select chat_fissa($1, true)`, [mfx.id]), 'chi non e\' nella chat non fissa');
await come(D, `select chat_fissa($1, false)`, [mfx.id]);
vero((await q(`select fissato_il from chat_messaggi where id = $1`, [mfx.id]))[0].fissato_il === null, 'tolto dai fissati');
await come(D, `select chat_fissa($1, true)`, [mfx.id]);
await come(D, `select chat_elimina($1)`, [mfx.id]);
vero((await q(`select fissato_il from chat_messaggi where id = $1`, [mfx.id]))[0].fissato_il === null, 'eliminato per tutti: via dai fissati');

console.log('— sondaggi');
const sond = (await ins(D, G1, 'sondaggio', 'Chi c\'è martedì?', {opzioni: [{id: 'a', t: 'Io'}, {id: 'b', t: 'No'}], multi: false}))[0];
vero(!!sond.id, 'sondaggio creato');
vero(!!await errore(D, `insert into chat_messaggi (conv_id, tipo, testo, media) values ($1, 'sondaggio', 'x', '{"opzioni":[{"id":"a","t":"solo"}]}')`, [G1]), 'una sola opzione: no');
vero(!!await errore(D, `insert into chat_messaggi (conv_id, tipo, testo, media) values ($1, 'sondaggio', 'x', '{"opzioni":[{"id":"a","t":"x"},{"id":"a","t":"y"}]}')`, [G1]), 'opzioni doppie: no');
vero(!!await errore(D, `insert into chat_messaggi (conv_id, tipo, testo, media) values ($1, 'sondaggio', 'x', '{"opzioni":"no"}')`, [G1]), 'opzioni non lista: no');
await come(M, `select chat_vota($1, $2)`, [sond.id, ['a']]);
await come(M, `select chat_vota($1, $2)`, [sond.id, ['b']]);
r = await q(`select opzione from chat_voti where msg_id = $1 and utente_id = $2`, [sond.id, M]);
vero(r.length === 1 && r[0].opzione === 'b', 'voto cambiato (una risposta)');
vero(/una sola/.test(await errore(M, `select chat_vota($1, $2)`, [sond.id, ['a','b']]) || ''), 'due risposte in un sondaggio a una: no');
vero(/opzione/.test(await errore(M, `select chat_vota($1, $2)`, [sond.id, ['z']]) || ''), 'opzione inesistente: no');
await come(M, `select chat_vota($1, $2)`, [sond.id, []]);
vero((await q(`select count(*)::int n from chat_voti where msg_id = $1 and utente_id = $2`, [sond.id, M]))[0].n === 0, 'voto tolto');
vero((await come(A, `select count(*)::int n from chat_voti where msg_id = $1`, [sond.id]))[0].n === 0, 'Antonio vede i voti (0)');
await come(A, `select chat_vota($1, $2)`, [sond.id, ['a']]);
vero((await come(M, `select count(*)::int n from chat_voti where msg_id = $1`, [sond.id]))[0].n === 1, 'Momo vede il voto di Antonio');
vero((await come(X, `select count(*)::int n from chat_voti where msg_id = $1`, [sond.id]))[0].n === 0, 'chi e\' fuori non vede i voti');
vero(!!await errore(M, `select chat_chiudi_sondaggio($1)`, [sond.id]), 'solo chi l\'ha creato lo chiude');
await come(D, `select chat_chiudi_sondaggio($1)`, [sond.id]);
vero(/chiuso/.test(await errore(M, `select chat_vota($1, $2)`, [sond.id, ['a']]) || ''), 'sondaggio chiuso: niente voti');
const multi = (await ins(D, G1, 'sondaggio', 'Cosa porto?', {opzioni: [{id: 'a', t: 'Luci'}, {id: 'b', t: 'Drone'}, {id: 'c', t: 'Gimbal'}], multi: true}))[0];
await come(M, `select chat_vota($1, $2)`, [multi.id, ['a', 'c']]);
vero((await q(`select count(*)::int n from chat_voti where msg_id = $1`, [multi.id]))[0].n === 2, 'più risposte');

console.log('— lavoro e colpetto');
await ins(D, G1, 'lavoro', null, {lavoro: {id: 'p1790698076918', org: O1, n: 'Guitar Power'}});
vero(!!await errore(D, `insert into chat_messaggi (conv_id, tipo, media) values ($1, 'lavoro', '{"lavoro":{"id":"p1","org":"no","n":"x"}}')`, [G1]), 'lavoro con archivio rotto: no');
await azzeraPush();
await ins(D, G1, 'colpetto', null, {a: M});
p = await push();
vero(p.length === 0, 'colpetto a Momo che ha silenziato il gruppo: nessun avviso (' + p.length + ')');
await azzeraPush();
await ins(D, C1, 'colpetto', null, {a: M});
p = await push();
vero(p.length === 1 && p[0].iscrizioni[0].endpoint.endsWith('/m') && /colpetto/.test(p[0].notifica.dati.testo), 'colpetto in privata: avviso a Momo');
vero(p[0].notifica.dati.colpetto === true && !p[0].notifica.dati.msg, 'colpetto: segnato come colpetto');
vero(/qualche secondo/.test(await errore(D, `insert into chat_messaggi (conv_id, tipo, media) values ($1, 'colpetto', $2)`, [C1, JSON.stringify({a: M})]) || ''), 'colpetti a raffica: no');
vero(!!await errore(D, `insert into chat_messaggi (conv_id, tipo, media) values ($1, 'colpetto', $2)`, [C1, JSON.stringify({a: D})]), 'colpetto a se stessi: no');
vero(!!await errore(D, `insert into chat_messaggi (conv_id, tipo, media) values ($1, 'colpetto', $2)`, [C1, JSON.stringify({a: A})]), 'colpetto a chi non e\' nella chat: no');

console.log('— programmati');
const pr = (await come(D, `insert into chat_programmati (conv_id, testo, media, quando) values ($1, 'buongiorno', $2, now() + interval '1 hour') returning *`, [C1, JSON.stringify({menzioni: [{id: M, n: 'Momo'}]})]))[0];
vero(pr.autore === D, 'programmato salvato');
vero(!!await errore(X, `insert into chat_programmati (conv_id, testo, quando) values ($1, 'x', now() + interval '1 hour')`, [C1]), 'non nelle chat altrui');
vero(!!await errore(D, `insert into chat_programmati (conv_id, testo, quando) values ($1, 'x', now() - interval '1 day')`, [C1]), 'non nel passato');
vero((await come(M, `select count(*)::int n from chat_programmati`))[0].n === 0, 'gli altri non vedono i miei programmati');
await q(`update chat_programmati set quando = now() - interval '1 second' where id = $1`, [pr.id]);
await azzeraPush();
await q(`select chat_orologio()`);
r = await q(`select * from chat_messaggi where conv_id = $1 and testo = 'buongiorno'`, [C1]);
vero(r.length === 1 && r[0].autore === D, 'l\'orologio manda il programmato a nome di Davide');
vero((await q(`select count(*)::int n from chat_programmati`))[0].n === 0, 'programmato tolto dopo l\'invio');
p = await push();
vero(p.length === 1 && p[0].iscrizioni[0].endpoint.endsWith('/m'), 'avviso per il programmato');
vero((await q(`select current_setting('chat.interno', true) v`))[0].v !== '1', 'la modalità interna non resta accesa');
/* un programmato rotto non blocca gli altri */
await q(`insert into chat_programmati (conv_id, autore, testo, media, quando) values ($1, $2, 'rotto', '{"strano":1}', now() - interval '1 second'), ($1, $2, 'buono', null, now() - interval '1 second')`, [C1, D]);
await q(`select chat_orologio()`);
vero((await q(`select count(*)::int n from chat_messaggi where testo = 'buono'`))[0].n === 1, 'il buono parte anche se c\'e\' un rotto');
vero((await q(`select count(*)::int n from chat_programmati`))[0].n === 0, 'il rotto viene tolto');

console.log('— promemoria e importanti');
const target = (await ins(D, C1, 'testo', 'ricordamelo', null))[0];
await come(M, `insert into chat_promemoria (msg_id, conv_id, quando) values ($1, $2, now() + interval '1 hour')`, [target.id, C1]);
await come(M, `insert into chat_promemoria (msg_id, conv_id, quando) values ($1, $2, now() + interval '2 hour') on conflict (utente_id, msg_id) do update set quando = excluded.quando`, [target.id, C1]);
vero((await q(`select count(*)::int n from chat_promemoria`))[0].n === 1, 'un promemoria per messaggio');
vero(!!await errore(X, `insert into chat_promemoria (msg_id, conv_id, quando) values ($1, $2, now() + interval '1 hour')`, [target.id, C1]), 'non sui messaggi altrui');
vero(!!await errore(M, `insert into chat_promemoria (msg_id, conv_id, quando) values ($1, $2, now() + interval '1 hour')`, [target.id, G1]), 'messaggio e chat devono combaciare');
await q(`update chat_promemoria set quando = now() - interval '1 second'`);
await azzeraPush();
await q(`select chat_orologio()`);
p = await push();
vero(p.length === 1 && p[0].notifica.dati.promemoria === true && /Promemoria/.test(p[0].notifica.dati.titolo) && p[0].notifica.dati.msg === target.id, 'promemoria mandato a Momo');
vero((await q(`select count(*)::int n from chat_promemoria`))[0].n === 0, 'promemoria tolto');
await come(M, `insert into chat_importanti (msg_id, conv_id) values ($1, $2)`, [target.id, C1]);
vero((await come(M, `select count(*)::int n from chat_importanti`))[0].n === 1, 'stella messa');
vero((await come(D, `select count(*)::int n from chat_importanti`))[0].n === 0, 'le stelle sono personali');
await come(M, `delete from chat_importanti where msg_id = $1`, [target.id]);
vero((await come(M, `select count(*)::int n from chat_importanti`))[0].n === 0, 'stella tolta');

console.log('— letture con l\'ora');
await come(M, `select chat_letto($1)`, [C1]);
const lt = await come(D, `select * from chat_letture where conv_id = $1`, [C1]);
vero(lt.length >= 1 && lt.every(x => x.utente_id === M), 'Davide vede quando Momo ha letto i suoi messaggi');
vero((await come(M, `select count(*)::int n from chat_letture where conv_id = $1`, [C1]))[0].n === 0, 'Momo non vede le letture dei messaggi di Davide');
vero(!!await errore(M, `select chat_registra_letture($1, $2, now() - interval '1 day', now())`, [C1, M]), 'la funzione interna non si chiama da fuori');

console.log('— elenco e non lette');
let el = (await come(A, `select chat_elenco() r`))[0].r;
let g = el.find(x => x.id === G1);
vero(g && g.menzioni === 1, 'Antonio: una menzione da leggere (@tutti): ' + (g && g.menzioni));
vero(g && g.ultimo && 'modificato_il' in g.ultimo, 'ultimo con modificato_il');
vero((await come(A, `select chat_non_lette() n`))[0].n >= 1, 'non lette contate');
await ins(D, G1, 'testo', '@Momo ci sei?', {menzioni: [{id: M, n: 'Momo'}]});
el = (await come(M, `select chat_elenco() r`))[0].r; g = el.find(x => x.id === G1);
vero(g && g.menzioni === 1 && g.silenziata === true, 'Momo: menzione nuova anche col gruppo silenziato');
vero((await come(M, `select chat_non_lette() n`))[0].n >= 1, 'gruppo silenziato ma menzionata: conta');

console.log('— lavori di FOSS');
let dove = (await come(D, `select chat_dove_creare() r`))[0].r;
vero(dove.archivi.length === 1 && dove.archivi[0].spazi.length === 1 && dove.archivi[0].squadra === true, 'Davide puo\' creare e scegliere la squadra');
dove = (await come(A, `select chat_dove_creare() r`))[0].r;
vero(dove.archivi.length === 0, 'Antonio non puo\' creare');
dove = (await come(M, `select chat_dove_creare() r`))[0].r;
vero(dove.archivi.length === 1 && dove.archivi[0].spazi.length === 0, 'Momo: archivio sì, spazi visibili no (non ha lavori li\')');
const cr = (await come(D, `select chat_crea_lavoro($1, 'sp1', 'Videoclip Il Merlo', 'Carolina', '2026-12-13', '09:00', 'Riprese', '2026-12-20', 'Consegna', 'Milano, Via Berna 15', 'Porta <le luci>\nE il drone', $2, $3) r`,
  [O1, [M, X], G1]))[0].r;
vero(/^p\d+$/.test(cr.id) && cr.nome === 'Videoclip Il Merlo', 'lavoro creato: ' + cr.id);
vero(cr.msg && cr.msg.tipo === 'lavoro' && cr.msg.autore === D && cr.msg.media.nuovo === true, 'scheda nella chat');
const prog = (await q(`select * from progetti where id = $1`, [cr.id]))[0];
vero(prog.dati._formato === 2 && prog.dati.consegna === '20/12/2026' && prog.dati.indirizzo === 'Milano, Via Berna 15', 'nucleo del lavoro giusto');
vero(JSON.stringify(prog.dati.team) === JSON.stringify([D, M]), 'squadra: Davide e Momo (chi e\' fuori resta fuori)');
vero(prog.dati.nota === 'Porta &lt;le luci&gt;<br>E il drone', 'note sicure: ' + prog.dati.nota);
vero(prog.dati.daChat && prog.dati.daChat.conv === G1 && prog.dati.daChat.completo === false, 'segno «nato in chat»');
const els = await q(`select tipo, dati from elementi where progetto_id = $1 order by ordine`, [cr.id]);
vero(els.filter(e => e.tipo === 'evento').length === 2 && els.some(e => e.tipo === 'log' && /Videoclip Il Merlo/.test(e.dati.tx)), 'date e registro');
vero(els.some(e => e.tipo === 'evento' && e.dati.t === 'Riprese' && e.dati.ora === '09:00'), 'giorno delle riprese con l\'ora');
vero((await q(`select count(*)::int n from membri_progetto where progetto_id = $1`, [cr.id]))[0].n === 2, 'membri del lavoro');
vero((await q(`select count(*)::int n from notifiche where progetto_id = $1 and tipo = 'aperto' and utente_id = $2`, [cr.id, M]))[0].n === 1, 'Momo avvisata in FOSS');
let lav = (await come(M, `select chat_lavori($1) r`, [[cr.id, 'p-che-non-esiste']]))[0].r;
vero(lav.length === 1 && lav[0].nome === 'Videoclip Il Merlo' && lav[0].eventi.length === 2 && lav[0].voci.tot === 0, 'Momo vede la scheda');
lav = (await come(A, `select chat_lavori($1) r`, [[cr.id]]))[0].r;
vero(lav.length === 0, 'Antonio non e\' nel lavoro: niente scheda');
vero(/permesso/.test(await errore(A, `select chat_crea_lavoro($1, 'sp1', 'X')`, [O1]) || ''), 'Antonio non puo\' creare');
vero(/titolo o il cliente/.test(await errore(D, `select chat_crea_lavoro($1, 'sp1', '  ', '')`, [O1]) || ''), 'serve titolo o cliente');
vero(/spazio/.test(await errore(D, `select chat_crea_lavoro($1, 'spX', 'X')`, [O1]) || ''), 'spazio inesistente');
vero(!!await errore(X, `select chat_crea_lavoro($1, 'sp1', 'X', '', null, null, null, null, null, '', '', '{}', $2)`, [O1, G1]), 'chi e\' fuori non crea');
const el2 = (await come(M, `select chat_lavori_elenco() r`))[0].r;
vero(el2.some(x => x.id === cr.id && x.prossimo === '2026-12-13'), 'Momo trova il lavoro nell\'elenco col prossimo giorno');
vero((await come(M, `select foss_completa_da_chat($1, $2) r`, [O1, cr.id]))[0].r === true, 'il primo che apre completa');
vero((await come(D, `select foss_completa_da_chat($1, $2) r`, [O1, cr.id]))[0].r === false, 'il secondo no');
vero((await come(A, `select foss_completa_da_chat($1, $2) r`, [O1, cr.id]))[0].r === false, 'chi non e\' nel lavoro no');
dove = (await come(M, `select chat_dove_creare() r`))[0].r;
vero(dove.archivi[0].spazi.length === 1, 'ora Momo vede lo spazio (ha un lavoro li\')');
vero(dove.clienti.includes('Carolina'), 'clienti suggeriti');
/* guest senza «visibilita»: il lavoro lo vede solo lui */
await q(`update membri_org set permessi = '{"visibilita":false}' where utente_id = $1`, [M]);
const cr2 = (await come(M, `select chat_crea_lavoro($1, 'sp1', 'Solo mio', '', null, null, null, null, null, '', '', $2, null) r`, [O1, [D, A]]))[0].r;
const p2 = (await q(`select dati from progetti where id = $1`, [cr2.id]))[0];
vero(JSON.stringify(p2.dati.team) === JSON.stringify([M]) && !cr2.msg, 'guest senza permesso squadra: solo lui, niente messaggio senza chat');

console.log('— avvisi con la foto');
await q(`update profili set foto_url = 'https://suqpteanvnvvmfujlevi.supabase.co/storage/v1/object/public/avatar/d.jpg' where id = $1`, [D]);
await azzeraPush();
await ins(D, C1, 'foto', null, {path: C1 + '/scena.jpg', w: 10, h: 10});
p = await push();
vero(p.length === 1 && /avatar\/d\.jpg$/.test(p[0].notifica.dati.foto) && p[0].notifica.dati.img === C1 + '/scena.jpg', 'foto: avviso con la faccia di chi scrive e l\'anteprima');
await azzeraPush();
await ins(D, C1, 'foto', null, {path: C1 + '/x.gif', gif: true, w: 10, h: 10});
p = await push();
vero(p.length === 1 && !p[0].notifica.dati.img, 'gif: niente anteprima');
await azzeraPush();
await new Promise(r => setTimeout(r, 10));
await q(`delete from chat_messaggi where tipo = 'colpetto'`);
await ins(D, C1, 'colpetto', null, {a: M});
p = await push();
vero(p.length === 1 && !!p[0].notifica.dati.foto && !p[0].notifica.dati.img, 'colpetto: con la faccia');
await q(`update profili set foto_url = null where id = $1`, [D]);
await q(`update chat_conversazioni set foto = $1 where id = $2`, [G1 + '/g.jpg', G1]);
await q(`update chat_membri set silenziata = false where conv_id = $1`, [G1]);
await azzeraPush();
await ins(D, G1, 'testo', 'ciao a tutti', null);
p = await push();
vero(p.length > 0 && p.every(b => b.notifica.dati.foto_chat === G1 + '/g.jpg' && !b.notifica.dati.foto), 'senza foto: quella del gruppo');

console.log('— importare da WhatsApp');
await q(`insert into admin_foss values ('${D}', 'd@x')`);
await q(`update chat_membri set silenziata = false`);
const LOT = 'aaaaaaaa-1111-4222-8333-444444444444';
const imp = (u, conv, msgs, lotto) => come(u, `select chat_importa($1, $2, $3::jsonb) as n`, [conv, lotto || LOT, JSON.stringify(msgs)]);
await azzeraPush();
const primaUlt = (await q(`select ultimo_il from chat_conversazioni where id = $1`, [G1]))[0].ultimo_il;
const lettoM = (await q(`select letto_fino from chat_membri where conv_id = $1 and utente_id = $2`, [G1, M]))[0].letto_fino;
const lote = [
  {k: 'wa-k-00000001', n: 'Davide M', a: D, t: 'testo', x: 'ciao dal 2023', il: '2023-05-04T10:11:12+02:00'},
  {k: 'wa-k-00000002', n: 'Momo 🎬', a: M, t: 'testo', x: 'eccomi', il: '2023-05-04T10:12:00+02:00'},
  {k: 'wa-k-00000003', n: 'Zio Pino', t: 'testo', x: 'chi sono?', il: '2023-05-04T10:13:00+02:00'},
  {k: 'wa-k-00000004', n: 'Momo 🎬', a: M, t: 'foto', m: {url: 'https://media.foss.team/m/' + G1 + '/a.jpg', w: 10, h: 10}, il: '2023-05-04T10:14:00+02:00'},
];
let ri = await imp(D, G1, lote);
vero(ri[0].n === 4, 'importati 4 messaggi (' + ri[0].n + ')');
let righe = await q(`select * from chat_messaggi where media ? 'importato' order by creato_il`);
vero(righe.length === 4 && new Date(righe[0].creato_il).toISOString() === '2023-05-04T08:11:12.000Z', 'tengono la data di WhatsApp');
vero(righe[0].autore === D && righe[1].autore === M && righe[2].autore === null, 'autori collegati come scelto (e nessuno per chi non è in FOSS)');
vero(righe[2].media.importato.n === 'Zio Pino' && righe[2].media.importato.da === D && righe[2].media.importato.l === LOT, 'nome di WhatsApp, chi ha importato e il lotto restano scritti');
vero((await push()).length === 0, 'nessun avviso per i messaggi importati');
vero((await q(`select letto_fino from chat_membri where conv_id = $1 and utente_id = $2`, [G1, M]))[0].letto_fino.getTime() === lettoM.getTime(), 'le letture non si toccano');
vero((await q(`select ultimo_il from chat_conversazioni where id = $1`, [G1]))[0].ultimo_il.getTime() === primaUlt.getTime(), 'la chat non salta in cima per messaggi vecchi');
ri = await imp(D, G1, lote);
vero(ri[0].n === 0 && (await q(`select count(*)::int n from chat_messaggi where media ? 'importato'`))[0].n === 4, 'reimportando la stessa chat non si doppia nulla');
vero(/amministratore di FOSS/.test(await errore(M, `select chat_importa($1, $2, $3::jsonb)`, [G1, LOT, JSON.stringify(lote)]) || ''), 'importa solo l\'amministratore di FOSS');
vero(/amministratore di FOSS/.test(await errore(M, `select chat_importa($1, $2, $3::jsonb)`, [C1, LOT, '[]']) || ''), 'neanche in una chat a due chi non è amministratore di FOSS');
vero(/non puoi/.test(await errore(X, `select chat_importa($1, $2, $3::jsonb)`, [C1, LOT, '[]']) || ''), 'chi non è nella chat non importa');
vero(/solo a chi/.test(await errore(D, `select chat_importa($1, $2, $3::jsonb)`, [C1, LOT, JSON.stringify([{k: 'wa-k-00000099', n: 'A', a: A, t: 'testo', x: 'x', il: '2023-01-01T00:00:00Z'}])]) || ''), 'non si può dare un messaggio a chi non è nella chat');
vero(/data/.test(await errore(D, `select chat_importa($1, $2, $3::jsonb)`, [C1, LOT, JSON.stringify([{k: 'wa-k-00000098', n: 'A', t: 'testo', x: 'x', il: '2099-01-01T00:00:00Z'}])]) || ''), 'niente date nel futuro');
vero(/non valid/.test(await errore(D, `select chat_importa($1, $2, $3::jsonb)`, [C1, LOT, JSON.stringify([{k: 'wa-k-00000097', n: 'A', t: 'sistema', x: 'x', il: '2023-01-01T00:00:00Z'}])]) || ''), 'niente messaggi di sistema');
vero(/indirizzo/.test(await errore(D, `select chat_importa($1, $2, $3::jsonb)`, [C1, LOT, JSON.stringify([{k: 'wa-k-00000096', n: 'A', t: 'foto', m: {url: 'javascript:alert(1)'}, il: '2023-01-01T00:00:00Z'}])]) || ''), 'i file passano gli stessi controlli');
vero(/effetto/.test(await errore(D, `select chat_importa($1, $2, $3::jsonb)`, [C1, LOT, JSON.stringify([{k: 'wa-k-00000095', n: 'A', t: 'testo', x: 'x', m: {schermo: 'x'.repeat(50)}, il: '2023-01-01T00:00:00Z'}])]) || ''), 'il testo passa gli stessi controlli');
await azzeraPush();
const dopo = (await ins(D, G1, 'testo', 'nuovo dopo import', null))[0];
vero(Math.abs(new Date(dopo.creato_il) - Date.now()) < 60000 && dopo.autore === D && (await push()).length > 0, 'i messaggi normali dopo: data di adesso e avvisi');
await errore(D, `insert into chat_messaggi (conv_id, tipo, testo, creato_il) values ($1, 'testo', 'finto vecchio', '2020-01-01')`, [G1]);
const fv = await q(`select creato_il from chat_messaggi where testo = 'finto vecchio'`);
vero(fv.length === 0 || fv[0].creato_il.getFullYear() > 2024, 'scrivendo normale non si può mettere una data vecchia');
vero((await come(M, `select chat_importa_annulla($1, $2) as n`, [G1, LOT]))[0].n === 0, 'annullare: solo chi ha importato');
vero((await come(D, `select chat_importa_annulla($1, $2) as n`, [G1, LOT]))[0].n === 4 && (await q(`select count(*)::int n from chat_messaggi where media ? 'importato'`))[0].n === 0, 'annullare toglie tutto il lotto');
const tanti = Array.from({length: 501}, (_, i) => ({k: 'wa-k-' + String(i).padStart(8, '0'), n: 'A', t: 'testo', x: 'x', il: '2023-01-01T00:00:00Z'}));
vero(/non valid/.test(await errore(D, `select chat_importa($1, $2, $3::jsonb)`, [C1, LOT, JSON.stringify(tanti)]) || ''), 'al massimo 500 per volta');
ri = await imp(D, C1, tanti.slice(0, 500));
vero(ri[0].n === 500, 'privata: 500 in un colpo');

console.log('');
console.log(ok + ' prove riuscite, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
