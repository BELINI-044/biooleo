import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { brand } from "@/constants/brand";

import {
    getCurrentUserProfile,
    type UserProfile,
} from "@/services/authService";

import {
    dispatchContainer,
    loadDispatchOptions,
    type DispatchableContainer,
    type DriverOption,
    type EstablishmentOption,
} from "@/services/dispatchService";

const colors = brand.colors;

interface SelectionRowProps {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}

function SelectionRow({
  title,
  subtitle,
  selected,
  onPress,
}: SelectionRowProps) {
  return (
    <Pressable
      style={[styles.selectionRow, selected && styles.selectionRowSelected]}
      onPress={onPress}
    >
      <View style={styles.selectionInformation}>
        <Text
          style={[
            styles.selectionTitle,
            selected && styles.selectionTitleSelected,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.selectionSubtitle}>{subtitle}</Text>
      </View>

      <View
        style={[
          styles.selectionIndicator,
          selected && styles.selectionIndicatorSelected,
        ]}
      >
        {selected && <View style={styles.selectionIndicatorInner} />}
      </View>
    </Pressable>
  );
}

export default function DispatchScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [containers, setContainers] = useState<DispatchableContainer[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentOption[]>(
    [],
  );

  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedContainerId, setSelectedContainerId] = useState("");
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function refreshOptions(): Promise<void> {
    const options = await loadDispatchOptions();

    setDrivers(options.drivers);
    setContainers(options.containers);
    setEstablishments(options.establishments);
  }

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

        const options = await loadDispatchOptions();

        if (!isMounted) return;

        setDrivers(options.drivers);
        setContainers(options.containers);
        setEstablishments(options.establishments);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os dados.",
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

  async function handleDispatch(): Promise<void> {
    if (!selectedContainerId || !selectedDriverId || !selectedEstablishmentId) {
      setErrorMessage(
        "Selecione uma bombona, um entregador e um estabelecimento.",
      );
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const result = await dispatchContainer(
        selectedContainerId,
        selectedDriverId,
        selectedEstablishmentId,
      );

      setSuccessMessage(
        `Bombona ${result.container_code} despachada com sucesso.`,
      );

      setSelectedContainerId("");
      await refreshOptions();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar o despacho.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.yellow} />
        <Text style={styles.loadingText}>Carregando despacho...</Text>
      </View>
    );
  }

  const selectedContainer = containers.find(
    (item) => item.id === selectedContainerId,
  );

  const selectedDriver = drivers.find((item) => item.id === selectedDriverId);

  const selectedEstablishment = establishments.find(
    (item) => item.id === selectedEstablishmentId,
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.replace("/admin")}>
            <Text style={styles.backButton}>← Voltar ao painel</Text>
          </Pressable>

          <Text style={styles.brandName}>BIOOLEO</Text>
          <Text style={styles.headerSubtitle}>DESPACHO DE BOMBONAS</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.pageTitle}>Nova entrega</Text>

          <Text style={styles.pageDescription}>
            Escolha a bombona, o entregador e o destino para autorizar a saída
            do estoque.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. BOMBONA CHEIA</Text>

            {containers.length === 0 ? (
              <Text style={styles.emptyText}>
                Não existem bombonas cheias disponíveis no estoque.
              </Text>
            ) : (
              containers.map((container) => (
                <SelectionRow
                  key={container.id}
                  title={container.code}
                  subtitle={`${container.capacity_l} litros • Cheia`}
                  selected={selectedContainerId === container.id}
                  onPress={() => {
                    setSelectedContainerId(container.id);
                    setErrorMessage("");
                  }}
                />
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. ENTREGADOR RESPONSÁVEL</Text>

            {drivers.length === 0 ? (
              <Text style={styles.emptyText}>
                Nenhum entregador ativo cadastrado.
              </Text>
            ) : (
              drivers.map((driver) => (
                <SelectionRow
                  key={driver.id}
                  title={driver.full_name}
                  subtitle="Entregador ativo"
                  selected={selectedDriverId === driver.id}
                  onPress={() => {
                    setSelectedDriverId(driver.id);
                    setErrorMessage("");
                  }}
                />
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              3. ESTABELECIMENTO DE DESTINO
            </Text>

            {establishments.length === 0 ? (
              <Text style={styles.emptyText}>
                Nenhum estabelecimento ativo cadastrado.
              </Text>
            ) : (
              establishments.map((establishment) => (
                <SelectionRow
                  key={establishment.id}
                  title={establishment.name}
                  subtitle={`${establishment.city} - ${establishment.state}`}
                  selected={selectedEstablishmentId === establishment.id}
                  onPress={() => {
                    setSelectedEstablishmentId(establishment.id);
                    setErrorMessage("");
                  }}
                />
              ))
            )}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>RESUMO DO DESPACHO</Text>

            <Text style={styles.summaryText}>
              Bombona: {selectedContainer?.code ?? "Não selecionada"}
            </Text>

            <Text style={styles.summaryText}>
              Entregador: {selectedDriver?.full_name ?? "Não selecionado"}
            </Text>

            <Text style={styles.summaryText}>
              Destino: {selectedEstablishment?.name ?? "Não selecionado"}
            </Text>
          </View>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          {successMessage ? (
            <Text style={styles.successText}>{successMessage}</Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.dispatchButton,
              pressed && styles.buttonPressed,
              isSaving && styles.buttonDisabled,
            ]}
            onPress={() => {
              void handleDispatch();
            }}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.dispatchButtonText}>AUTORIZAR SAÍDA</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    backgroundColor: colors.background,
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    color: colors.yellow,
    fontSize: 14,
    marginBottom: 24,
    fontWeight: "700",
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
  },
  pageTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  pageDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 25,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    color: colors.yellow,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 12,
  },
  selectionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    padding: 15,
    marginBottom: 8,
  },
  selectionRowSelected: {
    borderColor: colors.primary,
    backgroundColor: "#10291E",
  },
  selectionInformation: {
    flex: 1,
  },
  selectionTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 14,
  },
  selectionTitleSelected: {
    color: colors.primary,
  },
  selectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 5,
  },
  selectionIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  selectionIndicatorSelected: {
    borderColor: colors.primary,
  },
  selectionIndicatorInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  emptyText: {
    color: colors.textMuted,
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    fontSize: 12,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.yellow,
    borderRadius: 13,
    padding: 18,
    marginBottom: 18,
  },
  summaryTitle: {
    color: colors.yellow,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 12,
  },
  summaryText: {
    color: colors.text,
    fontSize: 12,
    marginTop: 6,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginBottom: 12,
  },
  successText: {
    color: colors.primary,
    fontSize: 13,
    marginBottom: 12,
    fontWeight: "700",
  },
  dispatchButton: {
    height: 55,
    backgroundColor: colors.yellow,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  dispatchButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
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
