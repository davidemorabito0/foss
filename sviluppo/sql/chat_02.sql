-- FOSS.chat: funzioni

-- persone con cui posso chattare: chi sta in almeno uno dei miei team
create or replace function public.chat_contatti()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'nome', trim(coalesce(p.nome,'') || ' ' || coalesce(p.cognome,'')),
           'nick', coalesce(p.nickname,''), 'foto', p.foto_url, 'ruolo', coalesce(p.ruolo,''),
           'visto', (select visto_il from chat_presenza v where v.utente_id = p.id))
         order by lower(coalesce(nullif(trim(p.nickname),''), p.nome, ''))), '[]'::jsonb)
    from profili p
   where p.id <> auth.uid()
     and exists (select 1 from membri_org a join membri_org b on b.org_id = a.org_id
                  where a.utente_id = auth.uid() and b.utente_id = p.id);
$$;

-- profili di chi e' nelle mie conversazioni (anche chi non e' piu' nel team)
create or replace function public.chat_persone(p_ids uuid[])
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'nome', trim(coalesce(p.nome,'') || ' ' || coalesce(p.cognome,'')),
           'nick', coalesce(p.nickname,''), 'foto', p.foto_url, 'ruolo', coalesce(p.ruolo,''),
           'visto', (select visto_il from chat_presenza v where v.utente_id = p.id))), '[]'::jsonb)
    from profili p
   where p.id = any(p_ids)
     and (p.id = auth.uid() or condividiamo_org(p.id) or exists (
           select 1 from chat_membri a join chat_membri b on b.conv_id = a.conv_id
            where a.utente_id = auth.uid() and b.utente_id = p.id));
$$;

