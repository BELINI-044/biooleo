import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import PainelAdmin from "@/components/tracking/PainelAdmin";
import { Botao, cor, estilo } from "@/components/tracking/ui";
import { DEMO_MODE } from "@/config/env";
import { getCurrentUserProfile } from "@/services/authService";
import { demonstracaoAutorizada } from "@/services/tracking/demoSession";

export default function AdminScreen() {
  const router = useRouter();
  const { qr } = useLocalSearchParams<{ qr?: string }>();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  useEffect(() => {
    let ativo = true;
    async function validar() {
      try {
        if (DEMO_MODE) {
          const autorizado = await demonstracaoAutorizada();
          if (!ativo) return;
          if (autorizado) setNome("Administrador");
          else router.replace({ pathname: "/", params: qr ? { qr } : {} });
          return;
        }
        const perfil = await getCurrentUserProfile();
        if (!ativo) return;
        if (perfil?.role === "admin") setNome(perfil.full_name || "Administrador");
        else if (perfil?.role === "driver") router.replace("/driver");
        else router.replace({ pathname: "/", params: qr ? { qr } : {} });
      } catch {
        if (ativo) setErro("Não foi possível verificar o acesso administrativo.");
      }
    }
    if (!nome) void validar();
    return () => { ativo = false; };
  }, [router, qr, nome]);
  if (nome) return <PainelAdmin nome={nome} />;
  return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12, backgroundColor: cor.background }}>
    {erro ? <><Text accessibilityRole="alert" style={estilo.texto}>{erro}</Text>
      <Botao onPress={() => router.replace({ pathname: "/", params: qr ? { qr } : {} })}>Voltar para o acesso</Botao></>
      : <><ActivityIndicator color={cor.primary} /><Text style={estilo.nota}>Verificando acesso…</Text></>}
  </View>;
}
