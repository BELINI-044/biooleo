/**
 * Localidades de demonstração no Paraná.
 *
 * Estas coordenadas são referências geográficas de cidades paranaenses
 * usadas para simular a distribuição da operação.
 */

export interface LocalDemo {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  /** Raio de dispersão, em graus, usado para espalhar os ativos. */
  dispersaoGraus: number;
}

/** Centro operacional (depósito) da demonstração. */
export const DEPOSITO_DEMO: LocalDemo = {
  id: "deposito-central",
  nome: "Depósito Central BioOleo (demonstração)",
  latitude: -25.4284,
  longitude: -49.2733,
  dispersaoGraus: 0.018,
};

/** Cidades do Paraná usadas como sede de clientes na demonstração. */
export const CIDADES_DEMO: LocalDemo[] = [
  {
    id: "curitiba",
    nome: "Curitiba",
    latitude: -25.4284,
    longitude: -49.2733,
    dispersaoGraus: 0.035,
  },
  {
    id: "sao-jose-dos-pinhais",
    nome: "São José dos Pinhais",
    latitude: -25.4954,
    longitude: -49.2944,
    dispersaoGraus: 0.018,
  },
  {
    id: "colombo",
    nome: "Colombo",
    latitude: -25.2917,
    longitude: -49.2242,
    dispersaoGraus: 0.016,
  },
  {
    id: "piraquara",
    nome: "Piraquara",
    latitude: -25.4415,
    longitude: -49.0628,
    dispersaoGraus: 0.014,
  },
  {
    id: "pinhais",
    nome: "Pinhais",
    latitude: -25.4447,
    longitude: -49.1925,
    dispersaoGraus: 0.014,
  },
  {
    id: "campo-largo",
    nome: "Campo Largo",
    latitude: -25.4589,
    longitude: -49.5281,
    dispersaoGraus: 0.018,
  },
  {
    id: "araucaria",
    nome: "Araucária",
    latitude: -25.5931,
    longitude: -49.4100,
    dispersaoGraus: 0.020,
  },
  {
    id: "almirante-tamandare",
    nome: "Almirante Tamandaré",
    latitude: -25.3247,
    longitude: -49.3097,
    dispersaoGraus: 0.016,
  },
  {
    id: "lapa",
    nome: "Lapa",
    latitude: -25.3861,
    longitude: -49.7172,
    dispersaoGraus: 0.014,
  },
  {
    id: "campo-mourão",
    nome: "Campo Mourão",
    latitude: -24.0459,
    longitude: -52.3831,
    dispersaoGraus: 0.016,
  },
  {
    id: "maringá",
    nome: "Maringá",
    latitude: -23.4253,
    longitude: -51.9386,
    dispersaoGraus: 0.030,
  },
  {
    id: "londrina",
    nome: "Londrina",
    latitude: -23.3103,
    longitude: -51.1628,
    dispersaoGraus: 0.030,
  },
  {
    id: "paranaguá",
    nome: "Paranaguá",
    latitude: -25.5213,
    longitude: -48.5303,
    dispersaoGraus: 0.014,
  },
  {
    id: "ponta-grossa",
    nome: "Ponta Grossa",
    latitude: -25.0916,
    longitude: -50.1668,
    dispersaoGraus: 0.022,
  },
  {
    id: "guarapuava",
    nome: "Guarapuava",
    latitude: -25.3958,
    longitude: -51.4625,
    dispersaoGraus: 0.018,
  },
];

/** Rota simulada percorrida pelos caminhões na demonstração. */
export interface RotaDemonstracao {
  id: string;
  nome: string;
  pontos: { latitude: number; longitude: number }[];
}

export const ROTAS_DEMO: RotaDemonstracao[] = [
  {
    id: "rota-circular",
    nome: "Rota circular RMC",
    pontos: [
      { latitude: -25.4284, longitude: -49.2733 },
      { latitude: -25.4415, longitude: -49.0628 },
      { latitude: -25.4447, longitude: -49.1925 },
      { latitude: -25.4954, longitude: -49.2944 },
      { latitude: -25.2917, longitude: -49.2242 },
      { latitude: -25.3247, longitude: -49.3097 },
      { latitude: -25.4284, longitude: -49.2733 },
    ],
  },
  {
    id: "rota-norte",
    nome: "Rota norte",
    pontos: [
      { latitude: -25.4284, longitude: -49.2733 },
      { latitude: -25.4589, longitude: -49.5281 },
      { latitude: -25.5931, longitude: -49.4100 },
      { latitude: -25.3861, longitude: -49.7172 },
      { latitude: -25.5213, longitude: -48.5303 },
      { latitude: -25.4954, longitude: -49.2944 },
      { latitude: -25.4284, longitude: -49.2733 },
    ],
  },
];

/**
 * Converte um ponto da rota em coordenadas interpoladas.
 * @param indiceProgresso posição entre 0 e 1 ao longo da rota.
 */
export function pontoNaRota(
  rota: RotaDemonstracao,
  indiceProgresso: number,
): { latitude: number; longitude: number } {
  const pontos = rota.pontos;
  const segmentos = pontos.length - 1;

  if (segmentos <= 0) {
    return pontos[0];
  }

  const posicao = Math.min(0.9999, Math.max(0, indiceProgresso)) * segmentos;
  const segmento = Math.floor(posicao);
  const fracao = posicao - segmento;

  const inicio = pontos[segmento];
  const fim = pontos[Math.min(segmento + 1, pontos.length - 1)];

  return {
    latitude: inicio.latitude + (fim.latitude - inicio.latitude) * fracao,
    longitude: inicio.longitude + (fim.longitude - inicio.longitude) * fracao,
  };
}
