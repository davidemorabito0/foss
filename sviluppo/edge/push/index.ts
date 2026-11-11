// FOSS — avvisi sul telefono (Web Push).
// La chiama il database quando nasce una notifica: riceve la notifica, i
// dispositivi di chi la deve ricevere e le chiavi VAPID (custodite nel Vault
// del database). Controlla che le chiavi siano quelle di FOSS, scrive il testo,
// lo cifra per ogni dispositivo e lo manda al servizio push (Apple, Google...).
// I dispositivi che non esistono piu' (404/410) li toglie dal database.
// Serve anche FOSS.chat: i messaggi nuovi arrivano con tipo 'fosschat'.
import { manda, b64uA, b64uDa } from './webpush.js';

const PUBBLICA = 'BNlGbW4nZrXmx8DioKxnl7ubULVOr5_6CAKvpuQYoiXeObmxYAzGU6UrkExx2zu1hACmtRNDcpoMh_ARQ0GSmlw';
const APP = Deno.env.get('FOSS_APP_URL') ?? 'https://foss.team/';
const BASE = Deno.env.get('SUPABASE_URL') ?? 'https://suqpteanvnvvmfujlevi.supabase.co';
const CHIAVE = Deno.env.get('SUPABASE_ANON_KEY') ?? 'sb_publishable_f5Kjp6NHT9yTxr1bhWJjhg_4y72V-Kj';
const SERVIZIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

type Jwk = { kty: string; crv: string; x: string; y: string; d: string };

// solo i servizi push veri: Google (Chrome, Android, Edge nuovo), Mozilla, Apple, Microsoft
const SERVIZI = /^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
const PROVE = (Deno.env.get('FOSS_PUSH_PROVE') ?? '').split(',').filter(Boolean);   // solo nelle prove locali
function servizioVero(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    if (PROVE.includes(u.host)) return true;
    return u.protocol === 'https:' && !u.port && SERVIZI.test(u.hostname);
  } catch { return false; }
}
type Iscrizione = { endpoint: string; p256dh: string; auth: string };
type Notifica = { id: string; tipo: string; progetto_id: string | null; dati: Record<string, unknown> };

function pubblicaDi(jwk: Jwk): string {
  const x = b64uDa(jwk.x), y = b64uDa(jwk.y);
  const p = new Uint8Array(65); p[0] = 4; p.set(x, 1); p.set(y, 33);
  return b64uA(p);
}
// la chiave e' quella di FOSS solo se la parte pubblica coincide E la parte
// privata firma qualcosa che la pubblica riconosce (una d inventata non passa)
async function chiaveGiusta(jwk: Jwk | undefined): Promise<boolean> {
  try {
    if (!jwk || !jwk.d || pubblicaDi(jwk) !== PUBBLICA) return false;
    const alg = { name: 'ECDSA', namedCurve: 'P-256' };
    const priv = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d, ext: true }, alg, false, ['sign']);
    const pub = await crypto.subtle.importKey('raw', b64uDa(PUBBLICA), alg, false, ['verify']);
    const m = new TextEncoder().encode('foss');
    const firma = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, priv, m);
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, firma, m);
  } catch { return false; }
}
const s = (v: unknown) => (v == null ? '' : String(v));
const cit = (v: unknown) => '«' + s(v) + '»';

