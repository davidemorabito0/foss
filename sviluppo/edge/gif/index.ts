// FOSS.chat — GIF di tendenza e ricerca (GIPHY). La chiave resta qui, nel segreto GIPHY_KEY.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const ok = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const pulisci = (u: string) => { try { const x = new URL(u); return 'https://' + x.host + x.pathname; } catch { return ''; } };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const KEY = Deno.env.get('GIPHY_KEY') || '';
  if (!KEY) return ok({ errore: 'chiave' });
  let b: { q?: string; offset?: number } = {};
  try { b = await req.json(); } catch { /* vuoto */ }
  const q = String(b.q || '').trim().slice(0, 60);
  const off = Math.max(0, Math.min(4900, Number(b.offset) || 0));
  const p = new URLSearchParams({ api_key: KEY, limit: '24', offset: String(off), rating: 'pg-13', lang: 'it', bundle: 'messaging_non_clips' });
  if (q) p.set('q', q);
  const r = await fetch('https://api.giphy.com/v1/gifs/' + (q ? 'search' : 'trending') + '?' + p);
  if (!r.ok) return ok({ errore: 'giphy ' + r.status }, 502);
  const j = await r.json();
  const lista = (j.data || []).map((g: any) => {
    const fw = g.images?.fixed_width || {}, or = g.images?.original || {};
    return { id: g.id, anteprima: pulisci(fw.webp || fw.url || ''), mp4: pulisci(fw.mp4 || or.mp4 || ''), w: +fw.width || 200, h: +fw.height || 200, titolo: String(g.title || '').slice(0, 80) };
  }).filter((x: any) => x.mp4 && x.anteprima);
  return ok({ lista, prossimo: off + 24, fine: (j.pagination?.total_count || 0) <= off + 24 });
});
