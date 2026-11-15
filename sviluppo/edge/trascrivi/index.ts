// FOSS.chat 2.9.4 — trascrizione dei vocali. Il testo si salva in chat_trascrizioni: si fa una volta
// sola per vocale e chi arriva dopo lo trova pronto. Solo vocali fino a 2 minuti.
// Il servizio e' uno compatibile con l'interfaccia «audio/transcriptions» (di serie Groq, Whisper):
//   segreto TRASCRIZIONE_CHIAVE (obbligatorio); facoltativi TRASCRIZIONE_URL, TRASCRIZIONE_MODELLO,
//   TRASCRIZIONE_LINGUA («it» di serie, «auto» per lasciarla scegliere al servizio).
import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_SECONDI = 120, MAX_BYTE = 24 * 1024 * 1024;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const aspetta = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ errore: "metodo" }, 405);
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ errore: "accesso" }, 401);
  const URL_SB = Deno.env.get("SUPABASE_URL")!;
  const sb = createClient(URL_SB, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return json({ errore: "accesso" }, 401);

  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ errore: "richiesta" }, 400); }
  const mid = String(b.messaggio || "");
  if (!UUID.test(mid)) return json({ errore: "richiesta" }, 400);

  // il vocale lo devo poter vedere io (RLS: sono nella chat)
  const { data: m } = await sb.from("chat_messaggi").select("id,conv_id,tipo,media,eliminato").eq("id", mid).maybeSingle();
  if (!m || m.eliminato || m.tipo !== "vocale") return json({ errore: "messaggio" }, 404);
  const media = (m.media || {}) as Record<string, unknown>;
  const dur = Number(media.dur) || 0;
  if (dur > MAX_SECONDI) return json({ errore: "lungo", durata: dur });

  const adm = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const leggi = async () => (await adm.from("chat_trascrizioni").select("stato,testo,ms,aggiornata_il").eq("msg_id", mid).maybeSingle()).data;
  // qualcun altro la sta gia' facendo: aspetto il suo testo (al massimo 25 secondi)
  const attendi = async () => {
    for (let i = 0; i < 25; i++) {
      await aspetta(1000);
      const r = await leggi();
      if (r?.stato === "fatta") return json({ testo: r.testo || "", ms: r.ms });
      if (!r || r.stato === "errore") break;
    }
    return json({ stato: "in_corso" });
  };

  const c = await leggi();
  if (c?.stato === "fatta") return json({ testo: c.testo || "", ms: c.ms, pronta: true });
  const fresca = c && Date.now() - new Date(c.aggiornata_il).getTime() < 90000;
  if (c?.stato === "in_corso" && fresca) return await attendi();

  const KEY = Deno.env.get("TRASCRIZIONE_CHIAVE") || "";
  if (!KEY) return json({ errore: "chiave" });

  // prendo il posto: se un'altra richiesta l'ha preso un attimo prima, aspetto la sua
  if (c) {
    const { data: io } = await adm.from("chat_trascrizioni").update({ stato: "in_corso", aggiornata_il: new Date().toISOString() })
      .eq("msg_id", mid).eq("aggiornata_il", c.aggiornata_il).select("msg_id");
    if (!io?.length) return await attendi();
  } else {
    const { data: io } = await adm.from("chat_trascrizioni").upsert({ msg_id: mid, conv_id: m.conv_id, stato: "in_corso" }, { onConflict: "msg_id", ignoreDuplicates: true }).select("msg_id");
    if (!io?.length) return await attendi();
  }
  const sbaglio = async (perche: string, s = 502) => {
    await adm.from("chat_trascrizioni").update({ stato: "errore", aggiornata_il: new Date().toISOString() }).eq("msg_id", mid);
    return json({ errore: perche }, s);
  };

  // il file: sul NAS dello studio (indirizzo suo) oppure su Supabase
  let audio: Blob | null = null;
  try {
    const url = String(media.url || "");
    if (url) {
      const h = new URL(url);
      if (h.protocol !== "https:" || !(h.hostname === "foss.team" || h.hostname.endsWith(".foss.team"))) return await sbaglio("file", 400);
      const r = await fetch(url);
      if (r.ok) audio = await r.blob();
    } else if (media.path) {
      const { data } = await adm.storage.from("chat").download(String(media.path));
      audio = data;
    }
  } catch { audio = null; }
  if (!audio || !audio.size) return await sbaglio("file");
  if (audio.size > MAX_BYTE) return await sbaglio("lungo", 200);

  const mime = String(media.mime || audio.type || "audio/mp4");
  const ext = mime.includes("webm") ? "webm" : mime.includes("ogg") ? "ogg" : mime.includes("mpeg") ? "mp3" : "m4a";
  const f = new FormData();
  f.append("file", new File([audio], "vocale." + ext, { type: mime }));
  f.append("model", Deno.env.get("TRASCRIZIONE_MODELLO") || "whisper-large-v3-turbo");
  f.append("response_format", "json");
  const lingua = Deno.env.get("TRASCRIZIONE_LINGUA") || "it";
  if (lingua !== "auto") f.append("language", lingua);
  const t0 = Date.now();
  let testo = "";
  try {
    const r = await fetch(Deno.env.get("TRASCRIZIONE_URL") || "https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: "Bearer " + KEY }, body: f,
    });
    if (!r.ok) { console.warn("trascrizione", r.status, (await r.text()).slice(0, 300)); return await sbaglio("servizio"); }
    const j = await r.json();
    testo = String(j.text || "").trim();
  } catch (e) { console.warn("trascrizione", String(e)); return await sbaglio("servizio"); }
  const ms = Date.now() - t0;
  await adm.from("chat_trascrizioni").update({ stato: "fatta", testo, ms, durata: dur || null, aggiornata_il: new Date().toISOString() }).eq("msg_id", mid);
  return json({ testo, ms });
});