// lo stesso testo della campanella, senza grassetti
function testi(n: Notifica): { titolo: string; testo: string } {
  const d = n.dati || {};
  const chi = s(d.chi) || 'Qualcuno', pr = d.progetto ? ' · ' + s(d.progetto) : '';
  const quanti = Number(d.n) || 1;
  switch (n.tipo) {
    case 'assegnata':
      return { titolo: 'Ti hanno assegnato ' + (quanti > 1 ? quanti + ' cose' : 'una cosa'),
               testo: chi + ' ti ha assegnato ' + cit(d.titolo) + (d.in ? ' in ' + cit(d.in) : '') + pr };
    case 'taggato': return { titolo: 'Ti hanno aggiunto a una task', testo: chi + ' ti ha aggiunto a ' + cit(d.titolo) + pr };
    case 'menzione': return { titolo: chi + ' ti ha menzionato', testo: (d.titolo ? cit(d.titolo) + ': ' : '') + cit(d.testo) + pr };
    case 'risposta': return { titolo: chi + ' ti ha risposto', testo: (d.titolo ? cit(d.titolo) + ': ' : '') + cit(d.testo) + pr };
    case 'commento': return { titolo: s(d.progetto) || 'Nuovo commento',
                              testo: (quanti > 1 ? quanti + ' commenti nuovi, l’ultimo di ' : '') + chi +
                                     (d.titolo ? ' su ' + cit(d.titolo) : '') + ': ' + s(d.testo) };
    case 'chat': return { titolo: s(d.progetto) || 'Chat',
                          testo: (quanti > 1 ? quanti + ' messaggi in chat, l’ultimo di ' : '') + chi + ': ' + s(d.testo) };
    // FOSS.chat: come un messaggio sul telefono, il nome di chi scrive (o del gruppo) e il testo;
    // un colpetto o un promemoria arrivano gia' col loro titolo
    case 'fosschat':
      if (d.titolo) return { titolo: s(d.titolo), testo: s(d.testo) };
      return { titolo: d.gruppo ? s(d.gruppo) : chi, testo: (d.gruppo ? chi + ': ' : '') + s(d.testo) };
    case 'fase': return { titolo: s(d.progetto) || 'Lavoro', testo: 'È passato a ' + (d.fase_nome ? cit(d.fase_nome) : 'la fase successiva') };
    case 'consegnato': return { titolo: s(d.progetto) || 'Lavoro', testo: 'Consegnato' };
    case 'aperto': return { titolo: 'Hai un lavoro nuovo', testo: chi + ' ti ha aperto ' + cit(d.progetto) };
    case 'cliente':
      return { titolo: d.esito === 'ok' ? 'Il cliente ha approvato' : 'Il cliente chiede modifiche',
               testo: (s(d.nome) || 'Il cliente') + ': ' + (d.testo ? s(d.testo) : cit(d.fase_nome)) + pr };
    case 'richiesta_team': return { titolo: 'Richiesta di entrare in un team', testo: chi + ' ti chiede di entrare nel suo team' + (d.team ? ' ' + cit(d.team) : '') + '. Apri FOSS per rispondere.' };
    case 'richiesta_esito': return { titolo: 'Team', testo: chi + (d.esito === 'ok' ? ' è entrato nel tuo team' : ' non ha accettato di entrare nel tuo team') };
    case 'prova': return { titolo: 'FOSS', testo: s(d.testo) || 'Gli avvisi arrivano su questo dispositivo.' };
    case 'segnalazione': {
      const tipo: Record<string, string> = { problema: 'qualcosa non funziona', domanda: 'non trova come si fa', idea: 'un’idea' };
      return { titolo: 'Nuova segnalazione' + (tipo[s(d.esito)] ? ': ' + tipo[s(d.esito)] : ''), testo: chi + ': ' + s(d.testo) };
    }
  }
  return { titolo: 'FOSS', testo: chi + pr };
}

// un indirizzo temporaneo per una foto della chat (cartella privata): serve all'avviso per mostrarla
async function firmata(path: string, conv: string): Promise<string> {
  if (!SERVIZIO || conv.length !== 36 || !new RegExp('^' + conv + '/[A-Za-z0-9._-]{1,120}$').test(path)) return '';
  try {
    const h: Record<string, string> = { apikey: SERVIZIO, 'Content-Type': 'application/json' };
    if (SERVIZIO.startsWith('eyJ')) h['Authorization'] = 'Bearer ' + SERVIZIO;
    const r = await fetch(BASE + '/storage/v1/object/sign/chat/' + path, {
      method: 'POST', headers: h, body: JSON.stringify({ expiresIn: 3 * 86400 }),
    });
    if (!r.ok) return '';
    const j = await r.json();
    const u = s(j?.signedURL || j?.signedUrl);
    return !u ? '' : u.startsWith('https://') ? u : BASE + '/storage/v1' + (u.startsWith('/') ? '' : '/') + u;
  } catch { return ''; }
}
const httpsOk = (v: unknown) => { const u = s(v); return /^https:\/\/[A-Za-z0-9.-]+(:[0-9]+)?\/\S{1,600}$/.test(u) ? u : ''; };

