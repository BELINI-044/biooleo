import { cnpjValido } from "@/lib/cnpj";
import { SIMULACAO_INTERVALO_OPERACIONAL_MIN } from "@/config/env";
import type { Alerta, Bombona, Caminhao, Cliente, Localizacao, Movimentacao, PosicaoBombona, Rastreador, TipoMovimentacao } from "@/types/tracking";

export const MODELO_RASTREADOR = "Barra Edge SL-0001-PT";
export const FABRICANTE_RASTREADOR = "Vision Telematics";
export const INTERVALO_MS = SIMULACAO_INTERVALO_OPERACIONAL_MIN * 60_000;
export const QR_PREFIXO = "biooleo://admin?qr=";

type Ponto = Pick<Localizacao, "latitude" | "longitude">;
export type DadosBombona = Omit<Bombona, "id" | "codigo" | "rastreadorId" | "qrCode" | "createdAt" | "updatedAt"> & {
  codigoRastreador: string;
  serial: string;
};
export type DadosCliente = Omit<Cliente, "id" | "createdAt">;
export type EventoOperacional = Exclude<TipoMovimentacao, "cadastro" | "edicao" | "exclusao">;

// Em um ciclo, o horário é compartilhado por todas as transmissões.
export type Leitura = [identificador: string, latitudeE6: number, longitudeE6: number, bateria: number, velocidade: number, precisao: number];
export interface CicloLocal { instante: string; leituras: Leitura[] }
export interface PontoRota extends Ponto { registradoEm: string }
export interface EstadoPainel {
  bombonas: Bombona[];
  clientes: Cliente[];
  caminhoes: Caminhao[];
  rastreadores: Rastreador[];
  movimentacoes: Movimentacao[];
  alertas: Alerta[];
  ultimas: Record<string, Localizacao>;
  agora: string;
  indicadores?: { movimentosDia: Record<string, number>; movimentosMes: Record<string, number>; alertasDia: Record<string, number> };
}
export interface EstadoDemo extends EstadoPainel {
  proximoCodigo: number;
  ciclo: number;
  ativo: boolean;
  deslocamento: boolean;
  posicoesNoUltimoCiclo: number;
  ultimoCicloEm: string | null;
  perdidos: Record<string, number>;
  ciclos: CicloLocal[];
  rotas: Record<string, PontoRota[]>;
}
export const estadoVazio = (): EstadoPainel => ({
  bombonas: [], clientes: [], caminhoes: [], rastreadores: [], movimentacoes: [], alertas: [], ultimas: {},
  agora: new Date().toISOString(),
});

export function codigoBombona(numero: number) {
  return "BIO-" + String(numero).padStart(6, "0");
}

export function validarCoordenadas({ latitude, longitude }: Ponto) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error("Informe latitude entre −90 e 90 e longitude entre −180 e 180.");
  }
}

export function coordenadas(texto: string) {
  return texto.trim() ? Number(texto.replace(",", ".")) : NaN;
}

export function validarBombona(dados: DadosBombona, estado: EstadoPainel, id?: string) {
  validarCoordenadas(dados);
  if (!dados.numeroIdentificacao || !dados.modelo || !dados.codigoRastreador || !dados.serial) {
    throw new Error("Preencha a identificação, o modelo, o código e o número de série do rastreador.");
  }
  if (!Number.isFinite(dados.capacidadeLitros) || dados.capacidadeLitros <= 0 || dados.capacidadeLitros > 10_000) {
    throw new Error("Informe uma capacidade entre 0 e 10.000 L.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.dataInstalacao) ||
      Number.isNaN(Date.parse(dados.dataInstalacao)) ||
      new Date(dados.dataInstalacao).toISOString().slice(0, 10) !== dados.dataInstalacao) {
    throw new Error("Informe uma data de instalação válida no formato DD/MM/AAAA.");
  }
  if (estado.bombonas.some(b => b.id !== id && b.numeroIdentificacao.toUpperCase() === dados.numeroIdentificacao.toUpperCase())) {
    throw new Error("Esse número de identificação já está em uso.");
  }
  if (estado.rastreadores.some(r => r.bombonaId !== id &&
    (r.codigo.toUpperCase() === dados.codigoRastreador.toUpperCase() || r.serial.toUpperCase() === dados.serial.toUpperCase()))) {
    throw new Error("Já existe um rastreador com esse código ou número de série.");
  }
  validarVinculos(estado, dados);
}

export function validarVinculos(estado: EstadoPainel, dados: Pick<Bombona, "status" | "clienteId" | "caminhaoId">) {
  if ((dados.clienteId || dados.status === "em_cliente") &&
      !estado.clientes.some(c => c.id === dados.clienteId && c.status === "ativo")) {
    throw new Error("Selecione um cliente ativo.");
  }
  if ((dados.caminhaoId || dados.status === "em_transporte") &&
      !estado.caminhoes.some(c => c.id === dados.caminhaoId && c.status !== "manutencao")) {
    throw new Error("Selecione um caminhão disponível.");
  }
}

export function validarCliente(dados: DadosCliente, clientes: Cliente[], id?: string) {
  validarCoordenadas(dados);
  if (!dados.nome || !dados.responsavel || !dados.telefone || !dados.endereco) {
    throw new Error("Preencha nome, responsável, telefone e endereço.");
  }
  if (!cnpjValido(dados.cnpj)) throw new Error("Informe um CNPJ válido de 14 caracteres.");
  if (clientes.some(cliente => cliente.cnpj === dados.cnpj && cliente.id !== id)) throw new Error("Esse CNPJ já está cadastrado.");
}

export function obterPosicoes(estado: EstadoPainel): PosicaoBombona[] {
  const rastreadores = new Map(estado.rastreadores.map(r => [r.id, r]));
  const agora = Date.parse(estado.agora);
  return estado.bombonas.flatMap(b => {
    const r = rastreadores.get(b.rastreadorId);
    if (!r) return [];
    const leitura = estado.ultimas[b.id];
    const idade = r.ultimaComunicacao ? Math.max(0, Math.floor((agora - Date.parse(r.ultimaComunicacao)) / 60_000)) : Infinity;
    return [{
      bombonaId: b.id, codigo: b.codigo, rastreadorId: r.id, codigoRastreador: r.codigo, serialRastreador: r.serial,
      latitude: leitura?.latitude ?? b.latitude, longitude: leitura?.longitude ?? b.longitude,
      precisao: leitura?.precisao ?? null, velocidade: leitura?.velocidade ?? null, bateriaPercentual: r.bateriaPercentual,
      statusComunicacao: idade > 60 ? "offline" : r.status, statusBombona: b.status,
      clienteId: b.clienteId, caminhaoId: b.caminhaoId, registradoEm: leitura?.registradoEm ?? b.updatedAt,
      aproximada: !leitura || leitura.fonteDado === "manual" || (leitura.precisao ?? 0) >= 50,
      desatualizada: idade > 30, idadeMinutos: idade, fonteDado: leitura?.fonteDado ?? "manual",
    }];
  });
}

export function expandirLeitura(leitura: Leitura, instante: string, rastreadorId: string): Localizacao {
  const [bombonaId, lat, lng, bateriaPercentual, velocidade, precisao] = leitura;
  return {
    id: `${bombonaId}/${instante}`, bombonaId, rastreadorId, latitude: lat / 1e6, longitude: lng / 1e6,
    bateriaPercentual, precisao, velocidade, statusComunicacao: "online", fonteDado: "simulado",
    registradoEm: instante, createdAt: instante,
  };
}
