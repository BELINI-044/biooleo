import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

import { getCurrentUserProfile, signInWithEmail } from "@/services/authService";

import { DEMO_MODE } from "@/config/env";
import { abrirDemonstracao, demonstracaoAutorizada } from "@/services/tracking/demoSession";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  return DEMO_MODE ? <EntradaDemonstracao /> : <EntradaSupabase />;
}

function EntradaDemonstracao() {
  const router = useRouter();
  const { qr } = useLocalSearchParams<{ qr?: string }>();
  const [erro, setErro] = useState("");
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    let ativo = true;

    void demonstracaoAutorizada()
      .then((autorizada) => {
        if (!ativo) return;
        if (autorizada) {
          router.replace({ pathname: "/admin", params: qr ? { qr } : {} });
        } else {
          setVerificando(false);
        }
      })
      .catch(() => {
        if (ativo) {
          setErro("Não foi possível verificar o acesso à demonstração.");
          setVerificando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [qr, router]);

  async function entrar(): Promise<void> {
    try {
      setErro("");
      await abrirDemonstracao();
      router.replace({ pathname: "/admin", params: qr ? { qr } : {} });
    } catch {
      setErro("Não foi possível iniciar a demonstração. Tente novamente.");
    }
  }

  return (
    <SafeAreaView style={demoStyles.safeArea}>
      <View style={demoStyles.conteudo}>
        <View style={demoStyles.cartao}>
          <Image
            source={require("../../assets/images/biooleo-logo.png")}
            style={demoStyles.logo}
            resizeMode="contain"
            accessibilityLabel="Logotipo BioOleo Brasil"
          />
          <Text style={demoStyles.titulo}>Rastreamento de bombonas</Text>
          <Text style={demoStyles.descricao}>
            Ambiente de demonstração com 3.000 bombonas e telemetria simulada.
          </Text>
          <View style={demoStyles.aviso}>
            <Text style={demoStyles.avisoTexto}>DADOS SIMULADOS · DEMONSTRAÇÃO</Text>
          </View>
          {erro ? <Text style={demoStyles.erro}>{erro}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={verificando}
            onPress={() => void entrar()}
            style={({ pressed }) => [
              demoStyles.botao,
              pressed && demoStyles.botaoPressionado,
              verificando && demoStyles.botaoDesabilitado,
            ]}
          >
            {verificando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={demoStyles.botaoTexto}>Entrar na demonstração</Text>
            )}
          </Pressable>
          <Text style={demoStyles.rodape}>
            Frequência prevista de rastreamento: a cada 30 minutos
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function EntradaSupabase() {
  const scheme = useColorScheme();
  const base = scheme === 'dark' ? Colors.dark : Colors.light;
  const colors = {
    ...base,
    yellow: base.warning,
    primary: base.success,
    surfaceElevated: base.surfaceMuted,
  };
  const router = useRouter();

  const { qr } = useLocalSearchParams<{ qr?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession(): Promise<void> {
      try {
        const currentProfile = await getCurrentUserProfile();

        if (!isMounted || !currentProfile) {
          return;
        }

        if (currentProfile.role === "admin") {
          router.replace({ pathname: "/admin", params: qr ? { qr } : {} });
        } else {
          router.replace("/driver");
        }
      } catch {
        if (isMounted) {
          setFormError("Não foi possível verificar sua sessão.");
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, [qr, router]);

  async function handleLogin(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setFormError("Preencha seu e-mail e sua senha.");
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setFormError("Digite um e-mail válido.");
      return;
    }

    setFormError("");
    setIsLoading(true);

    try {
      const profile = await signInWithEmail(normalizedEmail, password);

      router.replace(profile.role === "admin" ? "/admin" : "/driver");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar o login.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 35,
    },
    header: {
      alignItems: "center",
      marginBottom: 30,
    },
    logo: {
      width: 155,
      height: 155,
    },
    brandSubtitle: {
      color: colors.yellow,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 2,
      marginTop: 12,
    },
    accentLine: {
      width: 65,
      height: 3,
      backgroundColor: colors.primary,
      borderRadius: 3,
      marginTop: 16,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 25,
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.yellow,
      marginBottom: 9,
    },
    description: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 28,
      lineHeight: 21,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.primary,
      marginBottom: 9,
      letterSpacing: 1,
    },
    input: {
      height: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.surfaceElevated,
    },
    passwordContainer: {
      height: 52,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.surfaceElevated,
    },
    passwordInput: {
      flex: 1,
      height: "100%",
      fontSize: 14,
      color: colors.text,
    },
    passwordToggle: {
      color: colors.yellow,
      fontWeight: "800",
      fontSize: 10,
    },
    errorText: {
      color: colors.error,
      fontSize: 13,
      marginBottom: 15,
    },
    loginButton: {
      height: 54,
      backgroundColor: colors.primary,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    loginButtonText: {
      color: colors.background,
      fontWeight: "900",
      fontSize: 13,
      letterSpacing: 0.8,
    },
    buttonPressed: {
      opacity: 0.8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    footerText: {
      color: colors.textMuted,
      fontSize: 11,
      textAlign: "center",
      marginTop: 22,
    },
    version: {
      textAlign: "center",
      color: colors.textMuted,
      fontSize: 9,
      letterSpacing: 1,
      marginTop: 25,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      color: colors.yellow,
      marginTop: 14,
    },
  });

  if (isCheckingSession) {
    return (
      <View style={styles.safeArea}>
        <ActivityIndicator size="large" color={colors.yellow} />
        <Text style={{ color: colors.yellow }}>Verificando acesso...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image
              source={require("../../assets/images/biooleo-logo.png")}
              style={{ width: 155, height: 155 }}
              resizeMode="contain"
              accessibilityLabel="Logotipo BioOleo Brasil"
            />

            <Text style={styles.brandSubtitle}>CONTROLE E RASTREABILIDADE</Text>

            <View style={{ width: 65, height: 3, backgroundColor: colors.primary, borderRadius: 3, marginTop: 16 }} />
          </View>

          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 25 }}>
            <Text style={{ fontSize: 26, fontWeight: "800", color: colors.yellow, marginBottom: 9 }}>Bem-vindo!</Text>

            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 28, lineHeight: 21 }}>
              Acesse o sistema de gestão de bombonas da BioOleo.
            </Text>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: colors.primary, marginBottom: 9, letterSpacing: 1 }}>E-MAIL</Text>

              <TextInput
                style={{ height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, fontSize: 14, color: colors.text, backgroundColor: colors.surfaceElevated }}
                placeholder="seu@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: colors.primary }}>SENHA</Text>

              <View style={{ height: 52, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, backgroundColor: colors.surfaceElevated }}>
                <TextInput
                  style={{ flex: 1, height: "100%", fontSize: 14, color: colors.text }}
                  placeholder="Digite sua senha"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  editable={!isLoading}
                />

                <Pressable
                  onPress={() => setPasswordVisible(!passwordVisible)}
                  disabled={isLoading}
                >
                  <Text style={{ color: colors.yellow, fontWeight: "800", fontSize: 10 }}>MOSTRAR</Text>
                </Pressable>
              </View>
            </View>

            {formError ? (
              <Text style={{ color: colors.error, fontSize: 13, marginBottom: 15 }}>{formError}</Text>
            ) : null}

            <Pressable
              style={{ height: 54, backgroundColor: colors.primary, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 8 }}
              onPress={() => {
                void handleLogin();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={{ color: colors.background, fontWeight: "900", fontSize: 13, letterSpacing: 0.8 }}>ENTRAR NO SISTEMA</Text>
              )}
            </Pressable>

            <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 22 }}>Acesso exclusivo para usuários autorizados.</Text>
          </View>

          <Text style={{ textAlign: "center", color: colors.textMuted, fontSize: 9, letterSpacing: 1, marginTop: 25 }}>BIOOLEO BRASIL • SISTEMA DE CONTROLE</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const demoStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B3D2E",
  },
  conteudo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  cartao: {
    width: "100%",
    maxWidth: 460,
    alignItems: "center",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 32,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  logo: {
    width: 138,
    height: 138,
  },
  titulo: {
    marginTop: 8,
    color: "#123D2D",
    fontSize: 25,
    fontWeight: "800",
    textAlign: "center",
  },
  descricao: {
    marginTop: 12,
    color: "#52645C",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  aviso: {
    marginTop: 20,
    borderRadius: 999,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  avisoTexto: {
    color: "#176A48",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  erro: {
    marginTop: 16,
    color: "#B42318",
    fontSize: 13,
    textAlign: "center",
  },
  botao: {
    width: "100%",
    minHeight: 54,
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#1F8A5B",
    paddingHorizontal: 18,
  },
  botaoPressionado: {
    opacity: 0.82,
  },
  botaoDesabilitado: {
    opacity: 0.7,
  },
  botaoTexto: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  rodape: {
    marginTop: 18,
    color: "#6B7771",
    fontSize: 12,
    textAlign: "center",
  },
});
