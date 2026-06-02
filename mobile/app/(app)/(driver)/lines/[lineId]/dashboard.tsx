import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../../../constants/theme";
import {
  getOperationsDashboard,
  type OperationsDashboard,
  type SegmentOccupancy,
  type OperationsAlert,
  type RoutePoint,
  type SlotOccupancy,
} from "../../../../../services/operations";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function alertColor(level: string) {
  if (level === "capacity-exceeded") return theme.colors.feedback.error;
  if (level === "critical") return theme.colors.feedback.warning;
  return theme.colors.feedback.success;
}

function alertIcon(level: string): "checkmark-circle" | "warning" | "alert-circle" {
  if (level === "capacity-exceeded") return "alert-circle";
  if (level === "critical") return "warning";
  return "checkmark-circle";
}

function alertLabel(level: string) {
  if (level === "capacity-exceeded") return "Excedido";
  if (level === "critical") return "Crítico";
  return "Normal";
}

interface SegmentCardProps {
  label: string;
  occupancy: SegmentOccupancy;
  capacity: number;
  alert?: OperationsAlert;
}

function SegmentCard({ label, occupancy, capacity, alert }: SegmentCardProps) {
  const level = alert?.level ?? "normal";
  const color = alertColor(level);
  const percentage = occupancy.percentage;

  return (
    <View style={styles.segmentCard}>
      <View style={styles.segmentHeader}>
        <Text style={styles.segmentLabel}>{label}</Text>
        <View style={[styles.alertBadge, { backgroundColor: color + "20", borderColor: color + "60" }]}>
          <Ionicons name={alertIcon(level)} size={14} color={color} />
          <Text style={[styles.alertBadgeText, { color }]}>{alertLabel(level)}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{occupancy.confirmedCount}</Text>
          <Text style={styles.metricLabel}>confirmados</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{capacity}</Text>
          <Text style={styles.metricLabel}>lugares</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color }]}>{percentage}%</Text>
          <Text style={styles.metricLabel}>ocupação</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

