begin;
create function public.tracking_salvar_bombona(p_dados jsonb, p_codigo_rastreador text, p_serial text, p_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare b public.bombonas; dados public.bombonas; rid uuid; operacao text;
begin
  if not public.rastreamento_admin() then raise insufficient_privilege; end if;
  dados := jsonb_populate_record(null::public.bombonas,p_dados);
  if btrim(p_codigo_rastreador) = '' or btrim(p_serial) = '' or btrim(dados.modelo) = '' or btrim(dados.numero_identificacao) = '' then
    raise check_violation;
  end if;
  if dados.cliente_id is not null and not exists(select 1 from public.clientes where id=dados.cliente_id and status='ativo') then raise check_violation; end if;
  if dados.caminhao_id is not null and not exists(select 1 from public.caminhoes where id=dados.caminhao_id and status<>'manutencao') then raise check_violation; end if;
  if p_id is null then
    rid := gen_random_uuid();
    insert into public.bombonas(numero_identificacao,capacidade_litros,modelo,status,cliente_id,caminhao_id,rastreador_id,latitude,longitude,data_instalacao,observacoes)
      values(dados.numero_identificacao,dados.capacidade_litros,dados.modelo,dados.status,dados.cliente_id,dados.caminhao_id,rid,dados.latitude,dados.longitude,dados.data_instalacao,dados.observacoes)
      returning * into b;
    insert into public.rastreadores(id,bombona_id,codigo,serial,modelo,fabricante)
      values(rid,b.id,p_codigo_rastreador,p_serial,'Barra Edge SL-0001-PT','Vision Telematics');
    operacao := 'cadastro';
  else
    select * into strict b from public.bombonas where id=p_id and excluida_em is null for no key update;
    update public.rastreadores set codigo=p_codigo_rastreador,serial=p_serial,updated_at=now() where id=b.rastreador_id;
    update public.bombonas set numero_identificacao=dados.numero_identificacao,capacidade_litros=dados.capacidade_litros,modelo=dados.modelo,
      status=dados.status,cliente_id=dados.cliente_id,caminhao_id=dados.caminhao_id,latitude=dados.latitude,longitude=dados.longitude,
      data_instalacao=dados.data_instalacao,observacoes=dados.observacoes,updated_at=now() where id=p_id returning * into b;
    operacao := 'edicao';
  end if;
  insert into public.movimentacoes(bombona_id,codigo_bombona,cliente_id,caminhao_id,tipo,latitude,longitude,descricao)
    values(b.id,b.codigo,b.cliente_id,b.caminhao_id,operacao,b.latitude,b.longitude,case when operacao='cadastro' then 'Cadastro da bombona' else 'Edição da bombona' end);
  return b.id;
end $$;

create function public.tracking_movimentar(p_id uuid,p_tipo text,p_destino uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.bombonas; anterior public.bombonas; novo_alerta text;
begin
  if not public.rastreamento_admin() then raise insufficient_privilege; end if;
  select * into strict b from public.bombonas where id=p_id and excluida_em is null for no key update;
  anterior := b;
  case p_tipo
    when 'entrega_cliente' then
      select latitude,longitude into strict b.latitude,b.longitude from public.clientes where id=p_destino and status='ativo';
      b.cliente_id:=p_destino; b.caminhao_id:=null; b.status:='em_cliente';
    when 'retirada_caminhao','saida_deposito' then
      select latitude,longitude into strict b.latitude,b.longitude from public.caminhoes where id=p_destino and status<>'manutencao';
      b.caminhao_id:=p_destino; b.cliente_id:=null; b.status:='em_transporte';
    when 'entrada_deposito' then
      select latitude,longitude into strict b.latitude,b.longitude from public.rastreamento_config where id=1 and latitude is not null;
      b.caminhao_id:=null; b.cliente_id:=null; b.status:='no_deposito';
    when 'manutencao' then b.status:='manutencao'; b.caminhao_id:=null;
    when 'inspecao' then null;
    when 'exclusao' then
      b.excluida_em:=now();
      update public.alertas set status='resolvido' where bombona_id=b.id and status<>'resolvido';
    else raise check_violation;
  end case;
  update public.bombonas set latitude=b.latitude,longitude=b.longitude,cliente_id=b.cliente_id,caminhao_id=b.caminhao_id,
    status=b.status,updated_at=now(),excluida_em=b.excluida_em where id=b.id;
  insert into public.movimentacoes(bombona_id,codigo_bombona,cliente_id,caminhao_id,tipo,latitude,longitude,descricao)
    values(b.id,b.codigo,coalesce(b.cliente_id,anterior.cliente_id),coalesce(b.caminhao_id,anterior.caminhao_id),p_tipo,b.latitude,b.longitude,'Operação registrada pelo administrador');
  if b.status <> anterior.status and (b.status='no_deposito' or anterior.status='no_deposito') then
    novo_alerta:=case when b.status='no_deposito' then 'entrada_deposito' else 'saida_deposito' end;
    insert into public.alertas(bombona_id,rastreador_id,tipo,gravidade,descricao,latitude,longitude)
      values(b.id,b.rastreador_id,novo_alerta,'baixa','Movimentação de depósito registrada pelo administrador.',b.latitude,b.longitude);
  end if;
end $$;

create function public.tracking_historico(p_bombona uuid,p_cliente uuid,p_de timestamptz,p_ate timestamptz,p_cursor timestamptz,p_cursor_id uuid)
returns setof public.localizacoes language sql stable security invoker set search_path = '' as $$
  select l.* from public.localizacoes l join public.bombonas b on b.id=l.bombona_id
  where (p_bombona is null or l.bombona_id=p_bombona) and (p_cliente is null or b.cliente_id=p_cliente)
    and (p_de is null or l.registrado_em>=p_de) and (p_ate is null or l.registrado_em<p_ate)
    and (p_cursor is null or (l.registrado_em,l.id)<(p_cursor,p_cursor_id))
  order by l.registrado_em desc,l.id desc limit 51
$$;

-- Operação programada exclusiva de backend, em lotes para limitar bloqueios e WAL.
create function public.tracking_purgar_posicoes() returns integer
language sql security invoker set search_path = '' as $$
  with lote as (
    select id from public.localizacoes where registrado_em < now()-interval '90 days'
    order by registrado_em,id limit 20000 for update skip locked
  ), excluidas as (
    delete from public.localizacoes l using lote where l.id=lote.id returning l.id
  ) select count(*)::integer from excluidas
$$;

create function public.tracking_verificar_sinal() returns void
language sql security invoker set search_path = '' as $$
  update public.rastreadores r set status='offline',updated_at=now()
    from public.bombonas b where b.rastreador_id=r.id and b.excluida_em is null
    and r.status='online' and r.ultima_comunicacao<now()-interval '60 minutes';
  insert into public.alertas(bombona_id,rastreador_id,tipo,gravidade,descricao,latitude,longitude)
    select b.id,r.id,'sem_comunicacao','alta','Sem transmissão há mais de 60 minutos.',l.latitude,l.longitude
    from public.rastreadores r join public.bombonas b on b.rastreador_id=r.id
    left join public.tracking_posicoes_atuais l on l.bombona_id=b.id
    where b.excluida_em is null and r.ultima_comunicacao<now()-interval '60 minutes' and r.status='offline'
    on conflict do nothing
$$;
revoke all on function public.tracking_salvar_bombona(jsonb,text,text,uuid), public.tracking_movimentar(uuid,text,uuid),
  public.tracking_historico(uuid,uuid,timestamptz,timestamptz,timestamptz,uuid) from public, anon;
grant execute on function public.tracking_salvar_bombona(jsonb,text,text,uuid), public.tracking_movimentar(uuid,text,uuid),
  public.tracking_historico(uuid,uuid,timestamptz,timestamptz,timestamptz,uuid) to authenticated;
revoke all on function public.tracking_purgar_posicoes(),public.tracking_verificar_sinal() from public,anon,authenticated;
grant execute on function public.tracking_purgar_posicoes(),public.tracking_verificar_sinal() to service_role;
grant select on public.tracking_posicoes_atuais to service_role;
grant select,insert,update,delete on public.localizacoes,public.rastreadores,public.alertas,public.rotas_caminhoes,public.caminhoes to service_role;
grant select on public.bombonas,public.clientes,public.rastreamento_config to service_role;
commit;
