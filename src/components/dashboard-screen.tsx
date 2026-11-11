import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Image,
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
    signOutUser,
    type UserProfile,
    type UserRole,
} from "@/services/authService";

interface DashboardScreenProps {
  requiredRole: UserRole;
  title: string;
  description: string;
}

const colors = brand.colors;

export function DashboardScreen({
  requiredRole,
  title,
  description,
}: DashboardScreenProps) {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function validateAccess(): Promise<void> {
      try {
        const currentProfile = await getCurrentUserProfile();

        if (!isMounted) return;

        if (!currentProfile) {
          router.replace("/");
          return;
        }

        if (currentProfile.role !== requiredRole) {
          router.replace(
            currentProfile.role === "admin" ? "/admin" : "/driver",
          );
          return;
        }

        setProfile(currentProfile);
      } catch {
        if (isMounted) {
          router.replace("/");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void validateAccess();

    return () => {
      isMounted = false;
    };
  }, [requiredRole, router]);

  async function handleLogout(): Promise<void> {
    try {
      await signOutUser();
      router.replace("/");
    } catch {
      Alert.alert("Erro", "Não foi possível encerrar sua sessão.");
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.yellow} />
        <Text style={styles.loadingText}>Verificando acesso...</Text>
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  const isAdmin = profile.role === "admin";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/biooleo-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.headerSubtitle}>CONTROLE E RASTREABILIDADE</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.welcome}>BEM-VINDO À BIOOLEO</Text>

          <Text style={styles.userName}>{profile.full_name}</Text>

          <Text style={styles.title}>{title}</Text>

          <Text style={styles.description}>{description}</Text>

          <View style={styles.profileCard}>
            <View style={styles.profileIndicator} />

            <View style={styles.profileInformation}>
              <Text style={styles.cardLabel}>PERFIL DE ACESSO</Text>

              <Text style={styles.cardValue}>
                {isAdmin ? "Administrador" : "Entregador"}
              </Text>
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>
              {isAdmin ? "GERENCIAMENTO" : "OPERAÇÕES"}
            </Text>

            {isAdmin && (
              <>
                <ActionButton
                  title="CADASTRAR BOMBONAS"
                  description="Criar identificação e QR Code individual."
                  onPress={() => router.push("/containers")}
                  primary
                />

                <ActionButton
                  title="CONSULTAR QR CODES"
                  description="Recuperar e visualizar etiquetas das bombonas."
                  onPress={() => router.push("/container-labels")}
                />

                <ActionButton
                  title="ESTABELECIMENTOS"
                  description="Cadastrar clientes e suas localizações GPS."
                  onPress={() => router.push("/establishments")}
                />

                <ActionButton
                  title="DESPACHAR BOMBONAS"
                  description="Atribuir uma bombona cheia a um entregador."
                  onPress={() => router.push("/dispatch")}
                  primary
                />
              </>
            )}

            {!isAdmin && (
              <>
                <ActionButton
                  title="MINHAS ENTREGAS E LEITOR QR"
                  description="Realizar entregas e trocas de bombonas."
                  onPress={() => router.push("/scanner")}
                  primary
                />

                <ActionButton
                  title="RETORNAR BOMBONAS"
                  description="Registrar o retorno das bombonas vazias ao depósito BioOleo."
                  onPress={() => router.push("/returns")}
                />
              </>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              void handleLogout();
            }}
          >
            <Text style={styles.logoutText}>SAIR DA CONTA</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>BIOOLEO BRASIL • SISTEMA DE CONTROLE</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ActionButtonProps {
  title: string;
  description: string;
  onPress: () => void;
  primary?: boolean;
}

function ActionButton({
  title,
  description,
  onPress,
  primary = false,
}: ActionButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionButton,
        primary && styles.primaryAction,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.actionTitle, primary && styles.primaryActionTitle]}>
        {title}
      </Text>

      <Text
        style={[
          styles.actionDescription,
          primary && styles.primaryActionDescription,
        ]}
      >
        {description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 25,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.background,
    paddingTop: 20,
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    width: 110,
    height: 110,
  },
  headerSubtitle: {
    fontSize: 9,
    color: colors.yellow,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 8,
  },
  content: {
    flex: 1,
    padding: 23,
  },
  welcome: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 1.5,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginTop: 5,
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: colors.yellow,
    marginTop: 20,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 18,
    marginTop: 25,
  },
  profileIndicator: {
    width: 5,
    height: 42,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginRight: 15,
  },
  profileInformation: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginTop: 5,
  },
  actionsContainer: {
    marginTop: 30,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.yellow,
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  actionButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.yellow,
    padding: 19,
    borderRadius: 13,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionTitle: {
    color: colors.yellow,
    fontWeight: "900",
    fontSize: 14,
  },
  primaryActionTitle: {
    color: colors.background,
  },
  actionDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 7,
  },
  primaryActionDescription: {
    color: "#073E28",
  },
  logoutButton: {
    backgroundColor: colors.surfaceElevated,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 35,
  },
  logoutText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1,
  },
  pressed: {
    opacity: 0.75,
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
  footer: {
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 15,
  },
});
