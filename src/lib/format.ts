const fuso = "America/Sao_Paulo";
const dataBrasileira = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit", year: "numeric" });
const horaBrasileira = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const moedaBrasileira = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function dataValida(entrada: string | Date | null | undefined) {
  if (!entrada) return null;
  const data = entrada instanceof Date ? entrada : new Date(entrada);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function formatarData(entrada: string | Date | null | undefined): string {
  const data = dataValida(entrada);
  return data ? dataBrasileira.format(data) : "—";
}

export function formatarHora(entrada: string | Date | null | undefined): string {
  const data = dataValida(entrada);
  return data ? horaBrasileira.format(data) : "—";
}

export function formatarDataHora(entrada: string | Date | null | undefined): string {
  const data = dataValida(entrada);
  return data ? `${dataBrasileira.format(data)} ${horaBrasileira.format(data)}` : "—";
}

/** Número no padrão brasileiro, com milhar "." e decimal ",". */
export function formatarNumero(
  valor: number | null | undefined,
  casasDecimais = 0,
): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return "—";
  }

  const negativo = valor < 0;
  const absoluto = Math.abs(valor).toFixed(casasDecimais);
  const [inteiro, decimal] = absoluto.split(".");

  const inteiroFormatado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const resultado = decimal
    ? `${inteiroFormatado},${decimal}`
    : inteiroFormatado;

  return negativo ? `-${resultado}` : resultado;
}

/** Valor monetário em Real brasileiro (R$). */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return "—";
  }

  return moedaBrasileira.format(valor);
}

/** Capacidade em litros. */
export function formatarLitros(
  valor: number | null | undefined,
  casasDecimais = 0,
): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return "—";
  }

  return `${formatarNumero(valor, casasDecimais)} L`;
}

/** Distância em quilômetros. */
export function formatarKm(
  valor: number | null | undefined,
  casasDecimais = 1,
): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return "—";
  }

  return `${formatarNumero(valor, casasDecimais)} km`;
}

/** Velocidade em km/h. */
export function formatarVelocidade(
  valor: number | null | undefined,
): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return "—";
  }

  return `${formatarNumero(valor, 1)} km/h`;
}

/** Percentual com símbolo. */
export function formatarPercentual(
  valor: number | null | undefined,
  casasDecimais = 0,
): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return "—";
  }

  return `${formatarNumero(valor, casasDecimais)}%`;
}

/** Coordenada decimal com 5 casas. */
export function formatarCoordenada(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return "—";
  }

  return formatarNumero(valor, 5);
}

/** Percentual de bateria. */
export function formatarBateria(valor: number | null | undefined): string {
  return formatarPercentual(valor, 0);
}

/**
 * Distância legível entre duas coordenadas, em quilômetros.
 * Fórmula de Haversine.
 */
export function distanciaKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const raio = 6371;

  const dLat = ((latitudeB - latitudeA) * Math.PI) / 180;
  const dLon = ((longitudeB - longitudeA) * Math.PI) / 180;

  const latA = (latitudeA * Math.PI) / 180;
  const latB = (latitudeB * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(latA) *
      Math.cos(latB) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return 2 * raio * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Tempo decorrido em linguagem natural curta.
 * Usa o tempo de Brasília para que a idade da telemetria simulada
 * siga o mesmo relógio exibido na tela.
 */
export function formatarDecorrido(
  referencia: string | Date | null | undefined,
  agora = new Date(),
): string {
  if (!referencia) {
    return "—";
  }

  const data = referencia instanceof Date ? referencia : new Date(referencia);

  if (Number.isNaN(data.getTime())) {
    return "—";
  }

  const diferencaMinutos = Math.floor(
    (agora.getTime() - data.getTime()) / 60000,
  );

  if (diferencaMinutos < 1) {
    return "agora";
  }

  if (diferencaMinutos < 60) {
    return `há ${diferencaMinutos} min`;
  }

  const horas = Math.floor(diferencaMinutos / 60);

  if (horas < 24) {
    return `há ${horas} h`;
  }

  const dias = Math.floor(horas / 24);

  if (dias < 30) {
    return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
  }

  const meses = Math.floor(dias / 30);

  return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

/** Nome curto do mês (3 letras) para rótulos de eixo. */
export function nomeCurtoMes(data: Date): string {
  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];

  return meses[Number(dataBrasileira.formatToParts(data).find(parte => parte.type === "month")?.value) - 1];
}

/** Nome do mês por extenso em português. */
export function nomeMes(data: Date): string {
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];

  return meses[Number(dataBrasileira.formatToParts(data).find(parte => parte.type === "month")?.value) - 1];
}

/** Converte "YYYY-MM-DD" em "DD/MM/AAAA" sem passar por Date (evita fuso). */
export function formatarDataIso(iso: string): string {
  const partes = iso.split("-");

  if (partes.length !== 3) {
    return iso;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
