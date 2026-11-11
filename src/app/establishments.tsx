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

import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    getCurrentUserProfile,
    type UserProfile,
} from "@/services/authService";

import {
    createEstablishment,
    listEstablishments,
    type Establishment,
} from "@/services/establishmentService";

function parseOptionalCoordinate(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.trim().replace(",", "."));

  if (!Number.isFinite(parsed)) {
    throw new Error("Coordenada GPS inválida.");
  }

  return parsed;
}

export default function EstablishmentsScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("PR");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geofenceRadius, setGeofenceRadius] = useState("150");
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function initializeScreen(): Promise<void> {
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

        const records = await listEstablishments();

        if (isMounted) {
          setEstablishments(records);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar a tela.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initializeScreen();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleCaptureLocation(): Promise<void> {
    setErrorMessage("");
    setSuccessMessage("");
    setIsCapturingLocation(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        throw new Error("Permita o acesso à localização para capturar o GPS.");
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(currentLocation.coords.latitude.toFixed(6));
      setLongitude(currentLocation.coords.longitude.toFixed(6));
      setLocationAccuracy(currentLocation.coords.accuracy);

      setSuccessMessage("Localização capturada com sucesso.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível capturar a localização.",
      );
    } finally {
      setIsCapturingLocation(false);
    }
  }

  function clearForm(): void {
    setName("");
    setPhone("");
    setStreet("");
    setNumber("");
    setNeighborhood("");
    setCity("");
    setState("PR");
    setPostalCode("");
    setLatitude("");
    setLongitude("");
    setGeofenceRadius("150");
    setLocationAccuracy(null);
  }

  async function handleCreateEstablishment(): Promise<void> {
    setErrorMessage("");
    setSuccessMessage("");

    const radius = Number(geofenceRadius);

    if (!Number.isInteger(radius)) {
      setErrorMessage("Informe o raio como um número inteiro.");
      return;
    }

    setIsSaving(true);

    try {
      await createEstablishment({
        name,
        phone,
        street,
        number,
        neighborhood,
        city,
        state,
        postal_code: postalCode,
        latitude: parseOptionalCoordinate(latitude),
        longitude: parseOptionalCoordinate(longitude),
        geofence_radius_m: radius,
      });

      setSuccessMessage("Estabelecimento cadastrado com sucesso!");
      clearForm();

      try {
        const updatedEstablishments = await listEstablishments();
        setEstablishments(updatedEstablishments);
      } catch {
        setErrorMessage(
          "Cadastro realizado, mas não foi possível atualizar a lista.",
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o estabelecimento.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#174B3C" />
        <Text style={styles.loadingText}>Carregando estabelecimentos...</Text>
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
            <Pressable onPress={() => router.replace("/admin")}>
              <Text style={styles.backButton}>← Voltar ao painel</Text>
            </Pressable>

            <Text style={styles.brand}>BIOOLEO</Text>
            <Text style={styles.headerSubtitle}>
              CADASTRO DE ESTABELECIMENTOS
            </Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.pageTitle}>Novo estabelecimento</Text>

            <Text style={styles.pageDescription}>
              Cadastre o cliente e registre sua localização para validar
              entregas e retiradas de bombonas.
            </Text>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Dados do estabelecimento</Text>

              <Text style={styles.label}>NOME *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nome do estabelecimento"
                placeholderTextColor="#929A94"
              />

              <Text style={styles.label}>TELEFONE</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="(44) 99999-9999"
                placeholderTextColor="#929A94"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>RUA / AVENIDA</Text>
              <TextInput
                style={styles.input}
                value={street}
                onChangeText={setStreet}
                placeholder="Nome da rua"
                placeholderTextColor="#929A94"
              />

              <Text style={styles.label}>NÚMERO</Text>
              <TextInput
                style={styles.input}
                value={number}
                onChangeText={setNumber}
                placeholder="Número"
                placeholderTextColor="#929A94"
              />

              <Text style={styles.label}>BAIRRO</Text>
              <TextInput
                style={styles.input}
                value={neighborhood}
                onChangeText={setNeighborhood}
                placeholder="Bairro"
                placeholderTextColor="#929A94"
              />

              <Text style={styles.label}>CIDADE *</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Cidade"
                placeholderTextColor="#929A94"
              />

              <View style={styles.inlineFields}>
                <View style={styles.stateField}>
                  <Text style={styles.label}>UF *</Text>
                  <TextInput
                    style={styles.input}
                    value={state}
                    onChangeText={(value) =>
                      setState(value.toUpperCase().slice(0, 2))
                    }
                    placeholder="PR"
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.postalField}>
                  <Text style={styles.label}>CEP</Text>
                  <TextInput
                    style={styles.input}
                    value={postalCode}
                    onChangeText={setPostalCode}
                    placeholder="00000-000"
                    placeholderTextColor="#929A94"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.sectionDivider} />

              <Text style={styles.sectionTitle}>Localização GPS</Text>

              <Text style={styles.helperText}>
                Capture a localização estando dentro ou próximo do
                estabelecimento. A precisão depende do sinal GPS disponível.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.locationButton,
                  pressed && styles.buttonPressed,
                  isCapturingLocation && styles.buttonDisabled,
                ]}
                onPress={() => {
                  void handleCaptureLocation();
                }}
                disabled={isCapturingLocation}
              >
                {isCapturingLocation ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.locationButtonText}>
                    CAPTURAR LOCALIZAÇÃO ATUAL
                  </Text>
                )}
              </Pressable>

              <Text style={styles.label}>LATITUDE</Text>
              <TextInput
                style={styles.input}
                value={latitude}
                editable={false}
                placeholder="GPS não capturado"
                placeholderTextColor="#929A94"
              />

              <Text style={styles.label}>LONGITUDE</Text>
              <TextInput
                style={styles.input}
                value={longitude}
                editable={false}
                placeholder="GPS não capturado"
                placeholderTextColor="#929A94"
              />

              {locationAccuracy !== null && (
                <Text style={styles.accuracyText}>
                  Precisão estimada: ±{Math.round(locationAccuracy)} metros
                </Text>
              )}

              <Text style={styles.label}>RAIO DE VALIDAÇÃO (METROS)</Text>
              <TextInput
                style={styles.input}
                value={geofenceRadius}
                onChangeText={setGeofenceRadius}
                keyboardType="number-pad"
                placeholder="150"
              />

              <Text style={styles.helperText}>
                Valor permitido: de 20 a 1000 metros. Esse raio será usado para
                conferir se uma leitura ocorreu perto do endereço.
              </Text>

              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}

              {successMessage ? (
                <Text style={styles.successText}>{successMessage}</Text>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.buttonPressed,
                  isSaving && styles.buttonDisabled,
                ]}
                onPress={() => {
                  void handleCreateEstablishment();
                }}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    SALVAR ESTABELECIMENTO
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>
                Estabelecimentos cadastrados
              </Text>

              {establishments.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    Nenhum estabelecimento cadastrado ainda.
                  </Text>
                </View>
              ) : (
                establishments.map((establishment) => (
                  <View key={establishment.id} style={styles.establishmentCard}>
                    <Text style={styles.establishmentName}>
                      {establishment.name}
                    </Text>

                    <Text style={styles.establishmentAddress}>
                      {establishment.city} - {establishment.state}
                    </Text>

                    <Text style={styles.establishmentStatus}>
                      {establishment.latitude !== null
                        ? "GPS cadastrado"
                        : "GPS pendente"}
                    </Text>
                  </View>
                ))
              )}
            </View>
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
    padding: 24,
  },
  backButton: {
    color: "#B7E4C7",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 25,
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
    padding: 20,
  },
  pageTitle: {
    color: "#173D32",
    fontSize: 25,
    fontWeight: "800",
  },
  pageDescription: {
    color: "#718078",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 22,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    color: "#173D32",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 18,
  },
  label: {
    color: "#385347",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#DCE5DF",
    borderRadius: 10,
    paddingHorizontal: 13,
    backgroundColor: "#FAFCFA",
    color: "#18392E",
    fontSize: 14,
  },
  inlineFields: {
    flexDirection: "row",
    gap: 12,
  },
  stateField: {
    flex: 1,
  },
  postalField: {
    flex: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#E3EAE5",
    marginVertical: 25,
  },
  helperText: {
    fontSize: 12,
    color: "#7B8981",
    lineHeight: 18,
    marginBottom: 12,
  },
  locationButton: {
    backgroundColor: "#356E53",
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  locationButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  accuracyText: {
    fontSize: 11,
    color: "#356E53",
    marginTop: 8,
  },
  errorText: {
    color: "#C0392B",
    fontSize: 13,
    marginTop: 16,
  },
  successText: {
    color: "#23834E",
    fontSize: 13,
    marginTop: 16,
  },
  saveButton: {
    backgroundColor: "#174B3C",
    height: 54,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  listSection: {
    marginTop: 30,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
  },
  emptyText: {
    color: "#718078",
    fontSize: 13,
  },
  establishmentCard: {
    backgroundColor: "#FFFFFF",
    padding: 17,
    borderRadius: 12,
    marginBottom: 10,
  },
  establishmentName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#173D32",
  },
  establishmentAddress: {
    fontSize: 13,
    color: "#718078",
    marginTop: 6,
  },
  establishmentStatus: {
    fontSize: 11,
    fontWeight: "700",
    color: "#356E53",
    marginTop: 9,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F6F3",
  },
  loadingText: {
    color: "#174B3C",
    marginTop: 12,
  },
  footer: {
    color: "#89968E",
    fontSize: 10,
    textAlign: "center",
    marginTop: 12,
  },
});
