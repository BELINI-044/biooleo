import { completarCnpj } from "@/lib/cnpj";
import { DEMO_TOTAL_BOMBONAS } from "@/config/env";
import { CIDADES_DEMO, DEPOSITO_DEMO, pontoNaRota, ROTAS_DEMO } from "@/data/demo/geo";
import { codigoBombona, expandirLeitura, FABRICANTE_RASTREADOR, INTERVALO_MS, MODELO_RASTREADOR, type EstadoDemo, type Leitura } from "@/services/tracking/model";
import type { Bombona, Caminhao, Cliente, Rastreador } from "@/types/tracking";

const nomes = ["Mesa do Vale", "Estação do Sabor", "Casa da Brasa", "Cozinha da Praça", "Raízes do Sul"];

export function criarBaseDemo(referencia = new Date()): EstadoDemo {
  const agora = referencia.toISOString();
  const clientes: Cliente[] = CIDADES_DEMO.map((cidade, i) => ({
    id: `cliente-${i + 1}`, nome: `${nomes[i % nomes.length]} · ${cidade.nome}`,
    cnpj: completarCnpj("DEMO" + String(i + 1).padStart(8, "0")), responsavel: "Equipe do estabelecimento",
    telefone: "(41) 0000-0000", endereco: `Local demonstrativo em ${cidade.nome}, PR`,
    latitude: cidade.latitude, longitude: cidade.longitude, status: "ativo", createdAt: agora,
  }));
  const caminhoes: Caminhao[] = ROTAS_DEMO.map((rota, i) => ({
    ...pontoNaRota(rota, i / 4), id: rota.id, identificacao: `Frota ${String(i + 1).padStart(2, "0")}`,
    placa: `BIO0D0${i + 1}`, modelo: i ? "Volkswagen Delivery" : "Mercedes-Benz Accelo",
    motorista: i ? "Carlos Lima" : "Ana Ribeiro", status: "em_operacao",
    dispositivoGps: `FROTA-GPS-0${i + 1}`, ultimaComunicacao: agora, createdAt: agora,
  }));
  const estado: EstadoDemo = {
    agora, bombonas: [], rastreadores: [], clientes, caminhoes, movimentacoes: [], alertas: [], ultimas: {},
    proximoCodigo: DEMO_TOTAL_BOMBONAS + 1, ciclo: 0, ativo: false, deslocamento: true,
    posicoesNoUltimoCiclo: 0, ultimoCicloEm: null, perdidos: {}, ciclos: [], rotas: {},
  };
  const leituras: Leitura[] = [];
  const anteriores: Leitura[] = [];
  const instanteAnterior = new Date(+referencia - 3 * INTERVALO_MS).toISOString();
  for (let i = 1; i <= DEMO_TOTAL_BOMBONAS; i++) {
    const id = codigoBombona(i);
    const noDeposito = i <= 1500;
    const emTransporte = i > 2820;
    const cliente = noDeposito || emTransporte ? null : clientes[i % clientes.length];
    const caminhao = emTransporte ? caminhoes[i % caminhoes.length] : null;
    const origem = cliente ?? caminhao ?? DEPOSITO_DEMO;
    const dispersao = noDeposito ? DEPOSITO_DEMO.dispersaoGraus / 6 : emTransporte ? 0.0003 : 0.0017;
    const latitude = origem.latitude + Math.sin(i * 137.5) * dispersao * ((i % 67) / 67);
    const longitude = origem.longitude + Math.cos(i * 137.5) * dispersao * ((i % 79) / 79);
    const bombona: Bombona = {
      id, codigo: id, numeroIdentificacao: String(i).padStart(6, "0"),
      modelo: i % 3 ? "Bombona PEAD" : "Bombona reforçada", capacidadeLitros: i % 3 ? 50 : 60,
      status: noDeposito ? "no_deposito" : caminhao ? "em_transporte" : "em_cliente",
      rastreadorId: id, clienteId: cliente?.id ?? null, caminhaoId: caminhao?.id ?? null,
      latitude, longitude, dataInstalacao: "2025-01-15", observacoes: null,
      qrCode: `demo-${id}`, createdAt: "2025-01-15T15:00:00Z", updatedAt: agora,
    };
    const offline = i % 41 === 0;
    const bateria = i % 109 === 0 ? 15 : 43 + i % 58;
    const rastreador: Rastreador = {
      id, codigo: `VE-${id.slice(4)}`, serial: `DEMO-SL-${id.slice(4)}`, modelo: MODELO_RASTREADOR,
      fabricante: FABRICANTE_RASTREADOR, bombonaId: id, status: offline ? "offline" : "online",
      bateriaPercentual: bateria, ultimaComunicacao: offline ? instanteAnterior : agora, tipoConexao: "Simulada",
      createdAt: bombona.createdAt, updatedAt: agora,
    };
    estado.bombonas.push(bombona);
    estado.rastreadores.push(rastreador);
    const leitura: Leitura = [id, Math.round(latitude * 1e6), Math.round(longitude * 1e6), bateria, caminhao ? 38 : 0, i % 17 ? 12 : 65];
    estado.ultimas[id] = expandirLeitura(leitura, rastreador.ultimaComunicacao!, rastreador.id);
    (offline ? anteriores : leituras).push(leitura);
    if (offline) estado.perdidos[id] = i % 6 + 2;
    for (const tipo of [offline ? "sem_comunicacao" : null, bateria < 20 ? "bateria_baixa" : null] as const) {
      if (!tipo) continue;
      const instante = new Date(+referencia - (i % 6) * 86_400_000).toISOString();
      estado.alertas.push({
        id: `inicial-${id}-${tipo}`, bombonaId: id, rastreadorId: id, tipo, gravidade: offline ? "alta" : "media",
        descricao: tipo === "sem_comunicacao" ? "Sem transmissão há mais de 60 minutos." : "Carga do rastreador abaixo de 20%.",
        status: i % 5 ? "pendente" : "resolvido", latitude, longitude, registradoEm: instante, createdAt: instante, simulado: true,
      });
    }
    if (i % 4 === 0) {
      const instante = new Date(+referencia - (i % 5 ? i % 7 : i % 175) * 86_400_000 - (i % 53) * INTERVALO_MS).toISOString();
      estado.movimentacoes.push({
        id: `mov-${id}`, bombonaId: id, codigoBombona: id, clienteId: bombona.clienteId, caminhaoId: bombona.caminhaoId,
        tipo: cliente ? "entrega_cliente" : caminhao ? "retirada_caminhao" : "entrada_deposito",
        descricao: "Registro inicial da operação demonstrativa.", latitude, longitude, registradoEm: instante, createdAt: instante,
      });
    }
  }
  estado.ciclos = [{ instante: agora, leituras }, { instante: instanteAnterior, leituras: anteriores }];
  estado.movimentacoes.sort((a, b) => b.registradoEm.localeCompare(a.registradoEm));
  estado.alertas.sort((a, b) => b.registradoEm.localeCompare(a.registradoEm));
  return estado;
}
