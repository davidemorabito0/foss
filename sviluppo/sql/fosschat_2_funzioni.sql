-- FOSS.chat 2: modifica, fissati, sondaggi, programmati, promemoria, importanti,
-- menzioni, lavori di FOSS, colpetto, letture con l'ora.

-- ---------- 1. messaggi: colonne e tipi nuovi ----------
alter table public.chat_messaggi
  add column if not exists modificato_il timestamptz,
  add column if not exists fissato_il timestamptz,
  add column if not exists fissato_da uuid references auth.users(id) on delete set null;
alter table public.chat_messaggi drop constraint if exists chat_messaggi_tipo_check;
alter table public.chat_messaggi add constraint chat_messaggi_tipo_check
  check (tipo = any (array['testo','foto','vocale','sticker','file','video','sistema','sondaggio','lavoro','colpetto']));
create index if not exists chat_messaggi_fissati on public.chat_messaggi (conv_id, fissato_il desc) where fissato_il is not null;
create index if not exists chat_messaggi_fissato_da on public.chat_messaggi (fissato_da) where fissato_da is not null;

-- ---------- 2. attrezzi ----------
create or replace function public.chat_esc(t text) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

-- i dati in piu' di un messaggio di testo: effetti, menzioni, lavori collegati
create or replace function public.chat_media_testo_ok(m jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare k text; x jsonb;
begin
  if m is null then return true; end if;
  if jsonb_typeof(m) <> 'object' or length(m::text) > 8000 then return false; end if;
  for k in select jsonb_object_keys(m) loop
    if k not in ('bolla','schermo','anim','menzioni','tutti','lavori','silenzioso') then return false; end if;
  end loop;
  if (m ? 'bolla' and (jsonb_typeof(m->'bolla') <> 'string' or length(m->>'bolla') > 20))
     or (m ? 'schermo' and (jsonb_typeof(m->'schermo') <> 'string' or length(m->>'schermo') > 20))
     or (m ? 'anim' and (jsonb_typeof(m->'anim') <> 'string' or length(m->>'anim') > 20))
     or (m ? 'tutti' and jsonb_typeof(m->'tutti') <> 'boolean')
     or (m ? 'silenzioso' and jsonb_typeof(m->'silenzioso') <> 'boolean') then
    return false;
  end if;
  if m ? 'menzioni' then
    if jsonb_typeof(m->'menzioni') <> 'array' or jsonb_array_length(m->'menzioni') > 50 then return false; end if;
    for x in select * from jsonb_array_elements(m->'menzioni') loop
      if jsonb_typeof(x) <> 'object'
         or coalesce(x->>'id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         or length(coalesce(x->>'n', '')) not between 1 and 80
         or exists (select 1 from jsonb_object_keys(x) kk where kk not in ('id','n')) then
        return false;
      end if;
    end loop;
  end if;
  if m ? 'lavori' then
    if jsonb_typeof(m->'lavori') <> 'array' or jsonb_array_length(m->'lavori') > 10 then return false; end if;
    for x in select * from jsonb_array_elements(m->'lavori') loop
      if jsonb_typeof(x) <> 'object'
         or coalesce(x->>'id', '') !~ '^[A-Za-z0-9_-]{1,60}$'
         or coalesce(x->>'org', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         or length(coalesce(x->>'n', '')) not between 1 and 120
         or exists (select 1 from jsonb_object_keys(x) kk where kk not in ('id','org','n')) then
        return false;
      end if;
    end loop;
  end if;
  return true;
end $$;

-- l'anteprima di un messaggio (avvisi sul telefono, promemoria)
create or replace function public.chat_anteprima(m public.chat_messaggi) returns text
language sql stable set search_path = public as $$
  select case m.tipo
    when 'testo' then left(m.testo, 200)
    when 'foto' then '📷 ' || coalesce(nullif(m.media->>'did', ''), case when m.media->>'gif' = 'true' then 'GIF' else 'Foto' end)
    when 'video' then case when m.media->>'gif' = 'true' then 'GIF' else '🎥 ' || coalesce(nullif(m.media->>'did', ''), 'Video') end
    when 'vocale' then '🎤 Messaggio vocale'
    when 'sticker' then 'Sticker'
    when 'sondaggio' then '📊 ' || left(coalesce(m.testo, 'Sondaggio'), 180)
    when 'lavoro' then '🎬 ' || case when m.media->>'nuovo' = 'true' then 'Nuovo lavoro: ' else 'Lavoro: ' end || coalesce(m.media->'lavoro'->>'n', '')
    when 'colpetto' then '👋 Colpetto'
    else '📄 ' || coalesce(m.media->>'nome', 'Documento') end;
$$;

-- ---------- 3. letture con l'ora (per «Letto oggi alle 18:58») ----------
create table if not exists public.chat_letture (
  msg_id uuid not null references public.chat_messaggi(id) on delete cascade,
  conv_id uuid not null references public.chat_conversazioni(id) on delete cascade,
  utente_id uuid not null references auth.users(id) on delete cascade,
  letto_il timestamptz not null default now(),
  primary key (msg_id, utente_id)
);
create index if not exists chat_letture_conv on public.chat_letture (conv_id);
create index if not exists chat_letture_utente on public.chat_letture (utente_id);
alter table public.chat_letture enable row level security;
drop policy if exists "chat letture: le vede chi ha scritto il messaggio" on public.chat_letture;
create policy "chat letture: le vede chi ha scritto il messaggio" on public.chat_letture for select to authenticated
  using (chat_membro(conv_id) and exists (select 1 from public.chat_messaggi m where m.id = msg_id and m.autore = (select auth.uid())));

create or replace function public.chat_registra_letture(p_conv uuid, p_utente uuid, p_da timestamptz, p_a timestamptz) returns void
language sql security definer set search_path = public as $$
  insert into chat_letture (msg_id, conv_id, utente_id, letto_il)
  select id, conv_id, p_utente, clock_timestamp() from (
    select id, conv_id from chat_messaggi
     where conv_id = p_conv and creato_il > p_da and creato_il <= p_a
       and autore is distinct from p_utente and tipo <> 'sistema'
     order by creato_il desc limit 500) x
  on conflict do nothing;
$$;
revoke execute on function public.chat_registra_letture(uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public.chat_letto(p_conv uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_old timestamptz; v_ora timestamptz := clock_timestamp();
begin
  select letto_fino into v_old from chat_membri where conv_id = p_conv and utente_id = auth.uid();
  if v_old is null then return; end if;
  update chat_membri set letto_fino = v_ora, ricevuto_fino = greatest(ricevuto_fino, v_ora)
   where conv_id = p_conv and utente_id = auth.uid();
  perform chat_registra_letture(p_conv, auth.uid(), v_old, v_ora);
end $$;

-- ---------- 4. prima del messaggio: chi scrive e cosa e' valido ----------
create or replace function public.chat_prima_del_messaggio() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_p text; v_x jsonb; v_ids text[] := '{}';
        v_interno boolean := coalesce(current_setting('chat.interno', true), '') = '1';
        v_importa boolean := coalesce(current_setting('chat.importa', true), '') = '1';
begin
  -- una chat importata da WhatsApp tiene la sua data (solo da chat_importa, che controlla tutto prima)
  if v_importa then
    if new.creato_il is null or new.creato_il > clock_timestamp() then raise exception 'data non valida'; end if;
    if not e_admin_foss() or not chat_membro(new.conv_id) or (new.autore is not null
       and not exists (select 1 from chat_membri where conv_id = new.conv_id and utente_id = new.autore)) then
      raise exception 'non puoi' using errcode = '42501';
    end if;
  else
    new.creato_il := clock_timestamp();
  end if;
  new.eliminato := false;
  new.modificato_il := null; new.fissato_il := null; new.fissato_da := null;
  if new.tipo = 'sistema' then return new; end if;
  -- un messaggio programmato lo manda l'orologio del database a nome di chi l'ha scritto
  if v_importa then null;
  elsif not (v_interno and new.autore is not null) then new.autore := auth.uid(); end if;

  if new.tipo = 'testo' then
    if coalesce(trim(new.testo), '') = '' then raise exception 'messaggio vuoto'; end if;
    if not chat_media_testo_ok(case when v_importa then new.media - 'importato' else new.media end) then raise exception 'effetto non valido'; end if;

  elsif new.tipo = 'sondaggio' then
    if length(trim(coalesce(new.testo, ''))) not between 1 and 300 then raise exception 'scrivi la domanda del sondaggio'; end if;
    if new.media is null or jsonb_typeof(new.media) <> 'object' or jsonb_typeof(new.media->'opzioni') is distinct from 'array' then
      raise exception 'sondaggio non valido';
    end if;
    if jsonb_array_length(new.media->'opzioni') not between 2 and 12
       or exists (select 1 from jsonb_object_keys(new.media) k where k not in ('opzioni','multi','silenzioso'))
       or (new.media ? 'multi' and jsonb_typeof(new.media->'multi') <> 'boolean')
       or (new.media ? 'silenzioso' and jsonb_typeof(new.media->'silenzioso') <> 'boolean') then
      raise exception 'sondaggio non valido';
    end if;
    for v_x in select * from jsonb_array_elements(new.media->'opzioni') loop
      if jsonb_typeof(v_x) <> 'object' then raise exception 'sondaggio non valido'; end if;
      if coalesce(v_x->>'id', '') !~ '^[a-z0-9]{1,8}$'
         or length(trim(coalesce(v_x->>'t', ''))) not between 1 and 100 or (v_x->>'id') = any(v_ids)
         or exists (select 1 from jsonb_object_keys(v_x) k where k not in ('id','t')) then
        raise exception 'sondaggio non valido';
      end if;
      v_ids := v_ids || (v_x->>'id');
    end loop;

  elsif new.tipo = 'lavoro' then
    if new.testo is not null and length(new.testo) > 1000 then raise exception 'testo troppo lungo'; end if;
    if new.media is null or jsonb_typeof(new.media) <> 'object' or jsonb_typeof(new.media->'lavoro') is distinct from 'object' then
      raise exception 'lavoro non valido';
    end if;
    if exists (select 1 from jsonb_object_keys(new.media) k where k not in ('lavoro','nuovo','silenzioso'))
       or exists (select 1 from jsonb_object_keys(new.media->'lavoro') k where k not in ('id','org','n'))
       or coalesce(new.media->'lavoro'->>'id', '') !~ '^[A-Za-z0-9_-]{1,60}$'
       or coalesce(new.media->'lavoro'->>'org', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or length(coalesce(new.media->'lavoro'->>'n', '')) not between 1 and 120
       or (new.media ? 'nuovo' and jsonb_typeof(new.media->'nuovo') <> 'boolean')
       or (new.media ? 'silenzioso' and jsonb_typeof(new.media->'silenzioso') <> 'boolean') then
      raise exception 'lavoro non valido';
    end if;

  elsif new.tipo = 'colpetto' then
    new.testo := null; new.risponde_a := null;
    if new.media is null or jsonb_typeof(new.media) <> 'object'
       or coalesce(new.media->>'a', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'colpetto non valido';
    end if;
    if exists (select 1 from jsonb_object_keys(new.media) k where k <> 'a') then raise exception 'colpetto non valido'; end if;
    if (new.media->>'a')::uuid = new.autore
       or not exists (select 1 from chat_membri where conv_id = new.conv_id and utente_id = (new.media->>'a')::uuid) then
      raise exception 'colpetto non valido';
    end if;
    if exists (select 1 from chat_messaggi where conv_id = new.conv_id and tipo = 'colpetto' and autore = new.autore
                and media->>'a' = new.media->>'a' and creato_il > clock_timestamp() - interval '10 seconds') then
      raise exception 'aspetta qualche secondo prima di un altro colpetto';
    end if;

  else
    if new.media is null or jsonb_typeof(new.media) <> 'object' then raise exception 'manca il file'; end if;
    v_p := new.media->>'path';
    if v_p is not null and not (
         v_p ~ ('^' || new.conv_id::text || '/[A-Za-z0-9._-]{1,120}$')
      or (new.tipo = 'sticker' and v_p ~ '^sticker/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$')
      or (new.tipo = 'sticker' and v_p ~ '^foss:[a-z0-9-]{1,40}$')) then
      raise exception 'percorso del file non valido';
    end if;
    if new.media ? 'url' and coalesce(new.media->>'url', '') !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?/[A-Za-z0-9._~/%-]{1,250}$' then
      raise exception 'indirizzo del file non valido';
    end if;
    if v_p is null and not (new.media ? 'url') then raise exception 'manca il file'; end if;
    if new.media ? 'silenzioso' and jsonb_typeof(new.media->'silenzioso') <> 'boolean' then raise exception 'dati non validi'; end if;
    if length(new.media::text) > 4000 then raise exception 'dati del file troppo lunghi'; end if;
  end if;
  if new.risponde_a is not null and not exists (select 1 from chat_messaggi r where r.id = new.risponde_a and r.conv_id = new.conv_id) then
    new.risponde_a := null;
  end if;
  return new;
end $$;

-- ---------- 5. dopo il messaggio: letture e avvisi sul telefono ----------
create or replace function public.chat_dopo_il_messaggio() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_c chat_conversazioni; v_chiave text; v_r record; v_iscr jsonb; v_chi text; v_testo text; v_old timestamptz;
        v_menz uuid[] := '{}'; v_tutti boolean := false; v_muto boolean; v_a uuid; v_dati jsonb; v_menzionato boolean;
        v_viso jsonb;
begin
  -- messaggi vecchi importati da WhatsApp: niente avvisi e niente letture, solo l'ordine delle chat
  if coalesce(current_setting('chat.importa', true), '') = '1' then
    update chat_conversazioni set ultimo_il = greatest(ultimo_il, new.creato_il) where id = new.conv_id;
    return null;
  end if;
  update chat_conversazioni set ultimo_il = new.creato_il where id = new.conv_id returning * into v_c;
  if new.autore is not null then
    select letto_fino into v_old from chat_membri where conv_id = new.conv_id and utente_id = new.autore;
    update chat_membri set letto_fino = greatest(letto_fino, new.creato_il), ricevuto_fino = greatest(ricevuto_fino, new.creato_il)
     where conv_id = new.conv_id and utente_id = new.autore;
    if new.tipo <> 'sistema' and v_old is not null and v_old < new.creato_il then
      perform chat_registra_letture(new.conv_id, new.autore, v_old, new.creato_il);
    end if;
  end if;
  if new.tipo = 'sistema' then return null; end if;
  select decrypted_secret into v_chiave from vault.decrypted_secrets where name = 'foss_vapid';
  if v_chiave is null then return null; end if;
  v_chi := coalesce(nome_di(new.autore), 'Qualcuno');
  v_muto := coalesce(new.media->>'silenzioso', '') = 'true';
  if new.tipo = 'testo' and jsonb_typeof(new.media->'menzioni') = 'array' then
    select coalesce(array_agg((x->>'id')::uuid), '{}') into v_menz
      from jsonb_array_elements(new.media->'menzioni') x where coalesce(x->>'id', '') ~ '^[0-9a-f-]{36}$';
  end if;
  if new.tipo = 'testo' then v_tutti := coalesce(new.media->>'tutti', '') = 'true'; end if;
  if new.tipo = 'colpetto' then v_a := (new.media->>'a')::uuid; end if;
  v_testo := chat_anteprima(new);
  -- per un avviso piu' bello: la foto di chi scrive (o del gruppo) e l'anteprima di una foto
  select case when p.foto_url ~ '^https://[A-Za-z0-9.-]+/' and length(p.foto_url) <= 500 then jsonb_build_object('foto', p.foto_url) end
    into v_viso from profili p where p.id = new.autore;
  v_viso := coalesce(v_viso, '{}'::jsonb);
  if not (v_viso ? 'foto') and v_c.tipo = 'gruppo' and coalesce(v_c.foto, '') ~ ('^' || new.conv_id::text || '/[A-Za-z0-9._-]{1,120}$') then
    v_viso := jsonb_build_object('foto_chat', v_c.foto);
  end if;
  if new.tipo = 'foto' and coalesce(new.media->>'gif', '') <> 'true' then
    if coalesce(new.media->>'path', '') ~ ('^' || new.conv_id::text || '/[A-Za-z0-9._-]{1,120}$') then
      v_viso := v_viso || jsonb_build_object('img', new.media->>'path');
    elsif coalesce(new.media->>'url', '') ~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?/[A-Za-z0-9._~/%-]{1,250}$' then
      v_viso := v_viso || jsonb_build_object('img_url', new.media->>'url');
    end if;
  end if;
  for v_r in select m.utente_id, m.bloccata, m.silenziata from chat_membri m
              where m.conv_id = new.conv_id and m.utente_id <> new.autore loop
    -- il colpetto suona solo a chi lo riceve
    if v_a is not null and v_r.utente_id <> v_a then continue; end if;
    v_menzionato := v_r.utente_id = any(v_menz) or v_tutti;
    -- chat silenziata: passa solo chi e' stato menzionato
    if v_r.silenziata and not v_menzionato then continue; end if;
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]'::jsonb)
      into v_iscr from push_iscrizioni where utente_id = v_r.utente_id;
    if jsonb_array_length(v_iscr) = 0 then continue; end if;
    if v_r.bloccata then
      v_dati := jsonb_build_object('chi', 'FOSS.chat', 'testo', 'Nuovo messaggio', 'conv', new.conv_id);
    elsif v_a is not null then
      v_dati := jsonb_build_object('titolo', v_chi, 'chi', v_chi, 'conv', new.conv_id, 'colpetto', true,
                  'testo', case when v_c.tipo = 'gruppo' then 'Ti ha dato un colpetto in «' || coalesce(v_c.nome, 'gruppo') || '» 👋' else 'Ti ha dato un colpetto 👋' end)
                || (v_viso - 'img' - 'img_url');
    else
      v_dati := jsonb_build_object('chi', v_chi, 'testo', v_testo, 'conv', new.conv_id,
                  'gruppo', case when v_c.tipo = 'gruppo' then v_c.nome end, 'menzione', v_menzionato);
      -- chi e' menzionato, toccando l'avviso, arriva proprio a quel messaggio
      if v_menzionato then v_dati := v_dati || jsonb_build_object('msg', new.id); end if;
      v_dati := v_dati || v_viso;
    end if;
    if v_muto then v_dati := v_dati || jsonb_build_object('muto', true); end if;
    perform net.http_post(
      url := 'https://suqpteanvnvvmfujlevi.supabase.co/functions/v1/push',
      body := jsonb_build_object('vapid', v_chiave::jsonb, 'iscrizioni', v_iscr,
                'notifica', jsonb_build_object('id', new.id, 'tipo', 'fosschat', 'progetto_id', null, 'dati', v_dati)),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 10000);
  end loop;
  return null;
end $$;

-- ---------- 6. modificare un messaggio (entro 15 minuti) ----------
create or replace function public.chat_modifica(p_id uuid, p_testo text, p_extra jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v chat_messaggi; v_media jsonb; v_t text := p_testo;
begin
  select * into v from chat_messaggi where id = p_id for update;
  if v.id is null or v.autore is distinct from auth.uid() or v.eliminato or v.tipo = 'sistema' or not chat_membro(v.conv_id) then
    raise exception 'non puoi' using errcode = '42501';
  end if;
  if v.tipo not in ('testo','foto','video','file') then raise exception 'questo messaggio non si può modificare'; end if;
  if clock_timestamp() - v.creato_il > interval '15 minutes' then raise exception 'un messaggio si può modificare solo nei primi 15 minuti'; end if;
  if v.tipo = 'testo' then
    if coalesce(trim(v_t), '') = '' then raise exception 'messaggio vuoto'; end if;
    if length(v_t) > 6000 then raise exception 'messaggio troppo lungo'; end if;
    v_media := coalesce(v.media, '{}'::jsonb) - 'menzioni' - 'tutti' - 'lavori';
    if p_extra is not null and jsonb_typeof(p_extra) = 'object' then
      v_media := v_media || coalesce((select jsonb_object_agg(key, value) from jsonb_each(p_extra) where key in ('menzioni','tutti','lavori')), '{}'::jsonb);
    end if;
    if v_media = '{}'::jsonb then v_media := null; end if;
    if not chat_media_testo_ok(v_media) then raise exception 'dati non validi'; end if;
    update chat_messaggi set testo = v_t, media = v_media, modificato_il = clock_timestamp() where id = p_id returning * into v;
  else
    v_t := left(coalesce(v_t, ''), 1024);
    v_media := case when trim(v_t) = '' then v.media - 'did' else jsonb_set(v.media, '{did}', to_jsonb(v_t)) end;
    update chat_messaggi set media = v_media, modificato_il = clock_timestamp() where id = p_id returning * into v;
  end if;
  return to_jsonb(v);
end $$;

-- eliminare per tutti: anche dai fissati
create or replace function public.chat_elimina(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_m chat_messaggi;
begin
  select * into v_m from chat_messaggi where id = p_id;
  if v_m.id is null or v_m.autore is distinct from auth.uid() or v_m.tipo = 'sistema' then raise exception 'non puoi' using errcode = '42501'; end if;
  update chat_messaggi set eliminato = true, testo = null, media = null, fissato_il = null, fissato_da = null where id = p_id;
  return v_m.media;
end $$;

-- ---------- 7. messaggi fissati ----------
create or replace function public.chat_fissa(p_id uuid, p_si boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v chat_messaggi; v_n int;
begin
  select * into v from chat_messaggi where id = p_id;
  if v.id is null or not chat_membro(v.conv_id) then raise exception 'non puoi' using errcode = '42501'; end if;
  if p_si then
    if v.tipo in ('sistema','colpetto') or v.eliminato then raise exception 'questo messaggio non si può fissare'; end if;
    if v.fissato_il is not null then return; end if;
    select count(*) into v_n from chat_messaggi where conv_id = v.conv_id and fissato_il is not null;
    if v_n >= 10 then raise exception 'puoi fissare al massimo 10 messaggi: togline uno prima'; end if;
    update chat_messaggi set fissato_il = clock_timestamp(), fissato_da = auth.uid() where id = p_id;
    insert into chat_messaggi (conv_id, autore, tipo, testo, media)
      values (v.conv_id, auth.uid(), 'sistema', coalesce(nome_di(auth.uid()), 'Qualcuno') || ' ha fissato un messaggio', jsonb_build_object('fissato', p_id));
  else
    if v.fissato_il is null then return; end if;
    update chat_messaggi set fissato_il = null, fissato_da = null where id = p_id;
  end if;
end $$;

-- ---------- 8. sondaggi ----------
create table if not exists public.chat_voti (
  msg_id uuid not null references public.chat_messaggi(id) on delete cascade,
  conv_id uuid not null references public.chat_conversazioni(id) on delete cascade,
  utente_id uuid not null references auth.users(id) on delete cascade,
  opzione text not null check (opzione ~ '^[a-z0-9]{1,8}$'),
  creato_il timestamptz not null default now(),
  primary key (msg_id, utente_id, opzione)
);
create index if not exists chat_voti_conv on public.chat_voti (conv_id);
create index if not exists chat_voti_utente on public.chat_voti (utente_id);
alter table public.chat_voti enable row level security;
drop policy if exists "chat voti: li vede chi e' nella conversazione" on public.chat_voti;
create policy "chat voti: li vede chi e' nella conversazione" on public.chat_voti for select to authenticated using (chat_membro(conv_id));

create or replace function public.chat_vota(p_msg uuid, p_opzioni text[]) returns void
language plpgsql security definer set search_path = public as $$
declare v chat_messaggi; v_ok text[];
begin
  select * into v from chat_messaggi where id = p_msg;
  if v.id is null or v.tipo <> 'sondaggio' or v.eliminato or not chat_membro(v.conv_id) then raise exception 'non puoi' using errcode = '42501'; end if;
  if coalesce(v.media->>'chiuso', '') = 'true' then raise exception 'il sondaggio è chiuso'; end if;
  select coalesce(array_agg(x->>'id'), '{}') into v_ok from jsonb_array_elements(v.media->'opzioni') x;
  p_opzioni := coalesce(p_opzioni, '{}');
  if exists (select 1 from unnest(p_opzioni) o where not (o = any(v_ok))) then raise exception 'opzione non valida'; end if;
  if coalesce(v.media->>'multi', '') <> 'true' and cardinality(p_opzioni) > 1 then raise exception 'puoi scegliere una sola risposta'; end if;
  delete from chat_voti where msg_id = p_msg and utente_id = auth.uid() and not (opzione = any(p_opzioni));
  insert into chat_voti (msg_id, conv_id, utente_id, opzione)
    select p_msg, v.conv_id, auth.uid(), o from unnest(p_opzioni) o on conflict do nothing;
end $$;

create or replace function public.chat_chiudi_sondaggio(p_msg uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v chat_messaggi;
begin
  select * into v from chat_messaggi where id = p_msg;
  if v.id is null or v.tipo <> 'sondaggio' or v.autore is distinct from auth.uid() or v.eliminato then raise exception 'non puoi' using errcode = '42501'; end if;
  update chat_messaggi set media = media || '{"chiuso":true}'::jsonb where id = p_msg;
end $$;

-- ---------- 9. messaggi programmati ----------
create table if not exists public.chat_programmati (
  id uuid primary key default gen_random_uuid(),
  conv_id uuid not null references public.chat_conversazioni(id) on delete cascade,
  autore uuid not null default auth.uid() references auth.users(id) on delete cascade,
  testo text not null check (char_length(testo) between 1 and 6000),
  media jsonb,
  risponde_a uuid references public.chat_messaggi(id) on delete set null,
  quando timestamptz not null,
  creato_il timestamptz not null default now()
);
create index if not exists chat_programmati_quando on public.chat_programmati (quando);
create index if not exists chat_programmati_autore on public.chat_programmati (autore, conv_id);
create index if not exists chat_programmati_conv on public.chat_programmati (conv_id);
create index if not exists chat_programmati_risponde on public.chat_programmati (risponde_a) where risponde_a is not null;
alter table public.chat_programmati enable row level security;
drop policy if exists "chat programmati: vedo i miei" on public.chat_programmati;
drop policy if exists "chat programmati: li creo nelle mie chat" on public.chat_programmati;
drop policy if exists "chat programmati: cambio i miei" on public.chat_programmati;
drop policy if exists "chat programmati: tolgo i miei" on public.chat_programmati;
create policy "chat programmati: vedo i miei" on public.chat_programmati for select to authenticated using (autore = (select auth.uid()));
create policy "chat programmati: li creo nelle mie chat" on public.chat_programmati for insert to authenticated
  with check (autore = (select auth.uid()) and chat_membro(conv_id) and quando > now() - interval '1 minute'
              and quando < now() + interval '400 days' and chat_media_testo_ok(media));
create policy "chat programmati: cambio i miei" on public.chat_programmati for update to authenticated
  using (autore = (select auth.uid()))
  with check (autore = (select auth.uid()) and chat_membro(conv_id) and quando < now() + interval '400 days' and chat_media_testo_ok(media));
create policy "chat programmati: tolgo i miei" on public.chat_programmati for delete to authenticated using (autore = (select auth.uid()));

-- ---------- 10. promemoria ----------
create table if not exists public.chat_promemoria (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  msg_id uuid not null references public.chat_messaggi(id) on delete cascade,
  conv_id uuid not null references public.chat_conversazioni(id) on delete cascade,
  quando timestamptz not null,
  creato_il timestamptz not null default now(),
  unique (utente_id, msg_id)
);
create index if not exists chat_promemoria_quando on public.chat_promemoria (quando);
create index if not exists chat_promemoria_msg on public.chat_promemoria (msg_id);
create index if not exists chat_promemoria_conv on public.chat_promemoria (conv_id);
alter table public.chat_promemoria enable row level security;
drop policy if exists "chat promemoria: vedo i miei" on public.chat_promemoria;
drop policy if exists "chat promemoria: li metto io" on public.chat_promemoria;
drop policy if exists "chat promemoria: cambio i miei" on public.chat_promemoria;
drop policy if exists "chat promemoria: tolgo i miei" on public.chat_promemoria;
create policy "chat promemoria: vedo i miei" on public.chat_promemoria for select to authenticated using (utente_id = (select auth.uid()));
create policy "chat promemoria: li metto io" on public.chat_promemoria for insert to authenticated
  with check (utente_id = (select auth.uid()) and chat_membro(conv_id) and quando > now() - interval '1 minute' and quando < now() + interval '400 days'
              and exists (select 1 from public.chat_messaggi m where m.id = msg_id and m.conv_id = chat_promemoria.conv_id));
create policy "chat promemoria: cambio i miei" on public.chat_promemoria for update to authenticated
  using (utente_id = (select auth.uid()))
  with check (utente_id = (select auth.uid()) and chat_membro(conv_id) and quando < now() + interval '400 days'
              and exists (select 1 from public.chat_messaggi m where m.id = msg_id and m.conv_id = chat_promemoria.conv_id));
create policy "chat promemoria: tolgo i miei" on public.chat_promemoria for delete to authenticated using (utente_id = (select auth.uid()));

-- ---------- 11. messaggi importanti (la stella) ----------
create table if not exists public.chat_importanti (
  utente_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  msg_id uuid not null references public.chat_messaggi(id) on delete cascade,
  conv_id uuid not null references public.chat_conversazioni(id) on delete cascade,
  creato_il timestamptz not null default now(),
  primary key (utente_id, msg_id)
);
create index if not exists chat_importanti_msg on public.chat_importanti (msg_id);
create index if not exists chat_importanti_conv on public.chat_importanti (conv_id);
alter table public.chat_importanti enable row level security;
drop policy if exists "chat importanti: vedo i miei" on public.chat_importanti;
drop policy if exists "chat importanti: li metto io" on public.chat_importanti;
drop policy if exists "chat importanti: tolgo i miei" on public.chat_importanti;
create policy "chat importanti: vedo i miei" on public.chat_importanti for select to authenticated using (utente_id = (select auth.uid()));
create policy "chat importanti: li metto io" on public.chat_importanti for insert to authenticated
  with check (utente_id = (select auth.uid()) and chat_membro(conv_id)
              and exists (select 1 from public.chat_messaggi m where m.id = msg_id and m.conv_id = chat_importanti.conv_id));
create policy "chat importanti: tolgo i miei" on public.chat_importanti for delete to authenticated using (utente_id = (select auth.uid()));

-- ---------- 12. l'orologio: programmati e promemoria ----------
create or replace function public.chat_orologio() returns void
language plpgsql security definer set search_path = public as $$
declare r record; v_chiave text; v_iscr jsonb; v_m chat_messaggi; v_chi text; v_bl boolean; v_testo text;
begin
  for r in select * from chat_programmati where quando <= now() order by quando limit 200 for update skip locked loop
    delete from chat_programmati where id = r.id;
    if exists (select 1 from chat_membri where conv_id = r.conv_id and utente_id = r.autore) then
      begin
        perform set_config('chat.interno', '1', true);
        insert into chat_messaggi (conv_id, autore, tipo, testo, media, risponde_a)
          values (r.conv_id, r.autore, 'testo', r.testo, r.media, r.risponde_a);
        perform set_config('chat.interno', '', true);
      exception when others then
        perform set_config('chat.interno', '', true);
        raise warning 'messaggio programmato % non inviato: %', r.id, sqlerrm;
      end;
    end if;
  end loop;

  select decrypted_secret into v_chiave from vault.decrypted_secrets where name = 'foss_vapid';
  for r in select * from chat_promemoria where quando <= now() order by quando limit 200 for update skip locked loop
    delete from chat_promemoria where id = r.id;
    continue when v_chiave is null;
    select * into v_m from chat_messaggi where id = r.msg_id;
    v_bl := null;
    select bloccata into v_bl from chat_membri where conv_id = r.conv_id and utente_id = r.utente_id;
    continue when v_m.id is null or v_m.eliminato or v_bl is null;
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]'::jsonb)
      into v_iscr from push_iscrizioni where utente_id = r.utente_id;
    continue when jsonb_array_length(v_iscr) = 0;
    v_chi := case when v_m.autore = r.utente_id then 'Tu' else coalesce(nome_di(v_m.autore), 'Qualcuno') end;
    v_testo := case when v_bl then 'Hai un promemoria in una chat bloccata' else v_chi || ': ' || coalesce(chat_anteprima(v_m), '') end;
    perform net.http_post(
      url := 'https://suqpteanvnvvmfujlevi.supabase.co/functions/v1/push',
      body := jsonb_build_object('vapid', v_chiave::jsonb, 'iscrizioni', v_iscr,
                'notifica', jsonb_build_object('id', r.id, 'tipo', 'fosschat', 'progetto_id', null,
                  'dati', jsonb_build_object('titolo', '⏰ Promemoria', 'chi', '⏰ Promemoria', 'testo', v_testo, 'conv', r.conv_id,
                                             'msg', case when v_bl then null else r.msg_id end, 'promemoria', true))),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 10000);
  end loop;
end $$;
revoke execute on function public.chat_orologio() from public, anon, authenticated;

-- ---------- 13. elenco delle chat: anche le menzioni da leggere ----------
create or replace function public.chat_elenco() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x->>'fissata')::boolean desc, x->>'ultimo_il' desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', c.id, 'tipo', c.tipo, 'nome', c.nome, 'descrizione', c.descrizione, 'foto', c.foto,
      'creata_da', c.creata_da, 'creata_il', c.creata_il, 'ultimo_il', c.ultimo_il,
      'silenziata', m.silenziata, 'archiviata', m.archiviata, 'fissata', m.fissata, 'svuotata_il', m.svuotata_il,
      'bloccata', m.bloccata, 'letto_fino', m.letto_fino, 'ruolo', m.ruolo,
      'membri', (select jsonb_agg(jsonb_build_object('id', mm.utente_id, 'ruolo', mm.ruolo, 'letto', mm.letto_fino, 'ricevuto', mm.ricevuto_fino))
                   from chat_membri mm where mm.conv_id = c.id),
      'ultimo', (select jsonb_build_object('id', u.id, 'autore', u.autore, 'tipo', u.tipo,
                                           'testo', case when m.bloccata then null else left(u.testo, 140) end,
                                           'creato_il', u.creato_il, 'eliminato', u.eliminato, 'modificato_il', u.modificato_il,
                                           'media', case when m.bloccata then null else u.media end)
                   from chat_messaggi u where u.conv_id = c.id and u.creato_il > coalesce(m.svuotata_il, '-infinity')
                  order by u.creato_il desc limit 1),
      'non_lette', (select count(*) from chat_messaggi u where u.conv_id = c.id and u.creato_il > m.letto_fino
                      and u.autore is distinct from auth.uid() and u.tipo <> 'sistema'),
      'menzioni', (select count(*) from chat_messaggi u where u.conv_id = c.id and u.creato_il > m.letto_fino
                      and u.autore is distinct from auth.uid() and u.tipo = 'testo' and not u.eliminato
                      and (u.media->'menzioni' @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text)) or u.media->>'tutti' = 'true'))
    ) x
    from chat_membri m join chat_conversazioni c on c.id = m.conv_id
    where m.utente_id = auth.uid()
  ) s;
$$;

create or replace function public.chat_non_lette() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from chat_membri m
   where m.utente_id = auth.uid()
     and exists (select 1 from chat_messaggi u where u.conv_id = m.conv_id and u.creato_il > m.letto_fino
                   and u.autore is distinct from auth.uid() and u.tipo <> 'sistema'
                   and (not m.silenziata
                        or (u.tipo = 'testo' and (u.media->'menzioni' @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text)) or u.media->>'tutti' = 'true'))));
$$;

-- ---------- 14. i lavori di FOSS dentro la chat ----------
-- le schede: solo i lavori che chi chiede puo' vedere (le regole di FOSS valgono anche qui)
create or replace function public.chat_lavori(p_ids text[], p_copertine boolean default true) returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'org', p.org_id, 'spazio', p.spazio_id,
    'nome', coalesce(p.dati->>'nome', ''),
    'cliente', case when p.dati->>'personale' = 'true' then '' else coalesce(p.dati->>'cliente', '') end,
    'col', p.dati->>'col', 'icona', p.dati->>'icona', 'tipo', coalesce(nullif(p.dati->>'tipo', ''), 'video'),
    'fase', coalesce(intero_o_null(p.dati->>'fase'), 0),
    'fasi', case when jsonb_typeof(p.dati->'fasi') = 'array'
                 then (select jsonb_agg(f->>'nome' order by i) from jsonb_array_elements(p.dati->'fasi') with ordinality t(f, i)) end,
    'completato', coalesce(p.dati->>'completato', '') = 'true',
    'consegna', nullif(p.dati->>'consegna', ''),
    'indirizzo', nullif(p.dati->>'indirizzo', ''),
    'team', case when jsonb_typeof(p.dati->'team') = 'array' then p.dati->'team' else '[]'::jsonb end,
    'protetto', coalesce(p.dati->'lock'->>'on', '') = 'true',
    'copertina', case when p_copertine and coalesce(p.dati->'lock'->>'on', '') <> 'true' and p.dati->>'copertina' like 'data:image/%'
                      and length(p.dati->>'copertina') < 600000 then p.dati->>'copertina' end,
    'posizione', case when p_copertine then p.dati->'copRit'->'bacheca' end,
    'eventi', (select jsonb_agg(jsonb_build_object('d', e.dati->>'d', 't', left(e.dati->>'t', 80), 'ora', e.dati->>'ora', 'c', e.dati->'c') order by e.dati->>'d', e.dati->>'ora')
                 from elementi e where e.org_id = p.org_id and e.progetto_id = p.id and e.tipo = 'evento'
                  and coalesce(e.dati->>'d', '') ~ '^\d{4}-\d{2}-\d{2}$'),
    'voci', (select jsonb_build_object('fatte', count(*) filter (where e.dati->>'done' = 'true'), 'tot', count(*))
               from elementi e where e.org_id = p.org_id and e.progetto_id = p.id and e.tipo = 'voce'),
    'aggiornato', p.aggiornato_il,
    'da_chat', p.dati->'daChat'
  )), '[]'::jsonb)
  from progetti p where p.id = any(coalesce(p_ids, '{}')) and coalesce(cardinality(p_ids), 0) <= 40;
