import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import { apiService } from "../../../services/api";
import { ApiEndpoints } from "../../../constants/api";
import { updateMyPresenceStatus, type PresenceStatus } from "../../../services/presence";

interface PaymentStatus {
  lineId: string;
  lineName?: string;
  amount?: number;
  status: "paid" | "pending";
}

interface ActiveLine {
  lineId: string;
  name?: string;
  originCity?: string;
  destinationPlace?: string;
  departureTime?: string | null;
  arrivalTime?: string | null;
}

interface PresenceEntry {
  date: string;
  lineId: string;
  lineName?: string;
  status: PresenceStatus;
}

interface Summary {
  lines: ActiveLine[];
  upcomingPresence: PresenceEntry[];
  recentHistory: PresenceEntry[];
}

const STATUS_COLOR: Record<PresenceStatus, string> = {
  "vai e volta": theme.colors.feedback.success,
  "só vou e não volto": theme.colors.brand.orange,
  "não vou mas volto": theme.colors.brand.navy,
  "não vai e nem volta": theme.colors.feedback.error,
};

const STATUS_ICON: Record<PresenceStatus, string> = {
  "vai e volta": "checkmark-circle",
  "só vou e não volto": "arrow-forward-circle",
  "não vou mas volto": "return-down-back",
  "não vai e nem volta": "close-circle",
};

const STATUS_LABEL: Record<PresenceStatus, string> = {
  "vai e volta": "Vou e volto",
  "só vou e não volto": "Só vou",
  "não vou mas volto": "Só volto",
  "não vai e nem volta": "Não vou",
};

const STATUS_OPTIONS: PresenceStatus[] = ["vai e volta", "só vou e não volto", "não vou mas volto", "não vai e nem volta"];

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function isToday(iso: string) {
  return iso === new Date().toISOString().slice(0, 10);
}

function isTomorrow(iso: string) {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return iso === t.toISOString().slice(0, 10);
}

function dayLabel(iso: string) {
  if (isToday(iso)) return "Hoje";
  if (isTomorrow(iso)) return "Amanhã";
  return formatDate(iso);
}

