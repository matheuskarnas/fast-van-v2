import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import {
  listMyPresenceLines,
  updateMyPresenceStatus,
  type PresenceLineSummary,
  type PresenceStatus,
} from "../../../services/presence";
import { apiService } from "../../../services/api";
import { ApiEndpoints } from "../../../constants/api";

const STATUS_OPTIONS: { label: string; value: PresenceStatus; icon: string }[] = [
  { label: "Vou e volto", value: "vai e volta", icon: "checkmark-circle" },
  { label: "Só vou", value: "só vou e não volto", icon: "arrow-forward-circle" },
  { label: "Só volto", value: "não vou mas volto", icon: "return-down-back" },
  { label: "Não vou", value: "não vai e nem volta", icon: "close-circle" },
];

const STATUS_COLORS: Record<PresenceStatus, string> = {
  "vai e volta": theme.colors.feedback.success,
  "só vou e não volto": theme.colors.brand.orange,
  "não vou mas volto": theme.colors.brand.navy,
  "não vai e nem volta": theme.colors.feedback.error,
};

const ABSENT_ON_OUTBOUND: PresenceStatus[] = ["não vai e nem volta", "não vou mas volto"];

function getErrorMessage(code?: string, fallback?: string) {
  const map: Record<string, string> = {
    PRESENCE_DEADLINE_EXPIRED: "O prazo para alterar presença nessa viagem já encerrou.",
    FORBIDDEN_RESOURCE: "Você não tem permissão para alterar presença nesta linha.",
    INVALID_PRESENCE_DATE: "A data selecionada é inválida.",
    INVALID_PRESENCE_STATUS: "Status inválido.",
    NETWORK_ERROR: "Sem conexão. Verifique sua internet e tente novamente.",
    SLOT_FULL: "Não há vagas disponíveis no seu horário. A van já está lotada para esta viagem.",
  };
  return map[code ?? ""] || fallback || "Não foi possível atualizar sua presença.";
}

