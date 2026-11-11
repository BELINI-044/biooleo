import { supabase } from "@/lib/supabase";

export interface ReturnableContainer {
  container_id: string;
  container_code: string;
  capacity_l: number;
  dispatched_at: string;
}

export interface ContainerReturnResult {
  success: boolean;
  container_code: string;
  depot_name: string;
  contents_status: "empty";
  status: "available";
  distance_m: number;
}

interface CompleteReturnInput {
  containerId: string;
  qrToken: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}

export async function getReturnableContainers(): Promise<
  ReturnableContainer[]
> {
  const { data, error } = await supabase.rpc("get_driver_return_containers");

  if (error) {
    throw new Error(
      `Não foi possível carregar as devoluções: ${error.message}`,
    );
  }

  return (data ?? []) as ReturnableContainer[];
}

export async function completeContainerReturn(
  input: CompleteReturnInput,
): Promise<ContainerReturnResult> {
  if (!input.containerId || !input.qrToken) {
    throw new Error("Identificação da bombona inválida.");
  }

  if (
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude) ||
    !Number.isFinite(input.accuracy) ||
    input.accuracy < 0 ||
    input.accuracy > 100
  ) {
    throw new Error("A localização GPS é inválida ou imprecisa.");
  }

  const { data, error } = await supabase.rpc("complete_container_return", {
    p_container_id: input.containerId,
    p_qr_token: input.qrToken,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_accuracy_m: input.accuracy,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.success !== true) {
    throw new Error("O servidor não confirmou o retorno.");
  }

  return data as ContainerReturnResult;
}
