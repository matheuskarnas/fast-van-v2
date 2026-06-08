import { useCallback, useEffect, useMemo, useState } from "react";
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
import { getDriverLines, type Line } from "../../../services/driverLines";
import { getSession } from "../../../services/session";

interface DriverRatings {
  totalRatings: number;
  averages: {
    punctuality: number;
    driving: number;
    friendliness: number;
    comfort: number;
    vehicleQuality: number;
    hygiene: number;
  };
}

function averageScore(averages: DriverRatings["averages"]) {
  const values = Object.values(averages);
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function formatDays(days?: string) {
  if (!days) return "Dias não definidos";
  return days
    .split(",")
    .map((day) => day.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(", ");
}

export default function DriverHomeScreen() {
  const router = useRouter();
  const [name, setName] = useState("Motorista");
  const [driverId, setDriverId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [ratings, setRatings] = useState<DriverRatings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const session = await getSession();
      if (session?.userName) setName(session.userName);
      if (session?.userId) setDriverId(session.userId);
    };
    loadSession();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const linesResult = await getDriverLines();
      if (linesResult.success) setLines(linesResult.lines ?? []);
    } catch {
      setLines([]);
    }

    try {
      const ratingsResult = driverId
        ? await apiService.get<{ success: boolean } & DriverRatings>(
            ApiEndpoints.GET_DRIVER_RATINGS.replace(":driverId", driverId),
          )
        : null;
      const ratingData = ratingsResult?.data;
      if (ratingData?.success) {
        setRatings({
          totalRatings: ratingData.totalRatings ?? 0,
          averages: ratingData.averages,
        });
      }
    } catch {
      setRatings(null);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalPassengers = lines.reduce((sum, line) => sum + (line.passengerCount ?? 0), 0);
  const totalCapacity = lines.reduce((sum, line) => sum + (line.capacity ?? 0), 0);
  const occupancy = totalCapacity ? Math.round((totalPassengers / totalCapacity) * 100) : 0;
  const marketplaceLines = lines.filter((line: any) => line.marketplaceEnabled).length;
  const mainLine = useMemo(() => {
    return [...lines].sort((a, b) => (b.passengerCount ?? 0) - (a.passengerCount ?? 0))[0];
  }, [lines]);
  const overallRating = ratings ? averageScore(ratings.averages) : 0;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Painel do motorista</Text>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.subtitle}>Operação, passageiros e reputação em uma visão rápida.</Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.colors.brand.orange} />
            <Text style={styles.muted}>Carregando sua operação...</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.heroTitleGroup}>
                  <Text style={styles.heroLabel}>Linha em destaque</Text>
                  <Text style={styles.heroTitle}>{mainLine?.name ?? "Nenhuma linha criada"}</Text>
                </View>
                <View style={styles.occupancyBadge}>
                  <Text style={styles.occupancyValue}>{occupancy}%</Text>
                  <Text style={styles.occupancyLabel}>ocupação</Text>
                </View>
              </View>
              <Text style={styles.heroRoute} numberOfLines={1}>
                {mainLine ? `${mainLine.originCity} -> ${mainLine.destinationPlace}` : "Crie sua primeira linha para iniciar a operação"}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(occupancy, 100)}%` }]} />
              </View>
              <View style={styles.heroInfoRow}>
                <InfoPill icon="people-outline" label={`${totalPassengers}/${totalCapacity || 0} passageiros`} />
                <InfoPill icon="calendar-outline" label={formatDays(mainLine?.daysOfWeek)} />
              </View>
              <Pressable style={styles.primaryButton} onPress={() => router.push("/(app)/(driver)/lines")}>
                <Text style={styles.primaryButtonText}>Gerenciar linhas</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.text.inverse} />
              </Pressable>
            </View>

            <View style={styles.statsRow}>
              <StatCard value={String(lines.length)} label="linhas" icon="map-outline" />
              <StatCard value={String(totalPassengers)} label="passageiros" icon="people-outline" />
              <StatCard value={String(marketplaceLines)} label="anúncios" icon="storefront-outline" />
            </View>

            <View style={styles.ratingCard}>
              <View style={styles.ratingIcon}>
                <Ionicons name="star" size={22} color={theme.colors.brand.orange} />
              </View>
              <View style={styles.ratingBody}>
                <Text style={styles.ratingTitle}>Avaliação dos passageiros</Text>
                <Text style={styles.ratingText}>
                  {ratings && ratings.totalRatings > 0
                    ? `${ratings.totalRatings} avaliação${ratings.totalRatings === 1 ? "" : "ões"} recebida${ratings.totalRatings === 1 ? "" : "s"}`
                    : "As notas aparecem aqui quando os passageiros avaliarem."}
                </Text>
              </View>
              <View style={styles.ratingScore}>
                <Text style={styles.ratingScoreValue}>{overallRating.toFixed(1)}</Text>
                <Text style={styles.ratingScoreMax}>/5</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Ações rápidas</Text>
            <View style={styles.actionsGrid}>
              <HomeAction
                icon="play-circle-outline"
                title="Operação"
                description="Iniciar viagem e registrar ocorrências"
                onPress={() => router.push("/(app)/(driver)/lines")}
              />
              <HomeAction
                icon="cash-outline"
                title="Ganhos"
                description="Mensalidades e lançamentos"
                onPress={() => router.push("/(app)/(driver)/earnings")}
              />
              <HomeAction
                icon="storefront-outline"
                title="Marketplace"
                description="Anunciar linha e ver demandas"
                onPress={() => router.push("/(app)/shared/marketplace" as any)}
              />
              <HomeAction
                icon="chatbubble-ellipses-outline"
                title="Chat"
                description="Conversar com passageiros"
                onPress={() => router.push("/(app)/(driver)/chat")}
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

function StatCard({ value, label, icon }: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={theme.colors.brand.orange} />
      <Text style={styles.statValue}>{value}</Text>
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
  title: { fontSize: 32, fontWeight: "900", color: theme.colors.text.brand },
  subtitle: { fontSize: theme.font.md, color: theme.colors.text.secondary, lineHeight: 22 },
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
  heroHeader: { flexDirection: "row", justifyContent: "space-between", gap: theme.spacing.md },
  heroTitleGroup: { flex: 1 },
  heroLabel: { color: "rgba(255,255,255,0.72)", fontSize: theme.font.sm, fontWeight: "700" },
  heroTitle: { marginTop: 4, color: theme.colors.text.inverse, fontSize: theme.font.xl, fontWeight: "900" },
  heroRoute: { color: "rgba(255,255,255,0.78)", fontSize: theme.font.sm },
  occupancyBadge: {
    minWidth: 78,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(255,255,255,0.14)",
    padding: theme.spacing.sm,
  },
  occupancyValue: { color: theme.colors.text.inverse, fontSize: theme.font.lg, fontWeight: "900" },
  occupancyLabel: { color: "rgba(255,255,255,0.72)", fontSize: theme.font.xs, fontWeight: "700" },
  progressTrack: {
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: theme.radius.pill, backgroundColor: theme.colors.brand.orange },
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
  ratingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    padding: theme.spacing.md,
  },
  ratingIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brand.orange + "18",
  },
  ratingBody: { flex: 1 },
  ratingTitle: { fontSize: theme.font.md, fontWeight: "900", color: theme.colors.text.primary },
  ratingText: { marginTop: 2, fontSize: theme.font.sm, color: theme.colors.text.secondary },
  ratingScore: { flexDirection: "row", alignItems: "baseline" },
  ratingScoreValue: { fontSize: theme.font.xl, fontWeight: "900", color: theme.colors.brand.orange },
  ratingScoreMax: { fontSize: theme.font.sm, fontWeight: "800", color: theme.colors.text.secondary },
  sectionTitle: { fontSize: theme.font.lg, fontWeight: "900", color: theme.colors.text.primary },
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
