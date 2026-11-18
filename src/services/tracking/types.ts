import type {
  Localizacao,
  PosicaoBombona,
  Rastreador,
  StatusRastreador,
} from "@/types/tracking";

/**
 * Contrato único de obtenção de telemetria, independente do fornecedor.
 *
 * As telas nunca conhecem a implementação concreta: recebem posições e
 * eventos através deste contrato. Trocar o `MockTrackingProvider` pelo
 * `VisionTrackingProvider` não exige reescrever nenhuma tela.
 */

export interface TelemetriaRecebida {
  localizacao: Localizacao;
  statusComunicacao: StatusRastreador;
  bateriaPercentual: number | null;
}

export interface EventoRastreamento {
  tipo: "posicao" | "alerta" | "movimentacao" | "ciclo";
  ciclo: number;
  localizacoes: TelemetriaRecebida[];
}

export interface EstadoSimulacao {
  /** Indica se o motor de telemetria está em execução. */
  ativo: boolean;
  /** Número de ciclos simulados desde o início da demonstração. */
  ciclo: number;
  /** Intervalo operacional simulado entre ciclos (minutos). */
  intervaloOperacionalMin: number;
  /** Quantidade de posições geradas no último ciclo. */
  posicoesNoUltimoCiclo: number;
  /** Data/hora da última execução do ciclo. */
  ultimoCicloEm: string | null;
}

export interface TrackingProvider {
  /** Identificador estável do provedor. */
  readonly id: "mock" | "vision";
  /** Nome exibido na interface. */
  readonly nome: string;
  /** Verdadeiro quando os dados são simulados e não refletem ativos reais. */
  readonly simulado: boolean;

  /** Inicia o fluxo de telemetria. */
  iniciar(): void;
  /** Interrompe o fluxo sem descartar o estado acumulado. */
  pausar(): void;
  /** Interrompe e descarta listeners registrados. */
  parar(): void;
  /** Reinicia o provedor do zero. */
  reiniciar(): void;

  /** Snapshot das posições atuais de todas as bombonas conhecidas. */
  obterPosicoes(): PosicaoBombona[];
  /** Snapshot dos rastreadores conhecidos pelo provedor. */
  obterRastreadores(): Rastreador[];
  /** Estado atual do motor de simulação. */
  obterEstado(): EstadoSimulacao;

  /** Registra um listener. Retorna a função de cancelamento. */
  assinar(listener: (evento: EventoRastreamento) => void): () => void;

  /** Ações manuais de demonstração. */
  simularDeslocamentoCaminhoes(): void;
  simularPerdaComunicacao(): void;
  simularRecuperacaoSinal(): void;
  simularBateriaBaixa(): void;
}
