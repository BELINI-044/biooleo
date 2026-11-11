import { useEffect, useRef, useState } from "react";

import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
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
    completeContainerExchange,
    getDriverAssignments,
    type DriverAssignment,
    type ExchangeResult,
} from "@/services/exchangeService";

const colors = brand.colors;
const QR_PREFIX = "BIOOLEO:CONTAINER:";

type ScanStep = "full" | "empty";

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

export default function ScannerScreen() {
  const router = useRouter();
  const scanLocked = useRef(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] =
    useState<DriverAssignment | null>(null);

  const [scanStep, setScanStep] = useState<ScanStep | null>(null);

  const [fullQrToken, setFullQrToken] = useState("");
  const [emptyQrToken, setEmptyQrToken] = useState("");
  const [emptyConfirmed, setEmptyConfirmed] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successResult, setSuccessResult] = useState<ExchangeResult | null>(
    null,
  );

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

        const records = await getDriverAssignments();

        if (isMounted) {
          setAssignments(records);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as entregas.",
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

  async function refreshAssignments(): Promise<void> {
    const records = await getDriverAssignments();
    setAssignments(records);
  }

  async function startScanning(step: ScanStep): Promise<void> {
    setErrorMessage("");

    try {
      const permission = cameraPermission?.granted
        ? cameraPermission
        : await requestCameraPermission();

      if (!permission.granted) {
        setErrorMessage(
          "É necessário permitir o acesso à câmera para ler o QR Code.",
        );
        return;
      }

      scanLocked.current = false;
      setScanStep(step);
    } catch {
      setErrorMessage("Não foi possível acessar a câmera.");
    }
  }

  function handleBarcodeScanned(result: { data: string }): void {
    if (scanLocked.current || !scanStep) {
      return;
    }

    scanLocked.current = true;

    const token = extractQrToken(result.data);

    if (!token) {
      setErrorMessage("QR Code inválido. Utilize uma etiqueta BioOleo.");
      scanLocked.current = false;
      return;
    }

    if (scanStep === "full") {
      setFullQrToken(token);
      setEmptyQrToken("");
      setEmptyConfirmed(false);
    } else {
      if (token === fullQrToken) {
        setErrorMessage(
          "Você escaneou a mesma bombona duas vezes. Leia a bombona vazia.",
        );
        scanLocked.current = false;
        return;
      }

      setEmptyQrToken(token);
      setEmptyConfirmed(false);
    }

    setErrorMessage("");
    setScanStep(null);
  }

  function selectAssignment(assignment: DriverAssignment): void {
    setSelectedAssignment(assignment);
    setFullQrToken("");
    setEmptyQrToken("");
    setEmptyConfirmed(false);
    setErrorMessage("");
    setSuccessResult(null);
    setScanStep(null);
  }

  async function handleConfirmExchange(): Promise<void> {
    if (!selectedAssignment || !selectedAssignment.target_establishment_id) {
      setErrorMessage("Selecione uma entrega válida.");
      return;
    }

    if (!fullQrToken || !emptyQrToken) {
      setErrorMessage("Leia os QR Codes das duas bombonas.");
      return;
    }

    if (!emptyConfirmed) {
      setErrorMessage("Confirme que a bombona recolhida está vazia.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        throw new Error(
          "É necessário permitir o acesso à localização para confirmar a troca.",
        );
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const accuracy = location.coords.accuracy;

      if (accuracy === null || accuracy > 100) {
        throw new Error(
          "A precisão do GPS está baixa. Vá para uma área aberta e tente novamente.",
        );
      }

      const result = await completeContainerExchange({
        expectedFullContainerId: selectedAssignment.container_id,
        fullQrToken,
        emptyQrToken,
        establishmentId: selectedAssignment.target_establishment_id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy,
      });

      setSuccessResult(result);
      setSelectedAssignment(null);
      setFullQrToken("");
      setEmptyQrToken("");
      setEmptyConfirmed(false);
      setScanStep(null);

      await refreshAssignments();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar a troca.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.yellow} />
        <Text style={styles.loadingText}>Carregando suas entregas...</Text>
      </View>
    );
  }

  const deliveryAssignments = assignments.filter(
    (item) =>
      item.contents_status === "full" && item.target_establishment_id !== null,
  );

  const returnAssignments = assignments.filter(
    (item) => item.contents_status === "empty",
  );

  if (successResult) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>

          <Text style={styles.successTitle}>TROCA CONFIRMADA!</Text>

          <Text style={styles.successDescription}>
            As duas movimentações foram registradas no sistema.
          </Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>ESTABELECIMENTO</Text>

            <Text style={styles.resultValue}>
              {successResult.establishment}
            </Text>

            <Text style={styles.resultLabel}>BOMBA CHEIA ENTREGUE</Text>

            <Text style={styles.resultValue}>
              {successResult.delivered_code}
            </Text>

            <Text style={styles.resultLabel}>BOMBA VAZIA RECOLHIDA</Text>

            <Text style={styles.resultValue}>
              {successResult.collected_code}
            </Text>

            <Text style={styles.resultLabel}>
              DISTÂNCIA ATÉ O ESTABELECIMENTO
            </Text>

            <Text style={styles.resultValue}>
              {successResult.distance_m.toLocaleString("pt-BR")} metros
            </Text>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => setSuccessResult(null)}
          >
            <Text style={styles.primaryButtonText}>VER PRÓXIMAS ENTREGAS</Text>
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

          <Text style={styles.headerSubtitle}>LEITOR E TROCA DE BOMBONAS</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.pageTitle}>Minhas entregas</Text>

          <Text style={styles.pageDescription}>
            Selecione a entrega autorizada para iniciar a troca.
          </Text>

          {deliveryAssignments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nenhuma entrega pendente</Text>

              <Text style={styles.emptyDescription}>
                Quando a BioOleo atribuir uma bombona a você, ela aparecerá
                nesta tela.
              </Text>
            </View>
          ) : (
            deliveryAssignments.map((assignment) => (
              <Pressable
                key={assignment.container_id}
                style={[
                  styles.assignmentCard,
                  selectedAssignment?.container_id ===
                    assignment.container_id && styles.assignmentSelected,
                ]}
                onPress={() => selectAssignment(assignment)}
              >
                <Text style={styles.assignmentCode}>
                  {assignment.container_code}
                </Text>

                <Text style={styles.assignmentName}>
                  {assignment.establishment_name}
                </Text>

                <Text style={styles.assignmentDescription}>
                  {assignment.city} - {assignment.state}
                </Text>

                <Text style={styles.assignmentCapacity}>
                  {assignment.capacity_l} litros • Bombona cheia
                </Text>
              </Pressable>
            ))
          )}

          {selectedAssignment && (
            <View style={styles.exchangeCard}>
              <Text style={styles.sectionTitle}>TROCA AUTORIZADA</Text>

              <Text style={styles.establishmentName}>
                {selectedAssignment.establishment_name}
              </Text>

              <Text style={styles.stepTitle}>1. ESCANEAR BOMBONA CHEIA</Text>

              {fullQrToken ? (
                <View style={styles.completedStep}>
                  <Text style={styles.completedText}>
                    QR Code da bombona cheia capturado.
                  </Text>
                </View>
              ) : (
                <Pressable
                  style={styles.scanButton}
                  onPress={() => {
                    void startScanning("full");
                  }}
                >
                  <Text style={styles.scanButtonText}>
                    ABRIR CÂMERA — CHEIA
                  </Text>
                </Pressable>
              )}

              <Text style={styles.stepTitle}>2. ESCANEAR BOMBONA VAZIA</Text>

              {emptyQrToken ? (
                <View style={styles.completedStep}>
                  <Text style={styles.completedText}>
                    QR Code da bombona vazia capturado.
                  </Text>
                </View>
              ) : (
                <Pressable
                  style={[
                    styles.scanButton,
                    !fullQrToken && styles.disabledButton,
                  ]}
                  onPress={() => {
                    void startScanning("empty");
                  }}
                  disabled={!fullQrToken}
                >
                  <Text style={styles.scanButtonText}>
                    ABRIR CÂMERA — VAZIA
                  </Text>
                </Pressable>
              )}

              {scanStep && (
                <View style={styles.cameraContainer}>
                  {cameraPermission?.granted ? (
                    <>
                      <Text style={styles.cameraTitle}>
                        {scanStep === "full"
                          ? "APONTE PARA O QR DA BOMBONA CHEIA"
                          : "APONTE PARA O QR DA BOMBONA VAZIA"}
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
                        style={styles.cancelScanButton}
                        onPress={() => {
                          setScanStep(null);
                          scanLocked.current = false;
                        }}
                      >
                        <Text style={styles.cancelScanText}>
                          CANCELAR LEITURA
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <View style={styles.permissionCard}>
                      <Text style={styles.permissionText}>
                        Precisamos da permissão da câmera.
                      </Text>

                      <Pressable
                        style={styles.scanButton}
                        onPress={() => {
                          void startScanning(scanStep);
                        }}
                      >
                        <Text style={styles.scanButtonText}>
                          PERMITIR CÂMERA
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {emptyQrToken && (
                <Pressable
                  style={styles.confirmationRow}
                  onPress={() => setEmptyConfirmed(!emptyConfirmed)}
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: emptyConfirmed,
                  }}
                >
                  <View
                    style={[
                      styles.checkbox,
                      emptyConfirmed && styles.checkboxChecked,
                    ]}
                  >
                    {emptyConfirmed && (
                      <Text style={styles.checkboxMark}>✓</Text>
                    )}
                  </View>

                  <Text style={styles.confirmationText}>
                    Confirmo que retirei fisicamente uma bombona vazia deste
                    estabelecimento.
                  </Text>
                </Pressable>
              )}

              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}

              <Pressable
                style={[
                  styles.confirmButton,
                  (!fullQrToken ||
                    !emptyQrToken ||
                    !emptyConfirmed ||
                    isSubmitting) &&
                    styles.disabledButton,
                ]}
                onPress={() => {
                  void handleConfirmExchange();
                }}
                disabled={
                  !fullQrToken ||
                  !emptyQrToken ||
                  !emptyConfirmed ||
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.confirmButtonText}>CONFIRMAR TROCA</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.resetButton}
                onPress={() => selectAssignment(selectedAssignment)}
                disabled={isSubmitting}
              >
                <Text style={styles.resetButtonText}>REINICIAR LEITURA</Text>
              </Pressable>
            </View>
          )}

          {returnAssignments.length > 0 && (
            <View style={styles.returnCard}>
              <Text style={styles.returnTitle}>BOMBONAS VAZIAS COM VOCÊ</Text>

              <Text style={styles.returnDescription}>
                Estas bombonas foram recolhidas e aguardam o retorno ao estoque
                da BioOleo.
              </Text>

              {returnAssignments.map((item) => (
                <Text key={item.container_id} style={styles.returnItem}>
                  {item.container_code} • {item.capacity_l} litros
                </Text>
              ))}
            </View>
          )}
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
    fontWeight: "700",
    fontSize: 14,
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
    borderRadius: 13,
    padding: 20,
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
  assignmentCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    padding: 17,
    marginBottom: 10,
  },
  assignmentSelected: {
    borderColor: colors.primary,
  },
  assignmentCode: {
    color: colors.yellow,
    fontSize: 18,
    fontWeight: "900",
  },
  assignmentName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8,
  },
  assignmentDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  assignmentCapacity: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 10,
  },
  exchangeCard: {
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
  establishmentName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 20,
  },
  stepTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 15,
    marginBottom: 10,
  },
  scanButton: {
    backgroundColor: colors.primary,
    minHeight: 50,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "900",
  },
  completedStep: {
    backgroundColor: "#103D28",
    borderRadius: 9,
    padding: 13,
  },
  completedText: {
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
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 10,
  },
  camera: {
    width: "100%",
    height: 300,
  },
  cancelScanButton: {
    backgroundColor: colors.surfaceElevated,
    padding: 13,
    alignItems: "center",
  },
  cancelScanText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 11,
  },
  permissionCard: {
    padding: 15,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    gap: 12,
  },
  permissionText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  confirmationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    gap: 11,
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxMark: {
    color: colors.background,
    fontWeight: "900",
  },
  confirmationText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 15,
    lineHeight: 18,
  },
  confirmButton: {
    minHeight: 54,
    backgroundColor: colors.yellow,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  confirmButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.7,
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
    fontSize: 11,
    fontWeight: "800",
  },
  returnCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    padding: 17,
    marginTop: 25,
  },
  returnTitle: {
    color: colors.yellow,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  returnDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 9,
    marginBottom: 12,
  },
  returnItem: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 7,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
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
    alignSelf: "center",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    color: colors.background,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 42,
    fontWeight: "900",
    overflow: "hidden",
  },
  successTitle: {
    color: colors.yellow,
    fontSize: 23,
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
