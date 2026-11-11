// FOSS.chat — il server dei media sul NAS.
// Riceve foto, vocali, video e documenti della chat e li consegna. Nessuna libreria.
//
//   POST /carica/<conv>/<nome>     con il token di FOSS: solo chi e' nella chat puo' caricare
//   GET  /f/<firma>/<conv>/<nome>  l'indirizzo che va nel messaggio: senza la firma giusta non si apre
//   GET  /salute                   per vedere se e' acceso
//
// I file stanno in DATI/<conv>/<nome>; accanto, <nome>.tipo col tipo del file.
// La chiave delle firme la crea da solo al primo avvio (DATI/.segreto) e non esce mai dal NAS.
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const DATI = process.env.DATI || '/data';
const PORTA = Number(process.env.PORTA || 8080);
const SUPA = (process.env.SUPABASE_URL || 'https://suqpteanvnvvmfujlevi.supabase.co').replace(/\/$/, '');
const CHIAVE = process.env.SUPABASE_KEY || 'sb_publishable_f5Kjp6NHT9yTxr1bhWJjhg_4y72V-Kj';
const PUBBLICO = (process.env.PUBBLICO || 'https://media.foss.team').replace(/\/$/, '');
const ORIGINI = (process.env.ORIGINI || 'https://foss.team').split(',').map((s) => s.trim()).filter(Boolean);
const MASSIMO = Number(process.env.MASSIMO_MB || 2048) * 1024 * 1024;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NOME = /^[A-Za-z0-9._-]{1,120}$/;
const TIPO = /^[a-z0-9.+-]{1,40}\/[a-z0-9.+-]{1,80}$/i;

