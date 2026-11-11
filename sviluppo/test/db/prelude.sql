-- Un Supabase finto, per provare la migrazione di FOSS.chat 2 in locale (PGlite).
create schema if not exists auth;
create schema if not exists vault;
create schema if not exists net;
create schema if not exists cron;
create role authenticated nologin;
create role anon nologin;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                         (nullif(current_setting('request.jwt.claims', true), '')::jsonb)->>'sub'), '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
create table vault.decrypted_secrets (name text, decrypted_secret text);
insert into vault.decrypted_secrets values ('foss_vapid', '{"jwk":{"x":"1"}}');
create table net.chiamate (id serial, url text, body jsonb);
create function net.http_post(url text, body jsonb, headers jsonb default null, timeout_milliseconds int default 0) returns bigint
language plpgsql as $$ declare i int; begin insert into net.chiamate (url, body) values (url, body) returning id into i; return i; end $$;
create table cron.job (jobid serial primary key, jobname text, schedule text, command text, active boolean default true);
create table cron.job_run_details (end_time timestamptz);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job (jobname, schedule, command) values (n, s, c) returning jobid $$;
create function cron.unschedule(id bigint) returns boolean language sql as $$ delete from cron.job where jobid = id returning true $$;
create publication supabase_realtime;

grant usage on schema public, auth to authenticated, anon;
grant execute on all functions in schema auth to authenticated, anon;

-- ---------- tabelle di FOSS ----------
create table public.profili (id uuid primary key, nome text default '', cognome text default '', nickname text default '', email text,
  ruolo text default 'Collaboratore', foto_url text, tema text default 'brand', cfg jsonb default '{}', chat_cfg jsonb default '{}' not null);
create table public.organizzazioni (id uuid default gen_random_uuid() primary key, nome text not null, titolare uuid not null, creato_il timestamptz default now() not null);
create table public.membri_org (org_id uuid not null, utente_id uuid not null, ruolo text default 'collaboratore' not null, aggiunto_il timestamptz default now() not null,
  permessi jsonb default '{}' not null, primary key (org_id, utente_id));
create table public.spazi (org_id uuid not null, id text not null, dati jsonb default '{}' not null, ordine int default 0 not null, aggiornato_il timestamptz default now() not null, primary key (org_id, id));
create table public.progetti (org_id uuid not null, id text not null, spazio_id text, dati jsonb default '{}' not null, rev bigint default 1 not null,
  aggiornato_da uuid, aggiornato_il timestamptz default now() not null, primary key (org_id, id));
create table public.membri_progetto (org_id uuid not null, progetto_id text not null, utente_id uuid not null, primary key (org_id, progetto_id, utente_id));
create table public.elementi (org_id uuid not null, progetto_id text not null, id text not null, tipo text not null, genitore text, ordine double precision default 0 not null,
  dati jsonb default '{}' not null, creato_il timestamptz default now() not null, aggiornato_il timestamptz default now() not null, aggiornato_da uuid default auth.uid(),
  primary key (org_id, progetto_id, id));
create table public.spazio_lavoro (utente_id uuid primary key, stato jsonb default '{}' not null, aggiornato_il timestamptz default now());
create table public.push_iscrizioni (endpoint text primary key, utente_id uuid not null, p256dh text not null, auth text not null, dispositivo text default '' not null, creata_il timestamptz default now() not null);
create table public.notifiche (id uuid default gen_random_uuid() primary key, org_id uuid not null, utente_id uuid not null, progetto_id text, tipo text not null, da uuid,
  dati jsonb default '{}' not null, letta boolean default false not null, creata_il timestamptz default now() not null, aggiornata_il timestamptz default now() not null);

-- ---------- tabelle della chat (come sono oggi) ----------
create table public.chat_conversazioni (id uuid default gen_random_uuid() primary key, tipo text not null check (tipo in ('privata','gruppo')), nome text, descrizione text default '' not null,
  foto text, coppia text unique, creata_da uuid, creata_il timestamptz default now() not null, ultimo_il timestamptz default now() not null);
create table public.chat_membri (conv_id uuid not null references public.chat_conversazioni(id) on delete cascade, utente_id uuid not null references auth.users(id) on delete cascade,
  ruolo text default 'membro' not null, aggiunto_il timestamptz default now() not null, letto_fino timestamptz default now() not null, ricevuto_fino timestamptz default now() not null,
  silenziata boolean default false not null, archiviata boolean default false not null, fissata boolean default false not null, svuotata_il timestamptz, bloccata boolean default false not null,
  primary key (conv_id, utente_id));
create table public.chat_messaggi (id uuid default gen_random_uuid() primary key, conv_id uuid not null references public.chat_conversazioni(id) on delete cascade,
  autore uuid default auth.uid() references auth.users(id) on delete set null, tipo text not null constraint chat_messaggi_tipo_check check (tipo in ('testo','foto','vocale','sticker','file','video','sistema')),
  testo text check (testo is null or char_length(testo) <= 6000), media jsonb, risponde_a uuid references public.chat_messaggi(id) on delete set null,
  creato_il timestamptz default now() not null, eliminato boolean default false not null);
create index chat_messaggi_conv on public.chat_messaggi (conv_id, creato_il desc);
create table public.chat_reazioni (msg_id uuid not null references public.chat_messaggi(id) on delete cascade, utente_id uuid default auth.uid() not null, conv_id uuid not null,
  emoji text not null, creata_il timestamptz default now() not null, primary key (msg_id, utente_id));

