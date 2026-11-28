-- FOSS.chat 2.9.19 — le richieste dal modulo di contatto di davidemorabito.com arrivano anche in chat.
-- Il sito scrive in richieste_sito (solo inserimento, con la chiave pubblica); un trigger copia la richiesta
-- come messaggio nella chat «Richieste dal sito», dove non si può scrivere (solo_avvisi), e parte la notifica.

-- 1. chat di soli avvisi
alter table public.chat_conversazioni add column if not exists solo_avvisi boolean not null default false;

-- 2. la tabella delle richieste
create table if not exists public.richieste_sito (
  id uuid primary key default gen_random_uuid(),
  creato_il timestamptz not null default now(),
  nome text, email text, telefono text, tipo_progetto text, messaggio text,
  data_evento text, luogo text, budget text, provenienza text, pagina text,
  trappola text, compilato_ms bigint,
  spam boolean not null default false
);
alter table public.richieste_sito enable row level security;
revoke all on public.richieste_sito from anon, authenticated;
grant insert (nome, email, telefono, tipo_progetto, messaggio, data_evento, luogo, budget, provenienza, pagina, trappola, compilato_ms)
  on public.richieste_sito to anon, authenticated;
drop policy if exists "richieste sito: il modulo le inserisce" on public.richieste_sito;
create policy "richieste sito: il modulo le inserisce" on public.richieste_sito for insert to anon, authenticated with check (true);
drop policy if exists "richieste sito: le vede l'amministratore" on public.richieste_sito;
create policy "richieste sito: le vede l'amministratore" on public.richieste_sito for select to authenticated using (e_admin_foss());
grant select on public.richieste_sito to authenticated;

-- 3. prima di salvare: pulizia, limiti e filtro anti-spam (mai un errore al sito: al massimo la richiesta non si salva)
create or replace function public.richieste_sito_prima()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_t text;
begin
  new.id := gen_random_uuid(); new.creato_il := now(); new.spam := false;
  new.nome := left(nullif(trim(new.nome), ''), 120);
  new.email := left(nullif(trim(new.email), ''), 200);
  new.telefono := left(nullif(trim(new.telefono), ''), 40);
  new.tipo_progetto := left(nullif(trim(new.tipo_progetto), ''), 80);
  new.messaggio := left(nullif(trim(new.messaggio), ''), 4000);
  new.data_evento := left(nullif(trim(new.data_evento), ''), 120);
  new.luogo := left(nullif(trim(new.luogo), ''), 120);
  new.budget := left(nullif(trim(new.budget), ''), 80);
  new.provenienza := left(nullif(trim(new.provenienza), ''), 300);
  new.pagina := left(nullif(trim(new.pagina), ''), 300);
  new.trappola := left(new.trappola, 10);
  if new.nome is null or new.email is null or new.messaggio is null then return null; end if;
  -- robot: casella nascosta spuntata o modulo compilato in meno di 3 secondi
  if coalesce(new.trappola, '') <> '' or coalesce(new.compilato_ms, 999999) < 3000 then new.spam := true; end if;
  -- troppe richieste: stessa email più di 3 volte in 10 minuti, o più di 30 in un'ora in tutto
  if (select count(*) from richieste_sito where lower(email) = lower(new.email) and creato_il > now() - interval '10 minutes') >= 3
     or (select count(*) from richieste_sito where creato_il > now() - interval '1 hour') >= 30 then
    return null;
  end if;
  return new;
end $$;
drop trigger if exists richieste_sito_prima on public.richieste_sito;
create trigger richieste_sito_prima before insert on public.richieste_sito for each row execute function public.richieste_sito_prima();

