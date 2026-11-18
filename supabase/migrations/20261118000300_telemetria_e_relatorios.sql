begin;

-- Entrada normalizada para um futuro adaptador executado exclusivamente no servidor.
create function public.tracking_receber_posicao(
  p_codigo text, p_instante timestamptz, p_latitude double precision, p_longitude double precision,
  p_precisao numeric default null, p_velocidade numeric default null, p_bateria smallint default null,
  p_sensor_remocao boolean default null
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare r public.rastreadores; b public.bombonas; antiga public.localizacoes;
  lat_deposito double precision; lng_deposito double precision;
  lat_esperada double precision; lng_esperada double precision;
  antes_m double precision; depois_m double precision; registro uuid;
  alerta text; tipos text[] := array[]::text[];
begin
  if p_instante is null or p_instante > now()+interval '5 minutes' then raise check_violation; end if;
  if p_instante < now()-interval '90 days' then return false; end if;
  select * into strict r from public.rastreadores where upper(codigo)=upper(p_codigo) for update;
  select * into strict b from public.bombonas where id=r.bombona_id and excluida_em is null;
  select * into antiga from public.localizacoes where bombona_id=b.id and fonte_dado='gps'
    order by registrado_em desc,id desc limit 1;
  insert into public.localizacoes(bombona_id,rastreador_id,latitude,longitude,precisao,velocidade,bateria_percentual,
    status_comunicacao,fonte_dado,registrado_em)
    values(b.id,r.id,p_latitude,p_longitude,p_precisao,p_velocidade,p_bateria,'online','gps',p_instante)
    on conflict(rastreador_id,registrado_em,fonte_dado) do nothing returning id into registro;
  if registro is null then return false; end if;
  if r.ultima_comunicacao is not null and r.ultima_comunicacao >= p_instante then return true; end if;

  update public.rastreadores set status=case when p_instante<now()-interval '60 minutes' then 'offline' else 'online' end,
    bateria_percentual=coalesce(p_bateria,bateria_percentual),ultima_comunicacao=p_instante,updated_at=now() where id=r.id;
  update public.alertas set status='resolvido' where rastreador_id=r.id and status<>'resolvido'
    and ((tipo='sem_comunicacao' and p_instante>=now()-interval '60 minutes') or (tipo='bateria_baixa' and p_bateria>=20));
  if p_bateria<20 then tipos:=array_append(tipos,'bateria_baixa'); end if;
  if p_sensor_remocao is true then tipos:=array_append(tipos,'remocao_equipamento'); end if;

  -- Aproximação local em metros, aplicada somente com precisão reportada de até 50 m.
  if p_precisao <= 50 then
    select latitude,longitude into lat_deposito,lng_deposito from public.rastreamento_config where id=1;
    if lat_deposito is not null then
      depois_m:=111195*sqrt(power(p_latitude-lat_deposito,2)+power((p_longitude-lng_deposito)*cos(radians(lat_deposito)),2));
      if antiga.precisao <= 50 then
        antes_m:=111195*sqrt(power(antiga.latitude-lat_deposito,2)+power((antiga.longitude-lng_deposito)*cos(radians(lat_deposito)),2));
        if antes_m > 1050 and depois_m < 950 then tipos:=array_append(tipos,'entrada_deposito'); end if;
        if antes_m < 950 and depois_m > 1050 then tipos:=array_append(tipos,'saida_deposito'); end if;
      end if;
    end if;
    if b.status='no_deposito' then
      lat_esperada:=lat_deposito; lng_esperada:=lng_deposito;
    elsif b.status='em_cliente' then
      select latitude,longitude into lat_esperada,lng_esperada from public.clientes where id=b.cliente_id;
    end if;
    if lat_esperada is not null and 111195*sqrt(power(p_latitude-lat_esperada,2)+power((p_longitude-lng_esperada)*cos(radians(lat_esperada)),2))>1050 then
      tipos:=array_append(tipos,'fora_de_area');
      if p_velocidade>5 then tipos:=array_append(tipos,'movimentacao_inesperada'); end if;
    end if;
  end if;
  foreach alerta in array tipos loop
    insert into public.alertas(bombona_id,rastreador_id,tipo,gravidade,descricao,latitude,longitude,registrado_em)
      values(b.id,r.id,alerta,case alerta when 'remocao_equipamento' then 'alta' when 'fora_de_area' then 'alta'
        when 'entrada_deposito' then 'baixa' when 'saida_deposito' then 'baixa' else 'media' end,
        case alerta when 'bateria_baixa' then 'Carga do rastreador abaixo de 20%.'
          when 'remocao_equipamento' then 'O sensor reportou possível remoção do equipamento.'
          when 'fora_de_area' then 'Posição fora do raio da área operacional.'
          when 'movimentacao_inesperada' then 'Deslocamento detectado fora da área da bombona estacionária.'
          when 'entrada_deposito' then 'Posição entrou na área do depósito.'
          else 'Posição saiu da área do depósito.' end,p_latitude,p_longitude,p_instante)
      on conflict do nothing;
  end loop;
  return true;
end $$;

create function public.tracking_receber_rota(p_dispositivo text,p_instante timestamptz,p_latitude double precision,p_longitude double precision)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare alvo uuid; registro uuid;
begin
  if p_instante is null or p_instante>now()+interval '5 minutes' then raise check_violation; end if;
  select id into strict alvo from public.caminhoes where dispositivo_gps=p_dispositivo for update;
  insert into public.rotas_caminhoes(caminhao_id,latitude,longitude,registrado_em)
    values(alvo,p_latitude,p_longitude,p_instante) on conflict do nothing returning id into registro;
  if registro is null then return false; end if;
  update public.caminhoes set latitude=p_latitude,longitude=p_longitude,ultima_comunicacao=p_instante
    where id=alvo and (ultima_comunicacao is null or ultima_comunicacao<p_instante);
  return true;
end $$;
revoke all on function public.tracking_receber_posicao(text,timestamptz,double precision,double precision,numeric,numeric,smallint,boolean),
  public.tracking_receber_rota(text,timestamptz,double precision,double precision) from public,anon,authenticated;
grant execute on function public.tracking_receber_posicao(text,timestamptz,double precision,double precision,numeric,numeric,smallint,boolean),
  public.tracking_receber_rota(text,timestamptz,double precision,double precision) to service_role;

create function public.tracking_indicadores() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'movimentos_dia', coalesce((
      select jsonb_object_agg(to_char(d,'DD/MM/YYYY'), n) from (
        select (registrado_em at time zone 'America/Sao_Paulo')::date d,count(*) n from public.movimentacoes
        where registrado_em>=date_trunc('day',now(),'America/Sao_Paulo')-interval '6 days' group by 1
      ) s
    ), '{}'::jsonb),
    'movimentos_mes', coalesce((
      select jsonb_object_agg(to_char(m,'MM/YYYY'), n) from (
        select date_trunc('month',registrado_em at time zone 'America/Sao_Paulo') m,count(*) n from public.movimentacoes
        where registrado_em>=((date_trunc('month',now() at time zone 'America/Sao_Paulo')-interval '5 months') at time zone 'America/Sao_Paulo') group by 1
      ) s
    ), '{}'::jsonb),
    'alertas_dia', coalesce((
      select jsonb_object_agg(to_char(d,'DD/MM/YYYY'), n) from (
        select (registrado_em at time zone 'America/Sao_Paulo')::date d,count(*) n from public.alertas
        where registrado_em>=date_trunc('day',now(),'America/Sao_Paulo')-interval '6 days' group by 1
      ) s
    ), '{}'::jsonb)
  )
