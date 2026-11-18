import { supabase } from "@/lib/supabase";
import type { Alerta, Bombona, Caminhao, Cliente, Localizacao, Movimentacao, Rastreador, TipoMovimentacao } from "@/types/tracking";
import type { DadosBombona, DadosCliente, EstadoPainel, PontoRota } from "./model";

type Registro = Record<string, unknown>;
type Erro = { code?: string } | null;
export type FiltroHistorico = { bombona?: string; cliente?: string; de?: string; ate?: string; tipo?: TipoMovimentacao };
export type Cursor = { registradoEm: string; id: string };
export type DadosCaminhao = Pick<Caminhao, "identificacao" | "placa" | "modelo" | "motorista" | "status" | "dispositivoGps" | "latitude" | "longitude">;
export type Deposito = Pick<Bombona, "latitude" | "longitude">;

function verificar(erro: Erro) {
  if (!erro) return;
  if (erro.code === "23505") throw new Error("Já existe um registro com uma das identificações informadas.");
  if (erro.code === "42501") throw new Error("Seu perfil não tem permissão para esta operação.");
  if (erro.code === "P0002") throw new Error("Registro ou destino indisponível. Para entrada no depósito, confira o local em Configurações.");
  if (erro.code?.startsWith("22") || erro.code?.startsWith("23")) throw new Error("Verifique os dados informados e os vínculos selecionados.");
  throw new Error("Não foi possível acessar os dados do rastreamento. Confira a conexão e as migrations do Supabase.");
}
function ler<T>(obj: Registro): T {
  return Object.fromEntries(Object.entries(obj).map(([key, valor]) => [
    key.replace(/_([a-z])/g, (_, letra: string) => letra.toUpperCase()), valor,
  ])) as T;
}
function escrever(obj: object) {
  return Object.fromEntries(Object.entries(obj).map(([key, valor]) => [
    key.replace(/[A-Z]/g, letra => "_" + letra.toLowerCase()), valor,
  ]));
}

async function paginar<T>(tabela: string, chave = "id", apenasAtivas = false): Promise<T[]> {
  const lidos: T[] = [];
  let cursor: unknown;
  const tamanho = 500;
  for (;;) {
    let consulta = supabase.from(tabela).select("*").order(chave).limit(tamanho);
    if (apenasAtivas) consulta = consulta.is("excluida_em", null);
    if (cursor !== undefined) consulta = consulta.gt(chave, cursor);
    const { data, error } = await consulta;
    verificar(error);
    const pagina = (data ?? []) as Registro[];
    lidos.push(...pagina.map(ler<T>));
    if (pagina.length < tamanho) return lidos;
    cursor = pagina.at(-1)?.[chave];
  }
}

async function recentes<T>(tabela: string, limite: number): Promise<T[]> {
  const { data, error } = await supabase.from(tabela).select("*").order("registrado_em", { ascending: false }).limit(limite);
  verificar(error);
  return (data ?? []).map(ler<T>);
}

