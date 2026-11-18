import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import ArrowUpRight from "lucide-react-native/icons/arrow-up-right";
import Bell from "lucide-react-native/icons/bell";
import Boxes from "lucide-react-native/icons/boxes";
import Building2 from "lucide-react-native/icons/building-complex";
import MapPin from "lucide-react-native/icons/map-pin";
import Radio from "lucide-react-native/icons/radio";
import RadioTower from "lucide-react-native/icons/radio-tower";
import Truck from "lucide-react-native/icons/truck";
import Warehouse from "lucide-react-native/icons/warehouse";
import { BarChart } from "react-native-gifted-charts";
import { formatarCoordenada, formatarData, formatarDataHora, formatarNumero } from "@/lib/format";
import type { EstadoPainel } from "@/services/tracking/model";
import { ROTULOS_TIPO_MOVIMENTACAO, type Movimentacao, type PosicaoBombona } from "@/types/tracking";
import { Botao, Cartao, cor, estilo, Tag, Titulo } from "./ui";

function Serie({ titulo, dados, corBarra }: { titulo: string; dados: { label: string; value: number }[]; corBarra: string }) {
  const [largura, larguraMedida] = useState(0);
  const maximo = Math.max(4, Math.ceil(Math.max(...dados.map(d => d.value)) / 4) * 4);
  const passo = (largura - 45) / dados.length;
  const barra = Math.max(12, Math.min(31, passo * .55));
  return <Cartao style={{ flexBasis: 305, flexGrow: 1, flexShrink: 1, minWidth: 0 }}><Text style={estilo.subtitulo}>{titulo}</Text>
    <View onLayout={e => larguraMedida(e.nativeEvent.layout.width)} style={{ minHeight: 155 }}>
    {largura > 140 && <BarChart
      width={largura - 45} height={125} maxValue={maximo} noOfSections={4} data={dados}
      frontColor={corBarra} barWidth={barra}
      disableScroll roundedTop initialSpacing={Math.max(2, (passo - barra) / 2)} spacing={Math.max(2, passo - barra)} rulesColor={cor.border} yAxisThickness={0}
      xAxisColor={cor.border} yAxisTextStyle={{ color: cor.textSecondary, fontSize: 10 }}
      formatYLabel={valor => formatarNumero(Number(valor))}
      xAxisLabelTextStyle={{ color: cor.textSecondary, fontSize: 10 }} />}
    </View>
  </Cartao>;
}
function Distribuicao({ titulo, itens }: { titulo: string; itens: { rotulo: string; valor: number; cor: string }[] }) {
  const total = itens.reduce((somado, item) => somado + item.valor, 0);
  return <Cartao style={{ flexBasis: 235, flexGrow: 1, flexShrink: 1 }}><Text style={estilo.subtitulo}>{titulo}</Text>
    <View style={{ flexDirection: "row", gap: total ? 3 : 0, height: 10, backgroundColor: cor.surfaceMuted, borderRadius: 8, overflow: "hidden" }}>
      {itens.filter(item => item.valor > 0).map(item => <View key={item.rotulo} style={{ flex: item.valor, backgroundColor: item.cor }} />)}
    </View>
    {itens.map(item => <View key={item.rotulo} style={estilo.espalhar}><View style={estilo.linha}>
      <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: item.cor }} /><Text style={estilo.texto}>{item.rotulo}</Text>
    </View><Text style={estilo.rotulo}>{formatarNumero(item.valor)}</Text></View>)}
  </Cartao>;
}
export function Movimentos({ itens, estado, abrir }: { itens: Movimentacao[]; estado: EstadoPainel; abrir: (id: string) => void }) {
  if (!itens.length) return <Text style={estilo.nota}>Nenhuma movimentação encontrada.</Text>;
  return <>{itens.map(m => {
    const b = estado.bombonas.find(item => item.id === m.bombonaId);
    const destino = estado.clientes.find(c => c.id === m.clienteId)?.nome ?? estado.caminhoes.find(c => c.id === m.caminhaoId)?.identificacao;
    return <View key={m.id} style={[estilo.espalhar, estilo.divisoria]}>
      <View style={{ flex: 1, minWidth: 150 }}>
        {b ? <Pressable accessibilityRole="button" onPress={() => abrir(b.id)}><Text style={{ color: cor.primaryMedium, fontWeight: "800" }}>{b.codigo}</Text></Pressable>
          : <Text style={estilo.rotulo}>{m.codigoBombona ?? "Bombona excluída"}</Text>}
        <Text style={estilo.nota}>{destino ?? (m.tipo === "entrada_deposito" ? "Depósito" : "Operação interna")} · {formatarCoordenada(m.latitude)} / {formatarCoordenada(m.longitude)}</Text>
      </View>
      <Text style={estilo.nota}>{formatarDataHora(m.registradoEm)}</Text>
      <Tag texto={ROTULOS_TIPO_MOVIMENTACAO[m.tipo]} tom="cinza" />
    </View>;
  })}</>;
}