const risposta = (o: unknown, stato = 200) =>
  new Response(JSON.stringify(o), { status: stato, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return risposta({ errore: 'solo POST' }, 405);
  let corpo: { vapid?: { jwk?: Jwk }; notifica?: Notifica; iscrizioni?: Iscrizione[] };
  try { corpo = await req.json(); } catch { return risposta({ errore: 'corpo non valido' }, 400); }
  const jwk = corpo?.vapid?.jwk;
  if (!(await chiaveGiusta(jwk))) return risposta({ errore: 'chiave non valida' }, 403);
  const n = corpo.notifica, iscrizioni = (corpo.iscrizioni || []).filter((i) => i && servizioVero(i.endpoint)).slice(0, 20);
  if (!n || !n.id) return risposta({ errore: 'manca la notifica' }, 400);

  const { titolo, testo } = testi(n);
  const chat = n.tipo === 'fosschat';
  const uuid = (v: unknown) => s(v).replace(/[^0-9a-f-]/g, '').slice(0, 36);
  const conv = uuid(n.dati?.conv);
  // una menzione o un promemoria portano al messaggio giusto, non solo alla chat
  const msg = chat ? uuid(n.dati?.msg) : '';
  const promemoria = chat && n.dati?.promemoria === true, colpetto = chat && n.dati?.colpetto === true;
  // come su WhatsApp: la faccia di chi scrive (o la foto del gruppo) e l'anteprima di una foto
  const [icona, immagine] = chat ? await Promise.all([
    httpsOk(n.dati?.foto) || firmata(s(n.dati?.foto_chat), conv),
    n.dati?.img ? firmata(s(n.dati?.img), conv) : httpsOk(n.dati?.img_url),
  ]) : ['', ''];
  const payload = JSON.stringify({
    titolo: titolo.slice(0, 120), testo: testo.slice(0, 300),
    // una segnalazione non sta in un lavoro: apre la guida, dove l'amministratore trova l'elenco
    url: APP + (chat ? 'chat.html#c=' + conv + (msg.length === 36 ? '&m=' + msg : '')
                : n.tipo === 'segnalazione' ? '#/guida/segnalazioni'
                : n.progetto_id ? '#/p/' + encodeURIComponent(n.progetto_id) : ''),
    // i messaggi della stessa chat si sostituiscono, come sul telefono; un promemoria
    // o un colpetto restano a parte, cosi' non nascondono un messaggio (e viceversa)
    tag: !chat ? 'foss-' + n.id
       : promemoria ? 'fosschat-prom-' + uuid(n.id)
       : colpetto ? 'fosschat-colpetto-' + conv
       : 'fosschat-' + conv,
    // una notifica che si somma (2 commenti, 3 messaggi...) aggiorna quella di prima senza suonare di nuovo
    silenzioso: !chat && (Number(n.dati?.n) || 1) > 1,
    // un messaggio mandato «senza suono»: arriva, ma il telefono non suona
    muto: chat && n.dati?.muto === true,
    icona: icona || undefined,
    immagine: immagine || undefined,
  });
  const esiti = await Promise.all(iscrizioni.map(async (i) => {
    let host = '?';
    try { host = new URL(i.endpoint).host; } catch { /* indirizzo rotto */ }
    try { return { endpoint: i.endpoint, host, stato: await manda(i, payload, jwk!, PUBBLICA, APP) }; }
    catch (e) { return { endpoint: i.endpoint, host, stato: 0, errore: String(e).slice(0, 160) }; }
  }));
  const morti = esiti.filter((e) => e.stato === 404 || e.stato === 410).map((e) => e.endpoint);
  let tolte = 0;
  if (morti.length) {
    const h: Record<string, string> = { apikey: CHIAVE, 'Content-Type': 'application/json' };
    if (CHIAVE.startsWith('eyJ')) h['Authorization'] = 'Bearer ' + CHIAVE;
    try {
      const r = await fetch(BASE + '/rest/v1/rpc/togli_iscrizioni_push', {
        method: 'POST', headers: h, body: JSON.stringify({ p_prova: jwk!.d, p_endpoints: morti }),
      });
      tolte = r.ok ? Number(await r.json()) || 0 : -r.status;
    } catch { tolte = -1; }
  }
  return risposta({
    inviate: esiti.filter((e) => e.stato >= 200 && e.stato < 300).length,
    esiti: esiti.map((e) => ({ host: e.host, stato: e.stato, errore: (e as { errore?: string }).errore })),
    tolte,
  });
});
