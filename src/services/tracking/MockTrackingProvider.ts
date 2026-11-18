import { SIMULACAO_INTERVALO_MS, SIMULACAO_INTERVALO_OPERACIONAL_MIN } from "@/config/env";
import { DEPOSITO_DEMO, pontoNaRota, ROTAS_DEMO } from "@/data/demo/geo";
import { criarBaseDemo } from "@/data/demo/seed";
import { distanciaKm } from "@/lib/format";
import { ROTULOS_TIPO_ALERTA, ROTULOS_TIPO_MOVIMENTACAO } from "@/types/tracking";
import type { Alerta, Bombona, Caminhao, Localizacao, Movimentacao, Rastreador, TipoAlerta, TipoMovimentacao } from "@/types/tracking";
import {
  codigoBombona, expandirLeitura, FABRICANTE_RASTREADOR, INTERVALO_MS, MODELO_RASTREADOR, obterPosicoes,
  validarBombona, validarCliente, validarVinculos, type DadosBombona, type DadosCliente, type EstadoDemo, type EventoOperacional, type Leitura,
} from "./model";
import type { EventoRastreamento, TrackingProvider } from "./types";

const CICLOS_RETIDOS = 8;
const PONTOS_POR_ROTA = 96;

function criarAlerta(estado: EstadoDemo, b: Bombona, tipo: TipoAlerta, descricao: string): Alerta {
  const ponto = estado.ultimas[b.id] ?? b;
  return {
    id: `${b.id}/${tipo}/${estado.agora}/${estado.alertas.length}`,
    bombonaId: b.id, rastreadorId: b.rastreadorId, tipo, descricao,
    gravidade: tipo === "sem_comunicacao" || tipo === "fora_de_area" ? "alta"
      : tipo === "entrada_deposito" || tipo === "saida_deposito" ? "baixa" : "media",
    status: "pendente", latitude: ponto.latitude, longitude: ponto.longitude,
    registradoEm: estado.agora, createdAt: estado.agora, simulado: true,
  };
}

function registrarMovimento(estado: EstadoDemo, b: Bombona, tipo: TipoMovimentacao, clienteId = b.clienteId, caminhaoId = b.caminhaoId) {
  const evento: Movimentacao = {
    id: `${b.id}/${tipo}/${estado.agora}/${estado.movimentacoes.length}`,
    bombonaId: b.id, codigoBombona: b.codigo, clienteId, caminhaoId, tipo,
    latitude: b.latitude, longitude: b.longitude, descricao: ROTULOS_TIPO_MOVIMENTACAO[tipo],
    registradoEm: estado.agora, createdAt: estado.agora,
  };
  estado.movimentacoes = [evento, ...estado.movimentacoes];
}

export class MockTrackingProvider implements TrackingProvider {
  readonly id = "mock";
  readonly nome = "Simulador BioOleo";
  readonly simulado = true;
  private timer: ReturnType<typeof setInterval> | undefined;
  private listeners = new Set<(evento: EventoRastreamento) => void>();

  constructor(private estado: EstadoDemo) {}

