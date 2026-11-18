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

import { useColorScheme } from 'react-native';
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    getCurrentUserProfile,
    signOutUser,
    type UserProfile,
    type UserRole,
} from "@/services/authService";

import { Colors } from '@/constants/theme';

interface DashboardScreenProps {
    requiredRole: UserRole;
    title: string;
    description: string;
}

export function DashboardScreen({
    requiredRole,
    title,
    description,
}: DashboardScreenProps) {
    const scheme = useColorScheme();
    const base = scheme === 'dark' ? Colors.dark : Colors.light;
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
            if (isMounted) {
                router.replace("/");
            }
        }
    }

    const styles = StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: base.background,
        },
        scrollContent: {
            flexGrow: 1,
            paddingBottom: 25,
        },
        header: {
            alignItems: "center",
            backgroundColor: base.background,
            paddingTop: 20,
            paddingBottom: 22,
            borderBottomWidth: 1,
            borderBottomColor: base.border,
        },
        backButton: {
            color: base.yellow,
            fontSize: 14,
            fontWeight: "700",
            marginBottom: 22,
        },
        brandName: {
            color: base.yellow,
            fontSize: 26,
            fontWeight: "900",
            letterSpacing: 2,
        },
        headerSubtitle: {
            color: base.primary,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1.5,
            marginTop: 5,
        },
        loadingContainer: {
            flex: 1,
            backgroundColor: base.background,
            alignItems: "center",
            justifyContent: "center",
        },
        pageTitle: {
            color: base.text,
            fontSize: 25,
            fontWeight: "900",
        },
        pageDescription: {
            color: base.textSecondary,
            fontSize: 13,
            lineHeight: 20,
            marginTop: 8,
            marginBottom: 20,
        },
        content: {
            padding: 20,
        },
    });

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.replace("/admin")}>
                        <Text style={styles.backButton}>← Voltar ao painel</Text>
                    </Pressable>

                    <Text style={styles.brandName}>BIOOLEO</Text>
                    <Text style={styles.headerSubtitle}>{description}</Text>
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={base.yellow} />
                        <Text style={{ color: base.yellow }}>Carregando...</Text>
                    </View>
                ) : null}

                <View style={styles.content}>
                    <Text style={styles.pageTitle}>Painel de Controle</Text>

                    <Text style={styles.pageDescription}>
                        Bem-vindo ao sistema BioOleo.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}