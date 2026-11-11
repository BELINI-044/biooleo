import { useEffect, useState } from "react";

import {
    ActivityIndicator,
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
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    getCurrentUserProfile,
    type UserProfile,
} from "@/services/authService";

import { createContainer, type Container } from "@/services/containerService";

export default function ContainersScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  const [capacity, setCapacity] = useState("50");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdContainer, setCreatedContainer] = useState<Container | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    async function validateAccess(): Promise<void> {
      try {
        const currentProfile = await getCurrentUserProfile();

        if (!isMounted) {
          return;
        }

        if (!currentProfile) {
          router.replace("/");
          return;
        }

        if (currentProfile.role !== "admin") {
          router.replace("/driver");
          return;
        }

        setProfile(currentProfile);
      } catch {
        if (isMounted) {
          router.replace("/");
        }
      } finally {
        if (isMounted) {
          setIsCheckingAccess(false);
        }
      }
    }

    void validateAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleCreateContainer(): Promise<void> {
    const parsedCapacity = Number(capacity.trim().replace(",", "."));

    if (
      !Number.isFinite(parsedCapacity) ||
      parsedCapacity <= 0 ||
      parsedCapacity > 10000
    ) {
      setErrorMessage("Informe uma capacidade válida em litros.");
      return;
    }

    setErrorMessage("");
    setCreatedContainer(null);
    setIsSaving(true);

    try {
      const newContainer = await createContainer(parsedCapacity);

      setCreatedContainer(newContainer);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao cadastrar a bombona.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isCheckingAccess || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#174B3C" />
        <Text style={styles.loadingText}>Verificando permissões...</Text>
      </View>
    );
  }

  const qrValue = createdContainer
    ? `BIOOLEO:CONTAINER:${createdContainer.qr_token}`
    : "";

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
            <Pressable
              onPress={() => router.replace("/admin")}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Voltar ao painel</Text>
            </Pressable>

            <Text style={styles.brand}>BIOOLEO</Text>
            <Text style={styles.headerSubtitle}>GESTÃO DE BOMBONAS</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.pageTitle}>Cadastro de bombonas</Text>

            <Text style={styles.pageDescription}>
              Cadastre uma bombona e gere sua identificação individual por QR
              Code.
            </Text>

            {!createdContainer && (
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Nova bombona</Text>

                <Text style={styles.label}>CAPACIDADE EM LITROS</Text>

                <TextInput
                  style={styles.input}
                  value={capacity}
                  onChangeText={setCapacity}
                  placeholder="Ex.: 50"
                  placeholderTextColor="#929A94"
                  keyboardType="decimal-pad"
                  editable={!isSaving}
                />

                <Text style={styles.helperText}>
                  Aceita diferentes capacidades, inclusive valores decimais.
                </Text>

                {errorMessage ? (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                    isSaving && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    void handleCreateContainer();
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      CADASTRAR BOMBONA
                    </Text>
                  )}
                </Pressable>
              </View>
            )}

            {createdContainer && (
              <View style={styles.resultCard}>
                <View style={styles.successIcon}>
                  <Text style={styles.successIconText}>✓</Text>
                </View>

                <Text style={styles.successTitle}>Bombona cadastrada!</Text>

                <Text style={styles.resultDescription}>
                  A identificação foi criada e salva no banco de dados.
                </Text>

                <View style={styles.containerInfo}>
                  <Text style={styles.infoLabel}>IDENTIFICAÇÃO</Text>

                  <Text style={styles.containerCode}>
                    {createdContainer.code}
                  </Text>

                  <Text style={styles.infoLabel}>CAPACIDADE</Text>

                  <Text style={styles.infoValue}>
                    {Number(createdContainer.capacity_l).toLocaleString(
                      "pt-BR",
                    )}{" "}
                    litros
                  </Text>

                  <Text style={styles.infoLabel}>STATUS</Text>

                  <Text style={styles.status}>Disponível no estoque</Text>
                </View>

                <View style={styles.qrCard}>
                  <Text style={styles.qrTitle}>QR CODE DA BOMBONA</Text>

                  <QRCode
                    value={qrValue}
                    size={220}
                    color="#102D27"
                    backgroundColor="#FFFFFF"
                    ecl="H"
                  />

                  <Text style={styles.qrCaption}>
                    Código exclusivo: {createdContainer.code}
                  </Text>
                </View>

                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    setCreatedContainer(null);
                    setCapacity("50");
                    setErrorMessage("");
                  }}
                >
                  <Text style={styles.primaryButtonText}>
                    CADASTRAR OUTRA BOMBONA
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => router.replace("/admin")}
                >
                  <Text style={styles.secondaryButtonText}>
                    VOLTAR AO PAINEL
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          <Text style={styles.footer}>
            BIOOLEO • CONTROLE E RASTREABILIDADE
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F6F3",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 25,
  },
  header: {
    backgroundColor: "#102D27",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  backButton: {
    marginBottom: 25,
  },
  backButtonText: {
    color: "#B7E4C7",
    fontSize: 14,
    fontWeight: "600",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: 2,
  },
  headerSubtitle: {
    color: "#B7E4C7",
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 5,
  },
  content: {
    padding: 22,
  },
  pageTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#173D32",
  },
  pageDescription: {
    fontSize: 14,
    color: "#718078",
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 25,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#173D32",
    marginBottom: 25,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#385347",
    marginBottom: 10,
    letterSpacing: 1,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: "#DCE5DF",
    borderRadius: 11,
    paddingHorizontal: 15,
    fontSize: 17,
    color: "#18392E",
    backgroundColor: "#FAFCFA",
  },
  helperText: {
    color: "#89968E",
    fontSize: 11,
    marginTop: 9,
    lineHeight: 17,
  },
  errorText: {
    color: "#C0392B",
    fontSize: 13,
    marginTop: 15,
  },
  primaryButton: {
    height: 54,
    backgroundColor: "#174B3C",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.8,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
  },
  successIcon: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#DDF3E4",
    alignItems: "center",
    justifyContent: "center",
  },
  successIconText: {
    color: "#174B3C",
    fontSize: 30,
    fontWeight: "800",
  },
  successTitle: {
    fontSize: 22,
    color: "#173D32",
    fontWeight: "800",
    marginTop: 15,
  },
  resultDescription: {
    textAlign: "center",
    color: "#718078",
    fontSize: 13,
    marginTop: 8,
    lineHeight: 19,
  },
  containerInfo: {
    backgroundColor: "#F3F6F3",
    width: "100%",
    borderRadius: 13,
    padding: 18,
    marginTop: 22,
  },
  infoLabel: {
    color: "#829087",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 10,
  },
  containerCode: {
    fontSize: 25,
    color: "#174B3C",
    fontWeight: "800",
    marginTop: 5,
  },
  infoValue: {
    fontSize: 18,
    color: "#173D32",
    fontWeight: "700",
    marginTop: 5,
  },
  status: {
    fontSize: 14,
    color: "#23834E",
    fontWeight: "700",
    marginTop: 5,
  },
  qrCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5DF",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    marginTop: 22,
  },
  qrTitle: {
    color: "#385347",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 20,
  },
  qrCaption: {
    color: "#718078",
    fontSize: 11,
    marginTop: 16,
    textAlign: "center",
  },
  secondaryButton: {
    height: 50,
    borderWidth: 1,
    borderColor: "#174B3C",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#174B3C",
    fontWeight: "800",
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F6F3",
  },
  loadingText: {
    marginTop: 12,
    color: "#174B3C",
  },
  footer: {
    color: "#89968E",
    fontSize: 10,
    textAlign: "center",
    paddingHorizontal: 15,
    marginTop: 10,
  },
});
