import { useMemo, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Crosshair from "lucide-react-native/icons/crosshair";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import { DEPOSITO_DEMO } from "@/data/demo/geo";
import { formatarBateria, formatarCoordenada, formatarDataHora, formatarNumero, formatarVelocidade } from "@/lib/format";
import { ROTULOS_STATUS_BOMBONA, ROTULOS_STATUS_RASTREADOR, type PosicaoBombona } from "@/types/tracking";
import MapaBase from "./MapaBase";
import { agrupar, CORES_MAPA, enquadrar, estadoPosicao, focar, type MarcadorMapa } from "./mapa";
import { Botao, Campo, Cartao, Dado, Escolha, estilo, normalizar, opcoes, Tag, Titulo } from "./ui";
import type { Painel } from "./usePainel";

export function DadosPosicao({ p, local }: { p: PosicaoBombona; local: string }) {
  const conhecida = p.desatualizada || p.statusComunicacao === "offline";
  return <>
    <View style={estilo.espalhar}><Text style={estilo.subtitulo}>{p.codigo}</Text>
      <Tag texto={estadoPosicao(p)} tom={estadoPosicao(p) === "Atualizada" ? "verde" : estadoPosicao(p) === "Sem comunicação" ? "vermelho" : "ambar"} /></View>
    <Text style={estilo.nota}>{p.fonteDado === "simulado" ? "Posição simulada · " : ""}{p.fonteDado === "manual" ? "Localização inicial aproximada" : conhecida ? "Última posição conhecida" : "Última posição recebida"}</Text>
    <View style={estilo.linha}>
      <Dado rotulo="Local operacional" valor={local} />
      <Dado rotulo="Rastreador" valor={p.codigoRastreador} /><Dado rotulo="Número de série" valor={p.serialRastreador} />
      <Dado rotulo="Latitude / longitude" valor={`${formatarCoordenada(p.latitude)} / ${formatarCoordenada(p.longitude)}`} />
      <Dado rotulo="Horário da posição" valor={formatarDataHora(p.registradoEm)} />
      <Dado rotulo="Velocidade" valor={formatarVelocidade(p.velocidade)} /><Dado rotulo="Bateria" valor={formatarBateria(p.bateriaPercentual)} />
      <Dado rotulo="Comunicação" valor={ROTULOS_STATUS_RASTREADOR[p.statusComunicacao]} />
      <Dado rotulo="Precisão estimada" valor={p.precisao === null ? "—" : `${formatarNumero(p.precisao)} m`} />
    </View>
  </>;
}
export default function Rastreamento({ painel, id, abrir, abrirCaminhao, executar }: {
  painel: Painel; id?: string; abrir: (id: string) => void; abrirCaminhao: (id: string) => void;
  executar: (acao: () => Promise<unknown>, sucesso?: string) => void;
}) {
  const { estado, posicoes } = painel;
  const { width } = useWindowDimensions();
  const padrao = useMemo(() => enquadrar([...posicoes, ...estado.caminhoes], focar(DEPOSITO_DEMO, 2)), [posicoes, estado.caminhoes]);
  const inicial = posicoes.find(p => p.bombonaId === id);
  const [regiao, setRegiao] = useState(() => inicial ? focar(inicial) : padrao);
  const [visivel, setVisivel] = useState(regiao);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("");
  const [cliente, setCliente] = useState("");
  const [caminhao, setCaminhao] = useState("");
  const [selecionado, setSelecionado] = useState(id ?? "");
  const alertados = useMemo(() => new Set(estado.alertas.filter(a => a.status !== "resolvido").map(a => a.bombonaId)), [estado.alertas]);
  const filtradas = useMemo(() => {
    const termo = normalizar(busca);
    const numeros = new Map(estado.bombonas.map(b => [b.id, b.numeroIdentificacao]));
    return posicoes.filter(p =>
      (!termo || [p.codigo, numeros.get(p.bombonaId) ?? "", p.codigoRastreador, p.serialRastreador].some(v => normalizar(v).includes(termo))) &&
      (!cliente || p.clienteId === cliente) && (!caminhao || p.caminhaoId === caminhao) &&
      (!filtro || filtro === p.statusBombona || filtro === p.statusComunicacao || (filtro === "alertas" && alertados.has(p.bombonaId))));
  }, [posicoes, estado.bombonas, cliente, caminhao, filtro, busca, alertados]);
  const grupos = useMemo(() => agrupar(filtradas, visivel, selecionado), [filtradas, visivel, selecionado]);
  const frota = estado.caminhoes.filter(c => !caminhao || c.id === caminhao);
  const marcadores: MarcadorMapa[] = Array.from(grupos, ([chave, grupo]) => {
    const p = grupo[0];
    if (grupo.length === 1) return { id: p.bombonaId, latitude: p.latitude, longitude: p.longitude, titulo: p.codigo, cor: CORES_MAPA[estadoPosicao(p)] };
    return { id: chave, latitude: grupo.reduce((acc, q) => acc + q.latitude, 0) / grupo.length,
      longitude: grupo.reduce((acc, q) => acc + q.longitude, 0) / grupo.length,
      titulo: `${formatarNumero(grupo.length)} bombonas`, texto: formatarNumero(grupo.length), cor: "#123B2C" };
  });
  for (const [i, c] of frota.entries()) marcadores.push({ ...c, id: `frota:${c.id}`, titulo: c.identificacao, cor: "#44399A", texto: `C${i + 1}`, veiculo: true });
  const p = filtradas.find(item => item.bombonaId === selecionado);
  const veiculo = frota.find(c => `frota:${c.id}` === selecionado);
  function selecionar(chave: string) {
    const grupo = grupos.get(chave);
    if (grupo && grupo.length > 1) {
      const centro = marcadores.find(m => m.id === chave)!;
      setRegiao(focar(centro, Math.max(.0001, Math.min(visivel.latitudeDelta, visivel.longitudeDelta) / 3)));
      return;
    }
    const posicao = grupo?.[0] ?? filtradas.find(q => q.bombonaId === chave) ?? frota.find(c => `frota:${c.id}` === chave);
    if (posicao) { setSelecionado(chave); setRegiao(focar(posicao)); }
  }
  const local = p && (estado.clientes.find(c => c.id === p.clienteId)?.endereco ?? estado.caminhoes.find(c => c.id === p.caminhaoId)?.identificacao ?? ROTULOS_STATUS_BOMBONA[p.statusBombona]);
  return <>
    <Titulo titulo="Mapa GPS" nota="Frequência prevista de rastreamento: a cada 30 minutos">
      <View style={estilo.linha}><Botao icon={Crosshair} onPress={() => setRegiao(enquadrar([...filtradas, ...frota], padrao))}>Centralizar mapa</Botao>
        <Botao icon={RefreshCw} onPress={() => executar(painel.atualizar, "Posições atualizadas.")}>Atualizar posições</Botao></View>
    </Titulo>
    <Cartao>
      <View style={[estilo.linha, { alignItems: "flex-end" }]}>
        <View style={{ flex: 2, minWidth: 190 }}><Campo rotulo="Buscar bombona" placeholder="Código ou identificador" value={busca} onChangeText={setBusca}
          onSubmitEditing={() => { if (filtradas.length) selecionar(filtradas[0].bombonaId); }} autoCapitalize="characters" /></View>
        <View style={{ flex: 1, minWidth: 140 }}><Escolha rotulo="Situação" valor={filtro} escolher={setFiltro} itens={[
          { value: "", label: "Todas as bombonas" }, ...opcoes(ROTULOS_STATUS_BOMBONA), { value: "online", label: "Conectado" },
          { value: "offline", label: "Sem comunicação" }, { value: "alertas", label: "Com alertas" },
        ]} /></View>
        <View style={{ flex: 1, minWidth: 140 }}><Escolha rotulo="Cliente" valor={cliente} escolher={setCliente} itens={[
          { value: "", label: "Todos os clientes" }, ...estado.clientes.map(c => ({ value: c.id, label: c.nome })),
        ]} /></View>
        <View style={{ flex: 1, minWidth: 130 }}><Escolha rotulo="Caminhão" valor={caminhao} escolher={setCaminhao} itens={[
          { value: "", label: "Todos os caminhões" }, ...estado.caminhoes.map(c => ({ value: c.id, label: c.identificacao })),
        ]} /></View>
      </View>
      <Text style={estilo.nota}>{formatarNumero(filtradas.length)} {filtradas.length === 1 ? "bombona nos filtros" : "bombonas nos filtros"} · {formatarNumero(frota.length)} {frota.length === 1 ? "caminhão" : "caminhões"}</Text>
      {!!busca && <View style={estilo.linha}>{filtradas.slice(0, 6).map(q => <Botao key={q.bombonaId} onPress={() => selecionar(q.bombonaId)}>{q.codigo}</Botao>)}</View>}
      <MapaBase marcadores={marcadores} regiao={regiao} foco={selecionado} altura={width > 850 ? 510 : 370} selecionar={selecionar} mover={setVisivel}
        rota={veiculo ? painel.simulacao?.rotas[veiculo.id] : undefined} />
      <View style={estilo.linha}>
        {Object.entries({ ...CORES_MAPA, Caminhões: "#44399A" }).map(([nome, cor]) => <View key={nome} style={estilo.linha}>
          <View style={{ width: 9, height: 9, borderRadius: 6, backgroundColor: cor }} /><Text style={estilo.nota}>{nome}</Text>
        </View>)}
      </View>
    </Cartao>
    {p && <Cartao><DadosPosicao p={p} local={local ?? "—"} /><View style={estilo.linha}><Botao onPress={() => abrir(p.bombonaId)}>Ver detalhes da bombona</Botao></View></Cartao>}
    {veiculo && <Cartao><Text style={estilo.subtitulo}>{veiculo.identificacao} · {veiculo.placa}</Text><Text style={estilo.nota}>Última atualização {formatarDataHora(veiculo.ultimaComunicacao)}</Text>
      <View style={estilo.linha}><Botao onPress={() => abrirCaminhao(veiculo.id)}>Ver caminhão</Botao></View></Cartao>}
  </>;
}
