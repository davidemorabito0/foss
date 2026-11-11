/* ======================= IMPORTARE UNA CHAT DI WHATSAPP =======================
   Su WhatsApp: chat › Altro › Esporta chat. Arriva un .zip (con foto, video, vocali)
   o un .txt. Qui lo leggo, chiedo "chi è chi" (i nomi su WhatsApp e su FOSS possono
   essere diversi) e metto i messaggi nella chat aperta, con la loro data. */

const WA_INVIS = /[‎‏‪-‮⁦-⁩﻿]/g;
const WA_TESTA_IOS = /^\[(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?\]\s?(.*)$/;
const WA_TESTA_AND = /^(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?\s+[-–]\s+(.*)$/;
const WA_ALLEGATO_IOS = /^<(?:allegato|attached|adjunto|anexo|pi[eè]ce jointe|anhang|bijlage):\s*([^>]+)>\s*$/i;
const WA_ALLEGATO_AND = /^(.+?\.[A-Za-z0-9]{1,5})\s+\((?:file allegato|file attached|archivo adjunto|arquivo anexado|fichier joint|datei angeh[aä]ngt|bestand bijgevoegd)\)\s*$/i;
const WA_OMESSO = [
  [/^<?(?:media omessi|media omitted|multimedia omitido|m[ií]dia oculta|m[eé]dias omis|medien ausgeschlossen)>?$/i, '📎 Allegato non esportato'],
  [/^(?:immagine omessa|image omitted|imagen omitida|imagem ocultada|image absente|bild weggelassen)$/i, '📷 Foto non esportata'],
  [/^(?:video omesso|video omitted|video omitido|v[ií]deo oculto|vid[eé]o absente|video weggelassen)$/i, '🎥 Video non esportato'],
  [/^(?:audio omesso|audio omitted|audio omitido|[aá]udio ocultado|audio omis|audio weggelassen)$/i, '🎤 Vocale non esportato'],
  [/^(?:sticker omess[oa]|sticker omitted|sticker omitido|figurinha omitida|autocollant omis|sticker weggelassen)$/i, 'Sticker non esportato'],
  [/^(?:documento omesso|document omitted|documento omitido|document omis|dokument weggelassen)$/i, '📄 Documento non esportato'],
  [/^(?:gif (?:omessa|esclusa|omitted|omitida)|gif omitido)$/i, 'GIF non esportata'],
  [/^(?:scheda contatto omessa|contact card omitted|tarjeta de contacto omitida)$/i, '👤 Contatto non esportato'],
];
const WA_MODIFICATO = /\s*<(?:questo messaggio è stato modificato|this message was edited|se edit[oó] este mensaje|messaggio modificato)>\s*$/i;
const WA_ELIMINATO = /^(?:questo messaggio è stato eliminato|hai eliminato questo messaggio|this message was deleted|you deleted this message|se elimin[oó] este mensaje|eliminaste este mensaje)\.?$/i;

/* ---------- il .zip: lo leggo a pezzi, senza caricarlo tutto in memoria ---------- */
async function waLeggiZip(file){
  const coda = Math.min(file.size, 65557 + 22);
  const fine = new DataView(await file.slice(file.size - coda).arrayBuffer());
  let p = -1;
  for(let i = fine.byteLength - 22; i >= 0; i--) if(fine.getUint32(i, true) === 0x06054b50){ p = i; break; }
  if(p < 0) throw new Error('zip');
  let n = fine.getUint16(p + 10, true), dimCD = fine.getUint32(p + 12, true), offCD = fine.getUint32(p + 16, true);
  if((offCD === 0xffffffff || dimCD === 0xffffffff || n === 0xffff) && p >= 20 && fine.getUint32(p - 20, true) === 0x07064b50){
    const off64 = Number(fine.getBigUint64(p - 12, true));
    const z = new DataView(await file.slice(off64, off64 + 56).arrayBuffer());
    n = Number(z.getBigUint64(32, true)); dimCD = Number(z.getBigUint64(40, true)); offCD = Number(z.getBigUint64(48, true));
  }
  const cd = new DataView(await file.slice(offCD, offCD + dimCD).arrayBuffer());
  const dec = new TextDecoder('utf-8'), voci = new Map();
  let q = 0;
  while(q + 46 <= cd.byteLength && cd.getUint32(q, true) === 0x02014b50){
    const metodo = cd.getUint16(q + 10, true);
    let csize = cd.getUint32(q + 20, true), usize = cd.getUint32(q + 24, true), off = cd.getUint32(q + 42, true);
    const ln = cd.getUint16(q + 28, true), lx = cd.getUint16(q + 30, true), lc = cd.getUint16(q + 32, true);
    const nome = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + q + 46, ln));
    /* zip grandi: le misure vere stanno nell'extra 0x0001 */
    let e = q + 46 + ln; const fe = e + lx;
    while(e + 4 <= fe){
      const id = cd.getUint16(e, true), l = cd.getUint16(e + 2, true);
      if(id === 1){
        let k = e + 4;
        if(usize === 0xffffffff){ usize = Number(cd.getBigUint64(k, true)); k += 8; }
        if(csize === 0xffffffff){ csize = Number(cd.getBigUint64(k, true)); k += 8; }
        if(off === 0xffffffff){ off = Number(cd.getBigUint64(k, true)); }
      }
      e += 4 + l;
    }
    if(!/\/$/.test(nome)) voci.set(nome.split('/').pop(), {nome, metodo, csize, usize, off});
    q += 46 + ln + lx + lc;
  }
  return voci;
}
async function waEstrai(file, v, tipo){
  const h = new DataView(await file.slice(v.off, v.off + 30).arrayBuffer());
  if(h.getUint32(0, true) !== 0x04034b50) throw new Error('zip');
  const da = v.off + 30 + h.getUint16(26, true) + h.getUint16(28, true);
  const pezzo = file.slice(da, da + v.csize);
  let b;
  if(v.metodo === 0) b = pezzo;
  else if(v.metodo === 8 && window.DecompressionStream) b = await new Response(pezzo.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
  else throw new Error('zip');
  return new Blob([b], {type: tipo || ''});
}
function waTipoFile(nome){
  const x = estensione(nome);
  const t = {jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic',
    mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/mp4', '3gp': 'video/3gpp', webm: 'video/webm',
    opus: 'audio/ogg', ogg: 'audio/ogg', m4a: 'audio/mp4', mp3: 'audio/mpeg', aac: 'audio/aac', amr: 'audio/amr', wav: 'audio/wav',
    pdf: 'application/pdf', vcf: 'text/vcard', txt: 'text/plain', doc: 'application/msword', xls: 'application/vnd.ms-excel',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', zip: 'application/zip'}[x];
  return t || 'application/octet-stream';
}

/* ---------- il testo della chat ---------- */
function waLeggiTesto(txt){
  const righe = txt.replace(/\r\n?/g, '\n').split('\n');
  const grezzi = [];
  for(const r0 of righe){
    const r = r0.replace(/^[‎‏﻿]+/, '');
    const m = WA_TESTA_IOS.exec(r) || WA_TESTA_AND.exec(r);
    if(m) grezzi.push({p: [m[1], m[2], m[3]], h: +m[4], mi: +m[5], s: +(m[6] || 0), ap: m[7] || '', resto: m[8]});
    else if(grezzi.length) grezzi[grezzi.length - 1].resto += '\n' + r0;
  }
  if(!grezzi.length) return null;
  /* giorno/mese o mese/giorno? Lo capisco dai numeri: un 13 o piu' dice tutto */
  let ymd = grezzi.some(g => g.p[0].length === 4), dm = 0, md = 0;
  grezzi.forEach(g => { if(+g.p[0] > 12) dm++; if(+g.p[1] > 12) md++; });
  let meseGiorno = !ymd && md > 0 && dm === 0;
  if(!ymd && !dm && !md){
    /* nessun numero oltre il 12: scelgo il verso che tiene i messaggi in ordine; a parita', AM/PM vuol dire americano */
    const indietro = mg => { let n = 0, prima = 0; grezzi.forEach(g => { const t = mg ? (+g.p[2]) * 1e4 + (+g.p[0]) * 100 + (+g.p[1]) : (+g.p[2]) * 1e4 + (+g.p[1]) * 100 + (+g.p[0]); if(t < prima) n++; prima = t; }); return n; };
    const a = indietro(false), b = indietro(true);
    meseGiorno = b < a || (a === b && grezzi.some(g => g.ap));
  }
  const msgs = [];
  for(const g of grezzi){
    let y, mo, d;
    if(ymd){ y = +g.p[0]; mo = +g.p[1]; d = +g.p[2]; }
    else if(meseGiorno){ mo = +g.p[0]; d = +g.p[1]; y = +g.p[2]; }
    else { d = +g.p[0]; mo = +g.p[1]; y = +g.p[2]; }
    if(y < 100) y += 2000;
    let h = g.h;
    if(g.ap){ const pm = /^p/i.test(g.ap); if(pm && h < 12) h += 12; if(!pm && h === 12) h = 0; }
    const quando = new Date(y, mo - 1, d, h, g.mi, g.s);
    if(isNaN(quando) || mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    const i = g.resto.indexOf(': ');
    if(i <= 0) continue;                                  /* messaggi di sistema: "X ha creato il gruppo" */
    const nome = g.resto.slice(0, i).replace(WA_INVIS, '').replace(/^~\s*/, '').trim();
    let corpo = g.resto.slice(i + 2);
    /* su iPhone i messaggi di sistema (e gli allegati) cominciano con un segno invisibile */
    const invisibile = /^[‎‏]/.test(corpo);
    corpo = corpo.replace(WA_INVIS, '').replace(WA_MODIFICATO, '').replace(/\s+$/, '');
    if(!nome || nome.length > 80) continue;
    const prima = corpo.split('\n')[0].trim(), dopo = corpo.split('\n').slice(1).join('\n').trim();
    const ai = WA_ALLEGATO_IOS.exec(prima) || WA_ALLEGATO_AND.exec(prima);
    if(ai){ msgs.push({quando, nome, file: ai[1].trim(), testo: dopo}); continue; }
    const om = WA_OMESSO.find(o => o[0].test(prima));
    if(om){ msgs.push({quando, nome, omesso: om[1], testo: dopo}); continue; }
    if(WA_ELIMINATO.test(corpo.trim()) || corpo.trim() === 'null') continue;
    if(invisibile) continue;
    if(!corpo.trim()) continue;
    msgs.push({quando, nome, testo: corpo});
  }
  return msgs;
}

/* ---------- chi e' chi: provo a indovinare ---------- */
function waNorm(t){
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function waIndovina(nomi, membri){
  const voci = membri.map(id => {
    const p = S.persone.get(id) || {};
    const n = waNorm(p.nome), k = waNorm(p.nick);
    return {id, n, k, primo: n.split(' ')[0] || ''};
  });
  const scelte = new Map();
  nomi.forEach(w => {
    const x = waNorm(w); if(!x) return;
    let c = voci.filter(v => (v.n && v.n === x) || (v.k && v.k === x));
    if(c.length !== 1) c = voci.filter(v => v.n && (x.startsWith(v.n + ' ') || v.n.startsWith(x + ' ') || x.split(' ')[0] === v.primo));
    if(c.length !== 1) c = voci.filter(v => v.k && x.includes(v.k) && v.k.length >= 3);
    if(c.length === 1) scelte.set(w, c[0].id);
  });
  /* due nomi e due persone (chat a due): se ne ho indovinato uno, l'altro e' l'altra persona */
  if(nomi.length === 2 && membri.length === 2){
    const fatti = nomi.filter(w => scelte.has(w));
    if(fatti.length === 1){
      const resto = membri.find(id => id !== scelte.get(fatti[0]));
      const altroNome = nomi.find(w => !scelte.has(w));
      if(resto) scelte.set(altroNome, resto);
    }
  }
  /* due nomi uguali sulla stessa persona: tengo solo il piu' convincente (il primo) */
  const usati = new Set();
  nomi.forEach(w => { const id = scelte.get(w); if(!id) return; if(usati.has(id)) scelte.delete(w); else usati.add(id); });
  return scelte;
}

/* ---------- la finestra ---------- */
function importaWhatsApp(){
  const c = S.convs.get(S.aperta); if(!c) return;
  if(!S.adminFoss){ toast('Solo l’amministratore di FOSS può importare una chat.'); return; }
  const v = document.createElement('div'); v.className = 'velo scuro'; v.id = 'veloImporta';
  v.innerHTML = '<div class="foglio imp-foglio" role="dialog" aria-label="Importa da WhatsApp">'+
    '<div class="foglio-t">Importa da WhatsApp<button class="ib" data-x="1" aria-label="Chiudi">'+svg('chiudi')+'</button></div>'+
    '<div class="foglio-c" id="impC"></div><div class="foglio-f" id="impF"></div></div>';
  document.body.appendChild(v);
  const st = {c, fase: 'scegli', lotto: null, lavoro: false};
  v.addEventListener('click', e => {
    if((e.target === v || e.target.closest('[data-x]')) && !st.lavoro) return v.remove();
  });
  waPasso1(v, st);
}
function waPasso1(v, st, avviso){
  el('impC').innerHTML = (avviso ? '<p class="imp-errore">'+esc(avviso)+'</p>' : '')+
    '<p style="margin-top:0">Su WhatsApp apri la chat, tocca il nome in alto › <b>Esporta chat</b> (con o senza media) e salva il file. Poi sceglilo qui: i messaggi entrano in «'+esc(nomeConv(st.c))+'» con la loro data.</p>'+
    '<button class="imp-scegli" data-scegli="1">'+svg('allega', 1.8)+'<span><b>Scegli il file esportato</b><i>.zip (con foto, video e vocali) oppure .txt</i></span></button>';
  el('impF').innerHTML = '<button class="btn" data-x="1">Annulla</button>';
  $('[data-scegli]', v).onclick = () => scegliFile('.zip,.txt,application/zip,application/x-zip-compressed,text/plain', false, f => waApri(v, st, f[0]));
}
async function waApri(v, st, file){
  el('impC').innerHTML = '<p class="imp-attesa"><span class="giro"></span>Leggo la chat…</p>'; el('impF').innerHTML = '';
  try{
    let txt = null, voci = null;
    if(/\.zip$/i.test(file.name) || /zip/.test(file.type)){
      voci = await waLeggiZip(file);
      const nomi = Array.from(voci.keys());
      const t = nomi.find(n => n === '_chat.txt') || nomi.find(n => /\.txt$/i.test(n));
      if(!t) return waPasso1(v, st, 'Nel file .zip non c’è la chat: esportala di nuovo da WhatsApp.');
      txt = await (await waEstrai(file, voci.get(t), 'text/plain')).text();
      voci.delete(t);
    } else txt = await file.text();
    const msgs = waLeggiTesto(txt);
    if(!msgs || !msgs.length) return waPasso1(v, st, 'Non trovo messaggi di WhatsApp in questo file.');
    st.file = file; st.voci = voci; st.msgs = msgs;
    waPasso2(v, st);
  }catch(e){
    console.warn(e);
    waPasso1(v, st, e && e.message === 'zip' ? 'Questo file .zip non si riesce a leggere: prova a esportare di nuovo, oppure scegli il .txt.' : 'Il file non si riesce a leggere.');
  }
}
function waPasso2(v, st){
  const c = st.c, msgs = st.msgs;
  const conta = new Map();
  msgs.forEach(m => conta.set(m.nome, (conta.get(m.nome) || 0) + 1));
  const nomi = Array.from(conta.keys()).sort((a, b) => conta.get(b) - conta.get(a));
  const membri = (c.membri || []).map(m => m.id);
  const indov = waIndovina(nomi, membri);
  st.mappa = new Map(nomi.map(n => [n, indov.has(n) ? indov.get(n) : '']));
  const conFile = msgs.filter(m => m.file && st.voci && st.voci.has(m.file));
  const peso = conFile.reduce((s, m) => s + (st.voci.get(m.file).usize || 0), 0);
  st.media = conFile.length > 0;
  const opz = n => '<option value="">Non è su FOSS: resta «'+esc(n)+'»</option>'+
    membri.map(id => '<option value="'+id+'">'+esc(id === S.io ? nomeLungo(id) + ' (tu)' : nomeLungo(id))+'</option>').join('')+
    '<option value="-">Non importare i suoi messaggi</option>';
  el('impC').innerHTML =
    '<p class="imp-riass">'+msgs.length.toLocaleString('it-IT')+' messaggi, dal '+esc(dataBreve(msgs[0].quando))+' al '+esc(dataBreve(msgs[msgs.length - 1].quando))+'</p>'+
    '<div class="imp-tit">Chi è chi</div><p class="imp-nota">Scegli a chi di FOSS appartengono i messaggi di ogni nome di WhatsApp.</p>'+
    '<div class="imp-nomi">'+nomi.map((n, i) => '<label class="imp-riga"><span class="av" style="background:'+colore('wa:' + n)+'">'+esc(inizialiNome(n))+'</span>'+
      '<span class="imp-n"><b>'+esc(n)+'</b><i>'+conta.get(n).toLocaleString('it-IT')+(conta.get(n) === 1 ? ' messaggio' : ' messaggi')+'</i></span>'+
      '<select data-i="'+i+'" aria-label="Chi è '+esc(n)+' su FOSS">'+opz(n)+'</select></label>').join('')+'</div>'+
    (st.media ? '<label class="imp-media"><input type="checkbox" id="impMedia" checked><span><b>Importa anche foto, video e vocali</b><i>'+conFile.length+' file, '+esc(pesoFile(peso))+'</i></span></label>' :
      (msgs.some(m => m.file || m.omesso) ? '<p class="imp-nota">Questa esportazione non ha i file: al loro posto resta una nota.</p>' : ''));
  $$('select', v).forEach(s => {
    const n = nomi[+s.dataset.i]; s.value = st.mappa.get(n) || '';
    s.onchange = () => { st.mappa.set(n, s.value); conta2(); };
  });
  const conta2 = () => {
    const n = msgs.filter(m => st.mappa.get(m.nome) !== '-').length;
    const b = el('impVai'); if(b){ b.disabled = !n; b.textContent = n ? 'Importa ' + n.toLocaleString('it-IT') + ' messaggi' : 'Niente da importare'; }
  };
  el('impF').innerHTML = '<button class="btn" data-altro="1">Altro file</button><button class="btn pieno" id="impVai">Importa</button>';
  $('[data-altro]', v).onclick = () => waPasso1(v, st);
  el('impVai').onclick = () => waImporta(v, st, !!(el('impMedia') && el('impMedia').checked));
  conta2();
}
function pesoFile(b){ return b > 1048576 * 900 ? (b / 1073741824).toFixed(1).replace('.', ',') + ' GB' : b > 1048576 ? Math.round(b / 1048576) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }

async function waChiave(m, n){
  const s = m.quando.toISOString() + '|' + m.nome + '|' + (m.file || m.omesso || '') + '|' + (m.testo || '') + '|' + n;
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  let b = ''; h.forEach(x => b += String.fromCharCode(x));
  return 'wa' + btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 30);
}
function waPezzi(t, max){ const out = []; t = String(t || ''); while(t.length > max){ let i = t.lastIndexOf('\n', max); if(i < max / 2) i = max; out.push(t.slice(0, i)); t = t.slice(i).replace(/^\n/, ''); } if(t.trim()) out.push(t); return out; }

async function waVocale(blob, nome){
  const x = estensione(nome), media = {mime: blob.type, dim: blob.size};
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    const ab = await blob.arrayBuffer();
    const buf = await new Promise((ok, ko) => { const p = ac.decodeAudioData(ab, ok, ko); if(p && p.then) p.then(ok, ko); });
    try{ ac.close(); }catch(e){}
    const d = buf.getChannelData(0), n = 48, passo = Math.max(1, Math.floor(d.length / n)), lv = [];
    for(let i = 0; i < n; i++){ let mx = 0; for(let j = i * passo; j < Math.min(d.length, (i + 1) * passo); j += 64) mx = Math.max(mx, Math.abs(d[j])); lv.push(mx); }
    const picco = Math.max(.05, ...lv);
    media.dur = Math.round(buf.duration * 10) / 10;
    media.onda = lv.map(v => String.fromCharCode(65 + Math.round(Math.min(1, v / picco) * 31))).join('');
  }catch(e){
    media.dur = await new Promise(ok => {
      const a = new Audio(), u = URL.createObjectURL(blob); let f = false;
      const fine = d => { if(f) return; f = true; URL.revokeObjectURL(u); ok(d && isFinite(d) ? Math.round(d * 10) / 10 : 0); };
      a.preload = 'metadata'; a.onloadedmetadata = () => fine(a.duration); a.onerror = () => fine(0); a.src = u; setTimeout(() => fine(0), 4000);
    });
  }
  return {tipo: 'vocale', blob, ext: x || 'ogg', media};
}
async function waPreparaFile(st, nome){
  const v = st.voci.get(nome);
  const blob = await waEstrai(st.file, v, waTipoFile(nome));
  if(blob.size > MAX_FILE) return null;
  const f = new File([blob], nome, {type: blob.type});
  const t = blob.type;
  if(/^audio\//.test(t)) return waVocale(f, nome);
  if(t === 'image/webp'){
    /* gli sticker: li tengo come sono, con la trasparenza */
    let w = 512, h = 512, mini = '';
    try{ const im = await decodifica(f); [w, h] = lato(im); mini = miniatura(im, w, h); }catch(e){}
    return {tipo: 'foto', blob: f, ext: 'webp', media: {w, h, mini, dim: f.size}};
  }
  if(/^(image|video)\//.test(t)) return prepara(f);
  return {tipo: 'file', blob: f, ext: estensione(nome) || 'bin', media: {nome: nome.slice(0, 120), dim: f.size, mime: t}};
}

async function waImporta(v, st, conMedia){
  const c = st.c;
  st.lavoro = true; st.lotto = uuid();
  const ferma = e => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('beforeunload', ferma);
  const scrivi = (t, q) => { el('impC').innerHTML = '<p class="imp-attesa"><span class="giro"></span>'+esc(t)+'</p><div class="imp-barra"><i style="width:'+Math.round((q || 0) * 100)+'%"></i></div>'; };
  el('impF').innerHTML = '';
  scrivi('Preparo i messaggi…', 0);
  let fatti = 0, saltati = 0, fileKo = 0;
  try{
    /* gia' importati prima (stessa chat esportata di nuovo): li salto, anche i loro file */
    const gia = new Set();
    for(let da = 0; ; da += 1000){
      const {data, error} = await sb.from('chat_messaggi').select('k:media->importato->>k').eq('conv_id', c.id).not('media->importato', 'is', null).range(da, da + 999);
      if(error) throw error;
      (data || []).forEach(r => r.k && gia.add(r.k));
      if(!data || data.length < 1000) break;
    }
    /* la lista finale, nell'ordine giusto */
    const visti = new Map(), lista = [];
    for(const m of st.msgs){
      const chi = st.mappa.get(m.nome);
      if(chi === '-') continue;
      const base = m.quando.toISOString() + m.nome + (m.file || '') + (m.testo || '');
      const n = (visti.get(base) || 0) + 1; visti.set(base, n);
      lista.push({m, k: await waChiave(m, n), a: chi || null});
    }
    const daFare = lista.filter(x => !gia.has(x.k));
    saltati = lista.length - daFare.length;
    const BLOCCO = 200;
    for(let i = 0; i < daFare.length; i += BLOCCO){
      const pezzo = daFare.slice(i, i + BLOCCO), righe = [];
      for(const x of pezzo){
        const m = x.m, base = {n: m.nome, a: x.a, il: m.quando.toISOString()};
        const testo = (t, suff) => waPezzi(t, 6000).forEach((p, j) => righe.push(Object.assign({}, base, {k: x.k + (suff || '') + (j ? '-' + j : ''), t: 'testo', x: p})));
        if(m.file && conMedia && st.voci && st.voci.has(m.file)){
          scrivi('Carico i file… ' + (i + righe.length) + ' di ' + daFare.length, (i + righe.length) / daFare.length);
          let p = null;
          try{ p = await waPreparaFile(st, m.file); }catch(e){ console.warn(e); }
          if(p){
            try{
              const path = c.id + '/' + uuid() + '.' + (p.ext || 'bin');
              const r = await caricaFile(path, p.blob);
              const media = Object.assign({}, p.media, r.path ? {path: r.path} : {url: r.url});
              const did = (p.tipo === 'foto' || p.tipo === 'video') && m.testo && m.testo.length <= 1000 ? m.testo : '';
              if(did) media.did = did;
              righe.push(Object.assign({}, base, {k: x.k, t: p.tipo, m: media}));
              if(m.testo && !did) testo(m.testo, '-t');
              continue;
            }catch(e){ console.warn(e); fileKo++; }
          } else fileKo++;
        }
        if(m.file || m.omesso){
          const nota = m.omesso ? m.omesso : '📎 ' + m.file + (conMedia && st.voci && st.voci.has(m.file) ? ' (non caricato)' : ' (non esportato)');
          testo(nota + (m.testo ? '\n' + m.testo : ''));
        } else testo(m.testo);
      }
      scrivi('Importo i messaggi… ' + Math.min(daFare.length, i + pezzo.length) + ' di ' + daFare.length, Math.min(1, (i + pezzo.length) / daFare.length));
      for(let j = 0; j < righe.length; j += 500){
        const {data, error} = await sb.rpc('chat_importa', {p_conv: c.id, p_lotto: st.lotto, p_msgs: righe.slice(j, j + 500)});
        if(error) throw error;
        fatti += data || 0;
      }
    }
  }catch(e){
    console.warn(e);
    window.removeEventListener('beforeunload', ferma);
    st.lavoro = false;
    await waRicarica(c.id);
    el('impC').innerHTML = '<p class="imp-errore">L’importazione si è fermata'+(fatti ? ' dopo ' + fatti + ' messaggi' : '')+'. '+esc(/non puoi|amministratore|solo a chi/i.test(e && e.message) ? e.message : 'Controlla la connessione e riprova: i messaggi già entrati non si doppiano.')+'</p>';
    el('impF').innerHTML = (fatti ? '<button class="btn rosso" data-annulla="1">Togli quelli importati</button>' : '')+'<button class="btn pieno" data-x="1">Chiudi</button>';
    waAnnullabile(v, st);
    return;
  }
  window.removeEventListener('beforeunload', ferma);
  st.lavoro = false;
  await waRicarica(c.id);
  el('impC').innerHTML = '<div class="imp-fatto">'+svg('spunta', 2.4)+'<b>'+(fatti ? fatti.toLocaleString('it-IT') + (fatti === 1 ? ' messaggio importato' : ' messaggi importati') : 'Niente di nuovo da importare')+'</b>'+
    (saltati ? '<i>'+saltati.toLocaleString('it-IT')+' erano già nella chat</i>' : '')+
    (fileKo ? '<i>'+fileKo+' file non sono entrati: al loro posto c’è una nota</i>' : '')+'</div>';
  el('impF').innerHTML = (fatti ? '<button class="btn rosso" data-annulla="1">Annulla importazione</button>' : '')+'<button class="btn pieno" data-x="1">Fatto</button>';
  waAnnullabile(v, st);
}
function waAnnullabile(v, st){
  const b = $('[data-annulla]', v); if(!b) return;
  b.onclick = () => conferma('Annullare l’importazione?', 'Tolgo dalla chat tutti i messaggi appena importati da WhatsApp.', 'Togli', async () => {
    const {data, error} = await sb.rpc('chat_importa_annulla', {p_conv: st.c.id, p_lotto: st.lotto});
    if(error) return errore(error, 'Importazione non annullata');
    await waRicarica(st.c.id);
    v.remove();
    toast(data === 1 ? 'Tolto 1 messaggio importato.' : 'Tolti ' + (data || 0) + ' messaggi importati.');
  }, true);
}
/* dopo un'importazione la chat si ricarica da capo (i messaggi vecchi vanno al loro posto) */
async function waRicarica(conv){
  S.msgs.delete(conv);
  const c = S.convs.get(conv);
  if(c){
    const {data} = await sb.from('chat_messaggi').select('*').eq('conv_id', conv).order('creato_il', {ascending: false}).limit(1);
    if(data && data[0]){ const u = data[0]; c.ultimo = {id: u.id, autore: u.autore, tipo: u.tipo, testo: (u.testo || '').slice(0, 140), creato_il: u.creato_il, eliminato: u.eliminato, media: u.media}; c.ultimo_il = u.creato_il; }
  }
  if(S.aperta === conv) await apriConv(conv);
  disegnaLista();
}
/* arrivano dal vivo (un altro ha importato): non suonano e non contano, la chat si rifa' quando serve */
let waRitardo = new Map();
function arrivaImportato(m){
  const conv = m.conv_id;
  clearTimeout(waRitardo.get(conv));
  waRitardo.set(conv, setTimeout(() => {
    waRitardo.delete(conv);
    if(document.getElementById('veloImporta')) return;      /* sono io che sto importando: ricarico alla fine */
    if(S.aperta === conv) waRicarica(conv);
    else S.msgs.delete(conv);
  }, 1500));
}