-- ---------- funzioni di oggi ----------
create function public.chat_membro(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from chat_membri where conv_id = c and utente_id = auth.uid()); $$;
create function public.chat_admin(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from chat_membri where conv_id = c and utente_id = auth.uid() and ruolo = 'admin'); $$;
create function public.e_titolare(o uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from membri_org m where m.org_id = o and m.utente_id = auth.uid() and m.ruolo = 'titolare'); $$;
create function public.e_membro_org(o uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from membri_org m where m.org_id = o and m.utente_id = auth.uid()); $$;
create function public.lavora_al_progetto(o uuid, p text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from membri_progetto mp where mp.org_id = o and mp.progetto_id = p and mp.utente_id = auth.uid()); $$;
create function public.puo(o uuid, k text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from membri_org m where m.org_id = o and m.utente_id = auth.uid()
     and (m.ruolo = 'titolare' or (coalesce((m.permessi->>'sola_lettura')::boolean, false) = false and coalesce((m.permessi->>k)::boolean, true)))); $$;
create function public.vede_spazio(o uuid, s text, d jsonb) returns boolean language sql stable security definer set search_path = public as $$
  select e_titolare(o) or (e_membro_org(o) and (coalesce(d->'membri', '[]'::jsonb) ? auth.uid()::text
      or exists (select 1 from progetti p join membri_progetto mp on mp.org_id = p.org_id and mp.progetto_id = p.id
                  where p.org_id = o and p.spazio_id = s and mp.utente_id = auth.uid()))); $$;
create function public.intero_o_null(t text) returns integer language plpgsql immutable as $$ begin return t::int; exception when others then return null; end $$;
create function public.nome_di(p_utente uuid) returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(pf.nickname),''), nullif(trim(coalesce(pf.nome,'') || ' ' || coalesce(pf.cognome,'')),''), split_part(pf.email,'@',1)) from profili pf where pf.id = p_utente $$;
create function public.notifica_a(o uuid, u uuid, p text, t text, d jsonb) returns void language sql security definer set search_path = public as $$
  insert into notifiche (org_id, utente_id, progetto_id, tipo, dati) values (o, u, p, t, d); $$;
create function public.creatore_nel_lavoro() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not e_titolare(new.org_id) then
    insert into membri_progetto (org_id, progetto_id, utente_id) values (new.org_id, new.id, auth.uid()) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger creatore_nel_lavoro after insert on public.progetti for each row execute function public.creatore_nel_lavoro();
create function public.notifiche_membri() returns trigger language plpgsql security definer set search_path = public as $$
declare v_nome text;
begin
  if coalesce(current_setting('foss.silenzio', true), '') = '1' then return null; end if;
  if new.utente_id = auth.uid() then return null; end if;
  select dati->>'nome' into v_nome from progetti where org_id = new.org_id and id = new.progetto_id;
  perform notifica_a(new.org_id, new.utente_id, new.progetto_id, 'aperto', jsonb_build_object('chi', coalesce(nome_di(auth.uid()), 'Qualcuno'), 'progetto', coalesce(v_nome,'')));
  return null;
end $$;
create trigger notifiche_membri after insert on public.membri_progetto for each row execute function public.notifiche_membri();
create function public.tocca_progetto() returns trigger language plpgsql security definer set search_path = public as $$
begin new.rev := coalesce(old.rev, 0) + 1; new.aggiornato_il := now(); new.aggiornato_da := auth.uid(); return new; end $$;
create trigger trg_tocca_progetto before update on public.progetti for each row execute function public.tocca_progetto();

-- i trigger della chat (le funzioni vere le mette la migrazione)
create function public.chat_prima_del_messaggio() returns trigger language plpgsql as $$ begin return new; end $$;
create function public.chat_dopo_il_messaggio() returns trigger language plpgsql as $$ begin return null; end $$;
create trigger chat_prima_del_messaggio before insert on public.chat_messaggi for each row execute function public.chat_prima_del_messaggio();
create trigger chat_dopo_il_messaggio after insert on public.chat_messaggi for each row execute function public.chat_dopo_il_messaggio();

-- ---------- regole (RLS) di oggi ----------
alter table public.chat_messaggi enable row level security;
create policy m_ins on public.chat_messaggi for insert to authenticated with check (chat_membro(conv_id) and autore = (select auth.uid()) and tipo <> 'sistema');
create policy m_sel on public.chat_messaggi for select to authenticated using (chat_membro(conv_id));
alter table public.chat_membri enable row level security;
create policy mm_sel on public.chat_membri for select to authenticated using (chat_membro(conv_id));
alter table public.progetti enable row level security;
create policy p_ins on public.progetti for insert with check (puo(org_id, 'crea_lavori'));
create policy p_upd on public.progetti for update using (e_titolare(org_id) or (lavora_al_progetto(org_id, id) and (puo(org_id, 'modifica') or puo(org_id, 'spunta'))))
  with check (e_titolare(org_id) or (lavora_al_progetto(org_id, id) and (puo(org_id, 'modifica') or puo(org_id, 'spunta'))));
create policy p_sel on public.progetti for select to authenticated using (e_titolare(org_id) or lavora_al_progetto(org_id, id));
alter table public.elementi enable row level security;
create policy e_sel on public.elementi for select using (e_titolare(org_id) or lavora_al_progetto(org_id, progetto_id));
alter table public.membri_progetto enable row level security;
create policy mp_sel on public.membri_progetto for select to authenticated using (e_titolare(org_id) or lavora_al_progetto(org_id, progetto_id));
alter table public.spazi enable row level security;
create policy s_sel on public.spazi for select to authenticated using (vede_spazio(org_id, id, dati));

grant select, insert, update, delete on all tables in schema public to authenticated;

create table public.admin_foss (utente_id uuid primary key, email text);
create function public.e_admin_foss() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from admin_foss where utente_id = auth.uid()) $$;
