import { createContext, useContext, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { adminTheme } from "@/theme/admin";

export const cor = adminTheme.colors;
export const estilo = StyleSheet.create({
  card: { backgroundColor: cor.surface, borderColor: cor.border, borderWidth: 1, borderRadius: 16, padding: 18, gap: 12 },
  linha: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  espalhar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  titulo: { color: cor.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  subtitulo: { color: cor.text, fontSize: 17, fontWeight: "700" },
  texto: { color: cor.text, fontSize: 14, lineHeight: 21 },
  nota: { color: cor.textSecondary, fontSize: 13, lineHeight: 20 },
  rotulo: { color: cor.text, fontSize: 13, fontWeight: "700" },
  input: {
    minHeight: 44, borderWidth: 1, borderColor: cor.borderStrong, backgroundColor: cor.surface,
    borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9, color: cor.text, fontSize: 14,
  },
  divisoria: { borderTopWidth: 1, borderTopColor: cor.border, paddingTop: 11, marginTop: 2 },
});
export function Titulo({ titulo, nota, children }: { titulo: string; nota?: string; children?: ReactNode }) {
  return <View style={estilo.espalhar}><View style={{ flexShrink: 1, gap: 3 }}>
    <Text accessibilityRole="header" style={estilo.titulo}>{titulo}</Text>
    {!!nota && <Text style={estilo.nota}>{nota}</Text>}
  </View>{children}</View>;
}
export function Cartao({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[estilo.card, style]}>{children}</View>;
}
export function Botao({ children, onPress, icon: Icon, variante = "secundario", desabilitado }: {
  children: string; onPress: () => void; icon?: LucideIcon; variante?: "principal" | "secundario" | "perigo"; desabilitado?: boolean;
}) {
  const fundo = variante === "principal" ? cor.primary : variante === "perigo" ? cor.criticalSoft : cor.surface;
  const texto = variante === "principal" ? "#fff" : variante === "perigo" ? "#9A2222" : cor.primary;
  return <Pressable accessibilityRole="button" disabled={desabilitado} onPress={onPress} style={({ pressed }) => ({
    opacity: desabilitado ? 0.5 : pressed ? 0.77 : 1, minHeight: 42, paddingHorizontal: 13, paddingVertical: 8,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    borderWidth: 1, borderColor: variante === "principal" ? cor.primary : cor.border, backgroundColor: fundo, borderRadius: 9,
  })}>{Icon && <Icon size={17} color={texto} />}<Text style={{ color: texto, fontSize: 13, fontWeight: "700", flexShrink: 1 }}>{children}</Text></Pressable>;
}
export function Campo({ rotulo, ...props }: TextInputProps & { rotulo: string }) {
  return <View style={{ gap: 5, minWidth: 0 }}><Text style={estilo.rotulo}>{rotulo}</Text>
    <TextInput accessibilityLabel={rotulo} placeholderTextColor={cor.textSecondary} {...props} style={[estilo.input, props.style]} />
  </View>;
}
export type Opcao<T extends string> = { value: T; label: string };
export function opcoes<T extends string>(rotulos: Record<T, string>): Opcao<T>[] {
  return Object.entries<string>(rotulos).map(([value, label]) => ({ value: value as T, label }));
}
export function Escolha<T extends string>({ rotulo, valor, itens, escolher, embutida }: { rotulo: string; valor: T; itens: readonly Opcao<T>[]; escolher: (valor: T) => void; embutida?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const filtrados = itens.filter(item => normalizar(item.label).includes(normalizar(busca)));
  const opcoesVisiveis = <>
      {itens.length > 8 && <Campo rotulo="Buscar opção" value={busca} onChangeText={setBusca} />}
      <ScrollView style={{ maxHeight: embutida ? 180 : 330 }} keyboardShouldPersistTaps="handled">
        {filtrados.length === 0 && <Text style={estilo.nota}>Nenhuma opção encontrada.</Text>}
        {filtrados.map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: item.value === valor }}
          onPress={() => { escolher(item.value); setAberto(false); }} style={{ padding: 12, backgroundColor: item.value === valor ? cor.primarySoft : undefined }}>
          <Text style={estilo.texto}>{item.label}</Text></Pressable>)}
      </ScrollView>
  </>;
  return <View style={{ gap: 5 }}>
    <Text style={estilo.rotulo}>{rotulo}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={() => { setBusca(""); setAberto(true); }} style={[estilo.input, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }]}>
      <Text style={[estilo.texto, { flexShrink: 1 }]}>{itens.find(item => item.value === valor)?.label ?? "Selecione"}</Text><Text style={estilo.nota}>▾</Text>
    </Pressable>
    {embutida ? (aberto && <View style={{ gap: 7 }}>{opcoesVisiveis}</View>) : <Janela aberta={aberto} titulo={rotulo} fechar={() => setAberto(false)}>
      {opcoesVisiveis}
    </Janela>}
  </View>;
}

export const ErroOperacao = createContext("");

export function Janela({ aberta, titulo, fechar, children }: { aberta: boolean; titulo: string; fechar: () => void; children: ReactNode }) {
  const erro = useContext(ErroOperacao);
  return <Modal visible={aberta} transparent animationType="fade" onRequestClose={fechar}>
    <View style={{ flex: 1, padding: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#10261C80" }}>
      <View role="dialog" aria-label={titulo} accessibilityViewIsModal style={[estilo.card, { width: "100%", maxWidth: 500, maxHeight: "90%" }]}>
        <View style={estilo.espalhar}><Text style={estilo.subtitulo}>{titulo}</Text><Botao onPress={fechar}>Fechar</Botao></View>
        {!!erro && <Text accessibilityRole="alert" style={{ color: cor.critical }}>{erro}</Text>}
        {children}
      </View>
    </View>
  </Modal>;
}
export function Tag({ texto, tom = "verde" }: { texto: string; tom?: "verde" | "cinza" | "vermelho" | "ambar" | "azul" }) {
  const [fundo, frente] = {
    verde: [cor.primarySoft, cor.primary], cinza: [cor.surfaceMuted, cor.textSecondary], vermelho: [cor.criticalSoft, "#922F2F"],
    ambar: [cor.accentSoft, "#724D00"], azul: [cor.infoSoft, "#21539A"],
  }[tom];
  return <Text style={{ color: frente, backgroundColor: fundo, paddingVertical: 4, paddingHorizontal: 9,
    fontSize: 12, fontWeight: "700", borderRadius: 6, alignSelf: "flex-start", overflow: "hidden" }}>{texto}</Text>;
}
export function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return <View style={{ flexGrow: 1, flexBasis: 145, gap: 2 }}>
    <Text style={estilo.nota}>{rotulo}</Text><Text style={estilo.texto}>{valor}</Text>
  </View>;
}
export function Paginas({ pagina, anterior, proxima, temMais }: { pagina: number; anterior: () => void; proxima: () => void; temMais: boolean }) {
  return <View style={estilo.espalhar}><Text style={estilo.nota}>Página {pagina + 1}</Text>
    <View style={estilo.linha}><Botao onPress={anterior} desabilitado={pagina === 0}>Anterior</Botao>
      <Botao onPress={proxima} desabilitado={!temMais}>Próxima</Botao></View></View>;
}
export function normalizar(s: string) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