$$;
revoke all on function public.tracking_indicadores() from public,anon;
grant execute on function public.tracking_indicadores() to authenticated;
create index alertas_tempo on public.alertas(registrado_em desc,id desc);

create table public.rastreamento_log (
  id uuid primary key default gen_random_uuid(),
  entidade text not null, entidade_id uuid not null, operacao text not null check (operacao in ('insert','update','delete')),
  usuario_id uuid references auth.users on delete set null,
  registrado_em timestamptz not null default now()
);
alter table public.rastreamento_log enable row level security;
revoke all on public.rastreamento_log from public,anon,authenticated;
grant select on public.rastreamento_log to authenticated;
create policy leitura_admin on public.rastreamento_log for select to authenticated using ((select public.rastreamento_admin()));
create index rastreamento_log_tempo on public.rastreamento_log(registrado_em desc,id desc);
create function public.tracking_auditar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    insert into public.rastreamento_log(entidade,entidade_id,operacao,usuario_id)
      values(tg_table_name,case when tg_op='DELETE' then old.id else new.id end,lower(tg_op),auth.uid());
  end if;
  return null;
end $$;
revoke all on function public.tracking_auditar() from public,anon,authenticated;
do $$
declare t text;
begin
  foreach t in array array['bombonas','rastreadores','clientes','caminhoes','movimentacoes','alertas'] loop
    execute format('create trigger tracking_auditoria after insert or update or delete on public.%I for each row execute function public.tracking_auditar()',t);
  end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('relatorios-biooleo','relatorios-biooleo',false,5242880,array['text/csv']);
create policy relatorios_biooleo_gravar on storage.objects for insert to authenticated
  with check (bucket_id='relatorios-biooleo' and (storage.foldername(name))[1]=(select auth.uid())::text
    and (select public.rastreamento_admin()));
create policy relatorios_biooleo_ler on storage.objects for select to authenticated
  using (bucket_id='relatorios-biooleo' and (storage.foldername(name))[1]=(select auth.uid())::text
    and (select public.rastreamento_admin()));
commit;
