import { supabase } from "@/lib/supabase";

export interface Container {
  id: string;
  code: string;
  qr_token: string;
  capacity_l: number;
  status: string;
  created_at: string;
}

export async function createContainer(
  capacityLiters: number,
): Promise<Container> {
  if (
    !Number.isFinite(capacityLiters) ||
    capacityLiters <= 0 ||
    capacityLiters > 10000
  ) {
    throw new Error("Informe uma capacidade válida.");
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Você precisa estar autenticado.");
  }

  const { data, error } = await supabase
    .from("containers")
    .insert({
      capacity_l: capacityLiters,
      created_by: authData.user.id,
    })
    .select("id, code, qr_token, capacity_l, status, created_at")
    .single();

  if (error) {
    if (error.code === "42501") {
      throw new Error("Somente administradores podem cadastrar bombonas.");
    }

    throw new Error(
      "Não foi possível cadastrar a bombona. Verifique sua conexão.",
    );
  }

  if (!data) {
    throw new Error("O banco não retornou os dados da bombona.");
  }

  return data as Container;
}

export interface ContainerLabel {
  id: string;
  code: string;
  qr_token: string;
  capacity_l: number;
  status: string;
  contents_status: string;
  created_at: string;
}

export async function listContainerLabels(): Promise<ContainerLabel[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  const { data, error } = await supabase
    .from("containers")
    .select(
      "id, code, qr_token, capacity_l, status, contents_status, created_at",
    )
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (error) {
    throw new Error(`Não foi possível recuperar os QR Codes: ${error.message}`);
  }

  return (data ?? []) as ContainerLabel[];
}