fs.mkdirSync(DATI, { recursive: true });
const fileSegreto = path.join(DATI, '.segreto');
if (!fs.existsSync(fileSegreto)) fs.writeFileSync(fileSegreto, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
const SEGRETO = fs.readFileSync(fileSegreto, 'utf8').trim();

const firma = (conv, nome) => crypto.createHmac('sha256', SEGRETO).update(conv + '/' + nome).digest('hex').slice(0, 40);
const firmaOk = (f, conv, nome) => {
  const a = Buffer.from(String(f)), b = Buffer.from(firma(conv, nome));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const nomeOk = (n) => NOME.test(n) && !n.startsWith('.') && !n.endsWith('.tipo');

function intestazioni(req, extra = {}) {
  const o = req.headers.origin;
  const h = { 'X-Content-Type-Options': 'nosniff', ...extra };
  if (o && ORIGINI.includes(o)) {
    h['Access-Control-Allow-Origin'] = o;
    h['Vary'] = 'Origin';
    h['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, Cache-Control';
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    h['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Accept-Ranges';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}
function json(req, res, stato, o) {
  res.writeHead(stato, intestazioni(req, { 'Content-Type': 'application/json' }));
  res.end(JSON.stringify(o));
}

// chi sei e se sei nella chat: lo chiedo a Supabase col tuo stesso token (valgono le sue regole)
const cacheMembri = new Map();
async function puoCaricare(token, conv) {
  const k = crypto.createHash('sha256').update(token + '|' + conv).digest('hex');
  const c = cacheMembri.get(k);
  if (c && c.scade > Date.now()) return c.ok;
  const h = { apikey: CHIAVE, Authorization: 'Bearer ' + token };
  let ok = false;
  try {
    const u = await fetch(SUPA + '/auth/v1/user', { headers: h });
    if (u.ok) {
      const io = (await u.json())?.id;
      if (io && UUID.test(io)) {
        const r = await fetch(SUPA + '/rest/v1/chat_membri?select=conv_id&conv_id=eq.' + conv + '&utente_id=eq.' + io, { headers: h });
        ok = r.ok && (await r.json()).length === 1;
      }
    }
  } catch { ok = false; }
  cacheMembri.set(k, { ok, scade: Date.now() + (ok ? 5 * 60000 : 15000) });
  if (cacheMembri.size > 2000) cacheMembri.clear();
  return ok;
}

async function carica(req, res, conv, nome) {
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return json(req, res, 401, { error: 'serve l\'accesso a FOSS' });
  const lung = Number(req.headers['content-length'] || 0);
  if (lung > MASSIMO) return json(req, res, 413, { error: 'il file è troppo grande' });
  if (!(await puoCaricare(token, conv))) return json(req, res, 403, { error: 'non fai parte di questa chat' });
  const cartella = path.join(DATI, conv);
  const dest = path.join(cartella, nome);
  await fsp.mkdir(cartella, { recursive: true });
  if (fs.existsSync(dest)) return json(req, res, 409, { error: 'esiste già un file con questo nome' });
  const tmp = path.join(cartella, '.' + nome + '.' + crypto.randomBytes(4).toString('hex') + '.parte');
  let scritti = 0, troppo = false;
  await new Promise((fatto, errore) => {
    const out = fs.createWriteStream(tmp, { flags: 'wx' });
    req.on('data', (b) => {
      scritti += b.length;
      if (scritti > MASSIMO && !troppo) { troppo = true; req.unpipe(out); out.destroy(); req.resume(); fatto(); }
    });
    req.pipe(out);
    out.on('finish', fatto);
    out.on('error', errore);
    req.on('aborted', () => { out.destroy(); errore(new Error('interrotto')); });
  }).catch(() => { troppo = troppo || 'rotto'; });
  if (troppo || (lung && scritti !== lung)) {
    await fsp.rm(tmp, { force: true });
    return json(req, res, troppo === true ? 413 : 400, { error: troppo === true ? 'il file è troppo grande' : 'caricamento interrotto' });
  }
  const tipo = String(req.headers['content-type'] || '').split(';')[0].trim();
  await fsp.writeFile(dest + '.tipo', TIPO.test(tipo) ? tipo : 'application/octet-stream');
  await fsp.rename(tmp, dest);
  json(req, res, 200, { url: PUBBLICO + '/f/' + firma(conv, nome) + '/' + conv + '/' + nome, byte: scritti });
}

async function consegna(req, res, conv, nome) {
  const dest = path.join(DATI, conv, nome);
  let st;
  try { st = await fsp.stat(dest); } catch { return json(req, res, 404, { error: 'file non trovato' }); }
  if (!st.isFile()) return json(req, res, 404, { error: 'file non trovato' });
  let tipo = 'application/octet-stream';
  try { const t = (await fsp.readFile(dest + '.tipo', 'utf8')).trim(); if (TIPO.test(t)) tipo = t; } catch { /* senza tipo */ }
  // le immagini, i video e l'audio si vedono nella pagina; tutto il resto si scarica
  const inPagina = /^(image\/(jpeg|png|webp|gif|avif|heic)|video\/|audio\/)/i.test(tipo);
  const base = {
    'Content-Type': tipo, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=31536000, immutable',
    'Content-Disposition': (inPagina ? 'inline' : 'attachment') + '; filename="' + nome + '"',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Last-Modified': st.mtime.toUTCString(),
  };
  const r = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
  if (r && (r[1] || r[2])) {
    let da = r[1] ? Number(r[1]) : st.size - Number(r[2]);
    let a = r[1] ? (r[2] ? Number(r[2]) : st.size - 1) : st.size - 1;
    da = Math.max(0, da); a = Math.min(a, st.size - 1);
    if (da > a || da >= st.size) {
      res.writeHead(416, intestazioni(req, { 'Content-Range': 'bytes */' + st.size }));
      return res.end();
    }
    res.writeHead(206, intestazioni(req, { ...base, 'Content-Range': 'bytes ' + da + '-' + a + '/' + st.size, 'Content-Length': a - da + 1 }));
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(dest, { start: da, end: a }).pipe(res);
  }
  res.writeHead(200, intestazioni(req, { ...base, 'Content-Length': st.size }));
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(dest).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://nas');
    const p = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (req.method === 'OPTIONS') { res.writeHead(204, intestazioni(req)); return res.end(); }
    if (req.method === 'GET' && u.pathname === '/salute') return json(req, res, 200, { ok: true, servizio: 'FOSS.chat media' });
    if (req.method === 'POST' && p.length === 3 && p[0] === 'carica' && UUID.test(p[1]) && nomeOk(p[2])) return await carica(req, res, p[1], p[2]);
    if ((req.method === 'GET' || req.method === 'HEAD') && p.length === 4 && p[0] === 'f' && UUID.test(p[2]) && nomeOk(p[3])) {
      if (!firmaOk(p[1], p[2], p[3])) return json(req, res, 404, { error: 'file non trovato' });
      return await consegna(req, res, p[2], p[3]);
    }
    json(req, res, 404, { error: 'non trovato' });
  } catch (e) {
    console.error('errore', e);
    if (!res.headersSent) json(req, res, 500, { error: 'errore del server dei media' });
    else res.destroy();
  }
});
server.requestTimeout = 0;           // i file grandi possono metterci molto
server.headersTimeout = 60000;
server.listen(PORTA, () => console.log('FOSS.chat media pronto sulla porta ' + PORTA + ', file in ' + DATI));