-- apre (o ritrova) la chat privata con una persona del team
create or replace function public.chat_apri_privata(p_altro uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_io uuid := auth.uid(); v_k text; v_id uuid;
begin
  if v_io is null then raise exception 'serve l''accesso' using errcode = '42501'; end if;
  if p_altro is null or p_altro = v_io then raise exception 'persona non valida'; end if;
  v_k := least(v_io::text, p_altro::text) || ':' || greatest(v_io::text, p_altro::text);
  select id into v_id from chat_conversazioni where coppia = v_k;
  if v_id is not null then
    -- se ne ero uscito o l'avevo cancellata, ci rientro
    insert into chat_membri (conv_id, utente_id, ruolo) values (v_id, v_io, 'admin') on conflict do nothing;
    return v_id;
  end if;
  if not condividiamo_org(p_altro) then raise exception 'puoi scrivere solo a chi lavora con te' using errcode = '42501'; end if;
  insert into chat_conversazioni (tipo, coppia, creata_da) values ('privata', v_k, v_io) returning id into v_id;
  insert into chat_membri (conv_id, utente_id, ruolo) values (v_id, v_io, 'admin'), (v_id, p_altro, 'admin');
  return v_id;
end $$;

-- messaggio di servizio («Davide ha aggiunto Marco»)
create or replace function public.chat_sistema(p_conv uuid, p_testo text)
returns void language sql security definer set search_path = public as $$
  insert into chat_messaggi (conv_id, autore, tipo, testo) values (p_conv, auth.uid(), 'sistema', left(p_testo, 300));
$$;
revoke execute on function public.chat_sistema(uuid, text) from public, anon, authenticated;

create or replace function public.chat_crea_gruppo(p_nome text, p_membri uuid[], p_foto text default null, p_descrizione text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_io uuid := auth.uid(); v_id uuid; v_u uuid; v_nome text := left(trim(coalesce(p_nome,'')), 80);
begin
  if v_io is null then raise exception 'serve l''accesso' using errcode = '42501'; end if;
  if v_nome = '' then raise exception 'serve un nome per il gruppo'; end if;
  if coalesce(array_length(p_membri, 1), 0) > 256 then raise exception 'troppe persone'; end if;
  insert into chat_conversazioni (tipo, nome, descrizione, creata_da)
    values ('gruppo', v_nome, left(coalesce(p_descrizione,''), 500), v_io) returning id into v_id;
  insert into chat_membri (conv_id, utente_id, ruolo) values (v_id, v_io, 'admin');
  foreach v_u in array coalesce(p_membri, '{}') loop
    if v_u <> v_io and condividiamo_org(v_u) then
      insert into chat_membri (conv_id, utente_id) values (v_id, v_u) on conflict do nothing;
    end if;
  end loop;
  if p_foto is not null and p_foto ~ '^[A-Za-z0-9._-]{1,120}$' then
    update chat_conversazioni set foto = v_id::text || '/' || p_foto where id = v_id;
  end if;
  perform chat_sistema(v_id, coalesce(nome_di(v_io), 'Qualcuno') || ' ha creato il gruppo «' || v_nome || '»');
  return v_id;
end $$;

create or replace function public.chat_modifica_gruppo(p_conv uuid, p_nome text default null, p_descrizione text default null, p_foto text default null, p_togli_foto boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_c chat_conversazioni; v_chi text := coalesce(nome_di(auth.uid()), 'Qualcuno');
begin
  select * into v_c from chat_conversazioni where id = p_conv;
  if v_c.id is null or v_c.tipo <> 'gruppo' or not chat_membro(p_conv) then raise exception 'non puoi' using errcode = '42501'; end if;
  if p_nome is not null and left(trim(p_nome), 80) <> '' and left(trim(p_nome), 80) is distinct from v_c.nome then
    update chat_conversazioni set nome = left(trim(p_nome), 80) where id = p_conv;
    perform chat_sistema(p_conv, v_chi || ' ha cambiato il nome del gruppo in «' || left(trim(p_nome), 80) || '»');
  end if;
  if p_descrizione is not null and p_descrizione is distinct from v_c.descrizione then
    update chat_conversazioni set descrizione = left(p_descrizione, 500) where id = p_conv;
    perform chat_sistema(p_conv, v_chi || ' ha cambiato la descrizione del gruppo');
  end if;
  if p_togli_foto then
    update chat_conversazioni set foto = null where id = p_conv;
    perform chat_sistema(p_conv, v_chi || ' ha tolto l''immagine del gruppo');
  elsif p_foto is not null and p_foto ~ '^[A-Za-z0-9._-]{1,120}$' then
    update chat_conversazioni set foto = p_conv::text || '/' || p_foto where id = p_conv;
    perform chat_sistema(p_conv, v_chi || ' ha cambiato l''immagine del gruppo');
  end if;
end $$;

create or replace function public.chat_aggiungi(p_conv uuid, p_utenti uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare v_u uuid; v_n int := 0; v_tipo text;
begin
  select tipo into v_tipo from chat_conversazioni where id = p_conv;
  if v_tipo is distinct from 'gruppo' or not chat_admin(p_conv) then raise exception 'solo gli amministratori del gruppo' using errcode = '42501'; end if;
  foreach v_u in array coalesce(p_utenti, '{}') loop
    if condividiamo_org(v_u) and not exists (select 1 from chat_membri where conv_id = p_conv and utente_id = v_u) then
      insert into chat_membri (conv_id, utente_id) values (p_conv, v_u);
      perform chat_sistema(p_conv, coalesce(nome_di(auth.uid()), 'Qualcuno') || ' ha aggiunto ' || coalesce(nome_di(v_u), 'una persona'));
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $$;

create or replace function public.chat_togli(p_conv uuid, p_utente uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_tipo text;
begin
  select tipo into v_tipo from chat_conversazioni where id = p_conv;
  if v_tipo is distinct from 'gruppo' then raise exception 'non e'' un gruppo'; end if;
  if p_utente = auth.uid() then
    if not chat_membro(p_conv) then return; end if;
    perform chat_sistema(p_conv, coalesce(nome_di(auth.uid()), 'Qualcuno') || ' è uscito dal gruppo');
    delete from chat_membri where conv_id = p_conv and utente_id = auth.uid();
    -- se non resta nessun amministratore, lo diventa chi c'e' da piu' tempo
    if not exists (select 1 from chat_membri where conv_id = p_conv and ruolo = 'admin') then
      update chat_membri set ruolo = 'admin'
       where conv_id = p_conv and utente_id = (select utente_id from chat_membri where conv_id = p_conv order by aggiunto_il limit 1);
    end if;
    return;
  end if;
  if not chat_admin(p_conv) then raise exception 'solo gli amministratori del gruppo' using errcode = '42501'; end if;
  if not exists (select 1 from chat_membri where conv_id = p_conv and utente_id = p_utente) then return; end if;
  perform chat_sistema(p_conv, coalesce(nome_di(auth.uid()), 'Qualcuno') || ' ha rimosso ' || coalesce(nome_di(p_utente), 'una persona'));
  delete from chat_membri where conv_id = p_conv and utente_id = p_utente;
end $$;

create or replace function public.chat_admin_si(p_conv uuid, p_utente uuid, p_si boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not chat_admin(p_conv) then raise exception 'solo gli amministratori del gruppo' using errcode = '42501'; end if;
  update chat_membri set ruolo = case when p_si then 'admin' else 'membro' end where conv_id = p_conv and utente_id = p_utente;
end $$;

-- elimina per tutti un mio messaggio
create or replace function public.chat_elimina(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_m chat_messaggi;
begin
  select * into v_m from chat_messaggi where id = p_id;
  if v_m.id is null or v_m.autore is distinct from auth.uid() or v_m.tipo = 'sistema' then raise exception 'non puoi' using errcode = '42501'; end if;
  update chat_messaggi set eliminato = true, testo = null, media = null where id = p_id;
  return v_m.media;
end $$;

-- ho letto la conversazione
create or replace function public.chat_letto(p_conv uuid)
returns void language sql security definer set search_path = public as $$
  update chat_membri set letto_fino = now(), ricevuto_fino = now()
   where conv_id = p_conv and utente_id = auth.uid();
$$;

-- sono online: i messaggi mi arrivano (doppia spunta grigia)
create or replace function public.chat_ping()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into chat_presenza (utente_id, visto_il) values (auth.uid(), now())
    on conflict (utente_id) do update set visto_il = now();
  update chat_membri set ricevuto_fino = now() where utente_id = auth.uid();
end $$;

-- l'elenco delle chat con ultimo messaggio e non letti
create or replace function public.chat_elenco()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x->>'fissata')::boolean desc, x->>'ultimo_il' desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', c.id, 'tipo', c.tipo, 'nome', c.nome, 'descrizione', c.descrizione, 'foto', c.foto,
      'creata_da', c.creata_da, 'creata_il', c.creata_il, 'ultimo_il', c.ultimo_il,
      'silenziata', m.silenziata, 'archiviata', m.archiviata, 'fissata', m.fissata, 'svuotata_il', m.svuotata_il,
      'letto_fino', m.letto_fino, 'ruolo', m.ruolo,
      'membri', (select jsonb_agg(jsonb_build_object('id', mm.utente_id, 'ruolo', mm.ruolo, 'letto', mm.letto_fino, 'ricevuto', mm.ricevuto_fino))
                   from chat_membri mm where mm.conv_id = c.id),
      'ultimo', (select jsonb_build_object('id', u.id, 'autore', u.autore, 'tipo', u.tipo, 'testo', left(u.testo, 140),
                                           'creato_il', u.creato_il, 'eliminato', u.eliminato, 'media', u.media)
                   from chat_messaggi u where u.conv_id = c.id and u.creato_il > coalesce(m.svuotata_il, '-infinity')
                  order by u.creato_il desc limit 1),
      'non_lette', (select count(*) from chat_messaggi u where u.conv_id = c.id and u.creato_il > m.letto_fino
                      and u.autore is distinct from auth.uid() and u.tipo <> 'sistema')
    ) x
    from chat_membri m join chat_conversazioni c on c.id = m.conv_id
    where m.utente_id = auth.uid()
  ) s;
$$;

-- quante chat hanno messaggi da leggere (il pallino sul tasto in FOSS)
create or replace function public.chat_non_lette()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from chat_membri m
   where m.utente_id = auth.uid() and not m.silenziata
     and exists (select 1 from chat_messaggi u where u.conv_id = m.conv_id and u.creato_il > m.letto_fino
                   and u.autore is distinct from auth.uid() and u.tipo <> 'sistema');
$$;

-- ---------- un messaggio nuovo ----------
create or replace function public.chat_prima_del_messaggio()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_p text;
begin
  new.creato_il := now();
  new.eliminato := false;
  if new.tipo <> 'sistema' then
    new.autore := auth.uid();
    if new.tipo = 'testo' and coalesce(trim(new.testo), '') = '' then raise exception 'messaggio vuoto'; end if;
    if new.tipo <> 'testo' then
      if new.media is null or jsonb_typeof(new.media) <> 'object' then raise exception 'manca il file'; end if;
      v_p := new.media->>'path';
      if v_p is not null and not (
           v_p ~ ('^' || new.conv_id::text || '/[A-Za-z0-9._-]{1,120}$')
        or (new.tipo = 'sticker' and v_p ~ '^sticker/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$')
        or (new.tipo = 'sticker' and v_p ~ '^foss:[a-z0-9-]{1,40}$')) then
        raise exception 'percorso del file non valido';
      end if;
      if new.media ? 'url' and coalesce(new.media->>'url','') !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?/[A-Za-z0-9._~/%-]{1,300}$' then
        raise exception 'indirizzo del file non valido';
      end if;
      if v_p is null and not (new.media ? 'url') then raise exception 'manca il file'; end if;
      if length(new.media::text) > 4000 then raise exception 'dati del file troppo lunghi'; end if;
    end if;
    if new.risponde_a is not null and not exists (select 1 from chat_messaggi r where r.id = new.risponde_a and r.conv_id = new.conv_id) then
      new.risponde_a := null;
    end if;
  end if;
  return new;
end $$;

create or replace function public.chat_dopo_il_messaggio()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c chat_conversazioni; v_chiave text; v_r record; v_iscr jsonb; v_chi text; v_testo text;
begin
  update chat_conversazioni set ultimo_il = new.creato_il where id = new.conv_id returning * into v_c;
  if new.autore is not null then
    update chat_membri set letto_fino = new.creato_il, ricevuto_fino = new.creato_il
     where conv_id = new.conv_id and utente_id = new.autore;
  end if;
  if new.tipo = 'sistema' then return null; end if;
  -- avviso sul telefono a chi e' nella conversazione e non l'ha silenziata
  select decrypted_secret into v_chiave from vault.decrypted_secrets where name = 'foss_vapid';
  if v_chiave is null then return null; end if;
  v_chi := coalesce(nome_di(new.autore), 'Qualcuno');
  v_testo := case new.tipo when 'testo' then left(new.testo, 200) when 'foto' then '📷 Foto' when 'vocale' then '🎤 Messaggio vocale'
                           when 'sticker' then 'Sticker' when 'video' then '🎥 Video' else '📄 ' || coalesce(new.media->>'nome', 'Documento') end;
  for v_r in select m.utente_id from chat_membri m
              where m.conv_id = new.conv_id and m.utente_id <> new.autore and not m.silenziata loop
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]'::jsonb)
      into v_iscr from push_iscrizioni where utente_id = v_r.utente_id;
    if jsonb_array_length(v_iscr) > 0 then
      perform net.http_post(
        url := 'https://suqpteanvnvvmfujlevi.supabase.co/functions/v1/push',
        body := jsonb_build_object('vapid', v_chiave::jsonb, 'iscrizioni', v_iscr,
                  'notifica', jsonb_build_object('id', new.id, 'tipo', 'fosschat', 'progetto_id', null,
                     'dati', jsonb_build_object('chi', v_chi, 'testo', v_testo, 'conv', new.conv_id,
                                                'gruppo', case when v_c.tipo = 'gruppo' then v_c.nome end))),
        headers := jsonb_build_object('Content-Type', 'application/json'),
        timeout_milliseconds := 10000);
    end if;
  end loop;
  return null;
end $$;

create trigger chat_prima_del_messaggio before insert on public.chat_messaggi
  for each row execute function public.chat_prima_del_messaggio();
create trigger chat_dopo_il_messaggio after insert on public.chat_messaggi
  for each row execute function public.chat_dopo_il_messaggio();

revoke execute on function public.chat_prima_del_messaggio() from public, anon, authenticated;
revoke execute on function public.chat_dopo_il_messaggio() from public, anon, authenticated;
do $$ declare f text; begin
  foreach f in array array['chat_contatti()','chat_persone(uuid[])','chat_apri_privata(uuid)','chat_crea_gruppo(text,uuid[],text,text)',
    'chat_modifica_gruppo(uuid,text,text,text,boolean)','chat_aggiungi(uuid,uuid[])','chat_togli(uuid,uuid)','chat_admin_si(uuid,uuid,boolean)',
    'chat_elimina(uuid)','chat_letto(uuid)','chat_ping()','chat_elenco()','chat_non_lette()','chat_membro(uuid)','chat_admin(uuid)'] loop
    execute 'revoke execute on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;

-- ---------- tempo reale ----------
alter publication supabase_realtime add table public.chat_messaggi, public.chat_membri, public.chat_conversazioni;

-- ---------- file: bucket privato ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat', 'chat', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

create policy "chat file: li vede chi e' nella conversazione" on storage.objects
  for select to authenticated using (
    bucket_id = 'chat' and (
      ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and chat_membro(((storage.foldername(name))[1])::uuid))
      or ((storage.foldername(name))[1] = 'sticker' and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
          and condividiamo_org(((storage.foldername(name))[2])::uuid))));
create policy "chat file: li carica chi e' nella conversazione" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'chat' and allegato_sicuro(name) and (
      ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and chat_membro(((storage.foldername(name))[1])::uuid))
      or ((storage.foldername(name))[1] = 'sticker' and (storage.foldername(name))[2] = (select auth.uid())::text)));
create policy "chat file: li toglie chi li ha caricati" on storage.objects
  for delete to authenticated using (bucket_id = 'chat' and owner_id = (select auth.uid())::text);
