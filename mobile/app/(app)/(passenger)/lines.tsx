import { Link } from "expo-router";
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
import { ActionCard } from "../../../components/common/ActionCard";
import { theme } from "../../../constants/theme";
import {
  listMyPresenceLines,
  type PresenceLineSummary,
  type PresenceStatus,
  updateMyPresenceStatus,
} from "../../../services/presence";

const PRESENCE_OPTIONS: { label: string; value: PresenceStatus }[] = [
  { label: "Vai e volta", value: "vai e volta" },
  { label: "Não vai", value: "não vai e nem volta" },
  { label: "Só ida", value: "só vou e não volto" },
  { label: "Só volta", value: "não vou mas volto" },
];

function getPresenceErrorMessage(errorCode?: string, fallback?: string) {
  const messages: Record<string, string> = {
    INVALID_PRESENCE_DATE:
      "A data selecionada é inválida para marcação de presença.",
    INVALID_PRESENCE_STATUS:
      "O status selecionado não é válido para este fluxo.",
    PRESENCE_DEADLINE_EXPIRED:
      "O prazo para alterar presença nessa viagem já encerrou.",
    FORBIDDEN_RESOURCE:
      "Você não tem permissão para alterar presença nesta linha.",
    NETWORK_ERROR:
      "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
  };

  return (
    messages[errorCode || ""] ||
    fallback ||
    "Não foi possível atualizar sua presença neste momento."
  );
}

export default function PassengerLinesScreen() {
  const [loading, setLoading] = useState(true);
  const [savingLineId, setSavingLineId] = useState<string | null>(null);
  const [lines, setLines] = useState<PresenceLineSummary[]>([]);

  const targetDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }, []);

  const loadPresenceLines = useCallback(async () => {
    setLoading(true);
    const response = await listMyPresenceLines(targetDate);

    if (!response.success) {
      Alert.alert(
        "Não foi possível carregar suas linhas",
        getPresenceErrorMessage(response.error?.code, response.error?.message),
      );
      setLines([]);
      setLoading(false);
      return;
    }

    setLines(response.lines || []);
    setLoading(false);
  }, [targetDate]);

  useEffect(() => {
    loadPresenceLines();
  }, [loadPresenceLines]);

  const handleUpdatePresence = async (
    lineId: string,
    status: PresenceStatus,
  ) => {
    setSavingLineId(lineId);

    const response = await updateMyPresenceStatus(lineId, targetDate, status);

    if (!response.success) {
      Alert.alert(
        "Não foi possível salvar presença",
        getPresenceErrorMessage(response.error?.code, response.error?.message),
      );
      setSavingLineId(null);
      return;
    }

    setLines((previousLines) =>
      previousLines.map((line) =>
        line.lineId === lineId
          ? { ...line, status: response.status || status }
          : line,
      ),
    );

    Alert.alert(
      "Presença atualizada",
      "Sua escolha para a próxima viagem foi salva com sucesso.",
    );

    setSavingLineId(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Linhas e presença</Text>
      <Text style={styles.subtitle}>
        Confirme sua presença para a próxima viagem e ajuste seu status até o
        horário limite.
      </Text>

      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>RF3 - Minha presença</Text>
        <Text style={styles.sectionSubtitle}>Data de referência: {targetDate}</Text>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator color={theme.colors.brand.orangeDark} />
            <Text style={styles.loaderText}>Carregando suas linhas...</Text>
          </View>
        ) : null}

        {!loading && lines.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Nenhuma linha encontrada</Text>
            <Text style={styles.emptyText}>
              Você ainda não está vinculado a uma linha para a data selecionada.
            </Text>
          </View>
        ) : null}

        {!loading
          ? lines.map((line) => (
              <View key={line.lineId} style={styles.lineCard}>
                <Text style={styles.lineId}>Linha: {line.lineId}</Text>
                <Text style={styles.lineMeta}>Próxima data: {line.nextDate || targetDate}</Text>
                <Text style={styles.currentStatus}>Status atual: {line.status}</Text>

                <View style={styles.optionsWrap}>
                  {PRESENCE_OPTIONS.map((option) => {
                    const isSelected = line.status === option.value;
                    const isSaving = savingLineId === line.lineId;

                    return (
                      <Pressable
                        key={`${line.lineId}-${option.value}`}
                        style={[
                          styles.optionButton,
                          isSelected && styles.optionButtonSelected,
                        ]}
                        onPress={() => handleUpdatePresence(line.lineId, option.value)}
                        disabled={isSaving}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {isSaving ? "Salvando..." : option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          : null}
      </View>

      <Link href="/(app)/shared/maps" asChild>
        <ActionCard
          title="Geofencing da linha"
          description="Abrir o painel do motorista para criar e iniciar execuções."
        />
      </Link>

      <Link href="/(app)/shared/chat-group" asChild>
        <ActionCard
          title="Chat do grupo"
          description="Acompanhar a conversa da sua linha quando o grupo estiver criado."
        />
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: theme.spacing.xl,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background.screen,
    gap: theme.spacing.md,
  },
  title: {
    marginTop: theme.spacing.sm,
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text.primary,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  cardSection: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadow.card,
  },
  sectionTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.font.lg,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: theme.colors.text.secondary,
    fontSize: theme.font.sm,
  },
  loaderBox: {
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  loaderText: {
    color: theme.colors.text.secondary,
    fontSize: theme.font.sm,
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
  lineCard: {
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  lineId: {
    color: theme.colors.text.primary,
    fontSize: theme.font.md,
    fontWeight: "700",
  },
  lineMeta: {
    color: theme.colors.text.secondary,
    fontSize: theme.font.sm,
  },
  currentStatus: {
    color: theme.colors.text.brand,
    fontSize: theme.font.sm,
    fontWeight: "700",
    marginTop: theme.spacing.xs,
  },
  optionsWrap: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  optionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.input,
    backgroundColor: theme.colors.background.input,
  },
  optionButtonSelected: {
    borderColor: theme.colors.brand.orangeDark,
    backgroundColor: `${theme.colors.brand.orange}22`,
  },
  optionText: {
    color: theme.colors.text.primary,
    fontSize: theme.font.xs,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: theme.colors.text.brand,
  },
});
