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

import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { brand } from "@/constants/brand";

import { getCurrentUserProfile, signInWithEmail } from "@/services/authService";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const colors = brand.colors;

export default function LoginScreen() {
  const router = useRouter();

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
        const profile = await getCurrentUserProfile();

        if (!isMounted || !profile) {
          return;
        }

        router.replace(profile.role === "admin" ? "/admin" : "/driver");
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
  }, [router]);

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

  if (isCheckingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.yellow} />
        <Text style={styles.loadingText}>Verificando acesso...</Text>
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
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Logotipo BioOleo Brasil"
            />

            <Text style={styles.brandSubtitle}>CONTROLE E RASTREABILIDADE</Text>

            <View style={styles.accentLine} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.title}>Bem-vindo!</Text>

            <Text style={styles.description}>
              Acesse o sistema de gestão de bombonas da BioOleo.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-MAIL</Text>

              <TextInput
                style={styles.input}
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>SENHA</Text>

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
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
                  <Text style={styles.passwordToggle}>
                    {passwordVisible ? "OCULTAR" : "MOSTRAR"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {formError ? (
              <Text style={styles.errorText}>{formError}</Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={() => {
                void handleLogin();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.loginButtonText}>ENTRAR NO SISTEMA</Text>
              )}
            </Pressable>

            <Text style={styles.footerText}>
              Acesso exclusivo para usuários autorizados.
            </Text>
          </View>

          <Text style={styles.version}>
            BIOOLEO BRASIL • SISTEMA DE CONTROLE
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
