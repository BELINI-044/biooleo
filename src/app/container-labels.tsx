import { useCallback, useEffect, useState } from "react";

import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { brand } from "@/constants/brand";

import {
    getCurrentUserProfile,
    type UserProfile,
} from "@/services/authService";

import {
    listContainerLabels,
    type ContainerLabel,
} from "@/services/containerService";

const colors = brand.colors;

export default function ContainerLabelsScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [containers, setContainers] = useState<ContainerLabel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadContainers = useCallback(async () => {
    setErrorMessage("");

    try {
      const records = await listContainerLabels();
      setContainers(records);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as etiquetas.",
      );
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initialize(): Promise<void> {
      try {
        const currentProfile = await getCurrentUserProfile();

        if (!isMounted) return;

        if (!currentProfile) {
          router.replace("/");
          return;
        }

        if (currentProfile.role !== "admin") {
          router.replace("/driver");
          return;
        }

        setProfile(currentProfile);

        const records = await listContainerLabels();

        if (isMounted) {
          setContainers(records);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os QR Codes.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.yellow} />
        <Text style={styles.loadingText}>Recuperando QR Codes...</Text>
      </View>
    );
  }

  function getStatusLabel(container: ContainerLabel): string {
    if (container.status === "in_transit") {
      return "Em transporte";
    }

    if (container.status === "at_establishment") {
      return "No estabelecimento";
    }

    if (container.status === "available") {
      return "Disponível no estoque";
    }

    return container.status;
  }

  function getContentsLabel(status: string): string {
    if (status === "full") return "Cheia";
    if (status === "empty") return "Vazia";
    return "Não identificada";
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/admin")}>
          <Text style={styles.backButton}>← Voltar ao painel</Text>
        </Pressable>

        <Text style={styles.brandName}>BIOOLEO</Text>

        <Text style={styles.headerSubtitle}>ETIQUETAS E QR CODES</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>QR Codes cadastrados</Text>

        <Text style={styles.pageDescription}>
          Consulte e recupere as etiquetas individuais das bombonas registradas
          no banco de dados.
        </Text>

        <Pressable
          style={styles.refreshButton}
          onPress={() => {
            void loadContainers();
          }}
        >
          <Text style={styles.refreshButtonText}>ATUALIZAR LISTA</Text>
        </Pressable>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {containers.length === 0 && !errorMessage ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhuma bombona cadastrada.</Text>
          </View>
        ) : null}

        {containers.map((container) => (
          <View key={container.id} style={styles.labelCard}>
            <Text style={styles.containerCode}>{container.code}</Text>

            <Text style={styles.capacity}>
              {Number(container.capacity_l).toLocaleString("pt-BR")} litros
            </Text>

            <View style={styles.qrContainer}>
              <QRCode
                value={`BIOOLEO:CONTAINER:${container.qr_token}`}
                size={190}
                color="#050505"
                backgroundColor="#FFFFFF"
                ecl="H"
              />
            </View>

            <Text style={styles.qrCaption}>QR CODE INDIVIDUAL</Text>

            <View style={styles.divider} />

            <Text style={styles.detailText}>
              Situação: {getStatusLabel(container)}
            </Text>

            <Text style={styles.detailText}>
              Conteúdo: {getContentsLabel(container.contents_status)}
            </Text>

            <Text style={styles.warningText}>
              Não compartilhe ou reutilize esta etiqueta em outra bombona.
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.background,
    padding: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    color: colors.yellow,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 22,
  },
  brandName: {
    color: colors.yellow,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 2,
  },
  headerSubtitle: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 5,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  pageDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  refreshButton: {
    height: 45,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 20,
  },
  refreshButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "900",
  },
  labelCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  containerCode: {
    color: colors.yellow,
    fontSize: 25,
    fontWeight: "900",
  },
  capacity: {
    color: colors.textSecondary,
    marginTop: 5,
    fontSize: 13,
  },
  qrContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
  },
  qrCaption: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 14,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  detailText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
  warningText: {
    color: colors.yellow,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 15,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
  },
  emptyText: {
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    marginBottom: 15,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.yellow,
    marginTop: 12,
  },
});