export default function PassengerLinesScreen() {
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<PresenceLineSummary[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // RF6: Modal de troca de slot
  const [slotModalLine, setSlotModalLine] = useState<PresenceLineSummary | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [savingSlot, setSavingSlot] = useState(false);

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const formattedDate = useMemo(() => {
    const [y, m, d] = targetDate.split("-");
    return `${d}/${m}/${y}`;
  }, [targetDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listMyPresenceLines(targetDate);
    if (res.success) {
      setLines(res.lines ?? []);
    } else {
      setError(getErrorMessage(res.error?.code, res.error?.message));
    }
    setLoading(false);
  }, [targetDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doUpdate = useCallback(async (lineId: string, status: PresenceStatus) => {
    setSavingId(lineId);
    const res = await updateMyPresenceStatus(lineId, targetDate, status);
    if (res.success) {
      setLines((prev) =>
        prev.map((l) => l.lineId === lineId ? { ...l, status: res.status ?? status } : l),
      );
    } else {
      Alert.alert("Não foi possível salvar", getErrorMessage(res.error?.code, res.error?.message));
    }
    setSavingId(null);
  }, [targetDate]);

  const handleUpdate = useCallback((lineId: string, status: PresenceStatus, currentStatus: PresenceStatus) => {
    // RF8: confirmação ao reverter ausência de ida de última hora
    if (status === "vai e volta" && ABSENT_ON_OUTBOUND.includes(currentStatus)) {
      Alert.alert(
        "Voltar para a van?",
        "Você havia marcado ausência. Confirma que vai embarcar hoje?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Sim, vou embarcar", onPress: () => doUpdate(lineId, status) },
        ],
      );
      return;
    }
    doUpdate(lineId, status);
  }, [doUpdate]);

  const handleSlotRequest = useCallback(async () => {
    if (!slotModalLine || !selectedSlot) return;
    setSavingSlot(true);
    try {
      // Busca linha do backend para obter arrivalTimes
      const url = ApiEndpoints.POST_SLOT_REQUEST.replace(":lineId", slotModalLine.lineId);
      const res = await apiService.post<{ success: boolean; slotStatus?: string; error?: any }>(url, {
        date: targetDate,
        requestedDepartureTime: selectedSlot,
        requestedArrivalTime: slotModalLine.arrivalTime ?? selectedSlot,
      });
      if ((res.data as any).success) {
        const status = (res.data as any).slotStatus;
        const msg = status === "switched"
          ? "Troca confirmada! Você está no horário " + selectedSlot + " amanhã."
          : "Você entrou na fila de espera para o horário " + selectedSlot + ". Será avisado se houver vaga.";
        Alert.alert(status === "switched" ? "Troca confirmada!" : "Fila de espera", msg);
        setSlotModalLine(null);
        load();
      } else {
        Alert.alert("Erro", (res.data as any).error?.message ?? "Não foi possível solicitar a troca.");
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.error?.message ?? "Falha ao solicitar troca.");
    }
    setSavingSlot(false);
  }, [slotModalLine, selectedSlot, targetDate, load]);

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
        <Text style={styles.title}>Minhas Linhas</Text>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={13} color={theme.colors.brand.navy} />
          <Text style={styles.dateText}>Amanhã, {formattedDate}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.text.muted} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : lines.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bus-outline" size={64} color={theme.colors.text.muted} style={{ opacity: 0.4, marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Nenhuma linha encontrada</Text>
          <Text style={styles.emptyText}>Você ainda não está vinculado a nenhuma linha. Peça um convite ao motorista.</Text>
        </View>
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(item: PresenceLineSummary) => item.lineId}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: PresenceLineSummary }) => (
            <LinePresenceCard
              line={item}
              saving={savingId === item.lineId}
              onUpdate={(status) => handleUpdate(item.lineId, status, item.status)}
              onSlotRequest={() => { setSlotModalLine(item); setSelectedSlot(item.departureTime ?? ""); }}
            />
          )}
        />
      )}

      {/* RF6: Modal de troca de slot */}
      <Modal visible={!!slotModalLine} animationType="slide" transparent onRequestClose={() => setSlotModalLine(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Trocar horário amanhã</Text>
            <Text style={styles.modalSub}>Seu horário fixo: {slotModalLine?.departureTime ?? "—"} • Selecione um horário alternativo:</Text>
            <View style={styles.slotPickerRow}>
              {(slotModalLine?.departureTimes ?? [])
                .filter((s) => s !== slotModalLine?.departureTime)
                .map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.slotChip, selectedSlot === s && styles.slotChipSelected]}
                    onPress={() => setSelectedSlot(s)}
                  >
                    <Text style={[styles.slotChipText, selectedSlot === s && styles.slotChipTextSelected]}>{s}</Text>
                  </Pressable>
                ))}
              {(slotModalLine?.departureTimes ?? []).filter((s) => s !== slotModalLine?.departureTime).length === 0 && (
                <Text style={{ fontSize: 13, color: "#888" }}>
                  Esta linha tem apenas um horário de ida. Não há troca disponível.
                </Text>
              )}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setSlotModalLine(null)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, (!selectedSlot || savingSlot) && { opacity: 0.6 }]}
                onPress={handleSlotRequest}
                disabled={!selectedSlot || savingSlot}
              >
                {savingSlot ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Solicitar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function LinePresenceCard({
  line,
  saving,
  onUpdate,
  onSlotRequest,
}: {
  line: PresenceLineSummary;
  saving: boolean;
  onUpdate: (status: PresenceStatus) => void;
  onSlotRequest: () => void;
}) {
  const statusColor = STATUS_COLORS[line.status] ?? theme.colors.text.secondary;
  const currentOption = STATUS_OPTIONS.find((o) => o.value === line.status);

  return (
    <View style={styles.card}>
      {/* Cabeçalho da linha */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.lineName} numberOfLines={1}>
            {line.name || "Linha"}
          </Text>
          {(line.originCity || line.destinationPlace) && (
            <View style={styles.routeRow}>
              <Ionicons name="radio-button-on" size={12} color={theme.colors.brand.orange} />
              <Text style={styles.routeText} numberOfLines={1}>{line.originCity}</Text>
              <Ionicons name="arrow-forward" size={12} color={theme.colors.text.muted} />
              <Text style={styles.routeText} numberOfLines={1}>{line.destinationPlace}</Text>
            </View>
          )}
        </View>
        {/* Status atual */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20", borderColor: statusColor }]}>
          <Ionicons name={currentOption?.icon as any ?? "ellipse"} size={13} color={statusColor} />
          <Text style={[styles.statusBadgeText, { color: statusColor }]} numberOfLines={1}>
            {currentOption?.label ?? line.status}
          </Text>
        </View>
      </View>

      {/* Slot de horário do passageiro */}
      {(line.departureTime || line.arrivalTime) && (
        <View style={styles.slotRow}>
          {line.departureTime && (
            <View style={styles.slotBadge}>
              <Ionicons name="arrow-forward-circle-outline" size={13} color={theme.colors.brand.orange} />
              <Text style={styles.slotText}>Ida: {line.alternateDepartureTime ?? line.departureTime}</Text>
            </View>
          )}
          {line.arrivalTime && (
            <View style={styles.slotBadge}>
              <Ionicons name="return-down-back-outline" size={13} color={theme.colors.brand.navy} />
              <Text style={styles.slotText}>Volta: {line.alternateArrivalTime ?? line.arrivalTime}</Text>
            </View>
          )}
          {line.slotStatus === "waitlist" && (
            <View style={[styles.slotBadge, { backgroundColor: theme.colors.feedback.warning + "20", borderColor: theme.colors.feedback.warning }]}>
              <Ionicons name="time-outline" size={13} color={theme.colors.feedback.warning} />
              <Text style={[styles.slotText, { color: theme.colors.feedback.warning }]}>Fila de espera</Text>
            </View>
          )}
          {line.slotStatus === "switched" && (
            <View style={[styles.slotBadge, { backgroundColor: theme.colors.feedback.success + "20", borderColor: theme.colors.feedback.success }]}>
              <Ionicons name="swap-horizontal-outline" size={13} color={theme.colors.feedback.success} />
              <Text style={[styles.slotText, { color: theme.colors.feedback.success }]}>Horário trocado</Text>
            </View>
          )}
        </View>
      )}

      {/* RF6: Botão de troca de horário */}
      {line.departureTime && (
        <Pressable style={styles.slotSwapBtn} onPress={onSlotRequest}>
          <Ionicons name="swap-horizontal-outline" size={13} color={theme.colors.brand.navy} />
          <Text style={styles.slotSwapText}>Trocar horário amanhã</Text>
        </Pressable>
      )}

      {/* Opções de presença */}
      <Text style={styles.optionsLabel}>Minha presença amanhã:</Text>
      <View style={styles.options}>
        {STATUS_OPTIONS.map((opt) => {
          const selected = line.status === opt.value;
          const color = STATUS_COLORS[opt.value];
          const isRf8 = opt.value === "vai e volta" && ABSENT_ON_OUTBOUND.includes(line.status);
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.optBtn,
                selected && { borderColor: color, backgroundColor: color + "15" },
                isRf8 && { borderColor: theme.colors.feedback.success, borderWidth: 2 },
              ]}
              onPress={() => !saving && !selected && onUpdate(opt.value)}
              disabled={saving}
            >
              {saving && selected ? (
                <ActivityIndicator size="small" color={color} />
              ) : (
                <Ionicons
                  name={opt.icon as any}
                  size={18}
                  color={selected ? color : isRf8 ? theme.colors.feedback.success : theme.colors.text.muted}
                />
              )}
              <Text style={[
                styles.optText,
                selected && { color, fontWeight: "700" },
                isRf8 && { color: theme.colors.feedback.success, fontWeight: "700" },
              ]}>
                {isRf8 ? "Ir mesmo assim" : opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.soft,
    gap: theme.spacing.xs,
  },
  title: { fontSize: theme.font.xl, fontWeight: "800", color: theme.colors.text.primary },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: theme.colors.brand.navy + "12",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  dateText: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.brand.navy },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: theme.spacing.xl },
  errorText: { fontSize: theme.font.md, color: theme.colors.feedback.error, textAlign: "center", marginTop: theme.spacing.md },
  retryBtn: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.brand.orange,
    borderRadius: theme.radius.pill,
  },
  retryText: { color: theme.colors.text.inverse, fontWeight: "700" },
  emptyTitle: { fontSize: theme.font.lg, fontWeight: "700", color: theme.colors.text.primary, marginBottom: theme.spacing.sm, textAlign: "center" },
  emptyText: { fontSize: theme.font.md, color: theme.colors.text.secondary, textAlign: "center", lineHeight: 22 },
  list: { padding: theme.spacing.lg, gap: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    ...theme.shadow.card,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm },
  cardTitle: { flex: 1, gap: 4 },
  lineName: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  routeText: { fontSize: theme.font.sm, color: theme.colors.text.secondary, flex: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    maxWidth: 120,
  },
  statusBadgeText: { fontSize: theme.font.xs, fontWeight: "700" },
  slotSwapBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.brand.navy + "50", backgroundColor: theme.colors.brand.navy + "08" },
  slotSwapText: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.brand.navy },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: theme.colors.background.card, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, padding: theme.spacing.xl, gap: theme.spacing.md },
  modalTitle: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  modalSub: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  slotPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  slotChip: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.pill, borderWidth: 1.5, borderColor: theme.colors.border.default, backgroundColor: theme.colors.background.screen },
  slotChipSelected: { borderColor: theme.colors.brand.orange, backgroundColor: theme.colors.brand.orange + "15" },
  slotChipText: { fontSize: theme.font.md, fontWeight: "600", color: theme.colors.text.secondary },
  slotChipTextSelected: { color: theme.colors.brand.orange, fontWeight: "800" },
  modalActions: { flexDirection: "row", gap: theme.spacing.md },
  modalCancelBtn: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.pill, alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border.default },
  modalCancelText: { fontWeight: "700", color: theme.colors.text.secondary },
  modalConfirmBtn: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.pill, alignItems: "center", backgroundColor: theme.colors.brand.orange },
  modalConfirmText: { fontWeight: "700", color: "#fff" },
  slotRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  slotBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    backgroundColor: theme.colors.background.muted,
  },
  slotText: { fontSize: theme.font.xs, fontWeight: "600", color: theme.colors.text.secondary },
  optionsLabel: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  optBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.muted,
  },
  optText: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
});