export default function PassengerDashboardScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [payments, setPayments] = useState<PaymentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, paymentRes] = await Promise.all([
        apiService.get<{ success: boolean } & Summary>(ApiEndpoints.GET_MY_SUMMARY),
        apiService.get<{ success: boolean; payments: PaymentStatus[] }>(ApiEndpoints.GET_MY_PAYMENT_STATUS),
      ]);
      if (summaryRes.data.success) {
        setSummary({
          lines: summaryRes.data.lines ?? [],
          upcomingPresence: summaryRes.data.upcomingPresence ?? [],
          recentHistory: summaryRes.data.recentHistory ?? [],
        });
      }
      if ((paymentRes.data as any).success) {
        setPayments((paymentRes.data as any).payments ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleUpdate = useCallback(async (lineId: string, date: string, status: PresenceStatus) => {
    const key = `${lineId}::${date}`;
    setSaving(key);
    const res = await updateMyPresenceStatus(lineId, date, status);
    if (res.success) {
      setSummary((prev) => {
        if (!prev) return prev;
        const updateList = (list: PresenceEntry[]) =>
          list.map((e) => e.lineId === lineId && e.date === date ? { ...e, status: res.status ?? status } : e);
        return { ...prev, upcomingPresence: updateList(prev.upcomingPresence), recentHistory: updateList(prev.recentHistory) };
      });
    } else {
      Alert.alert("Erro", res.error?.message ?? "Não foi possível atualizar sua presença.");
    }
    setSaving(null);
  }, []);

  // Group upcoming entries by date
  const upcomingByDate = useMemo(() => {
    if (!summary) return [];
    const map = new Map<string, PresenceEntry[]>();
    summary.upcomingPresence.forEach((e) => {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [summary]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand.orange} />
        </View>
      </SafeAreaView>
    );
  }

  if (!summary || summary.lines.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Meu Dashboard</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="bus-outline" size={64} color={theme.colors.text.muted} style={{ opacity: 0.4, marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Nenhuma linha ativa</Text>
          <Text style={styles.emptyText}>Entre em uma linha pelo convite do motorista.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const absentCount = summary.upcomingPresence.filter((e) => e.status === "não vai e nem volta").length;
  const presentCount = summary.upcomingPresence.length - absentCount;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Meu Dashboard</Text>
        </View>

        {/* Resumo */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.lines.length}</Text>
            <Text style={styles.summaryLabel}>linhas ativas</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: theme.colors.feedback.success }]}>{presentCount}</Text>
            <Text style={styles.summaryLabel}>confirmados</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: theme.colors.feedback.error }]}>{absentCount}</Text>
            <Text style={styles.summaryLabel}>ausências</Text>
          </View>
        </View>

        {/* Linhas ativas com horário */}
        <Text style={styles.sectionTitle}>Minhas linhas</Text>
        {summary.lines.map((line) => (
          <View key={line.lineId} style={styles.lineCard}>
            <Text style={styles.lineName} numberOfLines={1}>{line.name || line.lineId}</Text>
            <View style={styles.routeRow}>
              <Ionicons name="radio-button-on" size={12} color={theme.colors.brand.orange} />
              <Text style={styles.routeText} numberOfLines={1}>{line.originCity}</Text>
              <Ionicons name="arrow-forward" size={12} color={theme.colors.text.muted} />
              <Text style={styles.routeText} numberOfLines={1}>{line.destinationPlace}</Text>
            </View>
            {(line.departureTime || line.arrivalTime) && (
              <View style={styles.slotRow}>
                {line.departureTime && (
                  <View style={styles.slotBadge}>
                    <Ionicons name="arrow-forward-circle-outline" size={12} color={theme.colors.brand.orange} />
                    <Text style={styles.slotText}>Ida {line.departureTime}</Text>
                  </View>
                )}
                {line.arrivalTime && (
                  <View style={styles.slotBadge}>
                    <Ionicons name="return-down-back-outline" size={12} color={theme.colors.brand.navy} />
                    <Text style={styles.slotText}>Volta {line.arrivalTime}</Text>
                  </View>
                )}
              </View>
            )}
            {/* Botão avaliar */}
            <Pressable
              style={styles.rateBtn}
              onPress={() => (router as any).push({ pathname: "/(app)/(passenger)/rate", params: { lineId: line.lineId, lineName: line.name } })}
            >
              <Ionicons name="star-outline" size={13} color={theme.colors.brand.orange} />
              <Text style={styles.rateBtnText}>Avaliar</Text>
            </Pressable>

            {/* Status real de pagamento */}
            {(() => {
              const pay = payments.find((p) => p.lineId === line.lineId);
              const isPaid = !pay || pay.status === "paid";
              return (
                <View style={[styles.slotBadge, { backgroundColor: (isPaid ? theme.colors.feedback.success : theme.colors.feedback.warning) + "15", borderColor: (isPaid ? theme.colors.feedback.success : theme.colors.feedback.warning) + "40" }]}>
                  <Ionicons name={isPaid ? "checkmark-circle-outline" : "time-outline"} size={12} color={isPaid ? theme.colors.feedback.success : theme.colors.feedback.warning} />
                  <Text style={[styles.slotText, { color: isPaid ? theme.colors.feedback.success : theme.colors.feedback.warning }]}>
                    {isPaid ? "Mensalidade em dia" : `Mensalidade pendente${pay?.amount ? ` · R$ ${pay.amount.toFixed(2)}` : ""}`}
                  </Text>
                </View>
              );
            })()}
          </View>
        ))}

        {/* Próximos 7 dias */}
        <Text style={styles.sectionTitle}>Próximas viagens</Text>
        {upcomingByDate.map(([date, entries]) => (
          <View key={date} style={styles.dayCard}>
            <Text style={[styles.dayLabel, isToday(date) && { color: theme.colors.brand.orange }]}>
              {dayLabel(date)}
            </Text>
            {entries.map((entry) => {
              const key = `${entry.lineId}::${date}`;
              const isSaving = saving === key;
              const color = STATUS_COLOR[entry.status];
              return (
                <View key={entry.lineId} style={styles.dayEntry}>
                  <View style={styles.dayEntryInfo}>
                    <Ionicons name={STATUS_ICON[entry.status] as any} size={16} color={color} />
                    <Text style={styles.dayEntryLine} numberOfLines={1}>
                      {entry.lineName || entry.lineId}
                    </Text>
                  </View>
                  <View style={styles.dayEntryActions}>
                    {STATUS_OPTIONS.map((opt) => {
                      const sel = entry.status === opt;
                      return (
                        <Pressable
                          key={opt}
                          style={[styles.miniBtn, sel && { backgroundColor: STATUS_COLOR[opt] }]}
                          onPress={() => !isSaving && !sel && handleUpdate(entry.lineId, date, opt)}
                          disabled={isSaving}
                        >
                          {isSaving && sel
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Ionicons name={STATUS_ICON[opt] as any} size={13} color={sel ? "#fff" : theme.colors.text.muted} />
                          }
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {/* Histórico */}
        <Text style={styles.sectionTitle}>Histórico (últimos 7 dias)</Text>
        <View style={styles.historyCard}>
          {summary.recentHistory.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum registro encontrado.</Text>
          ) : (
            summary.recentHistory.map((entry) => {
              const color = STATUS_COLOR[entry.status];
              return (
                <View key={`${entry.lineId}::${entry.date}`} style={styles.historyRow}>
                  <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
                  <Text style={styles.historyLine} numberOfLines={1}>{entry.lineName || entry.lineId}</Text>
                  <View style={[styles.historyBadge, { backgroundColor: color + "20" }]}>
                    <Ionicons name={STATUS_ICON[entry.status] as any} size={12} color={color} />
                    <Text style={[styles.historyBadgeText, { color }]}>{STATUS_LABEL[entry.status]}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.xl },
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md },
  title: { fontSize: theme.font.xl, fontWeight: "800", color: theme.colors.text.primary },
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  emptyTitle: { fontSize: theme.font.lg, fontWeight: "700", color: theme.colors.text.primary, marginBottom: theme.spacing.sm },
  emptyText: { fontSize: theme.font.sm, color: theme.colors.text.secondary, textAlign: "center" },
  sectionTitle: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: theme.spacing.xl },
  summaryRow: { flexDirection: "row", gap: theme.spacing.md, paddingHorizontal: theme.spacing.xl },
  summaryCard: { flex: 1, backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.md, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border.soft },
  summaryValue: { fontSize: theme.font.xxl, fontWeight: "800", color: theme.colors.text.primary },
  summaryLabel: { fontSize: theme.font.xs, color: theme.colors.text.secondary, textAlign: "center" },
  lineCard: { marginHorizontal: theme.spacing.xl, backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border.soft, ...theme.shadow.card },
  lineName: { fontSize: theme.font.md, fontWeight: "800", color: theme.colors.text.primary },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  routeText: { fontSize: theme.font.sm, color: theme.colors.text.secondary, flex: 1 },
  slotRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  slotBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border.soft, backgroundColor: theme.colors.background.muted },
  slotText: { fontSize: theme.font.xs, fontWeight: "600", color: theme.colors.text.secondary },
  dayCard: { marginHorizontal: theme.spacing.xl, backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border.soft },
  dayLabel: { fontSize: theme.font.sm, fontWeight: "800", color: theme.colors.text.primary },
  dayEntry: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm },
  dayEntryInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  dayEntryLine: { flex: 1, fontSize: theme.font.sm, color: theme.colors.text.secondary },
  dayEntryActions: { flexDirection: "row", gap: 6 },
  miniBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background.muted, borderWidth: 1, borderColor: theme.colors.border.soft },
  historyCard: { marginHorizontal: theme.spacing.xl, backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border.soft },
  historyRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  historyDate: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.text.muted, width: 36 },
  historyLine: { flex: 1, fontSize: theme.font.sm, color: theme.colors.text.primary },
  historyBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.pill },
  historyBadgeText: { fontSize: theme.font.xs, fontWeight: "700" },
  rateBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.brand.orange + "60", backgroundColor: theme.colors.brand.orange + "10" },
  rateBtnText: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.brand.orange },
});