export default function LineDashboardScreen() {
  const { lineId } = useLocalSearchParams<{ lineId: string }>();
  const router = useRouter();
  const [data, setData] = useState<OperationsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const date = todayISO();

  const load = useCallback(async () => {
    if (!lineId) return;
    setError(null);
    const result = await getOperationsDashboard(lineId, date);
    if (result.success) {
      setData(result as OperationsDashboard);
    } else {
      const err = (result as any).error;
      setError(err?.message ?? "Não foi possível carregar o dashboard.");
    }
    setLoading(false);
    setRefreshing(false);
  }, [lineId, date]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand.orange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Ocupação da linha</Text>
          <Text style={styles.headerDate}>{date}</Text>
        </View>
        <Pressable onPress={onRefresh} style={styles.refreshBtn} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color={theme.colors.brand.orange} />
            : <Ionicons name="refresh" size={22} color={theme.colors.brand.orange} />
          }
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.text.muted} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : data ? (
          <>
            {(data.hasCriticalAlert || data.hasExceededAlert) && (
              <View style={[styles.alertBanner, { backgroundColor: data.hasExceededAlert ? theme.colors.feedback.error + "15" : theme.colors.feedback.warning + "15" }]}>
                <Ionicons
                  name={data.hasExceededAlert ? "alert-circle" : "warning"}
                  size={20}
                  color={data.hasExceededAlert ? theme.colors.feedback.error : theme.colors.feedback.warning}
                />
                <Text style={[styles.alertBannerText, { color: data.hasExceededAlert ? theme.colors.feedback.error : theme.colors.feedback.warning }]}>
                  {data.hasExceededAlert ? "Capacidade excedida em um ou mais trechos." : "Lotação crítica em um ou mais trechos."}
                </Text>
              </View>
            )}

            {/* Slots de ida por horário */}
            <Text style={styles.sectionTitle}>Ida</Text>
            {data.slots?.departureSlots?.length > 0
              ? data.slots.departureSlots.map((s: SlotOccupancy) => (
                  <SegmentCard
                    key={s.slot}
                    label={`Saída ${s.slot}`}
                    occupancy={{ confirmedCount: s.confirmedCount, percentage: s.percentage, confirmedPassengerIds: [] }}
                    capacity={data.capacity}
                    alert={data.alerts.find((a) => a.segment === "ida")}
                  />
                ))
              : <SegmentCard
                  label="Trecho de ida"
                  occupancy={data.occupancy.outbound}
                  capacity={data.capacity}
                  alert={data.alerts.find((a) => a.segment === "ida")}
                />
            }

            {/* Slots de volta por horário */}
            <Text style={styles.sectionTitle}>Volta</Text>
            {data.slots?.arrivalSlots?.length > 0
              ? data.slots.arrivalSlots.map((s: SlotOccupancy) => (
                  <SegmentCard
                    key={s.slot}
                    label={`Chegada ${s.slot}`}
                    occupancy={{ confirmedCount: s.confirmedCount, percentage: s.percentage, confirmedPassengerIds: [] }}
                    capacity={data.capacity}
                    alert={data.alerts.find((a) => a.segment === "volta")}
                  />
                ))
              : <SegmentCard
                  label="Trecho de volta"
                  occupancy={data.occupancy.return}
                  capacity={data.capacity}
                  alert={data.alerts.find((a) => a.segment === "volta")}
                />
            }

            {data.routePoints && data.routePoints.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Rota do dia</Text>
                <View style={styles.routeCard}>
                  {data.routePoints.map((pt: RoutePoint) => (
                    <View key={pt.id} style={styles.routePoint}>
                      <Ionicons
                        name={pt.type === "pickup" ? "arrow-up-circle" : "arrow-down-circle"}
                        size={16}
                        color={pt.type === "pickup" ? theme.colors.feedback.success : theme.colors.feedback.error}
                      />
                      <Text style={styles.routePointText} numberOfLines={1}>{pt.address}</Text>
                      <Text style={styles.routeSegment}>{pt.segment === "ida" ? "Ida" : "Volta"}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.soft,
    gap: theme.spacing.md,
  },
  backBtn: { padding: theme.spacing.xs },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  headerDate: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  refreshBtn: { padding: theme.spacing.xs },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  sectionTitle: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.8 },
  segmentCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    ...theme.shadow.card,
  },
  segmentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  segmentLabel: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.primary },
  alertBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.radius.pill, borderWidth: 1 },
  alertBadgeText: { fontSize: theme.font.xs, fontWeight: "700" },
  metricsRow: { flexDirection: "row", alignItems: "center" },
  metric: { flex: 1, alignItems: "center", gap: 2 },
  metricValue: { fontSize: theme.font.xl, fontWeight: "800", color: theme.colors.text.primary },
  metricLabel: { fontSize: theme.font.xs, color: theme.colors.text.secondary },
  metricDivider: { width: 1, height: 32, backgroundColor: theme.colors.border.soft },
  progressBar: { height: 8, backgroundColor: theme.colors.border.soft, borderRadius: theme.radius.pill, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: theme.radius.pill },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  alertBannerText: { flex: 1, fontSize: theme.font.sm, fontWeight: "700" },
  routeCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    ...theme.shadow.card,
  },
  routePoint: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  routePointText: { flex: 1, fontSize: theme.font.sm, color: theme.colors.text.primary },
  routeSegment: {
    fontSize: theme.font.xs,
    color: theme.colors.text.muted,
    backgroundColor: theme.colors.background.muted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  errorBox: { alignItems: "center", gap: theme.spacing.md, paddingTop: theme.spacing.xxl },
  errorText: { fontSize: theme.font.md, color: theme.colors.text.secondary, textAlign: "center" },
  retryBtn: { paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, backgroundColor: theme.colors.brand.orange, borderRadius: theme.radius.pill },
  retryText: { color: theme.colors.text.inverse, fontWeight: "700" },
});
