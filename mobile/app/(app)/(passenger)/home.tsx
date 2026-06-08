import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiEndpoints } from "../../../constants/api";
import { theme } from "../../../constants/theme";
import { apiService } from "../../../services/api";
import { getSession } from "../../../services/session";
import type { PresenceStatus } from "../../../services/presence";

const PENDING_INVITE_KEY = "pendingInviteToken";

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

interface PassengerSummary {
  lines: ActiveLine[];
  upcomingPresence: PresenceEntry[];
  recentHistory: PresenceEntry[];
}

interface PaymentStatus {
  lineId: string;
  amount?: number | null;
  status: "paid" | "pending";
  displayStatus?: "paid" | "pending" | "overdue";
  dueDay?: number | null;
}

const STATUS_LABEL: Record<PresenceStatus, string> = {
  "vai e volta": "Vou e volto",
  "só vou e não volto": "Só ida",
  "não vou mas volto": "Só volta",
  "não vai e nem volta": "Não vou",
};

const STATUS_COLOR: Record<PresenceStatus, string> = {
  "vai e volta": theme.colors.feedback.success,
  "só vou e não volto": theme.colors.brand.orange,
  "não vou mas volto": theme.colors.brand.navy,
  "não vai e nem volta": theme.colors.feedback.error,
};

