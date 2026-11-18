import type { PosicaoBombona } from "@/types/tracking";

export type PontoMapa = { latitude: number; longitude: number };
export type Regiao = PontoMapa & { latitudeDelta: number; longitudeDelta: number };
export type MarcadorMapa = PontoMapa & { id: string; titulo: string; cor: string; texto?: string; veiculo?: boolean };
export type PropsMapa = {
  marcadores: MarcadorMapa[]; regiao: Regiao; foco?: string; rota?: PontoMapa[]; altura: number;
  selecionar: (id: string) => void; mover?: (regiao: Regiao) => void;
};

export const CORES_MAPA = { Atualizada: "#198052", Desatualizada: "#BD780B", "Sem comunicação": "#B53D39", Aproximada: "#386EB5" };
export function estadoPosicao(p: PosicaoBombona): keyof typeof CORES_MAPA {
  if (p.fonteDado === "manual") return "Aproximada";
  if (p.statusComunicacao === "offline" && p.idadeMinutos > 60) return "Sem comunicação";
  if (p.desatualizada || p.statusComunicacao === "offline") return "Desatualizada";
  return p.aproximada ? "Aproximada" : "Atualizada";
}
export function focar(p: PontoMapa, delta = 0.005): Regiao {
  return { latitude: p.latitude, longitude: p.longitude, latitudeDelta: delta, longitudeDelta: delta };
}
export function enquadrar(pontos: readonly PontoMapa[], padrao: Regiao): Regiao {
  if (pontos.length === 0) return padrao;
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  for (const p of pontos) {
    minLat = Math.min(minLat, p.latitude); maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude); maxLng = Math.max(maxLng, p.longitude);
  }
  return { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.012, (maxLat - minLat) * 1.3), longitudeDelta: Math.max(0.012, (maxLng - minLng) * 1.3) };
}
export function agrupar(posicoes: PosicaoBombona[], regiao: Regiao, selecionado?: string) {
  const grupos = new Map<string, PosicaoBombona[]>();
  const passoLat = Math.max(0.000006, regiao.latitudeDelta / 11);
  const passoLng = Math.max(0.000006, regiao.longitudeDelta / 15);
  for (const p of posicoes) {
    if (p.bombonaId !== selecionado && (Math.abs(p.latitude - regiao.latitude) > regiao.latitudeDelta * 0.68 ||
        Math.abs(p.longitude - regiao.longitude) > regiao.longitudeDelta * 0.68)) continue;
    const chave = p.bombonaId === selecionado ? p.bombonaId : `c-${Math.floor(p.latitude / passoLat)}-${Math.floor(p.longitude / passoLng)}`;
    const grupo = grupos.get(chave);
    if (grupo) grupo.push(p); else grupos.set(chave, [p]);
  }
  return grupos;
}
