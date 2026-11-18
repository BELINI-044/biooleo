import "expo-sqlite/localStorage/install";
import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_MODE } from "@/config/env";

let cliente: SupabaseClient | undefined;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function obterCliente() {
  if (DEMO_MODE) throw new Error("Operação Supabase indisponível no modo demonstração.");
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Configure o endereço e a chave publicável do Supabase.");
  }
  return cliente ??= createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      storage: globalThis.localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, campo) {
    const instancia = obterCliente();
    const valor = Reflect.get(instancia, campo);
    return typeof valor === "function" ? valor.bind(instancia) : valor;
  },
});