-- 4. dopo: il messaggio nella chat «Richieste dal sito»
create or replace function public.richieste_sito_in_chat()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_conv uuid; v_t text;
begin
  if new.spam then return null; end if;
  select id into v_conv from chat_conversazioni where solo_avvisi and nome = 'Richieste dal sito' order by creata_il limit 1;
  if v_conv is null then return null; end if;
  v_t := '📩 *Nuova richiesta dal sito*' || E'\n' ||
         '*' || new.nome || '*' || coalesce(' · ' || new.tipo_progetto, '') || E'\n\n' ||
         'Email: ' || new.email ||
         coalesce(E'\nTelefono: ' || new.telefono, '') ||
         coalesce(E'\nData: ' || new.data_evento, '') ||
         coalesce(E'\nLuogo: ' || new.luogo, '') ||
         coalesce(E'\nBudget: ' || new.budget, '') ||
         coalesce(E'\nCome mi ha trovato: ' || new.provenienza, '') ||
         E'\n\n' || new.messaggio;
  insert into chat_messaggi (conv_id, autore, tipo, testo) values (v_conv, null, 'testo', left(v_t, 6000));
  return null;
end $$;
drop trigger if exists richieste_sito_in_chat on public.richieste_sito;
create trigger richieste_sito_in_chat after insert on public.richieste_sito for each row execute function public.richieste_sito_in_chat();
revoke execute on function public.richieste_sito_prima() from public, anon, authenticated;
revoke execute on function public.richieste_sito_in_chat() from public, anon, authenticated;

-- 5. nelle chat di soli avvisi nessuno scrive (i messaggi arrivano solo dal database, senza autore)
do $$ declare d text; n text; begin
  d := pg_get_functiondef('public.chat_prima_del_messaggio'::regproc);
  n := replace(d, E'  if new.tipo = ''sistema'' then return new; end if;\n',
    E'  if new.tipo = ''sistema'' then return new; end if;\n' ||
    E'  -- chat di soli avvisi (es. «Richieste dal sito»): ci scrive solo il database\n' ||
    E'  if auth.uid() is not null and exists (select 1 from chat_conversazioni where id = new.conv_id and solo_avvisi) then\n' ||
    E'    raise exception ''in questa chat non si può scrivere'' using errcode = ''42501'';\n' ||
    E'  end if;\n');
  if n = d then raise exception 'chat_prima_del_messaggio: punto non trovato'; end if;
  execute n;

  -- un messaggio senza autore (dal database) avvisa tutti i membri, con il nome della chat come mittente
  d := pg_get_functiondef('public.chat_dopo_il_messaggio'::regproc);
  n := replace(d, 'm.utente_id <> new.autore loop', 'm.utente_id is distinct from new.autore loop');
  n := replace(n, E'v_chi := coalesce(nome_di(new.autore), ''Qualcuno'');',
                  E'v_chi := coalesce(nome_di(new.autore), case when new.autore is null then v_c.nome end, ''Qualcuno'');');
  if n = d or position('is distinct from new.autore loop' in n) = 0 or position('case when new.autore is null then v_c.nome' in n) = 0 then
    raise exception 'chat_dopo_il_messaggio: punto non trovato';
  end if;
  execute n;

  -- l'elenco delle chat dice quali sono di soli avvisi
  d := pg_get_functiondef('public.chat_elenco'::regproc);
  n := replace(d, E'''stile'', c.stile,', E'''stile'', c.stile, ''solo_avvisi'', c.solo_avvisi,');
  if n = d then raise exception 'chat_elenco: punto non trovato'; end if;
  execute n;
end $$;

-- 6. la chat, con dentro solo il titolare
do $$ declare v_io uuid := '4eed8596-7067-4cbb-aa2e-d60047930450'; v_c uuid; begin
  if not exists (select 1 from profili where id = v_io) then return; end if;
  select id into v_c from chat_conversazioni where solo_avvisi and nome = 'Richieste dal sito' limit 1;
  if v_c is null then
    insert into chat_conversazioni (tipo, nome, descrizione, creata_da, solo_avvisi)
      values ('gruppo', 'Richieste dal sito', 'Le richieste dal modulo di contatto di davidemorabito.com. Per rispondere usa l''email.', v_io, true)
      returning id into v_c;
    insert into chat_membri (conv_id, utente_id, ruolo) values (v_c, v_io, 'admin') on conflict do nothing;
  end if;
end $$;
