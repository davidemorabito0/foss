/* ======================================================================
   FOSS.chat — la chat del team dentro FOSS.
   Gli account sono quelli di FOSS: stessa sessione, stesso profilo.
   I messaggi stanno su Supabase; foto, vocali e file per ora nel bucket
   «chat» di Supabase, poi sul NAS (MEDIA_NAS) quando sara' collegato.
   ====================================================================== */
'use strict';
const SUPA_URL = 'https://suqpteanvnvvmfujlevi.supabase.co';
const SUPA_KEY = 'sb_publishable_f5Kjp6NHT9yTxr1bhWJjhg_4y72V-Kj';
const VAPID_PUBBLICA = 'BNlGbW4nZrXmx8DioKxnl7ubULVOr5_6CAKvpuQYoiXeObmxYAzGU6UrkExx2zu1hACmtRNDcpoMh_ARQ0GSmlw';
/* il server dei file sul NAS (es. 'https://media.foss.team'). Vuoto = si usa Supabase. */
const MEDIA_NAS = 'https://media.foss.team';
const VERSIONE = 'chat-2.4';
/* i temi colore: gli stessi di FOSS. Il predefinito per tutti è Brand (blu e giallo). */
const TEMI_COLORE = [
  {id:'brand',   nome:'Brand',    ds:'Navy e ambra, il predefinito', c:['#0D1926','#1A3149','#FFAD01']},
  {id:'ardesia', nome:'Ardesia',  ds:'Blu-grigio, accento teal',     c:['#101619','#1D272D','#2FB3A4']},
  {id:'nebbia',  nome:'Nebbia',   ds:'Chiaro e morbido',             c:['#DCE2E8','#EDF1F4','#2F7D8C']},
  {id:'sabbia',  nome:'Sabbia',   ds:'Caldo e naturale',             c:['#E4DDD2','#F1ECE4','#B4632A']},
  {id:'idea',    nome:'Idea',     ds:'Carta e inchiostro',           c:['#E4E1D2','#223D7C','#C2437A']},
  {id:'limoni',  nome:'Limoni',   ds:'Giallo limone e verde foglia', c:['#121810','#FFF0A0','#F5D130']},
  {id:'autunno', nome:'Autunno',  ds:'Marrone scuro e arancio',      c:['#1E1411','#35241E','#E39A4F']},
  {id:'bloom',   nome:'Bloom',    ds:'Morbido e grafico',            c:['#EBD3AF','#3B1F45','#D1733D']}
];
const MAX_SUPA = 50 * 1024 * 1024;
const MAX_FILE = MEDIA_NAS ? 2048 * 1024 * 1024 : MAX_SUPA;   // sul NAS anche i video lunghi

let sb = null;
try{ if(window.supabase) sb = window.supabase.createClient(SUPA_URL, SUPA_KEY); }catch(e){ sb = null; }

