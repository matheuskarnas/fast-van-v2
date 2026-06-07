import { Link } from "expo-router";
import { ActivityIndicator, ScrollView, View, Text, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { getSession } from "../../../services/session";
import { ActionCard } from "../../../components/common/ActionCard";
import { theme } from "../../../constants/theme";
import { apiService } from "../../../services/api";
import { ApiEndpoints } from "../../../constants/api";

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

const RATING_LABELS = [
  { key: "punctuality", label: "Pontualidade" },
  { key: "driving", label: "Direção" },
  { key: "friendliness", label: "Simpatia" },
  { key: "comfort", label: "Conforto" },
  { key: "vehicleQuality", label: "Veículo" },
  { key: "hygiene", label: "Higiene" },
] as const;

function averageScore(averages: DriverRatings["averages"]) {
  const values = Object.values(averages);
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export default function DriverHomeScreen() {
  const [name, setName] = useState("Motorista");
  const [ratings, setRatings] = useState<DriverRatings | null>(null);
  const [loadingRatings, setLoadingRatings] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const session = await getSession();
      if (session?.userName) {
        setName(session.userName);
      }
      if (session?.userId) {
        try {
          const url = ApiEndpoints.GET_DRIVER_RATINGS.replace(":driverId", session.userId);
          const response = await apiService.get<{ success: boolean } & DriverRatings>(url);
          if (response.data.success) {
            setRatings({
              totalRatings: response.data.totalRatings ?? 0,
              averages: response.data.averages,
            });
          }
        } catch {
          setRatings(null);
        }
      }
      setLoadingRatings(false);
    };

    loadSession();
  }, []);

  const overallRating = ratings ? averageScore(ratings.averages) : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Bem-vindo</Text>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.subtitle}>
        Acesse os fluxos de linha, geofencing e chat pelo painel abaixo.
      </Text>

      <View style={styles.ratingCard}>
        <View style={styles.ratingHeader}>
          <View>
            <Text style={styles.cardEyebrow}>Avaliações</Text>
            <Text style={styles.ratingTitle}>Feedback dos passageiros</Text>
          </View>
          {loadingRatings ? (
            <ActivityIndicator size="small" color={theme.colors.brand.orange} />
          ) : (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreValue}>{overallRating.toFixed(1)}</Text>
              <Text style={styles.scoreMax}>/5</Text>
            </View>
          )}
        </View>

        {loadingRatings ? (
          <Text style={styles.ratingMuted}>Carregando médias...</Text>
        ) : ratings && ratings.totalRatings > 0 ? (
          <>
            <Text style={styles.ratingMuted}>
              {ratings.totalRatings} avaliação{ratings.totalRatings === 1 ? "" : "ões"} recebida{ratings.totalRatings === 1 ? "" : "s"}
            </Text>
            <View style={styles.criteriaGrid}>
              {RATING_LABELS.map((item) => (
                <View key={item.key} style={styles.criteriaItem}>
                  <Text style={styles.criteriaLabel}>{item.label}</Text>
                  <Text style={styles.criteriaValue}>{ratings.averages[item.key].toFixed(1)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.ratingMuted}>
            As médias aparecem aqui quando os passageiros avaliarem suas viagens.
          </Text>
        )}
      </View>

      <Link href={"/(app)/shared/marketplace" as any} asChild>
        <ActionCard
          title="Marketplace"
          description="Anuncie linhas e veja demandas de eventos ou empresas."
        />
      </Link>

      <Link href="/(app)/shared/maps" asChild>
        <ActionCard
          title="RF7 - Geofencing"
          description="Criar linha, iniciar execução e registrar check-ins."
        />
      </Link>

      <Link href="/(app)/(driver)/chat" asChild>
        <ActionCard
          title="Chat privado"
          description="Iniciar conversa com passageiro por ID."
        />
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    backgroundColor: theme.colors.background.app,
    gap: 16,
  },
  kicker: {
    marginTop: 12,
    color: theme.colors.text.brand,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: theme.colors.text.brand,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  ratingCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadow.card,
  },
  ratingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  cardEyebrow: {
    fontSize: theme.font.xs,
    fontWeight: "800",
    color: theme.colors.brand.orange,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  ratingTitle: {
    fontSize: theme.font.md,
    fontWeight: "800",
    color: theme.colors.text.primary,
    marginTop: 2,
  },
  scoreBadge: {
    minWidth: 64,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brand.orange + "15",
    borderWidth: 1,
    borderColor: theme.colors.brand.orange + "40",
    paddingHorizontal: theme.spacing.sm,
  },
  scoreValue: {
    fontSize: theme.font.xl,
    fontWeight: "900",
    color: theme.colors.brand.orange,
  },
  scoreMax: {
    fontSize: theme.font.sm,
    fontWeight: "700",
    color: theme.colors.text.secondary,
  },
  ratingMuted: {
    fontSize: theme.font.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  criteriaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  criteriaItem: {
    width: "48%",
    minHeight: 54,
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.muted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  criteriaLabel: {
    fontSize: theme.font.xs,
    color: theme.colors.text.secondary,
    fontWeight: "700",
  },
  criteriaValue: {
    fontSize: theme.font.lg,
    color: theme.colors.text.primary,
    fontWeight: "900",
    marginTop: 2,
  },
});
