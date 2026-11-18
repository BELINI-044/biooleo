import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Bell from "lucide-react-native/icons/bell";
import Boxes from "lucide-react-native/icons/boxes";
import Building2 from "lucide-react-native/icons/building-complex";
import Droplets from "lucide-react-native/icons/droplets";
import History from "lucide-react-native/icons/rotate-ccw-clock";
import LayoutDashboard from "lucide-react-native/icons/layout-dashboard";
import LogOut from "lucide-react-native/icons/log-out";
import MapPin from "lucide-react-native/icons/map-pin";
import Menu from "lucide-react-native/icons/menu";
import Pause from "lucide-react-native/icons/pause";
import Play from "lucide-react-native/icons/play";
import Plus from "lucide-react-native/icons/plus";
import QrCode from "lucide-react-native/icons/qr-code";
import Settings from "lucide-react-native/icons/settings";
import Truck from "lucide-react-native/icons/truck";
import { DEMO_MODE } from "@/config/env";
import { formatarNumero } from "@/lib/format";
import { fecharDemonstracao } from "@/services/tracking/demoSession";
import { signOutUser } from "@/services/authService";
import Alertas from "./Alertas";
import { DetalhesBombona, FormBombona, LeitorBombona, ListaBombonas } from "./Bombonas";
import Configuracoes from "./Configuracoes";
import Historico from "./Historico";
import { Caminhoes, Clientes } from "./Operacao";
import Rastreamento from "./Rastreamento";
import { Botao, Cartao, cor, ErroOperacao, estilo, Tag, Titulo } from "./ui";
import { usePainel } from "./usePainel";
import VisaoGeral from "./VisaoGeral";

const links = [
  { id: "painel", titulo: "Painel geral", icon: LayoutDashboard },
  { id: "mapa", titulo: "Mapa GPS", icon: MapPin },
  { id: "bombonas", titulo: "Bombonas", icon: Boxes },
  { id: "cadastro", titulo: "Cadastrar bombona", icon: Plus },
  { id: "clientes", titulo: "Clientes", icon: Building2 },
  { id: "caminhoes", titulo: "Caminhões", icon: Truck },
  { id: "historico", titulo: "Histórico", icon: History },
  { id: "alertas", titulo: "Alertas", icon: Bell },
  { id: "configuracoes", titulo: "Configurações", icon: Settings },
] as const;
type Secao = typeof links[number]["id"] | "detalhes" | "leitor" | "operacoes";

