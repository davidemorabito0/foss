-- FOSS.chat: conversazioni private e di gruppo tra chi lavora nello stesso team.
-- Gli account sono quelli di FOSS (profili): nessuna registrazione in piu'.

create table public.chat_conversazioni (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('privata','gruppo')),
  nome text check (nome is null or char_length(nome) between 1 and 80),
  descrizione text not null default '' check (char_length(descrizione) <= 500),
  foto text check (foto is null or foto ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  coppia text unique,
  creata_da uuid references auth.users(id) on delete set null,
  creata_il timestamptz not null default now(),
  ultimo_il timestamptz not null default now()
);

create table public.chat_membri (
  conv_id uuid not null references public.chat_conversazioni(id) on delete cascade,
  utente_id uuid not null references auth.users(id) on delete cascade,
  ruolo text not null default 'membro' check (ruolo in ('admin','membro')),
  aggiunto_il timestamptz not null default now(),
  letto_fino timestamptz not null default now(),
  ricevuto_fino timestamptz not null default now(),
  silenziata boolean not null default false,
  archiviata boolean not null default false,
  fissata boolean not null default false,
  svuotata_il timestamptz,
  primary key (conv_id, utente_id)
);
create index chat_membri_utente on public.chat_membri (utente_id);

create table public.chat_messaggi (
  id uuid primary key default gen_random_uuid(),
  conv_id uuid not null references public.chat_conversazioni(id) on delete cascade,
  autore uuid references auth.users(id) on delete set null default auth.uid(),
  tipo text not null check (tipo in ('testo','foto','vocale','sticker','file','video','sistema')),
  testo text check (testo is null or char_length(testo) <= 6000),
  media jsonb,
  risponde_a uuid references public.chat_messaggi(id) on delete set null,
  creato_il timestamptz not null default now(),
  eliminato boolean not null default false
);
create index chat_messaggi_conv on public.chat_messaggi (conv_id, creato_il desc);

create table public.chat_presenza (
  utente_id uuid primary key references auth.users(id) on delete cascade,
  visto_il timestamptz not null default now()
);

create table public.chat_sticker (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  path text not null check (path ~ '^sticker/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  creato_il timestamptz not null default now()
);
create index chat_sticker_utente on public.chat_sticker (utente_id, creato_il desc);

alter table public.chat_conversazioni enable row level security;
alter table public.chat_membri enable row level security;
alter table public.chat_messaggi enable row level security;
alter table public.chat_presenza enable row level security;
alter table public.chat_sticker enable row level security;

-- ---------- funzioni di controllo ----------
create or replace function public.chat_membro(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from chat_membri where conv_id = c and utente_id = auth.uid());
$$;

create or replace function public.chat_admin(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from chat_membri where conv_id = c and utente_id = auth.uid() and ruolo = 'admin');
$$;

-- ---------- regole di lettura e scrittura ----------
create policy "chat conv: le vede chi ne fa parte" on public.chat_conversazioni
  for select to authenticated using (chat_membro(id));

create policy "chat membri: li vede chi e' nella conversazione" on public.chat_membri
  for select to authenticated using (chat_membro(conv_id));
create policy "chat membri: ognuno cambia le sue impostazioni" on public.chat_membri
  for update to authenticated using (utente_id = (select auth.uid())) with check (utente_id = (select auth.uid()));
revoke update on public.chat_membri from authenticated, anon;
grant update (letto_fino, ricevuto_fino, silenziata, archiviata, fissata, svuotata_il) on public.chat_membri to authenticated;

create policy "chat messaggi: li vede chi e' nella conversazione" on public.chat_messaggi
  for select to authenticated using (chat_membro(conv_id));
create policy "chat messaggi: li scrive chi e' nella conversazione" on public.chat_messaggi
  for insert to authenticated with check (chat_membro(conv_id) and autore = (select auth.uid()) and tipo <> 'sistema');
revoke update, delete on public.chat_messaggi from authenticated, anon;

create policy "chat presenza: la vede chi lavora con me" on public.chat_presenza
  for select to authenticated using (condividiamo_org(utente_id));

create policy "chat sticker: vedo i miei" on public.chat_sticker
  for select to authenticated using (utente_id = (select auth.uid()));
create policy "chat sticker: aggiungo i miei" on public.chat_sticker
  for insert to authenticated with check (utente_id = (select auth.uid()));
create policy "chat sticker: tolgo i miei" on public.chat_sticker
  for delete to authenticated using (utente_id = (select auth.uid()));

revoke all on public.chat_conversazioni from anon;
revoke all on public.chat_membri from anon;
revoke all on public.chat_messaggi from anon;
revoke all on public.chat_presenza from anon;
revoke all on public.chat_sticker from anon;
revoke insert, update, delete on public.chat_conversazioni from authenticated;
revoke insert, delete on public.chat_membri from authenticated;
revoke insert, update, delete on public.chat_presenza from authenticated;