$$;

-- l'elenco per scegliere un lavoro (# nella chat)
create or replace function public.chat_lavori_elenco() returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x->>'completato')::boolean, x->>'aggiornato' desc), '[]'::jsonb) from (
    select jsonb_build_object('id', p.id, 'org', p.org_id, 'nome', coalesce(p.dati->>'nome', ''),
      'cliente', case when p.dati->>'personale' = 'true' then '' else coalesce(p.dati->>'cliente', '') end,
      'col', p.dati->>'col', 'icona', p.dati->>'icona', 'tipo', coalesce(nullif(p.dati->>'tipo', ''), 'video'),
      'completato', coalesce(p.dati->>'completato', '') = 'true', 'aggiornato', p.aggiornato_il,
      'prossimo', (select min(e.dati->>'d') from elementi e where e.org_id = p.org_id and e.progetto_id = p.id and e.tipo = 'evento'
                     and coalesce(e.dati->>'d', '') ~ '^\d{4}-\d{2}-\d{2}$' and e.dati->>'d' >= to_char(current_date, 'YYYY-MM-DD'))) x
    from progetti p order by p.aggiornato_il desc limit 400
  ) s;
$$;

-- dove posso creare un lavoro: gli archivi dove ho il permesso e i loro spazi
create or replace function public.chat_dove_creare() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'archivi', coalesce((select jsonb_agg(jsonb_build_object(
        'org', o.id, 'nome', o.nome, 'titolare', m.ruolo = 'titolare',
        'squadra', e_titolare(o.id) or puo(o.id, 'visibilita'),
        'membri', (select coalesce(jsonb_agg(mm.utente_id), '[]'::jsonb) from membri_org mm where mm.org_id = o.id),
        'spazi', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'nome', coalesce(nullif(s.dati->>'nome', ''), 'Spazio'),
                                                               'tipo', coalesce(nullif(s.dati->>'tipo', ''), 'video'), 'col', s.dati->>'col') order by s.ordine), '[]'::jsonb)
                    from spazi s where s.org_id = o.id and vede_spazio(s.org_id, s.id, s.dati)))
        order by (m.ruolo = 'titolare') desc, o.nome)
      from membri_org m join organizzazioni o on o.id = m.org_id
      where m.utente_id = auth.uid() and puo(o.id, 'crea_lavori')), '[]'::jsonb),
    'ultimo', (select stato->>'spazioId' from spazio_lavoro where utente_id = auth.uid()),
    'clienti', (select coalesce(jsonb_agg(distinct p.dati->>'cliente'), '[]'::jsonb) from progetti p
                 where (e_titolare(p.org_id) or lavora_al_progetto(p.org_id, p.id))
                   and coalesce(p.dati->>'cliente', '') <> '' and coalesce(p.dati->>'personale', '') <> 'true'));