/* ---------- piccoli attrezzi ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const el = id => document.getElementById(id);
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function uuid(){
  if(crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}
const pausa = ms => new Promise(ok => setTimeout(ok, ms));
function debounce(f, ms){ let t; return function(){ const a = arguments; clearTimeout(t); t = setTimeout(() => f.apply(this, a), ms); }; }
function suTelefono(){ return window.matchMedia('(max-width:899px)').matches; }
function aTuttoSchermo(){ return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
function suIOS(){ const ua = navigator.userAgent || ''; return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function tocco(){ return window.matchMedia('(hover:none)').matches; }
function fmtDim(b){
  if(!b) return '';
  if(b < 1024) return b + ' B';
  if(b < 1048576) return Math.round(b / 1024) + ' kB';
  return (b / 1048576).toFixed(b < 10485760 ? 1 : 0).replace('.', ',') + ' MB';
}
function fmtDur(s){ s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
const MESI = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const GIORNI = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
function stessoGiorno(a, b){ return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function ora(d){ d = new Date(d); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function giorniFa(d){ const a = new Date(d); a.setHours(0,0,0,0); const b = new Date(); b.setHours(0,0,0,0); return Math.round((b - a) / 864e5); }
function dataBreve(d){
  d = new Date(d); const g = giorniFa(d);
  if(g === 0) return ora(d);
  if(g === 1) return 'Ieri';
  if(g < 7) return GIORNI[d.getDay()];
  return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
}
function dataGiorno(d){
  d = new Date(d); const g = giorniFa(d);
  if(g === 0) return 'Oggi';
  if(g === 1) return 'Ieri';
  if(g < 7) return GIORNI[d.getDay()].replace(/^./, c => c.toUpperCase());
  return d.getDate() + ' ' + MESI[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
}
/* «oggi alle 14:32», «domani alle 9:00», «lunedì alle 9:00», «il 12 dicembre alle 9:00» */
function quando(d, conIl){
  d = new Date(d); const g = giorniFa(d);
  const h = ' alle ' + ora(d);
  if(g === 0) return 'oggi' + h;
  if(g === 1) return 'ieri' + h;
  if(g === -1) return 'domani' + h;
  if(g > 1 && g < 7) return GIORNI[d.getDay()] + (d.getDay() === 0 ? ' scorsa' : ' scorso') + h;
  if(g < -1 && g > -7) return GIORNI[d.getDay()] + h;
  return (conIl === false ? '' : 'il ') + d.getDate() + ' ' + MESI[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '') + h;
}
function maiuscola(t){ t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }
function ultimoAccesso(v){
  if(!v) return '';
  const d = new Date(v), g = giorniFa(d);
  if(g === 0) return 'ultimo accesso oggi alle ' + ora(d);
  if(g === 1) return 'ultimo accesso ieri alle ' + ora(d);
  if(g < 7) return 'ultimo accesso ' + GIORNI[d.getDay()] + ' alle ' + ora(d);
  return 'ultimo accesso il ' + d.getDate() + ' ' + MESI[d.getMonth()];
}
function colore(id){
  const c = ['#06cf9c','#53bdeb','#ffbc38','#fc8a5d','#a5b337','#e26ab6','#7f66ff','#fd6669','#25d366','#ff9a8c','#02a698','#d3a128','#8b9cff','#00a5f4'];
  let h = 0; const s = String(id || ''); for(let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return c[h % c.length];
}
function memoria(k, v){
  try{
    if(v === undefined){ const x = localStorage.getItem('fosschat_' + k); return x == null ? null : JSON.parse(x); }
    if(v === null) localStorage.removeItem('fosschat_' + k); else localStorage.setItem('fosschat_' + k, JSON.stringify(v));
  }catch(e){ return null; }
}

/* ---------- icone (disegnate per FOSS.chat) ---------- */
const I = {
  mail:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  nuova:'<path d="M19 3H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3v3l4-3h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/><path d="M12 7.5v6M9 10.5h6"/>',
  menu:'<circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/>',
  cerca:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
  indietro:'<path d="M20 12H5M11 5l-7 7 7 7"/>',
  giu:'<path d="m6 9 6 6 6-6"/>',
  su:'<path d="m6 15 6-6 6 6"/>',
  allega:'<path d="M20.5 11.5 12.4 19.6a5.2 5.2 0 0 1-7.4-7.4l8.3-8.3a3.5 3.5 0 0 1 5 5l-8.3 8.3a1.7 1.7 0 0 1-2.5-2.5l7.6-7.6"/>',
  piu:'<path d="M12 5v14M5 12h14"/>',
  emoji:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  manda:'<path d="M4 12 3 4.5l18 7.5-18 7.5L4 12zm0 0h8" fill="currentColor" stroke="none"/>',
  camera:'<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.4-2h6.6l1.4 2h1.8A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.8"/>',
  foto:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m21 15.5-5-5-9 9.5"/>',
  doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  sticker:'<path d="M20.5 13V6.5A3.5 3.5 0 0 0 17 3H7a3.5 3.5 0 0 0-3.5 3.5V17A3.5 3.5 0 0 0 7 20.5h6.5z"/><path d="M13.5 20.5v-4a3 3 0 0 1 3-3h4"/><path d="M8.5 13.5a4 4 0 0 0 5 .5"/><circle cx="9" cy="9" r=".9" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r=".9" fill="currentColor" stroke="none"/>',
  gif:'<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M10 10H8a1.5 1.5 0 0 0-1.5 1.5v1A1.5 1.5 0 0 0 8 14h1.8v-2H8.8M12.6 9.8v4.4M15.5 14.2V9.8h2.6M15.5 12h2"/>',
  disegno:'<path d="M4 20c2.5 0 3-1.5 3-3 0-1.3 1-2.3 2.3-2.3S11.5 15.8 11.5 17c0 2-1.8 3-4 3"/><path d="M10.6 13.4 19 5a2 2 0 0 1 2.8 2.8l-8.4 8.4"/>',
  spunta:'<path d="m4 12.5 4.5 4.5L18 7.5"/>',
  spunte:'<path d="m1.5 12.5 4.5 4.5 9.5-9.5M10.5 15.5l1.5 1.5 9.5-9.5"/>',
  orologio:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  chiudi:'<path d="M6 6l12 12M18 6 6 18"/>',
  lucchetto:'<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  lucchettoAperto:'<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7"/>',
  silenzia:'<path d="M13.7 20a2 2 0 0 1-3.4 0M18 13.5V10a6 6 0 0 0-9.3-5M6.3 8.6A6 6 0 0 0 6 10.5v3.5L4 17h12.5M3 3l18 18"/>',
  campana:'<path d="M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  fissa:'<path d="M15 4.5 19.5 9 16 12.5l.5 4.5-2 2-4.5-4.5L5 19.5M9.5 9.5 7.5 9 5.5 11l7.5 7.5M15 4.5l-5.5 5"/>',
  archivio:'<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
  cestino:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  rispondi:'<path d="M10 8 4 13l6 5M4 13h10a6 6 0 0 1 6 6"/>',
  inoltra:'<path d="m14 8 6 5-6 5M20 13H10a6 6 0 0 0-6 6"/>',
  copia:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  gruppo:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.2a6.5 6.5 0 0 1 4 5.8"/>',
  persona:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  personaPiu:'<circle cx="10" cy="8" r="4"/><path d="M2.5 21a7.5 7.5 0 0 1 13-5M19 14v6M16 17h6"/>',
  impostazioni:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  luna:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  esci:'<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>',
  matita:'<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  scarica:'<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  importa:'<path d="M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M12 3v11M8 10l4 4 4-4"/>',
  play:'<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
  pausa:'<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
  effetti:'<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8zM5.5 15l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4L3.5 17l1.4-.6z"/>',
  testo:'<path d="M4 19 9 5l5 14M5.8 14h6.4M15 19v-6.5a2.5 2.5 0 0 1 5 0V19M15 15.5h5"/>',
  gomma:'<path d="M8 20h12M5.6 15.6 14.4 6.8a2 2 0 0 1 2.8 0l2.4 2.4a2 2 0 0 1 0 2.8L12 19.6a1.4 1.4 0 0 1-1 .4H8.4a1.4 1.4 0 0 1-1-.4l-1.8-1.8a1.4 1.4 0 0 1 0-2.2zM9.5 11.5l5 5"/>',
  annulla:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  rifai:'<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  forbici:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
  bacchetta:'<path d="m4 20 11-11M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 9l.6 1.4L21 11l-1.4.6L19 13l-.6-1.4L17 11l1.4-.6zM9 3l.5 1 1 .5-1 .5L9 6l-.5-1-1-.5 1-.5z"/>',
  ok:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  cuore:'<path d="M12 20s-7.5-4.4-9-9.3A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 9 4.3C19.5 15.6 12 20 12 20z"/>',
  video:'<rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="m15.5 10.5 6-3.5v10l-6-3.5"/>',
  evidenziatore:'<path d="m9 14 7.5-7.5a2.1 2.1 0 0 1 3 3L12 17H9zM6 20h8M9 14l-3 3v3h3"/>',
  penna:'<path d="M15.2 5.2 18.8 8.8M4 20l1-4.5L16.5 4a2.5 2.5 0 0 1 3.5 3.5L8.5 19z"/>',
  tondo:'<circle cx="12" cy="12" r="8"/>',
  quadro:'<rect x="4" y="4" width="16" height="16" rx="4"/>',
  libero:'<path d="M5 18c-1-3 0-7 3-9s7-3 9 0 1 7-2 9-9 3-10 0z"/>',
  contorno:'<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="8.5"/>',
  occhio:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  vietato:'<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  aggiorna:'<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  stella:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  link:'<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  server:'<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01M3 3l18 18"/>',
  segno:'<path d="M12 4v10M12 18v.5"/>',
  rotella:'<path d="M12 3a9 9 0 1 0 9 9"/>',
  puntini:'<circle cx="5.5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  chevron:'<path d="M15 4.5 7.5 12l7.5 7.5"/>',
  freccia:'<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>',
  chatTab:'<path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.6-4.3A8.5 8.5 0 1 1 20.5 11.5z"/>',
  sfondo:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="8.5" r="1.5"/>',
  stellaPiena:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>',
  sveglia:'<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.6 1.7M4.5 4.5 2.5 6.5M19.5 4.5l2 2"/>',
  sondaggio:'<path d="M5 20V11M12 20V4M19 20v-6.5"/>',
  lavoro:'<path d="M4 9.5h16v9A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="m4 9.5-.7-3.3 15.6-3.3.7 3.3zM8.4 5.3l2.4 3.4M13.5 4.2l2.4 3.4"/>',
  calendario:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  luogo:'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  chiocciola:'<circle cx="12" cy="12" r="3.6"/><path d="M15.6 12v1.4a2.6 2.6 0 0 0 5.2 0V12a8.8 8.8 0 1 0-3.5 7"/>',
  mano:'<path d="M7.2 11.6V6.9a1.4 1.4 0 0 1 2.8 0v4.2M10 10.6V5a1.4 1.4 0 0 1 2.8 0v5.6M12.8 10.6V6a1.4 1.4 0 0 1 2.8 0v6.3M15.6 12.3V9.4a1.4 1.4 0 0 1 2.8 0v5.2A6.4 6.4 0 0 1 12 21h-.8a6 6 0 0 1-4.7-2.3l-2.9-3.6a1.5 1.5 0 0 1 2.2-2l1.4 1.3"/>',
  seleziona:'<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8 5.4-5.6"/>',
  apri:'<path d="M14 4h6v6M20 4l-9 9M18 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5"/>',
  lista:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',
  spillo:'<path d="M9.5 3.5h5l-.8 6 3.3 3.3v1.7H7v-1.7l3.3-3.3z"/><path d="M12 14.5V21"/>',
  spilloVia:'<path d="M9.5 3.5h5l-.8 6 3.3 3.3v1.7H7v-1.7l3.3-3.3z"/><path d="M12 14.5V21M3.5 3.5l17 17"/>',
  programma:'<circle cx="11" cy="12.5" r="7.5"/><path d="M11 8.5v4.2l2.7 1.6"/><path d="M17.5 3.5l3 3"/>',
  cancelletto:'<path d="M9 3.5 7 20.5M17 3.5l-2 17M4 9h16.5M3.5 15H20"/>',
  piuCerchio:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  avanti:'<path d="m9 4.5 7.5 7.5L9 19.5"/>',
  squadra:'<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2.5 19a5.5 5.5 0 0 1 11 0M10.5 19a5.5 5.5 0 0 1 11 0"/>',
  foss:'',
};
function svg(n, sw){
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(sw||2)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(I[n]||'')+'</svg>';
}
const LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#0D1926"/><rect x="17" y="12" width="11" height="31" rx="5.5" fill="#FFAD01"/>'+
  '<path d="M22.5 42c3.6 4.6 5.6 7.6 5.6 10.1a5.6 5.6 0 0 1-11.2 0c0-2.5 2-5.5 5.6-10.1z" fill="#FFAD01"/><rect x="17" y="12" width="32" height="10" rx="5" fill="#E8EEF7"/>'+
  '<rect x="17" y="27" width="25" height="9.5" rx="4.75" fill="#E8EEF7"/><circle cx="48" cy="46" r="11" fill="#00a884"/><path d="M42.5 46.5h11M48 41v11" stroke="#fff" stroke-width="0" />'+
  '<path d="M43 44.5a5 5 0 0 1 10 0v1a5 5 0 0 1-5 5h-1.6l-3.4 2.2.6-3A5 5 0 0 1 43 45.5z" fill="#fff"/></svg>';

/* lo sfondo delle chat: piccoli disegni del mestiere (camera, ciak, microfono, gocce di FOSS...) */
function doodle(scuro){
  const c = scuro ? '#ffffff' : '#000000', o = scuro ? 0.05 : 0.07;
  const g = (x, y, r, d) => '<g transform="translate('+x+' '+y+') rotate('+r+')" fill="none" stroke="'+c+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="'+o+'">'+d+'</g>';
  const goccia = '<path d="M0-9c5 6.5 7.5 10 7.5 13.2a7.5 7.5 0 0 1-15 0C-7.5 1-5-2.5 0-9z"/>';
  const camera = '<rect x="-11" y="-7" width="16" height="13" rx="2.5"/><path d="M5-2l7-4v12l-7-4"/>';
  const ciak = '<rect x="-10" y="-3" width="20" height="13" rx="1.5"/><path d="M-10-3l2-6 18 0 -2 6M-4-9l-2 6M2-9l-2 6M8-9l-2 6"/>';
  const mic = '<rect x="-3.5" y="-10" width="7" height="12" rx="3.5"/><path d="M-7 0a7 7 0 0 0 14 0M0 7v4"/>';
  const stella = '<path d="m0-9 2.6 5.4 6 .8-4.3 4.2 1 5.9L0 4.5-5.3 7.3l1-5.9L-8.6-2.8l6-.8z"/>';
  const cuore = '<path d="M0 8S-8 3.3-8-2.2A4.4 4.4 0 0 1 0-4.5a4.4 4.4 0 0 1 8 2.3C8 3.3 0 8 0 8z"/>';
  const nota = '<path d="M-3 7V-7l10-2.5v13"/><circle cx="-5.5" cy="7" r="2.5"/><circle cx="4.5" cy="4.5" r="2.5"/>';
  const fumetto = '<path d="M-10-6h20v12H-2l-6 5v-5h-2z"/>';
  const pellicola = '<rect x="-8" y="-10" width="16" height="20" rx="1.5"/><path d="M-8-5h16M-8 5h16M-5-10v20M5-10v20"/>';
  const luce = '<path d="M-6-6h12l3 9h-18z"/><path d="M0 3v7M-4 10h8"/>';
  const drone = '<circle cx="-8" cy="-6" r="3.5"/><circle cx="8" cy="-6" r="3.5"/><circle cx="-8" cy="6" r="3.5"/><circle cx="8" cy="6" r="3.5"/><path d="M-5-3l10 6M5-3l-10 6"/><rect x="-3" y="-2" width="6" height="4" rx="1"/>';
  const caffe = '<path d="M-8-3h13v6a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M5-1h2a3 3 0 0 1 0 6H5M-4-10c-1 2 1 3 0 5M1-10c-1 2 1 3 0 5"/>';
  const pezzi = [goccia, camera, ciak, mic, stella, cuore, nota, fumetto, pellicola, luce, drone, caffe];
  let s = '';
  const pos = [[30,30],[110,20],[190,45],[270,25],[350,40],[60,95],[150,90],[235,110],[320,100],[395,90],[25,160],[100,170],[180,165],[265,175],[345,165],
               [60,235],[140,240],[220,230],[300,245],[385,230],[25,305],[105,310],[190,300],[270,315],[355,305],[60,375],[150,380],[235,370],[320,385],[400,370]];
  pos.forEach((p, i) => { s += g(p[0], p[1], (i * 37) % 60 - 30, pezzi[(i * 7) % pezzi.length]); });
  return 'url("data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420">' + s + '</svg>') + '")';
}

