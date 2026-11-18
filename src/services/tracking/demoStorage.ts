import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { criarBaseDemo } from "@/data/demo/seed";
import { expandirLeitura, type EstadoDemo } from "./model";
import { MockTrackingProvider } from "./MockTrackingProvider";

const CHAVE = "@biooleo/demo/3";
const FRAGMENTOS = 16;
const chaves = Array.from({ length: FRAGMENTOS }, (_, i) => `${CHAVE}/${i}`);
let pendente = Promise.resolve();

export async function carregarDemo() {
  await pendente.catch(() => {});
  const texto = Platform.OS === "web"
    ? await AsyncStorage.getItem(CHAVE)
    : (await AsyncStorage.multiGet(chaves)).map(([, valor]) => valor ?? "").join("");
  if (!texto) return new MockTrackingProvider(criarBaseDemo());
  const estado: EstadoDemo = JSON.parse(texto);
  const rastreadores = new Map(estado.bombonas.map(b => [b.id, b.rastreadorId]));
  estado.ultimas ??= {};
  for (const ciclo of estado.ciclos) {
    for (const leitura of ciclo.leituras) {
      const id = leitura[0];
      const rastreador = rastreadores.get(id);
      if (rastreador && !estado.ultimas[id]) estado.ultimas[id] = expandirLeitura(leitura, ciclo.instante, rastreador);
    }
  }
  return new MockTrackingProvider(estado);
}

export function salvarDemo(estado: EstadoDemo) {
  pendente = pendente.catch(() => {}).then(async () => {
    // A última leitura só precisa ser duplicada quando o dispositivo ficou
    // sem comunicação por mais tempo que a janela de histórico retida.
    const online = new Set(estado.rastreadores.filter(r => r.status === "online").map(r => r.bombonaId));
    const ultimas = Object.fromEntries(Object.entries(estado.ultimas).filter(([id]) => !online.has(id)));
    const texto = JSON.stringify({ ...estado, ultimas });
    if (Platform.OS === "web") return AsyncStorage.setItem(CHAVE, texto);
    const tamanho = Math.ceil(texto.length / FRAGMENTOS);
    return AsyncStorage.multiSet(chaves.map((chave, i) => [chave, texto.slice(i * tamanho, (i + 1) * tamanho)]));
  });
  return pendente;
}
