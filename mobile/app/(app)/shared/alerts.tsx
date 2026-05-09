import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DatePickerInput } from "../../../components/common/DatePickerInput";
import InviteButton from "../../../components/invite/InviteButton";
import { theme } from "../../../constants/theme";
import {
  getOperationsDashboard,
  listOperationsLines,
  type OperationsDashboard,
  type OperationsLineSummary,
} from "../../../services/operations";

import {
  getDashboardErrorMessage,
  getAlertVisual,
  getSelectedDateForLine,
  getInitialOperationalSelection,
  getTomorrowDate,
  toISODate,
} from "./alerts.helpers.js";

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
  const [linesLoading, setLinesLoading] = useState(true);
  const [availableLines, setAvailableLines] = useState<OperationsLineSummary[]>(
    [],
  );
  const [lineId, setLineId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(getTomorrowDate());
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<OperationsDashboard | null>(null);

  const alerts = useMemo(() => dashboard?.alerts || [], [dashboard]);

  const loadDriverLines = useCallback(async () => {
    setLinesLoading(true);
    const response = await listOperationsLines();
    setLinesLoading(false);

    if (!response.success) {
      Alert.alert(
        "Não foi possível carregar linhas",
        getDashboardErrorMessage(response.error?.code, response.error?.message),
      );
      setAvailableLines([]);
      setLineId(null);
      return;
    }

    const lines = response.lines || [];
    setAvailableLines(lines);

    const selection = getInitialOperationalSelection(lines, getTomorrowDate());
    setLineId((current) => current || selection.lineId);
    setSelectedDate(selection.selectedDate);

    if (lines.length === 0) {
      setLineId(null);
      setDashboard(null);
    }
  }, []);

  useEffect(() => {
    loadDriverLines();
  }, [loadDriverLines]);

  const handleSelectLine = (line: OperationsLineSummary) => {
    setLineId(line.lineId);
    setSelectedDate(getSelectedDateForLine(line, getTomorrowDate()));
    setDashboard(null);
  };

  const handleLoadDashboard = async () => {
    if (!lineId) {
      Alert.alert("Linha obrigatória", "Selecione uma linha para continuar.");
      return;
    }

    setLoading(true);
    const result = await getOperationsDashboard(
      lineId,
      toISODate(selectedDate),
    );
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
        <Text style={styles.label}>Linhas operacionais</Text>

        {linesLoading ? (
          <View style={styles.inlineLoaderBox}>
            <ActivityIndicator color={theme.colors.brand.orangeDark} />
            <Text style={styles.inlineLoaderText}>Carregando linhas...</Text>
          </View>
        ) : null}

        {!linesLoading && availableLines.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Nenhuma linha operacional</Text>
            <Text style={styles.emptyText}>
              Você ainda não está vinculado a linhas com dashboard disponível.
            </Text>
          </View>
        ) : null}

        {!linesLoading && availableLines.length > 0 ? (
          <View style={styles.linesWrap}>
            {availableLines.map((line) => {
              const isSelected = line.lineId === lineId;

              return (
                <Pressable
                  key={line.lineId}
                  style={[
                    styles.lineButton,
                    isSelected && styles.lineButtonSelected,
                  ]}
                  onPress={() => handleSelectLine(line)}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.lineButtonTitle,
                      isSelected && styles.lineButtonTitleSelected,
                    ]}
                  >
                    {line.lineId}
                  </Text>
                  <Text style={styles.lineButtonMeta}>
                    Próxima data: {line.nextDate || "não informada"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <DatePickerInput
          label="Data de consulta"
          value={selectedDate}
          onChange={setSelectedDate}
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLoadDashboard}
          disabled={loading || !lineId}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.text.primary} />
          ) : (
            <Text style={styles.buttonText}>Atualizar dashboard</Text>
          )}
        </Pressable>

        <Pressable
          style={[
            styles.secondaryButton,
            (loading || linesLoading) && styles.buttonDisabled,
          ]}
          onPress={loadDriverLines}
          disabled={loading || linesLoading}
        >
          <Text style={styles.secondaryButtonText}>Recarregar linhas</Text>
        </Pressable>

        {lineId && (
          <InviteButton
            lineId={lineId}
            label="Gerar Convite para Passageiro"
            style={styles.inviteButton}
            onSuccess={(token, url) => {
              Alert.alert(
                "Sucesso!",
                "Compartilhe o link ou token com o passageiro.",
              );
            }}
            onError={(error) => {
              Alert.alert("Erro", error);
            }}
          />
        )}
      </View>

      {dashboard ? (
        <View style={styles.dashboardSection}>
          <Text style={styles.sectionTitle}>Linha {dashboard.lineId}</Text>
          <Text style={styles.sectionMeta}>Data: {dashboard.date}</Text>
          <Text style={styles.sectionMeta}>
            Capacidade: {dashboard.capacity}
          </Text>

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
  inlineLoaderBox: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  inlineLoaderText: {
    color: theme.colors.text.secondary,
    fontSize: theme.font.sm,
  },
  linesWrap: {
    gap: theme.spacing.sm,
  },
  lineButton: {
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    backgroundColor: theme.colors.background.input,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  lineButtonSelected: {
    borderColor: theme.colors.brand.orange,
    backgroundColor: `${theme.colors.brand.orange}1A`,
  },
  lineButtonTitle: {
    color: theme.colors.text.primary,
    fontWeight: "800",
  },
  lineButtonTitleSelected: {
    color: theme.colors.text.brand,
  },
  lineButtonMeta: {
    color: theme.colors.text.secondary,
    fontSize: theme.font.sm,
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.input,
  },
  secondaryButtonText: {
    color: theme.colors.text.secondary,
    fontWeight: "700",
  },
  emptyBox: {
    backgroundColor: theme.colors.background.muted,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  emptyTitle: {
    color: theme.colors.text.primary,
    fontWeight: "700",
  },
  emptyText: {
    color: theme.colors.text.secondary,
    lineHeight: 20,
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