function formatDate(iso?: string) {
  if (!iso) return "Sem data";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}`;
}

function formatMoney(value?: number | null) {
  if (!value) return "Não configurado";
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export default function PassengerHomeScreen() {
  const router = useRouter();
  const [name, setName] = useState("Passageiro");
  const [summary, setSummary] = useState<PassengerSummary | null>(null);
  const [payments, setPayments] = useState<PaymentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      if (session?.userName) setName(session.userName);

      const pendingToken = await AsyncStorage.getItem(PENDING_INVITE_KEY);
      if (pendingToken) {
        await AsyncStorage.removeItem(PENDING_INVITE_KEY);
        router.replace(`/invite/${pendingToken}`);
      }
    };
    init();
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResult, paymentResult] = await Promise.allSettled([
        apiService.get<{ success: boolean } & PassengerSummary>(ApiEndpoints.GET_MY_SUMMARY),
        apiService.get<{ success: boolean; payments: PaymentStatus[] }>(ApiEndpoints.GET_MY_PAYMENT_STATUS),
      ]);

      if (summaryResult.status === "fulfilled" && summaryResult.value.data.success) {
        setSummary({
          lines: summaryResult.value.data.lines ?? [],
          upcomingPresence: summaryResult.value.data.upcomingPresence ?? [],
          recentHistory: summaryResult.value.data.recentHistory ?? [],
        });
      }

      if (paymentResult.status === "fulfilled" && paymentResult.value.data.success) {
        setPayments(paymentResult.value.data.payments ?? []);
      }
    } catch {
      setSummary(null);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const nextTrip = useMemo(() => {
    return [...(summary?.upcomingPresence ?? [])].sort((a, b) => a.date.localeCompare(b.date))[0];
  }, [summary]);

  const overduePayments = payments.filter((payment) => payment.displayStatus === "overdue").length;
  const activeLine = summary?.lines[0];
  const nextPayment = payments.find((payment) => payment.status !== "paid") ?? payments[0];
  const statusColor = nextTrip ? STATUS_COLOR[nextTrip.status] : theme.colors.text.muted;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Bem-vindo</Text>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.subtitle}>Sua rotina de viagem em um lugar só.</Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.colors.brand.orange} />
            <Text style={styles.muted}>Carregando sua home...</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <Ionicons name="bus-outline" size={24} color={theme.colors.text.inverse} />
                </View>
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={styles.statusBadgeText}>
                    {nextTrip ? STATUS_LABEL[nextTrip.status] : "Sem viagem"}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroLabel}>Próxima viagem</Text>
              <Text style={styles.heroTitle}>{nextTrip?.lineName ?? activeLine?.name ?? "Nenhuma linha ativa"}</Text>
              <Text style={styles.heroRoute} numberOfLines={1}>
                {activeLine?.originCity && activeLine?.destinationPlace
                  ? `${activeLine.originCity} -> ${activeLine.destinationPlace}`
                  : "Entre em uma linha para acompanhar sua rotina"}
              </Text>
              <View style={styles.heroInfoRow}>
                <InfoPill icon="calendar-outline" label={formatDate(nextTrip?.date)} />
                <InfoPill icon="arrow-forward-circle-outline" label={activeLine?.departureTime ? `Ida ${activeLine.departureTime}` : "Ida --"} />
                <InfoPill icon="return-down-back-outline" label={activeLine?.arrivalTime ? `Volta ${activeLine.arrivalTime}` : "Volta --"} />
              </View>
              <Pressable style={styles.primaryButton} onPress={() => router.push("/(app)/(passenger)/lines")}>
                <Text style={styles.primaryButtonText}>Confirmar presença</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.text.inverse} />
              </Pressable>
            </View>

            <View style={styles.statsRow}>
              <StatCard value={String(summary?.lines.length ?? 0)} label="linhas" icon="map-outline" />
              <StatCard value={String(summary?.upcomingPresence.length ?? 0)} label="próximas" icon="calendar-number-outline" />
              <StatCard value={String(overduePayments)} label="atrasos" icon="alert-circle-outline" danger={overduePayments > 0} />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Resumo</Text>
              <Pressable onPress={() => router.push("/(app)/(passenger)/dashboard")}>
                <Text style={styles.sectionLink}>Dashboard</Text>
              </Pressable>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="cash-outline" size={20} color={theme.colors.brand.orange} />
              </View>
              <View style={styles.infoCardBody}>
                <Text style={styles.infoCardTitle}>Mensalidade</Text>
                <Text style={styles.infoCardText}>
                  {formatMoney(nextPayment?.amount)}
                  {nextPayment?.dueDay ? ` · vence dia ${nextPayment.dueDay}` : ""}
                </Text>
              </View>
              <View style={[styles.smallBadge, overduePayments > 0 && styles.smallBadgeDanger]}>
                <Text style={[styles.smallBadgeText, overduePayments > 0 && styles.smallBadgeDangerText]}>
                  {overduePayments > 0 ? "Atrasada" : "Ok"}
                </Text>
              </View>
            </View>

            <View style={styles.actionsGrid}>
              <HomeAction
                icon="storefront-outline"
                title="Marketplace"
                description="Encontrar linhas e demandas"
                onPress={() => router.push("/(app)/shared/marketplace" as any)}
              />
              <HomeAction
                icon="ticket-outline"
                title="Convite"
                description="Entrar em uma linha"
                onPress={() => router.push("/(app)/(passenger)/accept-invite")}
              />
              <HomeAction
                icon="chatbubble-ellipses-outline"
                title="Chat"
                description="Falar com motorista"
                onPress={() => router.push("/(app)/(passenger)/chat")}
              />
              <HomeAction
                icon="add-circle-outline"
                title="Sugerir ponto"
                description="Ajustar embarque"
                onPress={() => router.push("/(app)/(passenger)/dashboard")}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.infoPill}>
      <Ionicons name={icon} size={13} color={theme.colors.brand.navy} />
      <Text style={styles.infoPillText}>{label}</Text>
    </View>
  );
}

function StatCard({ value, label, icon, danger }: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap; danger?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={danger ? theme.colors.feedback.error : theme.colors.brand.orange} />
      <Text style={[styles.statValue, danger && { color: theme.colors.feedback.error }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function HomeAction({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={theme.colors.brand.navy} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background.app },
  content: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  header: { gap: theme.spacing.xs },
  kicker: {
    marginTop: theme.spacing.sm,
    color: theme.colors.brand.orange,
    textTransform: "uppercase",
    fontSize: theme.font.xs,
    fontWeight: "900",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: theme.colors.text.brand,
  },
  subtitle: {
    fontSize: theme.font.md,
    color: theme.colors.text.secondary,
  },
  loadingCard: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.card,
    ...theme.shadow.card,
  },
  muted: { color: theme.colors.text.secondary, fontSize: theme.font.sm },
  heroCard: {
    backgroundColor: theme.colors.brand.navy,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { color: theme.colors.text.inverse, fontSize: theme.font.xs, fontWeight: "800" },
  heroLabel: { color: "rgba(255,255,255,0.72)", fontSize: theme.font.sm, fontWeight: "700" },
  heroTitle: { color: theme.colors.text.inverse, fontSize: theme.font.xl, fontWeight: "900" },
  heroRoute: { color: "rgba(255,255,255,0.78)", fontSize: theme.font.sm },
  heroInfoRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  infoPillText: { color: theme.colors.text.primary, fontSize: theme.font.xs, fontWeight: "800" },
  primaryButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brand.orange,
  },
  primaryButtonText: { color: theme.colors.text.inverse, fontSize: theme.font.md, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: theme.spacing.sm },
  statCard: {
    flex: 1,
    minHeight: 92,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
  },
  statValue: { fontSize: theme.font.xl, fontWeight: "900", color: theme.colors.text.primary },
  statLabel: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.text.secondary },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: theme.font.lg, fontWeight: "900", color: theme.colors.text.primary },
  sectionLink: { fontSize: theme.font.sm, fontWeight: "800", color: theme.colors.brand.orange },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    padding: theme.spacing.md,
  },
  infoCardIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brand.orange + "18",
  },
  infoCardBody: { flex: 1 },
  infoCardTitle: { fontSize: theme.font.md, fontWeight: "900", color: theme.colors.text.primary },
  infoCardText: { marginTop: 2, fontSize: theme.font.sm, color: theme.colors.text.secondary },
  smallBadge: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.feedback.success + "14",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  smallBadgeDanger: { backgroundColor: theme.colors.feedback.error + "14" },
  smallBadgeText: { fontSize: theme.font.xs, fontWeight: "900", color: theme.colors.feedback.success },
  smallBadgeDangerText: { color: theme.colors.feedback.error },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  actionCard: {
    width: "48.5%",
    minHeight: 132,
    justifyContent: "space-between",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    padding: theme.spacing.md,
  },
  actionIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.muted,
  },
  actionTitle: { fontSize: theme.font.md, fontWeight: "900", color: theme.colors.text.primary },
  actionDescription: { fontSize: theme.font.xs, lineHeight: 17, color: theme.colors.text.secondary },
});