export default function VisaoGeral({ estado, posicoes, abrirMapa, abrirHistorico, abrirBombona, ativo, demo }: {
  estado: EstadoPainel; posicoes: PosicaoBombona[]; abrirMapa: () => void; abrirHistorico: () => void;
  abrirBombona: (id: string) => void; ativo: boolean; demo: boolean;
}) {
  const total = estado.bombonas.length;
  const conectado = posicoes.filter(p => p.statusComunicacao === "online").length;
  const deposito = estado.bombonas.filter(b => b.status === "no_deposito").length;
  const clientes = estado.bombonas.filter(b => b.status === "em_cliente").length;
  const transporte = estado.bombonas.filter(b => b.status === "em_transporte").length;
  const alertas = estado.alertas.filter(a => a.status !== "resolvido").length;
  const indicadores = [
    { nome: "Total de bombonas", valor: total, icon: Boxes, tom: cor.primaryMedium, fundo: cor.primarySoft },
    { nome: "Rastreadores conectados", valor: conectado, icon: RadioTower, tom: cor.primaryMedium, fundo: cor.primarySoft },
    { nome: "Sem comunicação", valor: posicoes.length - conectado, icon: Radio, tom: "#A73A31", fundo: cor.criticalSoft },
    { nome: "No depósito", valor: deposito, icon: Warehouse, tom: "#426353", fundo: cor.surfaceMuted },
    { nome: "Em clientes", valor: clientes, icon: Building2, tom: "#315F9D", fundo: cor.infoSoft },
    { nome: "Em transporte", valor: transporte, icon: Truck, tom: "#4C42A0", fundo: "#EDEBFA" },
    { nome: "Alertas ativos", valor: alertas, icon: Bell, tom: "#875200", fundo: cor.accentSoft },
  ];
  const datas = Array.from({ length: 7 }, (_, i) => formatarData(new Date(Date.parse(estado.agora) - (6 - i) * 86_400_000)));
  const mensal = new Map<string, number>();
  const mesAtual = formatarData(estado.agora).split("/");
  const mesReferencia = Number(mesAtual[1]) - 1;
  const anoReferencia = Number(mesAtual[2]);
  for (let i = 5; i >= 0; i--) mensal.set(formatarData(new Date(Date.UTC(anoReferencia, mesReferencia - i, 1, 12))).slice(3), 0);
  for (const m of estado.movimentacoes) {
    const chave = formatarData(m.registradoEm).slice(3);
    if (mensal.has(chave)) mensal.set(chave, (mensal.get(chave) ?? 0) + 1);
  }
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return <>
    <Titulo titulo="Painel geral" nota="Acompanhe as bombonas, os rastreadores e a frota da BioOleo." />
    <View style={{ backgroundColor: cor.primary, borderRadius: 17, padding: 22, gap: 12 }}>
      <View style={estilo.espalhar}>
        <View style={{ gap: 7, flex: 1, minWidth: 190 }}>
          <View style={estilo.linha}><MapPin color="#86DEAB" size={20} />
            <Text style={{ color: "#A4E5BA", fontWeight: "800", fontSize: 13 }}>Rastreamento GPS</Text>
          </View>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 22 }}>Localização das bombonas</Text>
          <Text style={{ color: "#C8DBD0", fontSize: 13 }}>{demo ? (ativo ? "Simulação em execução · atualização a cada 12 segundos" : "Simulação pausada") : "Últimas posições registradas"} · {formatarDataHora(estado.agora)}</Text>
        </View>
        <Botao icon={ArrowUpRight} onPress={abrirMapa}>Abrir mapa GPS</Botao>
      </View>
    </View>
    <View style={[estilo.linha, { alignItems: "stretch" }]}>
      {indicadores.map(({ nome, valor, icon: Icon, tom, fundo }) => <Cartao key={nome} style={{ flexBasis: 130, flexGrow: 1, flexShrink: 1, padding: 14, gap: 8 }}>
        <View style={{ alignSelf: "flex-start", backgroundColor: fundo, borderRadius: 9, padding: 7 }}><Icon size={19} color={tom} /></View>
        <Text style={{ color: cor.text, fontSize: 25, fontWeight: "800" }}>{formatarNumero(valor)}</Text>
        <Text style={estilo.nota}>{nome}</Text>
      </Cartao>)}
    </View>
    <View style={[estilo.linha, { alignItems: "stretch" }]}>
      <Distribuicao titulo="Bombonas por localização" itens={[
        { rotulo: "Depósito", valor: deposito, cor: cor.primaryMedium }, { rotulo: "Clientes", valor: clientes, cor: cor.info },
        { rotulo: "Transporte", valor: transporte, cor: cor.series.quinary },
        ...((total > deposito + clientes + transporte) ? [{ rotulo: "Manutenção", valor: total - deposito - clientes - transporte, cor: cor.accent }] : []),
      ]} />
      <Serie titulo="Movimentações nos últimos sete dias" corBarra={cor.primaryMedium} dados={datas.map(d => ({
        label: d.slice(0, 5), value: estado.indicadores ? estado.indicadores.movimentosDia[d] ?? 0 : estado.movimentacoes.filter(m => formatarData(m.registradoEm) === d).length }))} />
    </View>
    <Cartao>
      <View style={estilo.espalhar}><Text style={estilo.subtitulo}>Últimas movimentações</Text><Botao onPress={abrirHistorico}>Ver histórico</Botao></View>
      <Movimentos itens={estado.movimentacoes.slice(0, 5)} estado={estado} abrir={abrirBombona} />
    </Cartao>
    <View style={[estilo.linha, { alignItems: "stretch" }]}>
      <Distribuicao titulo="Comunicação dos rastreadores" itens={[
        { rotulo: "Conectados", valor: conectado, cor: cor.primaryMedium },
        { rotulo: "Sem comunicação", valor: posicoes.length - conectado, cor: cor.critical },
      ]} />
      <Serie titulo="Histórico de alertas" corBarra={cor.accent} dados={datas.map(d => ({
        label: d.slice(0, 5), value: estado.indicadores ? estado.indicadores.alertasDia[d] ?? 0 : estado.alertas.filter(m => formatarData(m.registradoEm) === d).length }))} />
      <Serie titulo="Movimentações mensais" corBarra={cor.primaryMedium} dados={Array.from(mensal, ([d, value]) => ({
        label: meses[Number(d.slice(0, 2)) - 1], value: estado.indicadores ? estado.indicadores.movimentosMes[d] ?? 0 : value }))} />
    </View>
  </>;
}
