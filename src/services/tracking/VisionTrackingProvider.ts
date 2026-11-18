import type { TrackingProvider } from "./types";

/**
 * O adaptador oficial será executado no servidor. A aplicação consulta a
 * telemetria normalizada no Supabase, independente do transporte do fornecedor.
 */
export class VisionTrackingProvider implements TrackingProvider {
  readonly id = "vision";
  readonly nome = "Vision Telematics";
  readonly simulado = false;

  private indisponivel(): never {
    throw new Error("A integração Vision Telematics aguarda documentação e credenciais oficiais.");
  }

  iniciar() { this.indisponivel(); }
  pausar() {}
  parar() {}
  reiniciar() { this.indisponivel(); }
  obterPosicoes() { return []; }
  obterRastreadores() { return []; }
  obterEstado() {
    return { ativo: false, ciclo: 0, intervaloOperacionalMin: 30, posicoesNoUltimoCiclo: 0, ultimoCicloEm: null };
  }
  assinar() { return () => {}; }
  simularDeslocamentoCaminhoes() { this.indisponivel(); }
  simularPerdaComunicacao() { this.indisponivel(); }
  simularRecuperacaoSinal() { this.indisponivel(); }
  simularBateriaBaixa() { this.indisponivel(); }
}
