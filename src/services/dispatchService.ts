import { supabase } from "@/lib/supabase";

export interface DriverOption {
  id: string;
  full_name: string;
}

export interface DispatchableContainer {
  id: string;
  code: string;
  capacity_l: number;
  contents_status: string;
}

export interface EstablishmentOption {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface DispatchOptions {
  drivers: DriverOption[];
  containers: DispatchableContainer[];
  establishments: EstablishmentOption[];
}

export interface DispatchResult {
  success: boolean;
  container_code: string;
  status: string;
  driver_id: string;
  establishment_id: string;
}

export async function loadDispatchOptions(): Promise<DispatchOptions> {
  const [driversResult, containersResult, establishmentsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "driver")
        .eq("is_active", true)
        .order("full_name"),

      supabase
        .from("containers")
        .select("id, code, capacity_l, contents_status")
        .eq("status", "available")
        .eq("contents_status", "full")
        .eq("is_active", true)
        .order("code"),

      supabase
        .from("establishments")
        .select("id, name, city, state")
        .eq("is_active", true)
        .order("name"),
    ]);

  if (driversResult.error) {
    throw new Error("Não foi possível carregar os entregadores.");
  }

  if (containersResult.error) {
    throw new Error("Não foi possível carregar as bombonas disponíveis.");
  }

  if (establishmentsResult.error) {
    throw new Error("Não foi possível carregar os estabelecimentos.");
  }

  return {
    drivers: (driversResult.data ?? []) as DriverOption[],
    containers: (containersResult.data ?? []) as DispatchableContainer[],
    establishments: (establishmentsResult.data ?? []) as EstablishmentOption[],
  };
}

export async function dispatchContainer(
  containerId: string,
  driverId: string,
  establishmentId: string,
): Promise<DispatchResult> {
  if (!containerId || !driverId || !establishmentId) {
    throw new Error("Selecione a bombona, o entregador e o estabelecimento.");
  }

  const { data, error } = await supabase.rpc("dispatch_container", {
    p_container_id: containerId,
    p_driver_id: driverId,
    p_establishment_id: establishmentId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as DispatchResult;
}