/* ---------- stato ---------- */
const S = {
  io: null, me: null,
  persone: new Map(),       // id -> {id,nome,nick,foto,ruolo,visto}
  contatti: [],             // id di chi posso scrivere
  convs: new Map(),         // id -> conversazione
  aperta: null,
  msgs: new Map(),          // conv -> {lista:[], tutti:false, caricando:false, ids:Set}
  reazioni: new Map(),      // msg -> Map(utente -> emoji)
  nascosti: new Set(),
  online: new Set(),
  scrive: new Map(),        // conv -> Map(utente -> scadenza)
  sbloccate: new Set(),
  haPin: false,
  filtro: 'tutte', cerca: '',
  vista: 'chat',            // chat | archiviate
  risposta: null,
  bozze: memoria('bozze') || {},
  cfg: Object.assign({tema:'sistema', colori:'brand', frase:'', cornice:'', vivo:'', entrati:true, invio:true, suoni:true, sfondo:'', doodle:true, testo:'medio'}, memoria('cfg') || {}),
  sticker: [], gif: [],
  effettoScelto: null,      // {bolla, schermo, anim}
  visti: new Set(memoria('effetti_visti') || []),
  pronti: false,
  importanti: new Set(),    // i miei messaggi con la stella
  promemoria: new Map(),    // msg -> {id, quando, conv_id}
  programmati: [],          // i miei messaggi programmati
  fissati: new Map(),       // conv -> [messaggi fissati, il piu' recente prima]
  voti: new Map(),          // msg -> Map(utente -> Set(opzioni))
  lavori: new Map(),        // id lavoro FOSS -> {d: dati o null, t: quando}
  modifica: null,           // il messaggio che sto modificando
  menzBozza: [], lavBozza: [],   // menzioni e lavori scelti mentre scrivo
  selezione: null,          // Set dei messaggi scelti (modalita' selezione)
};
function nomeDi(id){
  if(id === S.io) return 'Tu';
  const p = S.persone.get(id);
  if(!p) return 'Utente FOSS';
  return (p.nick && p.nick.trim()) || (p.nome && p.nome.trim()) || 'Utente FOSS';
}
function nomeLungo(id){
  const p = S.persone.get(id); if(!p) return 'Utente FOSS';
  const n = (p.nome || '').trim(), k = (p.nick || '').trim();
  return k && n && k.toLowerCase() !== n.toLowerCase() ? k + ' (' + n + ')' : (k || n || 'Utente FOSS');
}
function inizialiNome(t){
  /* solo lettere e numeri (niente emoji a meta') */
  const p = String(t || '').trim().split(/\s+/).filter(x => /[\p{L}\p{N}]/u.test(x)).map(x => (x.match(/[\p{L}\p{N}]/u) || [''])[0]);
  return ((p[0] || '?') + (p.length > 1 ? p[p.length - 1] : '')).toUpperCase();
}
function iniziali(t){
  const p = String(t || '').trim().split(/\s+/).filter(Boolean);
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
function fotoSicura(u){ return typeof u === 'string' && /^(https:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(u) ? u : ''; }
/* v2.4: la cornice della foto, scelta da ognuno (si vede a tutti) */
const CORNICI = [{id:'oro', nome:'Oro'}, {id:'argento', nome:'Argento'}, {id:'neon', nome:'Neon'}, {id:'fuoco', nome:'Fuoco'},
  {id:'arcobaleno', nome:'Arcobaleno'}, {id:'rosa', nome:'Rosa'}, {id:'smeraldo', nome:'Smeraldo'}, {id:'viola', nome:'Viola'}];
function avatar(id, cls, conOnline, stile){
  const p = S.persone.get(id) || {}, f = fotoSicura(p.foto);
  const cr = /(^|\s)cr-/.test(cls || '') ? '' : (p.cornice && CORNICI.some(x => x.id === p.cornice) ? ' cr-' + p.cornice : '');
  return '<span class="av '+(cls||'')+cr+'" style="background:'+(f ? 'transparent' : colore(id))+';'+(stile||'')+'">'+
    (f ? '<img src="'+esc(f)+'" alt="" loading="lazy" onerror="this.remove()">' : svg('persona', 1.6))+
    (conOnline && S.online.has(id) ? '<i class="online"></i>' : '')+'</span>';
}
/* i messaggi importati da WhatsApp di chi non e' su FOSS: hanno solo il nome */
function importatoDa(m){ return !m.autore && m.media && m.media.importato ? m.media.importato : null; }
function chiaveAutore(m){ const i = importatoDa(m); return i ? 'wa:' + (i.n || '') : m.autore; }
function nomeMsg(m){ const i = m && importatoDa(m); return i ? (i.n || 'Utente WhatsApp') : nomeDi(m && m.autore); }
function avatarMsg(m, cls){
  const i = importatoDa(m); if(!i) return avatar(m.autore, cls);
  return '<span class="av av-iniz '+(cls||'')+'" style="background:'+colore(chiaveAutore(m))+'" title="Importato da WhatsApp">'+esc(inizialiNome(i.n))+'</span>';
}
function avatarConv(c, cls){
  if(!c) return '<span class="av '+(cls||'')+'"></span>';
  if(c.tipo === 'privata') return avatar(altro(c), cls, true);
  const u = c.foto ? urlFirmataSubito(c.foto) : '';
  return '<span class="av gruppo '+(cls||'')+'"'+(c.foto ? ' data-foto-gruppo="'+esc(c.foto)+'"' : '')+'>'+
    (u ? '<img src="'+esc(u)+'" alt="">' : svg('gruppo', 1.6))+'</span>';
}
function altro(c){ const m = (c.membri || []).find(x => x.id !== S.io); return m ? m.id : S.io; }
function nomeConv(c){
  if(!c) return '';
  if(c.tipo === 'gruppo') return c.nome || 'Gruppo';
  const a = altro(c);
  return a === S.io ? nomeLungo(S.io) + ' (tu)' : nomeDi(a);
}

/* ---------- avvisi brevi ---------- */
let tToast = null;
function toast(t, azione, f){
  const v = el('toast'); if(v) v.remove();
  const d = document.createElement('div'); d.className = 'toast'; d.id = 'toast';
  d.innerHTML = '<span>'+esc(t)+'</span>'+(azione ? '<button>'+esc(azione)+'</button>' : '');
  if(azione) d.querySelector('button').onclick = () => { d.remove(); f && f(); };
  document.body.appendChild(d);
  clearTimeout(tToast); tToast = setTimeout(() => d.remove(), azione ? 6000 : 3200);
}
function errore(e, cosa){
  console.warn(cosa || 'errore', e);
  const m = String((e && (e.message || e.error_description)) || e || '');
  if(/fetch|network|failed to|load failed/i.test(m) || !navigator.onLine) toast('Sembra che manchi la connessione. Riprova tra poco.');
  else if(/troppi tentativi/i.test(m)) toast('Troppi tentativi: riprova tra qualche minuto.');
  else if(/puoi scrivere solo|non puoi|solo gli amministratori/i.test(m)) toast(m.charAt(0).toUpperCase() + m.slice(1) + '.');
  else toast((cosa ? cosa + ': ' : '') + 'qualcosa non ha funzionato.');
}

/* ---------- suoni (generati, niente file) ---------- */
let audioCtx = null;
function suono(tipo){
  if(!S.cfg.suoni) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    if(tipo === 'entrato'){   /* tre note che salgono, come quando un amico entrava su MSN */
      o.type = 'triangle'; [523, 659, 784].forEach((f, i) => o.frequency.setValueAtTime(f, t + i * .11));
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08, t + .02); g.gain.setValueAtTime(.08, t + .3); g.gain.exponentialRampToValueAtTime(.0001, t + .55);
      o.start(t); o.stop(t + .56); return; }
    if(tipo === 'invio'){ o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1320, t + .08); g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.0001, t + .14); o.start(t); o.stop(t + .15); }
    else { o.type = 'sine'; o.frequency.setValueAtTime(660, t); o.frequency.setValueAtTime(990, t + .09); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + .02);
           g.gain.exponentialRampToValueAtTime(.0001, t + .32); o.start(t); o.stop(t + .33); }
  }catch(e){}
}
