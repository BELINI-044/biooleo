import { supabase } from "@/lib/supabase";

export interface Establishment {
  id: string;
  name: string;
  phone: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateEstablishmentInput {
  name: string;
  phone?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city: string;
  state: string;
  postal_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  geofence_radius_m: number;
}

function validateCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): void {
  const hasLatitude = latitude != null;
  const hasLongitude = longitude != null;

  if (hasLatitude !== hasLongitude) {
    throw new Error("Latitude e longitude precisam ser informadas juntas.");
  }

  if (
    hasLatitude &&
    (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
  ) {
    throw new Error("Latitude inválida.");
  }

  if (
    hasLongitude &&
    (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
  ) {
    throw new Error("Longitude inválida.");
  }
}

function validateEstablishment(input: CreateEstablishmentInput): void {
  if (input.name.trim().length < 2) {
    throw new Error("Informe o nome do estabelecimento.");
  }

  if (input.city.trim().length < 2) {
    throw new Error("Informe a cidade.");
  }

  if (!/^[A-Za-z]{2}$/.test(input.state.trim())) {
    throw new Error("Informe uma UF válida.");
  }

  if (
    !Number.isInteger(input.geofence_radius_m) ||
    input.geofence_radius_m < 20 ||
    input.geofence_radius_m > 1000
  ) {
    throw new Error("O raio deve estar entre 20 e 1000 metros.");
  }

  validateCoordinates(input.latitude, input.longitude);
}

export async function createEstablishment(
  input: CreateEstablishmentInput,
): Promise<Establishment> {
  validateEstablishment(input);

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  const { data, error } = await supabase
    .from("establishments")
    .insert({
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      street: input.street?.trim() || null,
      number: input.number?.trim() || null,
      neighborhood: input.neighborhood?.trim() || null,
      city: input.city.trim(),
      state: input.state.trim().toUpperCase(),
      postal_code: input.postal_code?.trim() || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      geofence_radius_m: input.geofence_radius_m,
      created_by: authData.user.id,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.code === "42501"
        ? "Somente administradores podem cadastrar estabelecimentos."
        : `Falha ao cadastrar estabelecimento: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error("Estabelecimento não retornado pelo banco.");
  }

  return data as Establishment;
}

export async function listEstablishments(): Promise<Establishment[]> {
  const { data, error } = await supabase
    .from("establishments")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      `Não foi possível carregar os estabelecimentos: ${error.message}`,
    );
  }

  return (data ?? []) as Establishment[];
}
