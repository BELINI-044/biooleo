import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Download from "lucide-react-native/icons/download";
import { DEPOSITO_DEMO } from "@/data/demo/geo";
import { arquivarCsv, exportarCsv } from "@/lib/exportarCsv";
import { formatarBateria, formatarCoordenada, formatarDataHora, formatarNumero } from "@/lib/format";
import { carregarMovimentacoes, carregarPosicoes, type Cursor, type FiltroHistorico } from "@/services/tracking/repository";
import { ROTULOS_STATUS_RASTREADOR, ROTULOS_TIPO_MOVIMENTACAO, type Localizacao, type Movimentacao, type TipoMovimentacao } from "@/types/tracking";
import { enquadrar, focar } from "./mapa";
import MapaBase from "./MapaBase";
import { Movimentos } from "./VisaoGeral";
import { Botao, Campo, Cartao, cor, Escolha, estilo, normalizar, opcoes, Paginas, Titulo } from "./ui";
import type { Painel } from "./usePainel";
import type { Executar } from "./actions";

const POR_PAGINA = 50;
const FONTES = { simulado: "Simulação", gps: "GPS", manual: "Registro manual" };
function noPeriodo(data: string, filtro: FiltroHistorico) {
  return (!filtro.de || data >= filtro.de) && (!filtro.ate || data < filtro.ate);
}

