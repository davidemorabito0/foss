// FOSS.chat — Super notifica (v2.3). Solo l'amministratore di FOSS: un suo messaggio
// arriva anche per email a tutte le persone della chat. Una volta sola per messaggio,
// al massimo 20 al giorno. Gli indirizzi email restano sul server.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corpoMail, testoSemplice } from "./mail.js";

const MITTENTE = "avvisi@davidemorabito.com";
const AL_GIORNO = 20, MAX_PERSONE = 60;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const quando = (t: string) =>
  new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    .format(new Date(t)).replace(/\.(?=\s|,)/, "").replace(" alle ore", ",");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ errore: "metodo" }, 405);
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ errore: "accesso" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return json({ errore: "accesso" }, 401);
  const io = u.user.id;

  const { data: admin } = await sb.rpc("e_admin_foss");
  if (admin !== true) return json({ errore: "admin" }, 403);

  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ errore: "richiesta" }, 400); }
  const mid = String(b.messaggio || "");
  if (!UUID.test(mid)) return json({ errore: "richiesta" }, 400);

  // il messaggio lo devo vedere io (RLS: sono nella chat) e deve essere mio
  const { data: m } = await sb.from("chat_messaggi").select("id,conv_id,autore,tipo,testo,media,creato_il,eliminato").eq("id", mid).maybeSingle();
  if (!m || m.autore !== io || m.eliminato || m.tipo === "sistema") return json({ errore: "messaggio" }, 404);

  const chiave = Deno.env.get("RESEND_API_KEY");
  if (!chiave) return json({ errore: "chiave" }, 503);
  const adm = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const ieri = new Date(Date.now() - 86400000).toISOString();
  const { count } = await adm.from("chat_super_notifiche").select("id", { count: "exact", head: true }).eq("da", io).gte("creata_il", ieri);
  if ((count || 0) >= AL_GIORNO) return json({ errore: "troppi" }, 429);

  const { data: membri } = await adm.from("chat_membri").select("utente_id").eq("conv_id", m.conv_id);
  const a = (membri || []).map((x: { utente_id: string }) => x.utente_id).filter((x: string) => x !== io).slice(0, MAX_PERSONE);
  if (!a.length) return json({ errore: "nessuno" }, 400);

  // una volta sola per messaggio: lo prenoto prima di mandare
  const { data: riga, error: gia } = await adm.from("chat_super_notifiche").insert({ msg_id: m.id, conv_id: m.conv_id, da: io, a }).select("id").maybeSingle();
  if (gia || !riga) return json({ errore: "gia" }, 409);

  const { data: conv } = await adm.from("chat_conversazioni").select("tipo,nome").eq("id", m.conv_id).maybeSingle();
  const { data: me } = await adm.from("profili").select("nome,cognome,nickname,foto_url").eq("id", io).maybeSingle();
  const chi = ((me?.nickname || "").trim() || `${me?.nome || ""} ${me?.cognome || ""}`.trim() || "FOSS").slice(0, 60);
  const md = (m.media || {}) as Record<string, unknown>;
  const cosa: Record<string, string> = { foto: "una foto", video: "un video", file: "un file", vocale: "un messaggio vocale", sondaggio: "un sondaggio", lavoro: "un lavoro di FOSS", sticker: "uno sticker" };
  const testo = String(m.testo || (md.domanda as string) || "").slice(0, 1200);
  const v = {
    chi, foto: me?.foto_url || "",
    chat: conv?.tipo === "gruppo" ? String(conv?.nome || "Gruppo").slice(0, 80) : "",
    testo, allegato: cosa[m.tipo] || "",
    quando: quando(m.creato_il),
    url: "https://foss.team/chat.html#c=" + m.conv_id,
  };

  const inviate: string[] = [], saltate: string[] = [];
  for (const id of a) {
    const { data: dest } = await adm.auth.admin.getUserById(id);
    const email = dest?.user?.email;
    if (!email) { saltate.push(id); continue; }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${chiave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${chi.replace(/[<>"]/g, "")} · FOSS.chat <${MITTENTE}>`, to: [email],
        subject: `${chi.split(" ")[0]} ti ha scritto su FOSS.chat` + (v.chat ? ` («${v.chat}»)` : ""),
        html: corpoMail(v), text: testoSemplice(v), tags: [{ name: "tipo", value: "super-notifica" }],
      }),
    });
    if (!r.ok) { console.error("resend", r.status, (await r.text()).slice(0, 300)); saltate.push(id); continue; }
    inviate.push(id);
  }
  // se non e' partita nessuna email, la super notifica si puo' riprovare
  if (!inviate.length) await adm.from("chat_super_notifiche").delete().eq("id", riga.id);
  return json({ inviate, saltate });
});
