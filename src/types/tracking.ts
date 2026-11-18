/**
 * Modelo de domínio do rastreamento de bombonas BioOleo.
 *
 * Estes tipos espelham as tabelas criadas nas migrations SQL e são
 * independentes do fornecedor de telemetria: tanto o `MockTrackingProvider`
 * quanto o futuro `VisionTrackingProvider` produzem dados neste formato.
 */

export type StatusBombona =
  | "no_deposito"
  | "em_cliente"
  | "em_transporte"
  | "manutencao";

export type StatusRastreador = "online" | "offline";

export type StatusCliente = "ativo" | "inativo";

export type StatusCaminhao = "em_operacao" | "parado" | "manutencao";

export type TipoMovimentacao =
  | "cadastro"
  | "edicao"
  | "exclusao"
  | "entrega_cliente"
  | "retirada_caminhao"
  | "entrada_deposito"
  | "saida_deposito"
  | "inspecao"
  | "manutencao";

export type TipoAlerta =
  | "sem_comunicacao"
  | "bateria_baixa"
  | "movimentacao_inesperada"
  | "fora_de_area"
  | "entrada_deposito"
  | "saida_deposito"
  | "remocao_equipamento";

export type GravidadeAlerta = "baixa" | "media" | "alta" | "critica";

export type StatusAlerta = "pendente" | "visualizado" | "resolvido";

export type FonteDado = "gps" | "simulado" | "manual";

export interface Bombona {
  id: string;
  codigo: string;
  numeroIdentificacao: string;
  capacidadeLitros: number;
  modelo: string;
  status: StatusBombona;
  clienteId: string | null;
  rastreadorId: string;
  caminhaoId: string | null;
  qrCode: string;
  latitude: number;
  longitude: number;
  dataInstalacao: string;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Rastreador {
  id: string;
  codigo: string;
  serial: string;
  modelo: string;
  fabricante: string;
  bombonaId: string | null;
  status: StatusRastreador;
  bateriaPercentual: number | null;
  ultimaComunicacao: string | null;
  tipoConexao: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cnpj: string;
  responsavel: string;
  telefone: string;
  endereco: string;
  latitude: number;
  longitude: number;
  status: StatusCliente;
  createdAt: string;
}

export interface Caminhao {
  id: string;
  identificacao: string;
  placa: string;
  modelo: string;
  motorista: string;
  latitude: number;
  longitude: number;
  status: StatusCaminhao;
  dispositivoGps: string;
  ultimaComunicacao: string | null;
  createdAt: string;
}

export interface Localizacao {
  id: string;
  bombonaId: string;
  rastreadorId: string;
  latitude: number;
  longitude: number;
  precisao: number | null;
  velocidade: number | null;
  bateriaPercentual: number | null;
  fonteDado: FonteDado;
  statusComunicacao: StatusRastreador;
  registradoEm: string;
  createdAt: string;
}

export interface Movimentacao {
  id: string;
  bombonaId: string;
  codigoBombona?: string;
  clienteId: string | null;
  caminhaoId: string | null;
  tipo: TipoMovimentacao;
  latitude: number;
  longitude: number;
  descricao: string;
  registradoEm: string;
  createdAt: string;
}

export interface Alerta {
  id: string;
  bombonaId: string | null;
  rastreadorId: string | null;
  tipo: TipoAlerta;
  gravidade: GravidadeAlerta;
  descricao: string;
  status: StatusAlerta;
  latitude: number | null;
  longitude: number | null;
  registradoEm: string;
  createdAt: string;
  /** Alertas gerados pelo simulador são sempre identificados como simulados. */
  simulado: boolean;
}

/** Posição atual de uma bombona, já resolvida com o dispositivo associado. */
export interface PosicaoBombona {
  bombonaId: string;
  codigo: string;
  rastreadorId: string;
  codigoRastreador: string;
  serialRastreador: string;
  latitude: number;
  longitude: number;
  precisao: number | null;
  velocidade: number | null;
  bateriaPercentual: number | null;
  statusComunicacao: StatusRastreador;
  statusBombona: StatusBombona;
  clienteId: string | null;
  caminhaoId: string | null;
  registradoEm: string;
  /** Verdadeiro quando a posição é uma aproximação do local da bombona. */
  aproximada: boolean;
  fonteDado: FonteDado;
  /** Verdadeiro quando a leitura é antiga e não representa o ponto atual. */
  desatualizada: boolean;
  /** Minutos decorridos desde a última transmissão do dispositivo. */
  idadeMinutos: number;
}

export const ROTULOS_STATUS_BOMBONA: Record<StatusBombona, string> = {
  no_deposito: "No depósito",
  em_cliente: "Em cliente",
  em_transporte: "Em transporte",
  manutencao: "Em manutenção",
};

export const ROTULOS_STATUS_RASTREADOR: Record<StatusRastreador, string> = {
  online: "Conectado",
  offline: "Sem comunicação",
};

export const ROTULOS_TIPO_MOVIMENTACAO: Record<TipoMovimentacao, string> = {
  cadastro: "Cadastro",
  edicao: "Edição",
  exclusao: "Exclusão",
  entrega_cliente: "Entrega ao cliente",
  retirada_caminhao: "Retirada pelo caminhão",
  entrada_deposito: "Entrada no depósito",
  saida_deposito: "Saída do depósito",
  inspecao: "Inspeção",
  manutencao: "Manutenção",
};

export const ROTULOS_TIPO_ALERTA: Record<TipoAlerta, string> = {
  sem_comunicacao: "Sem comunicação",
  bateria_baixa: "Bateria baixa",
  movimentacao_inesperada: "Movimentação não esperada",
  fora_de_area: "Saída de área permitida",
  entrada_deposito: "Entrada no depósito",
  saida_deposito: "Saída do depósito",
  remocao_equipamento: "Possível remoção do equipamento",
};

export const ROTULOS_GRAVIDADE_ALERTA: Record<GravidadeAlerta, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export const ROTULOS_STATUS_ALERTA: Record<StatusAlerta, string> = {
  pendente: "Pendente",
  visualizado: "Visualizado",
  resolvido: "Resolvido",
};

export const ROTULOS_STATUS_CLIENTE: Record<StatusCliente, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
};

export const ROTULOS_STATUS_CAMINHAO: Record<StatusCaminhao, string> = {
  em_operacao: "Em operação",
  parado: "Parado",
  manutencao: "Em manutenção",
};