export async function carregarProducao(): Promise<EstadoPainel> {
  const [bombonas, rastreadores, clientes, caminhoes, posicoes, movimentacoes, alertas, indicadores] = await Promise.all([
    paginar<Bombona>("bombonas", "id", true), paginar<Rastreador>("rastreadores"), paginar<Cliente>("clientes"),
    paginar<Caminhao>("caminhoes"), paginar<Localizacao>("tracking_posicoes_atuais", "bombona_id"),
    recentes<Movimentacao>("movimentacoes", 1000), paginar<Alerta>("alertas"), supabase.rpc("tracking_indicadores"),
  ]);
  verificar(indicadores.error);
  const ativos = new Set(bombonas.map(b => b.rastreadorId));
  return {
    bombonas, rastreadores: rastreadores.filter(r => ativos.has(r.id)), clientes, caminhoes, movimentacoes,
    alertas: alertas.map(a => ({ ...a, simulado: false })).sort((a, b) => b.registradoEm.localeCompare(a.registradoEm)),
    ultimas: Object.fromEntries(posicoes.map(p => [p.bombonaId, p])),
    indicadores: ler<NonNullable<EstadoPainel["indicadores"]>>(indicadores.data ?? {}), agora: new Date().toISOString(),
  };
}
export async function salvarBombonaProducao(dados: DadosBombona, id?: string) {
  const { codigoRastreador, serial, ...campos } = dados;
  const { data, error } = await supabase.rpc("tracking_salvar_bombona", {
    p_dados: escrever(campos), p_codigo_rastreador: codigoRastreador, p_serial: serial, p_id: id ?? null,
  });
  verificar(error);
  return data as string;
}
export async function movimentarProducao(id: string, tipo: TipoMovimentacao, destino?: string) {
  const { error } = await supabase.rpc("tracking_movimentar", { p_id: id, p_tipo: tipo, p_destino: destino ?? null });
  verificar(error);
}
export async function salvarClienteProducao(dados: DadosCliente, id?: string) {
  const tabela = supabase.from("clientes");
  const chamada = id ? tabela.update(escrever(dados)).eq("id", id) : tabela.insert(escrever(dados));
  const { data, error } = await chamada.select("id").single();
  verificar(error);
  return data!.id as string;
}
export async function salvarCaminhaoProducao(id: string | undefined, dados: DadosCaminhao) {
  const tabela = supabase.from("caminhoes");
  const { data, error } = await (id ? tabela.update(escrever(dados)).eq("id", id) : tabela.insert(escrever(dados))).select("id").single();
  verificar(error);
  return data!.id as string;
}
export async function alterarAlertaProducao(id: string, status: Alerta["status"]) {
  const { error } = await supabase.from("alertas").update({ status }).eq("id", id).select("id").single();
  verificar(error);
}
export async function carregarPosicoes(filtro: FiltroHistorico, cursor?: Cursor) {
  const { data, error } = await supabase.rpc("tracking_historico", {
    p_bombona: filtro.bombona ?? null, p_cliente: filtro.cliente ?? null,
    p_de: filtro.de ?? null, p_ate: filtro.ate ?? null,
    p_cursor: cursor?.registradoEm ?? null, p_cursor_id: cursor?.id ?? null,
  });
  verificar(error);
  return ((data ?? []) as Registro[]).map(ler<Localizacao>);
}
export async function carregarMovimentacoes(filtro: FiltroHistorico, cursor?: Cursor, caminhao?: string) {
  let consulta = supabase.from("movimentacoes").select("*").order("registrado_em", { ascending: false }).order("id", { ascending: false }).limit(51);
  if (filtro.bombona) consulta = consulta.eq("bombona_id", filtro.bombona);
  if (filtro.cliente) consulta = consulta.eq("cliente_id", filtro.cliente);
  if (filtro.tipo) consulta = consulta.eq("tipo", filtro.tipo);
  if (filtro.de) consulta = consulta.gte("registrado_em", filtro.de);
  if (filtro.ate) consulta = consulta.lt("registrado_em", filtro.ate);
  if (caminhao) consulta = consulta.eq("caminhao_id", caminhao);
  if (cursor) consulta = consulta.or(`registrado_em.lt.${cursor.registradoEm},and(registrado_em.eq.${cursor.registradoEm},id.lt.${cursor.id})`);
  const { data, error } = await consulta;
  verificar(error);
  return (data ?? []).map(ler<Movimentacao>);
}
export async function carregarRota(id: string) {
  const { data, error } = await supabase.from("rotas_caminhoes").select("latitude,longitude,registrado_em")
    .eq("caminhao_id", id).order("registrado_em", { ascending: false }).limit(96);
  verificar(error);
  return (data ?? []).map(ler<PontoRota>).reverse();
}
export async function depositoProducao() {
  const { data, error } = await supabase.from("rastreamento_config").select("latitude,longitude").eq("id", 1).single();
  verificar(error);
  return data?.latitude == null || data?.longitude == null ? null : data as Deposito;
}
export async function definirDepositoProducao(ponto: Deposito) {
  const { error } = await supabase.from("rastreamento_config").update(ponto).eq("id", 1).select("id").single();
  verificar(error);
}
