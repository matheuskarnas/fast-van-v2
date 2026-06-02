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
  postVanDecision,
  fetchVanDecision,
  type OperationsDashboard,
  type SegmentOccupancy,
  type OperationsAlert,
  type RoutePoint,
  type SlotOccupancy,
  type VanDecision,
  type VanDecisionRecord,
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

const DECISION_OPTIONS: { value: VanDecision; label: string; icon: string; color: string }[] = [
  { value: "single_van", label: "Usar 1 van", icon: "bus-outline", color: theme.colors.feedback.success },
  { value: "double_van_fleet", label: "2ª van (frota)", icon: "car-outline", color: theme.colors.brand.navy },
  { value: "double_van_app", label: "2ª van (Uber/99)", icon: "phone-portrait-outline", color: theme.colors.brand.orange },
];

function DecisionPanel({
  totalConfirmed, capacity, current, saving, onDecide,
}: {
  totalConfirmed: number;
  capacity: number;
  current: VanDecisionRecord | null;
  saving: boolean;
  onDecide: (d: VanDecision) => void;
}) {
  const pct = Math.round((totalConfirmed / capacity) * 100);
  const suggestion = pct >= 80 ? "double_van_fleet" : "single_van";

  return (
    <View style={styles.decisionCard}>
      <View style={styles.decisionHeader}>
        <Text style={styles.decisionTitle}>
          {totalConfirmed}/{capacity} passageiros confirmados ({pct}%)
        </Text>
        {!current && (
          <View style={[styles.suggestionBadge, { backgroundColor: (suggestion === "single_van" ? theme.colors.feedback.success : theme.colors.feedback.warning) + "20" }]}>
            <Text style={[styles.suggestionText, { color: suggestion === "single_van" ? theme.colors.feedback.success : theme.colors.feedback.warning }]}>
              {suggestion === "single_van" ? "Sugestão: 1 van" : "Sugestão: 2ª van"}
            </Text>
          </View>
        )}
        {current && (
          <View style={[styles.suggestionBadge, { backgroundColor: theme.colors.feedback.success + "20" }]}>
            <Ionicons name="checkmark-circle" size={13} color={theme.colors.feedback.success} />
            <Text style={[styles.suggestionText, { color: theme.colors.feedback.success }]}>Decisão registrada</Text>
          </View>
        )}
      </View>

      <View style={styles.decisionOptions}>
        {DECISION_OPTIONS.map((opt) => {
          const selected = current?.decision === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.decisionBtn, selected && { borderColor: opt.color, backgroundColor: opt.color + "15" }]}
              onPress={() => !saving && onDecide(opt.value)}
              disabled={saving}
            >
              {saving && selected
                ? <ActivityIndicator size="small" color={opt.color} />
                : <Ionicons name={opt.icon as any} size={18} color={selected ? opt.color : theme.colors.text.muted} />
              }
              <Text style={[styles.decisionBtnText, selected && { color: opt.color, fontWeight: "700" }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
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
  const [decision, setDecision] = useState<VanDecisionRecord | null>(null);
  const [savingDecision, setSavingDecision] = useState(false);
  const date = todayISO();

  const load = useCallback(async () => {
    if (!lineId) return;
    setError(null);
    const [dashResult, decisionResult] = await Promise.all([
      getOperationsDashboard(lineId, date),
      fetchVanDecision(lineId, date),
    ]);
    if (dashResult.success) {
      setData(dashResult as OperationsDashboard);
    } else {
      const err = (dashResult as any).error;
      setError(err?.message ?? "Não foi possível carregar o dashboard.");
    }
    if (decisionResult.success) setDecision(decisionResult.decision);
    setLoading(false);
    setRefreshing(false);
  }, [lineId, date]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDecision = useCallback(async (d: VanDecision) => {
    if (!lineId) return;
    setSavingDecision(true);
    const res = await postVanDecision(lineId, { date, decision: d });
    if (res.success && res.decision) setDecision(res.decision);
    setSavingDecision(false);
  }, [lineId, date]);

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

            {/* RF9: Painel de Decisão */}
            <Text style={styles.sectionTitle}>Decisão do dia</Text>
            <DecisionPanel
              totalConfirmed={
                data.slots?.departureSlots?.reduce((s, x) => s + x.confirmedCount, 0)
                ?? data.occupancy.outbound.confirmedCount
              }
              capacity={data.capacity}
              current={decision}
              saving={savingDecision}
              onDecide={handleDecision}
            />

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
  decisionCard: { backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border.soft, ...theme.shadow.card },
  decisionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: theme.spacing.sm },
  decisionTitle: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.primary, flex: 1 },
  suggestionBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.radius.pill },
  suggestionText: { fontSize: theme.font.xs, fontWeight: "700" },
  decisionOptions: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  decisionBtn: { flex: 1, minWidth: 90, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.border.default, backgroundColor: theme.colors.background.muted },
  decisionBtnText: { fontSize: theme.font.xs, fontWeight: "600", color: theme.colors.text.secondary },
});
