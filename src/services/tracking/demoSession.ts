import AsyncStorage from "@react-native-async-storage/async-storage";

const chave = "@biooleo/acesso-demonstracao";
export async function abrirDemonstracao() { await AsyncStorage.setItem(chave, "aberta"); }
export async function demonstracaoAutorizada() { return await AsyncStorage.getItem(chave) === "aberta"; }
export async function fecharDemonstracao() { await AsyncStorage.removeItem(chave); }
