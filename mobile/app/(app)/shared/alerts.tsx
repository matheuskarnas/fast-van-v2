import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { theme } from "../../../constants/theme";
import {
  getOperationsDashboard,
  type OperationsDashboard,
} from "../../../services/operations";

function getDashboardErrorMessage(errorCode?: string, fallback?: string) {
  const messages: Record<string, string> = {
    FORBIDDEN_RESOURCE:
      "Você não tem permissão para visualizar o dashboard desta linha.",
    LINE_NOT_FOUND: "Linha não encontrada. Verifique o ID informado.",
    INVALID_OCCUPANCY_DATE: "A data informada é inválida para consulta.",
    NEXT_DATE_ONLY:
      "A consulta só pode ser feita para a próxima data da linha.",
    INVALID_LINE_CAPACITY:
      "A linha está com capacidade inválida e não pode ser analisada.",
    NETWORK_ERROR:
      "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
  };

  return (
    messages[errorCode || ""] ||
    fallback ||
    "Não foi possível carregar o dashboard operacional."
  );
}

function getAlertVisual(level: string) {
  if (level === "capacity-exceeded") {
    return {
      bg: `${theme.colors.feedback.error}22`,
      border: theme.colors.feedback.error,
      text: theme.colors.feedback.error,
      title: "Capacidade Excedida",
    };
  }

  return {
    bg: `${theme.colors.feedback.warning}25`,
    border: theme.colors.feedback.warning,
    text: theme.colors.text.primary,
    title: "Lotação Crítica",
  };
}

function OccupancyCard({
  title,
  confirmedCount,
  percentage,
  passengers,
}: {
  title: string;
  confirmedCount: number;
  percentage: number;
  passengers: string[];
}) {
  return (
    <View style={styles.segmentCard}>
      <Text style={styles.segmentTitle}>{title}</Text>
      <Text style={styles.segmentMetric}>Confirmados: {confirmedCount}</Text>
      <Text style={styles.segmentMetric}>Ocupação: {percentage}%</Text>
      <Text style={styles.segmentMeta}>
        Passageiros: {passengers.length > 0 ? passengers.join(", ") : "Nenhum"}
      </Text>
    </View>
  );
}

export default function AlertsScreen() {
  const [lineId, setLineId] = useState("line-dashboard-1");
  const [date, setDate] = useState("2026-05-25");
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<OperationsDashboard | null>(null);

  const alerts = useMemo(() => dashboard?.alerts || [], [dashboard]);

  const handleLoadDashboard = async () => {
    if (!lineId.trim()) {
      Alert.alert("Linha obrigatória", "Informe o ID da linha para continuar.");
      return;
    }

    setLoading(true);
    const result = await getOperationsDashboard(lineId.trim(), date.trim());
    setLoading(false);

    if (!result.success) {
      Alert.alert(
        "Não foi possível carregar",
        getDashboardErrorMessage(result.error?.code, result.error?.message),
      );
      return;
    }

    setDashboard(result);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>RF4 + RF5</Text>
      <Text style={styles.title}>Dashboard operacional</Text>
      <Text style={styles.subtitle}>
        Acompanhe ocupação e alertas críticos da próxima viagem por trecho.
      </Text>

      <View style={styles.inputSection}>
        <Text style={styles.label}>ID da linha</Text>
        <TextInput
          value={lineId}
          onChangeText={setLineId}
          style={styles.input}
          placeholder="line-dashboard-1"
          placeholderTextColor={theme.colors.text.muted}
          editable={!loading}
        />

        <Text style={styles.label}>Data (YYYY-MM-DD)</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          style={styles.input}
          placeholder="2026-05-25"
          placeholderTextColor={theme.colors.text.muted}
          editable={!loading}
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLoadDashboard}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.text.primary} />
          ) : (
            <Text style={styles.buttonText}>Atualizar dashboard</Text>
          )}
        </Pressable>
      </View>

      {dashboard ? (
        <View style={styles.dashboardSection}>
          <Text style={styles.sectionTitle}>Linha {dashboard.lineId}</Text>
          <Text style={styles.sectionMeta}>Data: {dashboard.date}</Text>
          <Text style={styles.sectionMeta}>Capacidade: {dashboard.capacity}</Text>

          <OccupancyCard
            title="Trecho de ida"
            confirmedCount={dashboard.occupancy.outbound.confirmedCount}
            percentage={dashboard.occupancy.outbound.percentage}
            passengers={dashboard.occupancy.outbound.confirmedPassengerIds}
          />

          <OccupancyCard
            title="Trecho de volta"
            confirmedCount={dashboard.occupancy.return.confirmedCount}
            percentage={dashboard.occupancy.return.percentage}
            passengers={dashboard.occupancy.return.confirmedPassengerIds}
          />

          <View style={styles.alertSection}>
            <Text style={styles.sectionTitle}>Alertas de lotação</Text>

            {alerts.length === 0 ? (
              <View style={styles.noAlertBox}>
                <Text style={styles.noAlertText}>
                  Sem alertas críticos no momento (abaixo de 80%).
                </Text>
              </View>
            ) : (
              alerts.map((alert) => {
                const visual = getAlertVisual(alert.level);

                return (
                  <View
                    key={`${alert.segment}-${alert.level}`}
                    style={[
                      styles.alertCard,
                      {
                        backgroundColor: visual.bg,
                        borderColor: visual.border,
                      },
                    ]}
                  >
                    <Text style={[styles.alertTitle, { color: visual.text }]}>
                      {visual.title} - {alert.segment.toUpperCase()}
                    </Text>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.screen,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  kicker: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text.accent,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  inputSection: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadow.card,
  },
  label: {
    color: theme.colors.text.primary,
    fontWeight: "700",
    fontSize: theme.font.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.input,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.input,
    color: theme.colors.text.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  button: {
    marginTop: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brand.orange,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: theme.colors.text.primary,
    fontWeight: "800",
  },
  dashboardSection: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.font.lg,
    fontWeight: "800",
  },
  sectionMeta: {
    color: theme.colors.text.secondary,
    fontSize: theme.font.sm,
  },
  segmentCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  segmentTitle: {
    color: theme.colors.text.brand,
    fontWeight: "800",
  },
  segmentMetric: {
    color: theme.colors.text.primary,
    fontWeight: "700",
  },
  segmentMeta: {
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  alertSection: {
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  noAlertBox: {
    backgroundColor: theme.colors.background.muted,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  noAlertText: {
    color: theme.colors.text.secondary,
  },
  alertCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  alertTitle: {
    fontWeight: "800",
  },
  alertMessage: {
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
});