export default function Historico({ painel, bombona, clienteInicial, caminhao, inicial = "movimentos", abrir, executar, embutido = false }: {
  painel: Painel; bombona?: string; clienteInicial?: string; caminhao?: string; inicial?: "posicoes" | "movimentos";
  abrir: (id: string) => void; executar: Executar; embutido?: boolean;
}) {
  const { estado, demo } = painel;
  const [tipo, setTipo] = useState(inicial);
  const [busca, setBusca] = useState("");
  const [cliente, setCliente] = useState(clienteInicial ?? "");
  const [periodo, setPeriodo] = useState("");
  const [evento, setEvento] = useState<"" | TipoMovimentacao>("");
  const [pagina, setPagina] = useState(0);
  const [mapa, setMapa] = useState(false);
  const [selecionado, setSelecionado] = useState("");
  const [paginas, setPaginas] = useState<Cursor[]>([]);
  const [resultado, setResultado] = useState<{ chave: string; dados: (Localizacao | Movimentacao)[]; erro: string }>();
  const [repetir, setRepetir] = useState(0);
  const b = bombona ? estado.bombonas.find(item => item.id === bombona) : undefined;
  const ids = useMemo(() => {
    const termo = normalizar(busca);
    return new Set(estado.bombonas.filter(item => !termo || normalizar(item.codigo).includes(termo) ||
      normalizar(item.numeroIdentificacao).includes(termo)).map(item => item.id));
  }, [busca, estado.bombonas]);
  const alvo = bombona ?? (busca && ids.size === 1 ? [...ids][0] : undefined);
  const de = periodo ? new Date(Date.parse(estado.agora) - Number(periodo) * 86_400_000).toISOString() : undefined;
  const filtro = useMemo<FiltroHistorico>(() => ({ bombona: alvo, cliente: cliente || undefined, de, tipo: evento || undefined }), [alvo, cliente, de, evento]);
  const cursor = paginas[pagina - 1];
  const buscaAmbigua = !!busca && ids.size !== 1 && !demo;
  const chave = JSON.stringify([filtro, cursor, tipo, caminhao, repetir]);
  const carregando = !demo && !buscaAmbigua && resultado?.chave !== chave;
  const erro = resultado?.chave === chave ? resultado.erro : "";
  useEffect(() => {
    if (demo || buscaAmbigua) return;
    let ativo = true;
    const pedido = tipo === "posicoes" ? carregarPosicoes(filtro, cursor) : carregarMovimentacoes(filtro, cursor, caminhao);
    void pedido.then(dados => { if (ativo) setResultado({ chave, dados, erro: "" }); }, e => {
      if (ativo) setResultado({ chave, dados: [], erro: e instanceof Error ? e.message : "Falha ao carregar o histórico." });
    });
    return () => { ativo = false; };
  }, [demo, filtro, cursor, tipo, caminhao, chave, buscaAmbigua]);

  const registros = useMemo(() => {
    if (!demo) return buscaAmbigua || resultado?.chave !== chave ? [] : resultado.dados;
    const inicio = pagina * POR_PAGINA;
    if (tipo === "posicoes") {
      const ativos = bombona || cliente || busca ? new Set(estado.bombonas.filter(item =>
        (!bombona || item.id === bombona) && (!cliente || item.clienteId === cliente) &&
        (!busca || ids.has(item.id))).map(item => item.id)) : undefined;
      return demo.historico({ ids: ativos, de: filtro.de, ate: filtro.ate, inicio, limite: POR_PAGINA + 1 });
    }
    return estado.movimentacoes.filter(r => (!bombona || r.bombonaId === bombona) &&
      (!busca || ids.has(r.bombonaId) || normalizar(r.codigoBombona ?? "").includes(normalizar(busca))) &&
      (!cliente || r.clienteId === cliente) && noPeriodo(r.registradoEm, filtro) &&
      (!evento || r.tipo === evento) && (!caminhao || r.caminhaoId === caminhao))
      .slice(inicio, inicio + POR_PAGINA + 1);
  }, [demo, tipo, resultado, chave, buscaAmbigua, estado, cliente, bombona, busca, ids, filtro, evento, caminhao, pagina]);
  const visiveis = registros.slice(0, POR_PAGINA);
  const codigos = new Map(estado.bombonas.map(item => [item.id, item.codigo]));
  const codigo = (r: Localizacao | Movimentacao) => codigos.get(r.bombonaId) ?? ("tipo" in r ? r.codigoBombona ?? "Bombona excluída" : demo ? r.bombonaId : "Bombona excluída");
  function redefinir() { setPagina(0); setPaginas([]); setSelecionado(""); }
  function proxima() {
    if (!demo) setPaginas(p => [...p.slice(0, pagina), visiveis.at(-1)!]);
    setPagina(p => p + 1); setSelecionado("");
  }
  const selecionada = visiveis.find(item => item.id === selecionado);
  const regiao = useMemo(() => selecionada
    ? focar(selecionada) : enquadrar(registros, focar(DEPOSITO_DEMO, 2)), [registros, selecionada]);
  function relatorio(arquivar: boolean) {
    executar(() => (arquivar ? arquivarCsv : exportarCsv)("biooleo-historico.csv",
      ["Bombona", "Data e hora (Brasília)", "Latitude", "Longitude", "Origem ou movimentação", "Precisão (m)", "Comunicação", "Bateria"],
      visiveis.map(r => [codigo(r), formatarDataHora(r.registradoEm), formatarCoordenada(r.latitude), formatarCoordenada(r.longitude),
        "tipo" in r ? ROTULOS_TIPO_MOVIMENTACAO[r.tipo] : FONTES[r.fonteDado],
        "precisao" in r ? r.precisao : null, "statusComunicacao" in r ? ROTULOS_STATUS_RASTREADOR[r.statusComunicacao] : "",
        "bateriaPercentual" in r ? formatarBateria(r.bateriaPercentual) : ""])),
      arquivar ? "CSV arquivado no armazenamento privado." : "CSV da página exportado.");
  }
  return <>
    {!embutido && <Titulo titulo="Histórico de localização" nota="Consulte leituras de GPS e movimentações registradas pela operação." />}
    <Cartao>
      {!bombona && !clienteInicial && !caminhao && <View style={estilo.linha}>
        <Botao variante={tipo === "movimentos" ? "principal" : "secundario"} onPress={() => { setTipo("movimentos"); redefinir(); }}>Movimentações</Botao>
        <Botao variante={tipo === "posicoes" ? "principal" : "secundario"} onPress={() => { setTipo("posicoes"); redefinir(); }}>Posições</Botao>
      </View>}
      <View style={[estilo.linha, { alignItems: "flex-end" }]}>
        {!bombona && !clienteInicial && !caminhao && <>
          <View style={{ flex: 1, minWidth: 145 }}><Campo rotulo="Código da bombona" placeholder="BIO-000001" value={busca} onChangeText={v => { setBusca(v); redefinir(); }} /></View>
          <View style={{ flex: 1, minWidth: 145 }}><Escolha rotulo="Cliente" valor={cliente} escolher={v => { setCliente(v); redefinir(); }} itens={[
            { value: "", label: "Todos os clientes" }, ...estado.clientes.map(c => ({ value: c.id, label: c.nome })),
          ]} /></View>
        </>}
        <View style={{ flex: 1, minWidth: 145 }}><Escolha rotulo="Período" valor={periodo} escolher={v => { setPeriodo(v); redefinir(); }} itens={[
          { value: "", label: "Todo o período disponível" }, { value: "1", label: "Últimas 24 horas" },
          { value: "7", label: "Últimos sete dias" }, { value: "30", label: "Últimos 30 dias" }, { value: "90", label: "Últimos 90 dias" },
        ]} /></View>
        {tipo === "movimentos" && <View style={{ flex: 1, minWidth: 145 }}><Escolha rotulo="Tipo de movimentação" valor={evento}
          escolher={v => { setEvento(v); redefinir(); }} itens={[{ value: "", label: "Todos os tipos" }, ...opcoes(ROTULOS_TIPO_MOVIMENTACAO)]} /></View>}
      </View>
      {demo && tipo === "posicoes" && <Text style={estilo.nota}>A demonstração mantém as oito janelas de transmissão mais recentes.</Text>}
      {b && <Text style={estilo.nota}>{b.codigo}</Text>}
      {buscaAmbigua && <Text style={estilo.nota}>Digite um código completo para consultar uma única bombona.</Text>}
      <View style={estilo.espalhar}><View style={estilo.linha}>
        <Botao variante={!mapa ? "principal" : "secundario"} onPress={() => setMapa(false)}>Tabela</Botao>
        <Botao variante={mapa ? "principal" : "secundario"} onPress={() => setMapa(true)}>Mapa</Botao>
      </View><View style={estilo.linha}>
        <Botao icon={Download} desabilitado={!visiveis.length || carregando} onPress={() => relatorio(false)}>Exportar página em CSV</Botao>
        {!demo && <Botao desabilitado={!visiveis.length || carregando} onPress={() => relatorio(true)}>Arquivar página no Supabase</Botao>}
      </View></View>
      {carregando && <ActivityIndicator color={cor.primary} />}
      {!!erro && <View style={estilo.linha}><Text accessibilityRole="alert" style={estilo.nota}>{erro}</Text>
        <Botao onPress={() => setRepetir(n => n + 1)}>Tentar novamente</Botao></View>}
      {!carregando && !erro && <>
        {visiveis.length === 0 ? <Text style={estilo.nota}>Nenhum registro encontrado nos filtros.</Text> : mapa ?
          <><MapaBase altura={340} regiao={regiao} foco={selecionado} selecionar={setSelecionado}
            marcadores={visiveis.map(r => ({ ...r, titulo: codigo(r), cor: cor.primaryMedium }))}
            rota={bombona && tipo === "posicoes" ? [...visiveis].reverse() : undefined} />
          {selecionada && <Text style={estilo.texto}>{codigo(selecionada)} · {formatarDataHora(selecionada.registradoEm)} · {formatarCoordenada(selecionada.latitude)} / {formatarCoordenada(selecionada.longitude)}</Text>}</>
          : tipo === "movimentos" ? <Movimentos itens={visiveis as Movimentacao[]} estado={estado} abrir={abrir} />
            : (visiveis as Localizacao[]).map(r => <View key={r.id} style={[estilo.espalhar, estilo.divisoria]}>
              <View><Text style={estilo.rotulo}>{codigo(r)} · {FONTES[r.fonteDado]}</Text>
                <Text style={estilo.nota}>{formatarCoordenada(r.latitude)} / {formatarCoordenada(r.longitude)} · Precisão {r.precisao === null ? "—" : formatarNumero(r.precisao) + " m"}</Text></View>
              <View><Text style={estilo.texto}>{formatarDataHora(r.registradoEm)}</Text><Text style={estilo.nota}>{ROTULOS_STATUS_RASTREADOR[r.statusComunicacao]} · Bateria {formatarBateria(r.bateriaPercentual)}</Text></View>
            </View>)}
        <Paginas pagina={pagina} anterior={() => { setPagina(p => p - 1); setSelecionado(""); }} proxima={proxima} temMais={registros.length > POR_PAGINA} />
      </>}
    </Cartao>
  </>;
}
