begin;

-- Em instalações novas, cria somente a estrutura mínima usada pela autenticação do app.
do $$
begin
  if to_regclass('public.profiles') is null then
    create table public.profiles (
      id uuid primary key references auth.users on delete cascade,
      full_name text not null, role text not null check (role in ('admin','driver')),
      is_active boolean not null default true
    );
    alter table public.profiles enable row level security;
    revoke all on public.profiles from public,anon,authenticated;
    grant select on public.profiles to authenticated;
    create policy perfil_proprio on public.profiles for select to authenticated using (id=(select auth.uid()));
  end if;
end $$;

create table public.usuarios (
  id uuid primary key references auth.users on delete cascade,
  nome text not null, email text not null unique, perfil text not null check (perfil in ('admin','driver')),
  created_at timestamptz not null default now()
);
create table public.clientes (
  id uuid primary key default gen_random_uuid(), nome text not null,
  cnpj text not null unique check (cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$'),
  responsavel text not null, telefone text not null, endereco text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status text not null check (status in ('ativo','inativo')),
  created_at timestamptz not null default now()
);
create table public.caminhoes (
  id uuid primary key default gen_random_uuid(), identificacao text not null unique, placa text not null unique,
  modelo text not null, motorista text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status text not null check (status in ('em_operacao','parado','manutencao')),
  dispositivo_gps text not null unique, ultima_comunicacao timestamptz,
  created_at timestamptz not null default now()
);
create sequence public.rastreamento_codigo_seq;
create function public.rastreamento_gerar_codigo() returns text
language sql set search_path = '' as $$
  select 'BIO-' || lpad(n::text, greatest(6, length(n::text)), '0')
  from (select nextval('public.rastreamento_codigo_seq') n) s
$$;
create table public.bombonas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default public.rastreamento_gerar_codigo(),
  numero_identificacao text not null, capacidade_litros numeric not null check (capacidade_litros > 0 and capacidade_litros <= 10000),
  modelo text not null, status text not null check (status in ('no_deposito','em_cliente','em_transporte','manutencao')),
  cliente_id uuid references public.clientes, caminhao_id uuid references public.caminhoes,
  rastreador_id uuid not null unique,
  qr_code uuid not null unique default gen_random_uuid(),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  data_instalacao date not null, observacoes text, excluida_em timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (status <> 'em_cliente' or cliente_id is not null),
  check ((status = 'em_transporte') = (caminhao_id is not null))
);
create unique index bombonas_identificacao_ativa on public.bombonas (upper(numero_identificacao)) where excluida_em is null;
create index bombonas_cliente on public.bombonas(cliente_id);
create index bombonas_caminhao on public.bombonas(caminhao_id);
create table public.rastreadores (
  id uuid primary key default gen_random_uuid(),
  codigo text not null, serial text not null,
  modelo text not null, fabricante text not null,
  bombona_id uuid unique references public.bombonas deferrable initially deferred,
  status text not null default 'offline' check (status in ('online','offline')),
  bateria_percentual smallint check (bateria_percentual between 0 and 100),
  ultima_comunicacao timestamptz, tipo_conexao text not null default 'Não configurada',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,bombona_id)
);
create unique index rastreadores_codigo on public.rastreadores(upper(codigo));
create unique index rastreadores_serial on public.rastreadores(upper(serial));
alter table public.bombonas add constraint bombona_rastreador_coerente
  foreign key(rastreador_id,id) references public.rastreadores(id,bombona_id) deferrable initially deferred;
