import { DashboardScreen } from "@/components/dashboard-screen";

export default function AdminScreen() {
  return (
    <DashboardScreen
      requiredRole="admin"
      title="Painel administrativo"
      description="Gerencie bombonas, estabelecimentos, entregadores e movimentações."
    />
  );
}