  snapshot() { return this.estado; }
  obterPosicoes() { return obterPosicoes(this.estado); }
  obterRastreadores() { return this.estado.rastreadores; }
  obterEstado() {
    const { ativo, ciclo, posicoesNoUltimoCiclo, ultimoCicloEm } = this.estado;
    return { ativo, ciclo, posicoesNoUltimoCiclo, ultimoCicloEm, intervaloOperacionalMin: SIMULACAO_INTERVALO_OPERACIONAL_MIN };
  }
  assinar(listener: (evento: EventoRastreamento) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private publicar(estado: EstadoDemo, tipo: EventoRastreamento["tipo"], posicoes: Localizacao[] = []) {
    this.estado = estado;
    const evento: EventoRastreamento = {
      tipo, ciclo: estado.ciclo, localizacoes: posicoes.map(localizacao => ({
        localizacao, statusComunicacao: localizacao.statusComunicacao, bateriaPercentual: localizacao.bateriaPercentual,
      })),
    };
    this.listeners.forEach(listener => listener(evento));
  }
  iniciar() {
    if (this.timer) return;
    this.timer = setInterval(() => this.atualizar(), SIMULACAO_INTERVALO_MS);
    this.publicar({ ...this.estado, ativo: true }, "ciclo");
  }
  pausar() {
    clearInterval(this.timer);
    this.timer = undefined;
    if (this.estado.ativo) this.publicar({ ...this.estado, ativo: false }, "ciclo");
  }
  parar() {
    this.listeners.clear();
    this.pausar();
  }
  reiniciar() {
    this.pausar();
    this.publicar(criarBaseDemo(), "ciclo");
  }
  definirDeslocamento(deslocamento: boolean) {
    this.publicar({ ...this.estado, deslocamento }, "ciclo");
  }
  simularDeslocamentoCaminhoes() { this.atualizar("deslocamento"); }
  simularPerdaComunicacao() { this.atualizar("perda"); }
  simularRecuperacaoSinal() { this.atualizar("recuperacao"); }
  simularBateriaBaixa() { this.atualizar("bateria"); }

  atualizar(acao?: "perda" | "recuperacao" | "bateria" | "deslocamento") {
    const anterior = this.estado;
    const ciclo = anterior.ciclo + 1;
    const agora = new Date(Date.parse(anterior.agora) + INTERVALO_MS).toISOString();
    const perdidos = acao === "recuperacao" ? {} as Record<string, number> : { ...anterior.perdidos };
    const mover = acao === "deslocamento" || anterior.deslocamento;
    const caminhoes = anterior.caminhoes.map((c, i) => {
      if (!mover || c.status !== "em_operacao") return c;
      return { ...c, ...pontoNaRota(ROTAS_DEMO[i % ROTAS_DEMO.length], ((ciclo + i * 5) % 24) / 24), ultimaComunicacao: agora };
    });
    const rotas = { ...anterior.rotas };
    caminhoes.forEach((c, i) => {
      if (c === anterior.caminhoes[i]) return;
      rotas[c.id] = [...(rotas[c.id] ?? [{ ...anterior.caminhoes[i], registradoEm: anterior.agora }]).slice(-(PONTOS_POR_ROTA - 1)),
        { latitude: c.latitude, longitude: c.longitude, registradoEm: agora }];
    });
    const estado: EstadoDemo = { ...anterior, agora, ciclo, ultimoCicloEm: agora, caminhoes, rotas, perdidos, ultimas: { ...anterior.ultimas } };
    const clientes = new Map(estado.clientes.map(c => [c.id, c]));
    const frota = new Map(caminhoes.map(c => [c.id, c]));
    const rastreadores = new Map(anterior.rastreadores.map(r => [r.id, r]));
    const novas: Localizacao[] = [];
    const leituras: Leitura[] = [];
    const novosAlertas: Alerta[] = [];
    const ativos = new Set(estado.alertas.filter(a => a.status !== "resolvido").map(a => `${a.bombonaId}/${a.tipo}`));
    function sinalizar(b: Bombona, tipo: TipoAlerta, descricao: string) {
      if (ativos.has(`${b.id}/${tipo}`)) return;
      novosAlertas.push(criarAlerta(estado, b, tipo, descricao));
    }
    const recuperados = new Set<string>();
    estado.rastreadores = estado.bombonas.map((b, i) => {
      const r = rastreadores.get(b.rastreadorId)!;
      if ((acao === "perda" && i < 18) || (!acao && (i + ciclo * 19) % 233 === 0)) perdidos[b.id] = ciclo + 4;
      if (perdidos[b.id] > ciclo) {
        const idade = r.ultimaComunicacao ? Date.parse(agora) - Date.parse(r.ultimaComunicacao) : Infinity;
        if (idade > 2 * INTERVALO_MS) sinalizar(b, "sem_comunicacao", "Sem transmissão há mais de 60 minutos.");
        return { ...r, status: "offline", updatedAt: agora };
      }
      if (r.status === "offline") recuperados.add(b.id);
      delete perdidos[b.id];
      const caminhao = b.caminhaoId && frota.get(b.caminhaoId);
      const cliente = b.clienteId && clientes.get(b.clienteId);
      const base = caminhao || (b.status === "em_cliente" && cliente) || b;
      const variacao = caminhao ? 0.00011 : 0.00004;
      const ocorrencia = !acao && ciclo % 9 === 0 && i === 20 && b.status === "no_deposito";
      const latitude = base.latitude + Math.sin(i * 12.5 + ciclo) * variacao + (ocorrencia ? 0.043 : 0);
      const longitude = base.longitude + Math.cos(i * 19.9 + ciclo) * variacao;
      const consumo = (i + ciclo * 17) % 80 === 0 ? 1 : 0;
      const bateria = acao === "bateria" && i < 12 ? 12 + i % 6 : Math.max(1, (r.bateriaPercentual ?? 100) - consumo);
      const velocidade = caminhao && mover && caminhao.status === "em_operacao" ? 32 + (ciclo % 23) : ocorrencia ? 26 : 0;
      const leitura: Leitura = [b.id, Math.round(latitude * 1e6), Math.round(longitude * 1e6), bateria, velocidade, i % 17 ? 12 : 65];
      leituras.push(leitura);
      const posicao = expandirLeitura(leitura, agora, r.id);
      novas.push(posicao);
      estado.ultimas[b.id] = posicao;
      if (bateria < 20 && ((r.bateriaPercentual ?? 100) >= 20 || acao === "bateria")) sinalizar(b, "bateria_baixa", "Carga do rastreador abaixo de 20%.");
      if (ocorrencia) {
        sinalizar(b, "movimentacao_inesperada", "Foi detectado deslocamento em uma bombona prevista para ficar no depósito.");
        if (distanciaKm(b.latitude, b.longitude, latitude, longitude) > 1) {
          sinalizar(b, "fora_de_area", "A posição simulada ultrapassou o raio permitido de 1 km.");
        }
      }
      return { ...r, status: "online", bateriaPercentual: bateria, ultimaComunicacao: agora, updatedAt: agora };
    });
    estado.alertas = [...novosAlertas, ...anterior.alertas.map(a =>
      a.tipo === "sem_comunicacao" && a.bombonaId && recuperados.has(a.bombonaId) && a.status !== "resolvido"
        ? { ...a, status: "resolvido" as const } : a)];
    estado.ciclos = [{ instante: agora, leituras }, ...anterior.ciclos.slice(0, CICLOS_RETIDOS - 1)];
    estado.posicoesNoUltimoCiclo = leituras.length;
    this.publicar(estado, "ciclo", novas);
  }

  salvarBombona(dados: DadosBombona, id?: string) {
    const anterior = this.estado;
    validarBombona(dados, anterior, id);
    const existente = anterior.bombonas.find(b => b.id === id);
    if (id && !existente) throw new Error("Bombona não encontrada.");
    const codigo = existente?.codigo ?? codigoBombona(anterior.proximoCodigo);
    const agora = anterior.agora;
    const { codigoRastreador, serial, ...campos } = dados;
    const b: Bombona = {
      ...campos, id: codigo, codigo, rastreadorId: codigo, qrCode: existente?.qrCode ?? `demo-${codigo}-${Date.now().toString(36)}`,
      createdAt: existente?.createdAt ?? agora, updatedAt: agora,
    };
    const anteriorR = anterior.rastreadores.find(r => r.id === b.rastreadorId);
    const r: Rastreador = {
      id: b.rastreadorId, bombonaId: b.id, modelo: MODELO_RASTREADOR, fabricante: FABRICANTE_RASTREADOR,
      codigo: codigoRastreador, serial, ultimaComunicacao: null, status: "offline", bateriaPercentual: 100,
      tipoConexao: "Simulada", createdAt: agora, ...anteriorR, updatedAt: agora,
    };
    r.codigo = codigoRastreador;
    r.serial = serial;
    const estado = {
      ...anterior, proximoCodigo: anterior.proximoCodigo + (existente ? 0 : 1),
      bombonas: existente ? anterior.bombonas.map(item => item.id === b.id ? b : item) : [b, ...anterior.bombonas],
      rastreadores: anteriorR ? anterior.rastreadores.map(item => item.id === r.id ? r : item) : [r, ...anterior.rastreadores],
    };
    registrarMovimento(estado, b, existente ? "edicao" : "cadastro");
    this.publicar(estado, "movimentacao");
    return b.id;
  }

  excluirBombona(id: string) {
    const b = this.estado.bombonas.find(item => item.id === id);
    if (!b) throw new Error("Bombona não encontrada.");
    const { [id]: _, ...ultimas } = this.estado.ultimas;
    const estado = {
      ...this.estado, ultimas, bombonas: this.estado.bombonas.filter(item => item.id !== id),
      rastreadores: this.estado.rastreadores.filter(r => r.bombonaId !== id),
      alertas: this.estado.alertas.map(a => a.bombonaId === id ? { ...a, status: "resolvido" as const } : a),
    };
    registrarMovimento(estado, b, "exclusao");
    this.publicar(estado, "movimentacao");
  }

  salvarCliente(dados: DadosCliente, id?: string) {
    const anterior = this.estado;
    validarCliente(dados, anterior.clientes, id);
    const existente = anterior.clientes.find(c => c.id === id);
    if (id && !existente) throw new Error("Cliente não encontrado.");
    const cliente = { ...dados, id: id ?? `cliente-local-${Date.now().toString(36)}`, createdAt: existente?.createdAt ?? anterior.agora };
    this.publicar({ ...anterior, clientes: existente
      ? anterior.clientes.map(c => c.id === id ? cliente : c) : [...anterior.clientes, cliente] }, "movimentacao");
    return cliente.id;
  }

  salvarCaminhao(id: string, dados: Pick<Caminhao, "identificacao" | "placa" | "modelo" | "motorista" | "status" | "dispositivoGps" | "latitude" | "longitude">) {
    const anterior = this.estado;
    if (anterior.caminhoes.some(c => c.id !== id && (dados.placa === c.placa || dados.identificacao === c.identificacao ||
        dados.dispositivoGps === c.dispositivoGps))) throw new Error("Já existe um caminhão com essa placa, identificação ou dispositivo.");
    this.publicar({ ...anterior, caminhoes: anterior.caminhoes.map(c => c.id === id ? { ...c, ...dados } : c) }, "movimentacao");
  }

  movimentar(id: string, tipo: EventoOperacional, destino?: string) {
    const anterior = this.estado;
    const b = anterior.bombonas.find(item => item.id === id);
    if (!b) throw new Error("Bombona não encontrada.");
    const cliente = anterior.clientes.find(c => c.id === destino);
    const caminhao = anterior.caminhoes.find(c => c.id === destino);
    const nova: Bombona = { ...b, updatedAt: anterior.agora };
    if (tipo === "entrega_cliente") {
      Object.assign(nova, { status: "em_cliente", clienteId: cliente?.id ?? null, caminhaoId: null, latitude: cliente?.latitude, longitude: cliente?.longitude });
    } else if (tipo === "retirada_caminhao" || tipo === "saida_deposito") {
      Object.assign(nova, { status: "em_transporte", caminhaoId: caminhao?.id ?? null, clienteId: null, latitude: caminhao?.latitude, longitude: caminhao?.longitude });
    } else if (tipo === "entrada_deposito") {
      Object.assign(nova, { status: "no_deposito", caminhaoId: null, clienteId: null, latitude: DEPOSITO_DEMO.latitude, longitude: DEPOSITO_DEMO.longitude });
    } else if (tipo === "manutencao") {
      Object.assign(nova, { status: "manutencao", caminhaoId: null });
    }
    if (tipo !== "inspecao") validarVinculos(anterior, nova);
    const estado = { ...anterior, bombonas: anterior.bombonas.map(item => item.id === id ? nova : item) };
    registrarMovimento(estado, nova, tipo, nova.clienteId ?? b.clienteId, nova.caminhaoId ?? b.caminhaoId);
    if (b.status !== nova.status && (b.status === "no_deposito" || nova.status === "no_deposito")) {
      const tipoAlerta = nova.status === "no_deposito" ? "entrada_deposito" : "saida_deposito";
      const alerta = criarAlerta(estado, nova, tipoAlerta, ROTULOS_TIPO_ALERTA[tipoAlerta]);
      estado.alertas = [{ ...alerta, latitude: nova.latitude, longitude: nova.longitude }, ...estado.alertas];
    }
    this.publicar(estado, "movimentacao");
  }

  alterarAlerta(id: string, status: Alerta["status"]) {
    this.publicar({ ...this.estado, alertas: this.estado.alertas.map(a => a.id === id ? { ...a, status } : a) }, "alerta");
  }

  historico({ ids, de, ate, inicio, limite }: {
    ids?: ReadonlySet<string>; de?: string; ate?: string; inicio: number; limite: number;
  }): Localizacao[] {
    const resultado: Localizacao[] = [];
    let ignorar = inicio;
    for (const { instante, leituras } of this.estado.ciclos) {
      if ((de && instante < de) || (ate && instante >= ate)) continue;
      for (const leitura of leituras) {
        const id = leitura[0];
        if (ids && !ids.has(id)) continue;
        if (ignorar > 0) { ignorar--; continue; }
        resultado.push(expandirLeitura(leitura, instante, id));
        if (resultado.length === limite) return resultado;
      }
    }
    return resultado;
  }
}