export default function PainelAdmin({ nome }: { nome: string }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ secao?: Secao; id?: string; editar?: string; qr?: string }>();
  const { width } = useWindowDimensions();
  const lateral = width >= 1040;
  const [menu, setMenu] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean }>();
  const trava = useRef(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const painel = usePainel();
  const { estado, demo, simulacao, carregando } = painel;
  const b = estado.bombonas.find(item => item.id === params.id);
  const qrInvalido = !carregando && !!params.qr && !estado.bombonas.some(b => b.qrCode === params.qr);
  const secao = qrInvalido ? "leitor" : DEMO_MODE && params.secao === "operacoes" ? "painel" : params.secao ?? "painel";

  function navegar(destino: Secao, id?: string, editar = false) {
    router.setParams({ secao: destino, id: id ?? "", editar: editar ? "1" : "", qr: "" });
    setMenu(false);
  }
  const abrirBombona = (id: string) => navegar("detalhes", id);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [secao, params.id, params.editar]);
  useEffect(() => {
    if (carregando || !params.qr || painel.erro) return;
    const b = estado.bombonas.find(item => item.qrCode === params.qr);
    if (b) router.setParams({ secao: "detalhes", qr: "", id: b.id, editar: "" });
  }, [carregando, params.qr, estado.bombonas, router, painel.erro]);
  useEffect(() => {
    if (!mensagem || mensagem.erro) return;
    const timer = setTimeout(() => setMensagem(undefined), 5500);
    return () => clearTimeout(timer);
  }, [mensagem]);

  function executar(acao: () => Promise<unknown>, sucesso?: string) {
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setMensagem(undefined);
    void Promise.resolve().then(acao).then(() => {
      if (sucesso) setMensagem({ texto: sucesso, erro: false });
    }).catch(e => {
      setMensagem({ texto: e instanceof Error ? e.message : "Não foi possível concluir a operação.", erro: true });
    }).finally(() => { trava.current = false; setOcupado(false); });
  }
  function sair() {
    executar(async () => {
      if (DEMO_MODE) {
        await fecharDemonstracao();
      } else await signOutUser();
      router.replace("/");
    });
  }
  const ativos = estado.alertas.filter(a => a.status !== "resolvido").length;
  const props = { painel, executar, ocupado, abrirBombona };
  const simulador = demo && simulacao && <Botao icon={simulacao.ativo ? Pause : Play} desabilitado={ocupado} onPress={() => executar(async () => {
    if (simulacao.ativo) demo.pausar(); else demo.iniciar();
    await painel.persistir();
  }, simulacao.ativo ? "Simulação pausada." : "Simulação iniciada.")}>{simulacao.ativo ? "Pausar simulação" : "Iniciar simulação"}</Botao>;
  function corpo() {
    if (carregando) return <Cartao><ActivityIndicator color={cor.primary} /><Text style={estilo.nota}>Carregando o painel de rastreamento…</Text></Cartao>;
    if (painel.erro && !demo) return <Cartao>
      <Text accessibilityRole="alert" style={estilo.texto}>{painel.erro}</Text><View style={estilo.linha}>
        <Botao onPress={painel.tentarNovamente}>Tentar novamente</Botao>{!DEMO_MODE && <Botao onPress={() => router.push("/containers")}>Abrir bombonas da operação existente</Botao>}
      </View>
    </Cartao>;
    switch (secao) {
      case "mapa": return <Rastreamento key={params.id || "mapa"} painel={painel} id={params.id || undefined} abrir={abrirBombona} abrirCaminhao={id => navegar("caminhoes", id)} executar={executar} />;
      case "bombonas": return <ListaBombonas painel={painel} executar={executar} abrir={abrirBombona} nova={() => navegar("cadastro")} scan={() => navegar("leitor")} />;
      case "cadastro": return <FormBombona key={b?.id ?? "nova"} painel={painel} existente={b} abrir={abrirBombona} executar={executar} ocupado={ocupado}
        cancelar={() => b ? abrirBombona(b.id) : navegar("bombonas")} />;
      case "detalhes": return b ? <DetalhesBombona key={b.id} b={b} painel={painel} abrir={abrirBombona} editar={() => navegar("cadastro", b.id)}
        voltar={() => navegar("bombonas")} mapa={() => navegar("mapa", b.id)} executar={executar} ocupado={ocupado} />
        : <Cartao><Text style={estilo.texto}>Bombona indisponível.</Text><Botao onPress={() => navegar("bombonas")}>Voltar às bombonas</Botao></Cartao>;
      case "leitor": return <LeitorBombona painel={painel} abrir={abrirBombona} />;
      case "clientes": return <Clientes {...props} key={params.id || "clientes"} id={params.id || undefined} editando={params.editar === "1"} abrir={(id, editar) => navegar("clientes", id, editar)} />;
      case "caminhoes": return <Caminhoes {...props} key={params.id || "caminhoes"} id={params.id || undefined} editando={params.editar === "1"} abrir={(id, editar) => navegar("caminhoes", id, editar)} />;
      case "historico": return <Historico painel={painel} abrir={abrirBombona} executar={executar} />;
      case "alertas": return <Alertas painel={painel} abrir={abrirBombona} executar={executar} />;
      case "configuracoes": return <Configuracoes painel={painel} executar={executar} ocupado={ocupado} />;
      case "operacoes": return <>
        <Titulo titulo="Operações existentes" nota="Acesse os registros operacionais já usados pela equipe BioOleo." />
        <Cartao><View style={estilo.linha}>
          <Botao onPress={() => router.push("/containers")}>Cadastro operacional de bombonas</Botao>
          <Botao onPress={() => router.push("/container-labels")}>Etiquetas de bombonas</Botao>
          <Botao onPress={() => router.push("/establishments")}>Estabelecimentos</Botao>
          <Botao onPress={() => router.push("/dispatch")}>Despacho</Botao>
        </View></Cartao>
      </>;
      default: return <VisaoGeral estado={estado} posicoes={painel.posicoes} abrirMapa={() => navegar("mapa")} abrirHistorico={() => navegar("historico")}
        abrirBombona={abrirBombona} ativo={!!simulacao?.ativo} demo={DEMO_MODE} />;
    }
  }
  function navegacao() {
    const selecionada = secao === "detalhes" || secao === "leitor" ? "bombonas" : secao;
    return <>
      {links.map(({ id, titulo, icon: Icon }) => <Pressable key={id} accessibilityRole="button" accessibilityLabel={titulo}
        accessibilityHint={id === "alertas" && ativos ? `${formatarNumero(ativos)} alertas ativos` : undefined} accessibilityState={{ selected: selecionada === id }}
        onPress={() => navegar(id)} style={[styles.item, selecionada === id && styles.selecionado]}>
        <Icon size={17} color={selecionada === id ? "#ACEDC4" : "#B7D7C7"} />
        <Text style={styles.itemTexto}>{titulo}</Text>
        {id === "alertas" && ativos > 0 && <Text style={styles.contagem}>{formatarNumero(ativos)}</Text>}
      </Pressable>)}
      {!DEMO_MODE && <Pressable accessibilityRole="button" style={styles.item} onPress={() => navegar("operacoes")}><Boxes size={17} color="#B7D7C7" />
        <Text style={styles.itemTexto}>Operações existentes</Text></Pressable>}
    </>;
  }
  return <ErroOperacao.Provider value={mensagem?.erro ? mensagem.texto : ""}><SafeAreaView style={styles.area}>
    <View style={{ flex: 1, flexDirection: lateral ? "row" : "column" }}>
      {lateral && <View style={styles.lateral}>
        <View style={[estilo.linha, { paddingVertical: 13, marginBottom: 18, paddingHorizontal: 7 }]}>
          <View style={styles.marca}><Droplets size={22} color="#D4F6DE" /></View>
          <View><Text style={styles.nome}>BioOleo</Text><Text style={styles.marcaNota}>Gestão de bombonas</Text></View>
        </View>
        <ScrollView contentContainerStyle={{ gap: 3 }}>{navegacao()}</ScrollView>
        <Pressable accessibilityRole="button" style={styles.item} onPress={sair}><LogOut size={17} color="#B7D7C7" /><Text style={styles.itemTexto}>Sair</Text></Pressable>
      </View>}
      <View style={{ flex: 1, minWidth: 0, backgroundColor: cor.background }}>
        <View style={[styles.topo, { paddingHorizontal: lateral ? 26 : 15 }]}>
          <View style={estilo.linha}>{!lateral && <Botao icon={Menu} onPress={() => setMenu(v => !v)}>{menu ? "Fechar menu" : "Menu"}</Botao>}
            <Text style={estilo.rotulo}>{lateral ? "Operação BioOleo" : "BioOleo"}</Text>
            {DEMO_MODE && <Tag texto="Demonstração" tom="ambar" />}
          </View>
          <View style={estilo.linha}>
            {simulador}{lateral && <Botao icon={QrCode} onPress={() => navegar("leitor")}>Ler QR Code</Botao>}
            {lateral && <Text style={estilo.nota}>{nome}</Text>}
          </View>
        </View>
        {menu && !lateral && <ScrollView style={styles.mobile} contentContainerStyle={{ padding: 12, gap: 3 }}>
          {navegacao()}
          <Pressable accessibilityRole="button" style={styles.item} onPress={sair}><LogOut size={17} color="#B7D7C7" /><Text style={styles.itemTexto}>Sair</Text></Pressable>
        </ScrollView>}
        {mensagem && <View style={{ paddingVertical: 8, paddingHorizontal: 16, backgroundColor: mensagem.erro ? cor.criticalSoft : cor.primarySoft }}>
          <View style={estilo.espalhar}><Text accessibilityRole={mensagem.erro ? "alert" : undefined} accessibilityLiveRegion="polite"
            style={[estilo.texto, { flex: 1, color: mensagem.erro ? "#912C2C" : cor.primary }]}>{mensagem.texto}</Text>
            <Botao onPress={() => setMensagem(undefined)}>Dispensar</Botao></View>
        </View>}
        <ScrollView ref={scroll} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{
          padding: lateral ? 25 : 14, paddingBottom: 56, maxWidth: 1450, width: "100%", alignSelf: "center", gap: 16,
        }}>
          {!!painel.erro && demo && <Text style={[estilo.texto, { color: cor.critical }]} accessibilityRole="alert">{painel.erro}</Text>}
          {qrInvalido && <Text accessibilityRole="alert" style={{ color: cor.critical }}>O QR Code não pertence a uma bombona cadastrada neste ambiente.</Text>}
          {corpo()}
        </ScrollView>
      </View>
    </View>
  </SafeAreaView></ErroOperacao.Provider>;
}
const styles = StyleSheet.create({
  area: { flex: 1, backgroundColor: cor.primary },
  lateral: { width: 228, padding: 13, backgroundColor: "#103629", gap: 5 },
  marca: { backgroundColor: "#27634B", padding: 8, borderRadius: 10 },
  nome: { color: "#fff", fontSize: 21, fontWeight: "800" },
  marcaNota: { color: "#B7D7C7", fontSize: 11 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 10, minHeight: 42, borderRadius: 9 },
  selecionado: { backgroundColor: "#245640" },
  itemTexto: { color: "#ECF7EF", fontSize: 13, fontWeight: "600", flex: 1 },
  contagem: { backgroundColor: "#477159", color: "#fff", fontSize: 11, fontWeight: "700", borderRadius: 5, padding: 3, overflow: "hidden" },
  topo: { minHeight: 58, paddingVertical: 9, backgroundColor: cor.surface, borderBottomColor: cor.border, borderBottomWidth: 1,
    flexWrap: "wrap", alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 8 },
  mobile: { maxHeight: 300, backgroundColor: "#103629" },
});