$$;

-- creare la base di un lavoro dalla chat: poi su FOSS si completano i dettagli
create or replace function public.chat_crea_lavoro(
  p_org uuid, p_spazio text, p_nome text, p_cliente text default '',
  p_giorno date default null, p_ora text default null, p_giorno_t text default null,
  p_consegna date default null, p_consegna_t text default null,
  p_luogo text default '', p_nota text default '', p_team uuid[] default '{}', p_conv uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_io uuid := auth.uid(); v_id text; v_ms bigint; v_sp spazi; v_tipo text; v_nome text; v_cli text;
        v_team uuid[]; v_u uuid; v_n int; v_dati jsonb; v_nota text; v_conv chat_conversazioni; v_msg chat_messaggi;
        v_pal text[] := array['#FFAD01','#7FC8F8','#9AE6B4','#F6A8C0','#C3B1F0','#FFD79A','#8FD3C4','#E2723B'];
        v_ora text := nullif(trim(coalesce(p_ora, '')), '');
begin
  if v_io is null then raise exception 'serve l''accesso' using errcode = '42501'; end if;
  if p_org is null or not puo(p_org, 'crea_lavori') then
    raise exception 'non hai il permesso di creare lavori in questo archivio' using errcode = '42501';
  end if;
  select * into v_sp from spazi where org_id = p_org and id = p_spazio;
  if v_sp.id is null or not vede_spazio(v_sp.org_id, v_sp.id, v_sp.dati) then raise exception 'spazio non trovato'; end if;
  if p_conv is not null then
    select * into v_conv from chat_conversazioni where id = p_conv;
    if v_conv.id is null or not chat_membro(p_conv) then raise exception 'non puoi' using errcode = '42501'; end if;
  end if;
  v_nome := left(trim(coalesce(p_nome, '')), 120);
  v_cli := left(trim(coalesce(p_cliente, '')), 120);
  if v_nome = '' and v_cli = '' then raise exception 'scrivi almeno il titolo o il cliente'; end if;
  if v_nome = '' then v_nome := left('Lavoro ' || v_cli, 120); end if;
  if v_ora is not null and v_ora !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then v_ora := null; end if;
  v_tipo := coalesce(nullif(v_sp.dati->>'tipo', ''), 'video');

  v_ms := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  loop
    v_id := 'p' || v_ms;
    exit when not exists (select 1 from progetti where org_id = p_org and id = v_id);
    v_ms := v_ms + 1;
  end loop;
  select count(*) into v_n from progetti where org_id = p_org;

  -- chi lo vede: io, e chi scelgo se posso decidere la squadra
  v_team := array[v_io];
  if e_titolare(p_org) or puo(p_org, 'visibilita') then
    foreach v_u in array coalesce(p_team, '{}') loop
      if not (v_u = any(v_team)) and exists (select 1 from membri_org where org_id = p_org and utente_id = v_u) then
        v_team := v_team || v_u;
      end if;
    end loop;
  end if;

  v_nota := replace(chat_esc(left(trim(coalesce(p_nota, '')), 4000)), E'\n', '<br>');
  v_dati := jsonb_build_object(
    '_formato', 2, 'nome', v_nome, 'cliente', v_cli, 'tipo', v_tipo, 'prio', 'media',
    'col', v_pal[(v_n % 8) + 1], 'fase', 0, 'avanz', 0, 'team', to_jsonb(v_team), 'faseAss', '{}'::jsonb,
    'indirizzo', left(trim(coalesce(p_luogo, '')), 300), 'nota', v_nota, 'allegati', '[]'::jsonb, 'tags', '[]'::jsonb,
    'consegna', case when p_consegna is not null then to_char(p_consegna, 'DD/MM/YYYY') else '' end,
    'fattura', 'Da emettere', 'revisione', false, 'completato', false,
    'lock', jsonb_build_object('on', false, 'pw', ''), 'coord', null, 'ord', -1,
    'daChat', jsonb_build_object('conv', p_conv, 'da', v_io, 'il', now(), 'completo', false));
  insert into progetti (org_id, id, spazio_id, dati) values (p_org, v_id, v_sp.id, v_dati);
  insert into membri_progetto (org_id, progetto_id, utente_id)
    select p_org, v_id, u from unnest(v_team) u on conflict do nothing;

  -- le date nel calendario del lavoro, e la prima riga del registro
  if p_giorno is not null then
    insert into elementi (org_id, progetto_id, id, tipo, genitore, ordine, dati)
    values (p_org, v_id, 'e' || v_ms || substr(md5(random()::text), 1, 5), 'evento', null, 0,
            jsonb_strip_nulls(jsonb_build_object('d', to_char(p_giorno, 'YYYY-MM-DD'),
              't', left(coalesce(nullif(trim(coalesce(p_giorno_t, '')), ''), 'Giorno del lavoro'), 60), 'ora', v_ora)));
  end if;
  if p_consegna is not null then
    insert into elementi (org_id, progetto_id, id, tipo, genitore, ordine, dati)
    values (p_org, v_id, 'e' || v_ms || substr(md5(random()::text), 1, 5), 'evento', null, 1,
            jsonb_build_object('d', to_char(p_consegna, 'YYYY-MM-DD'),
              't', left(coalesce(nullif(trim(coalesce(p_consegna_t, '')), ''), 'Consegna') || ' ' || v_nome, 160), 'c', 1));
  end if;
  insert into elementi (org_id, progetto_id, id, tipo, genitore, ordine, dati)
  values (p_org, v_id, 'l' || v_ms || substr(md5(random()::text), 1, 5), 'log', null, -v_ms::double precision,
          jsonb_build_object('tx', 'Progetto creato dalla chat' || case when v_conv.id is not null
                                    then ' <b>' || chat_esc(case when v_conv.tipo = 'gruppo' then coalesce(v_conv.nome, 'gruppo') else 'privata' end) || '</b>' else '' end,
                             'ts', 'oggi ' || to_char(now() at time zone 'Europe/Rome', 'HH24:MI'), 'acc', true, 'u', v_io, 't', v_ms));

  -- e la scheda del lavoro nella chat
  if v_conv.id is not null then
    insert into chat_messaggi (conv_id, tipo, media)
    values (p_conv, 'lavoro', jsonb_build_object('lavoro', jsonb_build_object('id', v_id, 'org', p_org, 'n', left(v_nome, 120)), 'nuovo', true))
    returning * into v_msg;
  end if;
  return jsonb_build_object('id', v_id, 'org', p_org, 'nome', v_nome, 'msg', case when v_msg.id is not null then to_jsonb(v_msg) end);
end $$;

-- FOSS completa un lavoro nato in chat (fasi e task di partenza): lo fa il primo che lo apre
create or replace function public.foss_completa_da_chat(p_org uuid, p_id text) returns boolean
language plpgsql security invoker set search_path = public as $$
declare n int;
begin
  update progetti set dati = jsonb_set(dati, '{daChat,completo}', 'true'::jsonb)
   where org_id = p_org and id = p_id and jsonb_typeof(dati->'daChat') = 'object'
     and coalesce(dati->'daChat'->>'completo', '') <> 'true';
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- ---------- 15. tempo reale ----------
do $$ begin
  begin alter publication supabase_realtime add table public.chat_voti; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.chat_programmati; exception when duplicate_object then null; end;
end $$;

-- ---------- 16. l'orologio gira ogni 20 secondi; ogni notte pulisce il registro dei suoi giri ----------
do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname in ('fosschat-orologio', 'fosschat-pulizia-orologio');
end $$;
select cron.schedule('fosschat-orologio', '20 seconds', 'select public.chat_orologio()');
select cron.schedule('fosschat-pulizia-orologio', '10 2 * * *',
  $c$delete from cron.job_run_details where end_time < now() - interval '2 days'
       and jobid in (select jobid from cron.job where jobname = 'fosschat-orologio')$c$);


-- ---------- importare una chat esportata da WhatsApp ----------
-- p_msgs: [{k chiave, n nome su WhatsApp, a utente FOSS o null, t tipo, x testo, m media, il data}]
create index if not exists chat_messaggi_importati on public.chat_messaggi (conv_id, ((media->'importato'->>'k'))) where media ? 'importato';

create or replace function public.chat_importa(p_conv uuid, p_lotto uuid, p_msgs jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare v_io uuid := auth.uid(); v_x jsonb; v_n int := 0; v_a uuid; v_t text; v_il timestamptz; v_k text; v_nome text; v_media jsonb;
begin
  if v_io is null or not chat_membro(p_conv) then raise exception 'non puoi' using errcode = '42501'; end if;
  if not e_admin_foss() then raise exception 'solo l''amministratore di FOSS può importare una chat' using errcode = '42501'; end if;
  if p_lotto is null or jsonb_typeof(p_msgs) is distinct from 'array' or jsonb_array_length(p_msgs) > 500 then raise exception 'dati non validi'; end if;
  perform set_config('chat.importa', '1', true);
  for v_x in select * from jsonb_array_elements(p_msgs) loop
    if jsonb_typeof(v_x) <> 'object' then raise exception 'dati non validi'; end if;
    v_k := v_x->>'k'; v_nome := trim(coalesce(v_x->>'n', '')); v_t := coalesce(v_x->>'t', '');
    if coalesce(v_k, '') !~ '^[A-Za-z0-9_-]{8,64}$' or length(v_nome) not between 1 and 80
       or v_t not in ('testo','foto','video','vocale','file') then
      raise exception 'dati non validi';
    end if;
    begin v_il := (v_x->>'il')::timestamptz; exception when others then raise exception 'data non valida'; end;
    if v_il is null or v_il > clock_timestamp() or v_il < '2009-01-01'::timestamptz then raise exception 'data non valida'; end if;
    v_a := null;
    if jsonb_typeof(v_x->'a') = 'string' then
      if (v_x->>'a') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'dati non validi'; end if;
      v_a := (v_x->>'a')::uuid;
      if not exists (select 1 from chat_membri where conv_id = p_conv and utente_id = v_a) then
        raise exception 'si può collegare solo a chi è in questa chat';
      end if;
    end if;
    -- importata due volte: i messaggi gia' presenti non si doppiano
    if exists (select 1 from chat_messaggi where conv_id = p_conv and media ? 'importato' and media->'importato'->>'k' = v_k) then continue; end if;
    v_media := (case when jsonb_typeof(v_x->'m') = 'object' then (v_x->'m') - 'importato' else '{}'::jsonb end)
               || jsonb_build_object('importato', jsonb_build_object('n', v_nome, 'k', v_k, 'da', v_io, 'l', p_lotto));
    insert into chat_messaggi (conv_id, autore, tipo, testo, media, creato_il)
      values (p_conv, v_a, v_t, nullif(v_x->>'x', ''), v_media, v_il);
    v_n := v_n + 1;
  end loop;
  perform set_config('chat.importa', '', true);
  return v_n;
end $$;
revoke execute on function public.chat_importa(uuid, uuid, jsonb) from public, anon;
grant execute on function public.chat_importa(uuid, uuid, jsonb) to authenticated;

-- annullare un'importazione appena fatta (solo chi l'ha fatta)
create or replace function public.chat_importa_annulla(p_conv uuid, p_lotto uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if auth.uid() is null or not chat_membro(p_conv) then raise exception 'non puoi' using errcode = '42501'; end if;
  delete from chat_messaggi where conv_id = p_conv and media ? 'importato'
     and media->'importato'->>'l' = p_lotto::text and media->'importato'->>'da' = auth.uid()::text;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke execute on function public.chat_importa_annulla(uuid, uuid) from public, anon;
grant execute on function public.chat_importa_annulla(uuid, uuid) to authenticated;
