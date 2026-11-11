import { supabase } from "@/lib/supabase";

export type UserRole = "admin" | "driver";

export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

interface ProfileRecord {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

function isValidRole(role: string): role is UserRole {
  return role === "admin" || role === "driver";
}

async function clearSession(): Promise<void> {
  await supabase.auth.signOut();
}

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const profile = data as ProfileRecord;

  if (!profile.is_active || !isValidRole(profile.role)) {
    return null;
  }

  return {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role,
    is_active: profile.is_active,
  };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<UserProfile> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.user) {
    throw new Error("E-mail ou senha incorretos.");
  }

  try {
    const profile = await fetchUserProfile(data.user.id);

    if (!profile) {
      await clearSession();
      throw new Error("Perfil não encontrado, desativado ou sem permissão.");
    }

    return profile;
  } catch (error) {
    await clearSession();

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Não foi possível carregar seu perfil.");
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const profile = await fetchUserProfile(data.user.id);

  if (!profile) {
    await clearSession();
    return null;
  }

  return profile;
}

export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("Não foi possível encerrar sua sessão.");
  }
}
