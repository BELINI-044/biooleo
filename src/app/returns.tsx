import { useEffect, useRef, useState } from "react";

import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { CameraView, useCameraPermissions } from "expo-camera";

import * as Location from "expo-location";

import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { brand } from "@/constants/brand";

import {
    getCurrentUserProfile,
    type UserProfile,
} from "@/services/authService";

import {
    completeContainerReturn,
    getReturnableContainers,
    type ContainerReturnResult,
    type ReturnableContainer,
} from "@/services/returnService";

const colors = brand.colors;
const QR_PREFIX = "BIOOLEO:CONTAINER:";

function extractQrToken(data: string): string | null {
  const value = data.trim();

  if (!value.startsWith(QR_PREFIX)) {
    return null;
  }

  const token = value.slice(QR_PREFIX.length);

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidPattern.test(token) ? token : null;
}

export default function ReturnsScreen() {
  const router = useRouter();
  const scanLocked = useRef(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [containers, setContainers] = useState<ReturnableContainer[]>([]);
  const [selectedContainer, setSelectedContainer] =
    useState<ReturnableContainer | null>(null);

  const [qrToken, setQrToken] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successResult, setSuccessResult] =
    useState<ContainerReturnResult | null>(null);

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

        if (currentProfile.role !== "driver") {
          router.replace("/admin");
          return;
        }

        setProfile(currentProfile);

        const records = await getReturnableContainers();

        if (isMounted) {
          setContainers(records);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as bombonas.",
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

  async function refreshContainers(): Promise<void> {
    const records = await getReturnableContainers();
    setContainers(records);
  }

  function selectContainer(container: ReturnableContainer): void {
    setSelectedContainer(container);
    setQrToken("");
    setIsScanning(false);
    setErrorMessage("");
    setSuccessResult(null);
  }

  async function startScanner(): Promise<void> {
    setErrorMessage("");

    try {
      const permission = cameraPermission?.granted
        ? cameraPermission
        : await requestCameraPermission();

      if (!permission.granted) {
        setErrorMessage("Permita o acesso à câmera para escanear o QR Code.");
        return;
      }

      scanLocked.current = false;
      setIsScanning(true);
    } catch {
      setErrorMessage("Não foi possível acessar a câmera.");
    }
  }

  function handleBarcodeScanned(result: { data: string }): void {
    if (scanLocked.current || !isScanning) {
      return;
    }

    scanLocked.current = true;

    const token = extractQrToken(result.data);

    if (!token) {
      setErrorMessage("QR Code inválido. Utilize uma etiqueta BioOleo.");
      scanLocked.current = false;
      return;
    }

    setQrToken(token);
    setIsScanning(false);
    setErrorMessage("");
  }

  async function handleReturn(): Promise<void> {
    if (!selectedContainer || !qrToken) {
      setErrorMessage("Selecione uma bombona e leia seu QR Code.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        throw new Error(
          "Permita o acesso à localização para registrar o retorno.",
        );
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const accuracy = location.coords.accuracy;

      if (accuracy === null || accuracy > 100) {
        throw new Error(
          "O sinal GPS está impreciso. Tente novamente em uma área aberta.",
        );
      }

      const result = await completeContainerReturn({
        containerId: selectedContainer.container_id,
        qrToken,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy,
      });

      setSuccessResult(result);
      setSelectedContainer(null);
      setQrToken("");

      try {
        await refreshContainers();
      } catch {
        setErrorMessage(
          "Retorno registrado. Não foi possível atualizar a lista.",
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o retorno.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.yellow} />
        <Text style={styles.loadingText}>Carregando bombonas...</Text>
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  if (successResult) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>

          <Text style={styles.successTitle}>RETORNO CONFIRMADO!</Text>

          <Text style={styles.successDescription}>
            A bombona foi recebida e registrada no estoque da BioOleo.
          </Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>IDENTIFICAÇÃO</Text>

            <Text style={styles.resultValue}>
              {successResult.container_code}
            </Text>

            <Text style={styles.resultLabel}>DEPÓSITO</Text>

            <Text style={styles.resultValue}>{successResult.depot_name}</Text>

            <Text style={styles.resultLabel}>SITUAÇÃO</Text>

            <Text style={styles.resultValue}>Disponível — Vazia</Text>

            <Text style={styles.resultLabel}>DISTÂNCIA DO DEPÓSITO</Text>

            <Text style={styles.resultValue}>
              {successResult.distance_m.toLocaleString("pt-BR")} metros
            </Text>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => setSuccessResult(null)}
          >
            <Text style={styles.primaryButtonText}>VER OUTRAS DEVOLUÇÕES</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace("/driver")}
          >
            <Text style={styles.secondaryButtonText}>VOLTAR AO PAINEL</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace("/driver")}>
            <Text style={styles.backButton}>← Voltar ao painel</Text>
          </Pressable>

          <Text style={styles.brandName}>BIOOLEO</Text>

          <Text style={styles.headerSubtitle}>RETORNO AO ESTOQUE</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.pageTitle}>Devolução de bombonas</Text>

          <Text style={styles.pageDescription}>
            Selecione a bombona vazia que está com você e registre sua devolução
            no depósito BioOleo.
          </Text>

          {containers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nenhuma devolução pendente</Text>

              <Text style={styles.emptyDescription}>
                As bombonas vazias sob sua responsabilidade aparecerão aqui.
              </Text>
            </View>
          ) : (
            containers.map((container) => (
              <Pressable
                key={container.container_id}
                style={[
                  styles.containerCard,
                  selectedContainer?.container_id === container.container_id &&
                    styles.containerCardSelected,
                ]}
                onPress={() => selectContainer(container)}
              >
                <Text style={styles.containerCode}>
                  {container.container_code}
                </Text>

                <Text style={styles.containerCapacity}>
                  {container.capacity_l} litros • Vazia
                </Text>

                <Text style={styles.containerStatus}>
                  Aguardando retorno à BioOleo
                </Text>
              </Pressable>
            ))
          )}

          {selectedContainer && (
            <View style={styles.returnCard}>
              <Text style={styles.sectionTitle}>CONFIRMAR DEVOLUÇÃO</Text>

              <Text style={styles.selectedCode}>
                {selectedContainer.container_code}
              </Text>

              <Text style={styles.helperText}>
                Leia o QR Code original fixado na bombona.
              </Text>

              {!qrToken ? (
                <Pressable
                  style={styles.scanButton}
                  onPress={() => {
                    void startScanner();
                  }}
                >
                  <Text style={styles.scanButtonText}>
                    ABRIR LEITOR QR CODE
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.scannedCard}>
                  <Text style={styles.scannedText}>
                    QR Code capturado com sucesso.
                  </Text>
                </View>
              )}

              {isScanning && (
                <View style={styles.cameraContainer}>
                  <Text style={styles.cameraTitle}>
                    POSICIONE O QR CODE NA CÂMERA
                  </Text>

                  <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{
                      barcodeTypes: ["qr"],
                    }}
                    onBarcodeScanned={handleBarcodeScanned}
                  />

                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsScanning(false);
                      scanLocked.current = false;
                    }}
                  >
                    <Text style={styles.cancelButtonText}>
                      CANCELAR LEITURA
                    </Text>
                  </Pressable>
                </View>
              )}

              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}

              <Pressable
                style={[
                  styles.confirmButton,
                  (!qrToken || isSubmitting) && styles.disabledButton,
                ]}
                onPress={() => {
                  void handleReturn();
                }}
                disabled={!qrToken || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    CONFIRMAR RETORNO AO DEPÓSITO
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.resetButton}
                onPress={() => {
                  setSelectedContainer(null);
                  setQrToken("");
                  setIsScanning(false);
                  setErrorMessage("");
                  scanLocked.current = false;
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.resetButtonText}>CANCELAR OPERAÇÃO</Text>
              </Pressable>
            </View>
          )}

          {!selectedContainer && errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
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
    letterSpacing: 1.2,
    marginTop: 5,
  },
  content: {
    padding: 20,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
  },
  pageDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    borderRadius: 13,
  },
  emptyTitle: {
    color: colors.yellow,
    fontSize: 16,
    fontWeight: "800",
  },
  emptyDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
  },
  containerCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    padding: 17,
    marginBottom: 10,
  },
  containerCardSelected: {
    borderColor: colors.primary,
  },
  containerCode: {
    color: colors.yellow,
    fontSize: 19,
    fontWeight: "900",
  },
  containerCapacity: {
    color: colors.text,
    fontSize: 13,
    marginTop: 7,
  },
  containerStatus: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8,
  },
  returnCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.yellow,
    borderRadius: 15,
    padding: 18,
    marginTop: 20,
  },
  sectionTitle: {
    color: colors.yellow,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
  },
  selectedCode: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 12,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 15,
  },
  scanButton: {
    backgroundColor: colors.primary,
    minHeight: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  scanButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "900",
  },
  scannedCard: {
    backgroundColor: "#103D28",
    padding: 14,
    borderRadius: 10,
  },
  scannedText: {
    color: "#9BE7B8",
    fontSize: 12,
    fontWeight: "700",
  },
  cameraContainer: {
    marginTop: 18,
    overflow: "hidden",
    borderRadius: 12,
  },
  cameraTitle: {
    color: colors.yellow,
    fontWeight: "800",
    fontSize: 11,
    marginBottom: 10,
  },
  camera: {
    width: "100%",
    height: 300,
  },
  cancelButton: {
    backgroundColor: colors.surfaceElevated,
    padding: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 11,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 15,
    lineHeight: 18,
  },
  confirmButton: {
    backgroundColor: colors.yellow,
    minHeight: 54,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginTop: 22,
  },
  confirmButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.35,
  },
  resetButton: {
    alignItems: "center",
    padding: 14,
    marginTop: 5,
  },
  resetButtonText: {
    color: colors.textMuted,
    fontWeight: "800",
    fontSize: 11,
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
  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: "center",
  },
  successIcon: {
    width: 70,
    height: 70,
    lineHeight: 70,
    borderRadius: 35,
    alignSelf: "center",
    backgroundColor: colors.primary,
    color: colors.background,
    textAlign: "center",
    fontSize: 42,
    fontWeight: "900",
    overflow: "hidden",
  },
  successTitle: {
    color: colors.yellow,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 20,
  },
  successDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 10,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 18,
    marginTop: 25,
  },
  resultLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 13,
  },
  resultValue: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
    marginTop: 5,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "900",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.yellow,
    height: 50,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: colors.yellow,
    fontSize: 12,
    fontWeight: "800",
  },
});
