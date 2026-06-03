import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import { apiService } from "../../../services/api";
import { ApiEndpoints } from "../../../constants/api";

interface DashboardData {
  month: string;
  fleet: { totalVehicles: number };
  lines: { total: number; totalPassengers: number; list: any[] };
  financial: { monthlyReceived: number; monthlyPending: number; extraIncome: number; expenses: number; netProfit: number };
  analytics: { estimatedKm: number; singleVanDays: number; economySaved: number; totalAbsences: number };
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
}

function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}

function MetricCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={[styles.metricCard, color ? { borderTopColor: color, borderTopWidth: 3 } : {}]}>
      <Ionicons name={icon as any} size={20} color={color ?? theme.colors.brand.orange} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {sub && <Text style={styles.metricSub}>{sub}</Text>}
    </View>
  );
}

export default function DriverAnalyticsScreen() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.get<{ success: boolean } & DashboardData>(
        `${ApiEndpoints.GET_DRIVER_DASHBOARD}?month=${month}`,
      );
      if ((res.data as any).success) setData(res.data as DashboardData);
    } catch { /* silent */ }
    setLoading(false);
  }, [month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.brand.orange} /></View>
      </SafeAreaView>
    );
  }

  const f = data?.financial;
  const a = data?.analytics;

  return (
    <SafeAreaView style={styles.container}>
      {/* Navegação de mês */}
      <View style={styles.monthNav}>
        <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.brand.orange} />
        </Pressable>
        <Text style={styles.monthLabel}>{formatMonth(month)}</Text>
        <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.monthBtn}>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.brand.orange} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Frota e linhas */}
        <Text style={styles.sectionTitle}>Visão geral</Text>
        <View style={styles.metricsGrid}>
          <MetricCard icon="car-outline" label="Vans" value={String(data?.fleet.totalVehicles ?? 0)} color={theme.colors.brand.navy} />
          <MetricCard icon="map-outline" label="Linhas ativas" value={String(data?.lines.total ?? 0)} color={theme.colors.brand.orange} />
          <MetricCard icon="people-outline" label="Passageiros" value={String(data?.lines.totalPassengers ?? 0)} color={theme.colors.feedback.success} />
          <MetricCard icon="speedometer-outline" label="Km estimados" value={`${a?.estimatedKm ?? 0} km`} color={theme.colors.feedback.warning} />
        </View>

        {/* Financeiro */}
        <Text style={styles.sectionTitle}>Financeiro</Text>
        <View style={styles.financeCard}>
          <View style={styles.finRow}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.feedback.success} />
            <Text style={styles.finLabel}>Mensalidades recebidas</Text>
            <Text style={[styles.finValue, { color: theme.colors.feedback.success }]}>{formatCurrency(f?.monthlyReceived ?? 0)}</Text>
          </View>
          <View style={styles.finRow}>
            <Ionicons name="time-outline" size={16} color={theme.colors.feedback.warning} />
            <Text style={styles.finLabel}>Mensalidades pendentes</Text>
            <Text style={[styles.finValue, { color: theme.colors.feedback.warning }]}>{formatCurrency(f?.monthlyPending ?? 0)}</Text>
          </View>
          <View style={styles.finRow}>
            <Ionicons name="add-circle-outline" size={16} color={theme.colors.brand.navy} />
            <Text style={styles.finLabel}>Receitas extras</Text>
            <Text style={[styles.finValue, { color: theme.colors.brand.navy }]}>{formatCurrency(f?.extraIncome ?? 0)}</Text>
          </View>
          <View style={styles.finRow}>
            <Ionicons name="remove-circle-outline" size={16} color={theme.colors.feedback.error} />
            <Text style={styles.finLabel}>Despesas</Text>
            <Text style={[styles.finValue, { color: theme.colors.feedback.error }]}>{formatCurrency(f?.expenses ?? 0)}</Text>
          </View>
          <View style={[styles.finRow, styles.finRowTotal]}>
            <Ionicons name="trending-up-outline" size={16} color={(f?.netProfit ?? 0) >= 0 ? theme.colors.feedback.success : theme.colors.feedback.error} />
            <Text style={styles.finLabelBold}>Lucro líquido</Text>
            <Text style={[styles.finValueBold, { color: (f?.netProfit ?? 0) >= 0 ? theme.colors.feedback.success : theme.colors.feedback.error }]}>
              {formatCurrency(f?.netProfit ?? 0)}
            </Text>
          </View>
        </View>

        {/* RF30 — Relatório de economia */}
        <Text style={styles.sectionTitle}>Relatório de economia (RF30)</Text>
        <View style={styles.reportCard}>
          <View style={styles.reportRow}>
            <View style={styles.reportIcon}>
              <Ionicons name="car-outline" size={24} color={theme.colors.feedback.success} />
            </View>
            <View style={styles.reportInfo}>
              <Text style={styles.reportValue}>{a?.singleVanDays ?? 0} dias</Text>
              <Text style={styles.reportLabel}>operando com 1 van</Text>
            </View>
          </View>
          <View style={styles.reportRow}>
            <View style={[styles.reportIcon, { backgroundColor: theme.colors.feedback.success + "20" }]}>
              <Ionicons name="cash-outline" size={24} color={theme.colors.feedback.success} />
            </View>
            <View style={styles.reportInfo}>
              <Text style={[styles.reportValue, { color: theme.colors.feedback.success }]}>
                {formatCurrency(a?.economySaved ?? 0)}
              </Text>
              <Text style={styles.reportLabel}>economia estimada no mês</Text>
            </View>
          </View>
          <View style={styles.reportRow}>
            <View style={[styles.reportIcon, { backgroundColor: theme.colors.feedback.warning + "20" }]}>
              <Ionicons name="person-remove-outline" size={24} color={theme.colors.feedback.warning} />
            </View>
            <View style={styles.reportInfo}>
              <Text style={styles.reportValue}>{a?.totalAbsences ?? 0}</Text>
              <Text style={styles.reportLabel}>ausências registradas</Text>
            </View>
          </View>
        </View>

        {/* Linhas detalhadas */}
        {(data?.lines.list ?? []).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Por linha</Text>
            {data!.lines.list.map((line) => (
              <View key={line.lineId} style={styles.lineCard}>
                <Text style={styles.lineName} numberOfLines={1}>{line.name || line.lineId}</Text>
                <View style={styles.lineStats}>
                  <Text style={styles.lineStat}>{line.passengerCount} passageiros</Text>
                  <Text style={styles.lineStat}>Cap: {line.capacity}</Text>
                  <Text style={[styles.lineStat, { color: line.passengerCount >= line.capacity * 0.8 ? theme.colors.feedback.warning : theme.colors.feedback.success }]}>
                    {Math.round((line.passengerCount / line.capacity) * 100)}%
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.md, gap: theme.spacing.xl, borderBottomWidth: 1, borderBottomColor: theme.colors.border.soft },
  monthBtn: { padding: theme.spacing.sm },
  monthLabel: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary, minWidth: 120, textAlign: "center" },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  sectionTitle: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.8 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md },
  metricCard: { flex: 1, minWidth: "45%", backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.md, gap: 4, borderWidth: 1, borderColor: theme.colors.border.soft, alignItems: "flex-start" },
  metricValue: { fontSize: theme.font.xl, fontWeight: "800", color: theme.colors.text.primary },
  metricLabel: { fontSize: theme.font.xs, color: theme.colors.text.secondary },
  metricSub: { fontSize: theme.font.xs, color: theme.colors.text.muted },
  financeCard: { backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border.soft },
  finRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  finRowTotal: { borderTopWidth: 1, borderTopColor: theme.colors.border.soft, paddingTop: theme.spacing.md, marginTop: theme.spacing.xs },
  finLabel: { flex: 1, fontSize: theme.font.sm, color: theme.colors.text.secondary },
  finLabelBold: { flex: 1, fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.primary },
  finValue: { fontSize: theme.font.sm, fontWeight: "600" },
  finValueBold: { fontSize: theme.font.md, fontWeight: "800" },
  reportCard: { backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border.soft },
  reportRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.lg },
  reportIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.feedback.success + "15", alignItems: "center", justifyContent: "center" },
  reportInfo: { flex: 1 },
  reportValue: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  reportLabel: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  lineCard: { backgroundColor: theme.colors.background.card, borderRadius: theme.radius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border.soft, gap: theme.spacing.xs },
  lineName: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.primary },
  lineStats: { flexDirection: "row", gap: theme.spacing.lg },
  lineStat: { fontSize: theme.font.xs, color: theme.colors.text.secondary },
});
