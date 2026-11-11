import { supabase } from "@/lib/supabase";

export interface DriverAssignment {
  container_id: string;
  container_code: string;
  capacity_l: number;
  contents_status: "full" | "empty" | "unknown";
  target_establishment_id: string | null;
  establishment_name: string | null;
  city: string | null;
  state: string | null;
}

export interface ExchangeResult {
  success: boolean;
  exchange_id: string;
  establishment: string;
  distance_m: number;
  delivered_code: string;
  collected_code: string;
}

interface CompleteExchangeInput {
  expectedFullContainerId: string;
  fullQrToken: string;
  emptyQrToken: string;
  establishmentId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}

export async function getDriverAssignments(): Promise<DriverAssignment[]> {
  const { data, error } = await supabase.rpc("get_driver_assignments");

  if (error) {
    throw new Error(`Não foi possível carregar as entregas: ${error.message}`);
  }

  return (data ?? []) as DriverAssignment[];
}

export async function completeContainerExchange(
  input: CompleteExchangeInput,
): Promise<ExchangeResult> {
  const { data, error } = await supabase.rpc("complete_container_exchange", {
    p_expected_full_container_id: input.expectedFullContainerId,
    p_full_qr_token: input.fullQrToken,
    p_empty_qr_token: input.emptyQrToken,
    p_establishment_id: input.establishmentId,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_accuracy_m: input.accuracy,
    p_empty_confirmed: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("O servidor não confirmou a troca.");
  }

  return data as ExchangeResult;
}
