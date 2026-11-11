import { DashboardScreen } from "@/components/dashboard-screen";

export default function DriverScreen() {
  return (
    <DashboardScreen
      requiredRole="driver"
      title="Área do entregador"
      description="Acesse suas entregas, retiradas e leitura de QR Codes."
    />
  );
}
