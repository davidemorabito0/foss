// Web Push senza librerie: firma VAPID (ES256, RFC 8292) e cifratura
// aes128gcm (RFC 8291 + RFC 8188). Solo Web Crypto: gira uguale in Deno
// (Edge Function) e in Node (prove).
const enc = new TextEncoder();

export function b64uA(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64uDa(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function unisci(...parti) {
  const out = new Uint8Array(parti.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parti) { out.set(p, o); o += p.length; }
  return out;
}
async function hkdf(salt, ikm, info, lunghezza) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, lunghezza * 8));
}

/* il messaggio cifrato per un solo dispositivo */
export async function cifra(testo, p256dh, auth) {
  const uaPub = b64uDa(p256dh), segreto = b64uDa(auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaChiave = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaChiave }, as.privateKey, 256));
  const ikm = await hkdf(segreto, ecdh, unisci(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const sale = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(sale, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sale, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const chiave = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const chiaro = unisci(enc.encode(testo), new Uint8Array([2]));          // 2 = ultimo blocco
  const cifrato = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, chiave, chiaro));
  const rs = new Uint8Array([0, 0, 16, 0]);                                 // blocchi da 4096 byte
  return unisci(sale, rs, new Uint8Array([asPub.length]), asPub, cifrato);
}

/* la firma che dice al servizio push che il messaggio viene davvero da FOSS */
export async function firmaVapid(jwk, aud, sub) {
  const chiave = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const testa = b64uA(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corpo = b64uA(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub })));
  const firma = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chiave, enc.encode(testa + '.' + corpo));
  return testa + '.' + corpo + '.' + b64uA(firma);
}

/* manda a un dispositivo; torna lo stato HTTP del servizio push */
export async function manda(iscrizione, testo, jwk, pubblica, sub) {
  const url = new URL(iscrizione.endpoint);
  const jwt = await firmaVapid(jwk, url.origin, sub);
  const corpo = await cifra(testo, iscrizione.p256dh, iscrizione.auth);
  const r = await fetch(iscrizione.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Urgency': 'high',
      'Authorization': 'vapid t=' + jwt + ', k=' + pubblica,
    },
    body: corpo,
    redirect: 'manual',            // un servizio push non ci manda da nessun'altra parte
  });
  try { await r.arrayBuffer(); } catch (_e) { /* risposta vuota */ }
  return r.status;
}
