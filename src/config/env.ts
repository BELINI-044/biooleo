/**
 * Configuração de ambiente da aplicação.
 *
 * As variáveis `EXPO_PUBLIC_*` são embutidas em tempo de build pelo Expo.
 * Nenhuma chave de serviço (secret key) deve ser adicionada aqui: o aplicativo
 * conversa com o Supabase apenas usando a chave publicável.
 */

/** Indica se o aplicativo está operando com dados e telemetria simulados. */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === "true";

/** Intervalo real, em milissegundos, entre dois ciclos do simulador. */
export const SIMULACAO_INTERVALO_MS = 12_000;

/**
 * Intervalo operacional entre duas transmissões de telemetria.
 * Cada ciclo do simulador equivale a esse intervalo.
 */
export const SIMULACAO_INTERVALO_OPERACIONAL_MIN = 30;

/** Total de bombonas geradas no modo demonstração. */
export const DEMO_TOTAL_BOMBONAS = 3_000;