create table public.localizacoes (
  id uuid primary key default gen_random_uuid(),
  bombona_id uuid not null references public.bombonas, rastreador_id uuid not null references public.rastreadores,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  precisao numeric check (precisao >= 0), velocidade numeric check (velocidade >= 0),
  bateria_percentual smallint check (bateria_percentual between 0 and 100),
  status_comunicacao text not null default 'online' check (status_comunicacao in ('online','offline')),
  fonte_dado text not null check (fonte_dado in ('gps','manual')),
  registrado_em timestamptz not null, created_at timestamptz not null default now(),
  unique (rastreador_id, registrado_em, fonte_dado)
);
create index localizacoes_bombona_tempo on public.localizacoes(bombona_id,registrado_em desc,id desc);
create index localizacoes_tempo on public.localizacoes(registrado_em desc,id desc);
create table public.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  bombona_id uuid not null references public.bombonas, codigo_bombona text not null,
  cliente_id uuid references public.clientes, caminhao_id uuid references public.caminhoes,
  tipo text not null check (tipo in ('cadastro','edicao','exclusao','entrega_cliente','retirada_caminhao','entrada_deposito','saida_deposito','inspecao','manutencao')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  descricao text not null, registrado_em timestamptz not null default now(), created_at timestamptz not null default now(),
  usuario_id uuid default auth.uid() references auth.users on delete set null
);
create index movimentacoes_bombona_tempo on public.movimentacoes(bombona_id,registrado_em desc);
create index movimentacoes_cliente_tempo on public.movimentacoes(cliente_id,registrado_em desc);
create index movimentacoes_caminhao_tempo on public.movimentacoes(caminhao_id,registrado_em desc);
create index movimentacoes_tempo on public.movimentacoes(registrado_em desc,id desc);
create table public.alertas (
  id uuid primary key default gen_random_uuid(), bombona_id uuid references public.bombonas, rastreador_id uuid references public.rastreadores,
  tipo text not null check (tipo in ('sem_comunicacao','bateria_baixa','movimentacao_inesperada','fora_de_area','entrada_deposito','saida_deposito','remocao_equipamento')),
  gravidade text not null check (gravidade in ('baixa','media','alta','critica')),
  descricao text not null, status text not null default 'pendente' check (status in ('pendente','visualizado','resolvido')),
  latitude double precision check (latitude between -90 and 90), longitude double precision check (longitude between -180 and 180),
  registrado_em timestamptz not null default now(), created_at timestamptz not null default now()
);
create index alertas_status_tempo on public.alertas(status,registrado_em desc);
create index alertas_bombona on public.alertas(bombona_id);
create unique index alertas_condicao_ativa on public.alertas(rastreador_id,tipo)
  where status <> 'resolvido' and tipo in ('sem_comunicacao','bateria_baixa','fora_de_area','movimentacao_inesperada','remocao_equipamento');
create table public.rastreamento_config (
  id integer primary key check (id = 1),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  check ((latitude is null) = (longitude is null))
);
insert into public.rastreamento_config(id) values (1);
create table public.rotas_caminhoes (
  id uuid primary key default gen_random_uuid(), caminhao_id uuid not null references public.caminhoes,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  registrado_em timestamptz not null, unique (caminhao_id,registrado_em)
);
create index rotas_caminhoes_tempo on public.rotas_caminhoes(registrado_em desc,id desc);

-- A fonte de autorização continua sendo o perfil ativo usado pelo aplicativo existente.
create function public.rastreamento_admin() returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare autorizado boolean;
begin
  if to_regclass('public.profiles') is null then return false; end if;
  execute 'select exists(select 1 from public.profiles where id = $1 and role = ''admin'' and is_active)'
    into autorizado using auth.uid();
  return autorizado;
end
$$;
revoke execute on function public.rastreamento_admin() from public, anon;
grant execute on function public.rastreamento_admin() to authenticated;
do $$
declare t text;
begin
  foreach t in array array['usuarios','clientes','caminhoes','bombonas','rastreadores','localizacoes',
    'movimentacoes','alertas','rastreamento_config','rotas_caminhoes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy leitura_admin on public.%I for select to authenticated using ((select public.rastreamento_admin()))', t);
  end loop;
  foreach t in array array['clientes','caminhoes','rastreamento_config','alertas'] loop
    execute format('create policy escrita_admin on public.%I for all to authenticated using ((select public.rastreamento_admin())) with check ((select public.rastreamento_admin()))', t);
  end loop;
end $$;
grant insert,update on public.clientes,public.caminhoes to authenticated;
grant update(latitude,longitude) on public.rastreamento_config to authenticated;
grant update(status) on public.alertas to authenticated;
revoke all on sequence public.rastreamento_codigo_seq from public, anon, authenticated;

create view public.tracking_posicoes_atuais with (security_invoker = true) as
select l.* from public.bombonas b
cross join lateral (
  select * from public.localizacoes l where l.bombona_id = b.id and l.rastreador_id = b.rastreador_id
  order by registrado_em desc,id desc limit 1
) l where b.excluida_em is null;
revoke all on public.tracking_posicoes_atuais from public, anon, authenticated;
grant select on public.tracking_posicoes_atuais to authenticated;
commit;
