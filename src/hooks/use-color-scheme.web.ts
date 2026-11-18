import { useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

const assinar = () => () => {};
const cliente = () => true;
const servidor = () => false;

export function useColorScheme() {
  const hidratado = useSyncExternalStore(assinar, cliente, servidor);
  const esquema = useRNColorScheme();
  return hidratado ? esquema : "light";
}
