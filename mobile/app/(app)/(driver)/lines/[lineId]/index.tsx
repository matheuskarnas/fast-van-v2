import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DraggableFlatList from "react-native-draggable-flatlist";
import { theme } from "../../../../../constants/theme";
import { apiService } from "../../../../../services/api";
import { ApiEndpoints } from "../../../../../constants/api";
import {
  getLineById,
  getLinePassengers,
  generateLineInvite,
  removeLinePoint,
  reorderLinePoints,
  updateLinePointPassengers,
  type Line,
  type LinePassenger,
  type LinePoint,
} from "../../../../../services/driverLines";

export default function LineDetailsScreen() {
  const { lineId } = useLocalSearchParams<{ lineId: string }>();
  const router = useRouter();
  const [line, setLine] = useState<Line | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [passengerModalPoint, setPassengerModalPoint] = useState<LinePoint | null>(null);
  const [linePassengers, setLinePassengers] = useState<LinePassenger[]>([]);
  const [selectedPassengerIds, setSelectedPassengerIds] = useState<string[]>([]);
  const [loadingPassengers, setLoadingPassengers] = useState(false);
  const [savingPassengers, setSavingPassengers] = useState(false);
  const [pendingSuggestionsCount, setPendingSuggestionsCount] = useState(0);
  const [activePointSegment, setActivePointSegment] = useState<"ida" | "volta">("ida");
  const [savingOrder, setSavingOrder] = useState(false);

  const loadLine = useCallback(async () => {
    if (!lineId) return;
    setLoading(true);
    const result = await getLineById(lineId);
    if (result.success && result.line) {
      setLine(result.line);
    } else {
      Alert.alert("Erro", result.error?.message ?? "Linha não encontrada.");
      router.back();
    }
    setLoading(false);
  }, [lineId, router]);

  const loadPendingSuggestionsCount = useCallback(async () => {
    if (!lineId) return;
    try {
      const url = ApiEndpoints.GET_SUGGESTIONS.replace(":lineId", lineId);
      const response = await apiService.get<{ success: boolean; suggestions?: unknown[] }>(url);
      if (response.data.success) {
        setPendingSuggestionsCount(response.data.suggestions?.length ?? 0);
      }
    } catch {
      setPendingSuggestionsCount(0);
    }
  }, [lineId]);

  useFocusEffect(useCallback(() => {
    loadLine();
    loadPendingSuggestionsCount();
  }, [loadLine, loadPendingSuggestionsCount]));

  const handleGenerateInvite = async () => {
    if (!lineId) return;
    setSharing(true);
    const result = await generateLineInvite(lineId);
    setSharing(false);
    if (result.success && result.url) {
      await Share.share({
        message: `Entre na minha linha de van pelo FastVan: ${result.url}`,
        url: result.url,
      });
    } else {
      Alert.alert("Erro", result.error?.message ?? "Não foi possível gerar o convite.");
    }
  };

  const handleRemovePoint = (point: LinePoint) => {
    const hasPassengers = (point.passengers?.length ?? 0) > 0;
    if (hasPassengers) {
      Alert.alert("Não é possível remover", "Remova os passageiros vinculados antes de deletar este ponto.");
      return;
    }
    Alert.alert("Remover ponto?", `Deseja remover o ponto "${point.address}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          const result = await removeLinePoint(lineId!, point.id);
          if (result.success) {
            loadLine();
          } else {
            Alert.alert("Erro", result.error?.message ?? "Não foi possível remover o ponto.");
          }
        },
      },
    ]);
  };

  const openPassengerManager = async (point: LinePoint) => {
    if (!lineId) return;
    setPassengerModalPoint(point);
    setSelectedPassengerIds(getPointPassengerIds(point));
    setLoadingPassengers(true);
    const result = await getLinePassengers(lineId);
    setLoadingPassengers(false);
    if (result.success) {
      setLinePassengers(result.passengers ?? []);
    } else {
      Alert.alert("Erro", result.error?.message ?? "Não foi possível carregar os passageiros.");
    }
  };

  const togglePassenger = (passengerId: string) => {
    setSelectedPassengerIds((current) =>
      current.includes(passengerId)
        ? current.filter((id) => id !== passengerId)
        : [...current, passengerId],
    );
  };

  const closePassengerManager = () => {
    if (savingPassengers) return;
    setPassengerModalPoint(null);
    setSelectedPassengerIds([]);
  };

  const savePointPassengers = async () => {
    if (!lineId || !passengerModalPoint) return;
    setSavingPassengers(true);
    const result = await updateLinePointPassengers(lineId, passengerModalPoint.id, selectedPassengerIds);
    setSavingPassengers(false);
    if (result.success) {
      setPassengerModalPoint(null);
      await loadLine();
    } else {
      Alert.alert("Erro", result.error?.message ?? "Não foi possível salvar os passageiros do ponto.");
    }
  };

  const handleReorderPoints = async (points: LinePoint[]) => {
    if (!lineId || !line) return;
    const orderedPoints = points.map((point, index) => ({ ...point, sortOrder: index }));
    setLine({
      ...line,
      points: [
        ...orderedPoints,
        ...(line.points ?? []).filter((point) => point.segment !== activePointSegment),
      ].sort(compareLinePoints),
    });

    setSavingOrder(true);
    const result = await reorderLinePoints(lineId, activePointSegment, orderedPoints.map((point) => point.id));
    setSavingOrder(false);
    if (!result.success) {
      Alert.alert("Erro", result.error?.message ?? "Não foi possível salvar a ordem dos pontos.");
      loadLine();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand.orange} />
        </View>
      </SafeAreaView>
    );
  }

  if (!line) return null;

  const segmentPoints = getOrderedSegmentPoints(line.points ?? [], activePointSegment);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={1}>{line.originCity} → {line.destinationPlace}</Text>
          <Text style={styles.subtitle}>{line.capacity} lugares</Text>
        </View>
      </View>

      <DraggableFlatList
        data={segmentPoints}
        keyExtractor={(item) => item.id}
        activationDistance={10}
        onDragEnd={({ data }) => handleReorderPoints(data)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.infoCard}>
              <InfoRow icon="radio-button-on" color={theme.colors.brand.orange} label="Origem" value={line.originCity} />
              <InfoRow icon="location" color={theme.colors.brand.navy} label="Destino" value={line.destinationPlace} />
              {line.arrivalTimes?.length > 0 && (
                <InfoRow icon="flag-outline" color={theme.colors.feedback.success} label="Chegada" value={line.arrivalTimes.join(" • ")} />
              )}
              {line.departureTimes?.length > 0 && (
                <InfoRow icon="return-down-back-outline" color={theme.colors.feedback.error} label="Saída" value={line.departureTimes.join(" • ")} />
              )}
            </View>

            <View style={styles.actionsRow}>
              <Pressable style={styles.actionButton} onPress={() => (router as any).push({ pathname: "/(app)/shared/chat-group", params: { lineId, lineName: line.name } })}>
                <Ionicons name="chatbubbles-outline" size={20} color={theme.colors.brand.navy} />
                <Text style={[styles.actionText, { color: theme.colors.brand.navy }]}>Grupo</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={handleGenerateInvite} disabled={sharing}>
                {sharing
                  ? <ActivityIndicator size="small" color={theme.colors.brand.orange} />
                  : <Ionicons name="share-outline" size={20} color={theme.colors.brand.orange} />
                }
                <Text style={styles.actionText}>Convidar</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => router.push(`/lines/${lineId}/dashboard`)}>
                <Ionicons name="bar-chart-outline" size={20} color={theme.colors.feedback.success} />
                <Text style={[styles.actionText, { color: theme.colors.feedback.success }]}>Ocupação</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => router.push(`/lines/${lineId}/map`)}>
                <Ionicons name="map-outline" size={20} color={theme.colors.feedback.success} />
                <Text style={[styles.actionText, { color: theme.colors.feedback.success }]}>Mapa</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => router.push(`/lines/${lineId}/suggestions`)}>
                {pendingSuggestionsCount > 0 && (
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>
                      {pendingSuggestionsCount > 9 ? "9+" : pendingSuggestionsCount}
                    </Text>
                  </View>
                )}
                <Ionicons name="git-pull-request-outline" size={20} color={theme.colors.feedback.warning} />
                <Text style={[styles.actionText, { color: theme.colors.feedback.warning }]}>Sugestões</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => router.push(`/lines/${lineId}/operation`)}>
                <Ionicons name="play-circle-outline" size={20} color={theme.colors.brand.navy} />
                <Text style={[styles.actionText, { color: theme.colors.brand.navy }]}>Operar</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => router.push(`/lines/${lineId}/point`)}>
                <Ionicons name="add-circle-outline" size={20} color={theme.colors.brand.navy} />
                <Text style={[styles.actionText, { color: theme.colors.brand.navy }]}>Ponto</Text>
              </Pressable>
            </View>

            <View style={styles.pointsHeader}>
              <View>
                <Text style={styles.sectionTitle}>Ordem das paradas</Text>
                <Text style={styles.sectionHint}>
                  {savingOrder ? "Salvando ordem..." : "Arraste o ponto pelo ícone para mudar a sequência."}
                </Text>
              </View>
              <View style={styles.segmentTabs}>
                {(["ida", "volta"] as const).map((segment) => {
                  const isActive = activePointSegment === segment;
                  return (
                    <Pressable
                      key={segment}
                      style={[styles.segmentTab, isActive && styles.segmentTabActive]}
                      onPress={() => setActivePointSegment(segment)}
                    >
                      <Text style={[styles.segmentTabText, isActive && styles.segmentTabTextActive]}>
                        {segment === "ida" ? "Ida" : "Volta"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {segmentPoints.length === 0 && (
              <Text style={styles.emptyPoints}>Nenhum ponto cadastrado para este trecho.</Text>
            )}
          </>
        }
        renderItem={({ item, drag, isActive, getIndex }) => (
          <PointCard
            point={item}
            orderNumber={(getIndex() ?? 0) + 1}
            onDrag={drag}
            isDragging={isActive}
            onEdit={() => (router as any).push({ pathname: `/lines/${lineId}/point`, params: { pointId: item.id, address: item.address, type: item.type, segment: item.segment } })}
            onManagePassengers={() => openPassengerManager(item)}
            onRemove={() => handleRemovePoint(item)}
          />
        )}
      />

      <Modal
        visible={!!passengerModalPoint}
        transparent
        animationType="slide"
        onRequestClose={closePassengerManager}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>Passageiros do ponto</Text>
                <Text style={styles.modalSubtitle} numberOfLines={2}>{passengerModalPoint?.address}</Text>
              </View>
              <Pressable style={styles.modalCloseButton} onPress={closePassengerManager}>
                <Ionicons name="close" size={22} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            {loadingPassengers ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={theme.colors.brand.orange} />
              </View>
            ) : (
              <ScrollView style={styles.passengerList} contentContainerStyle={styles.passengerListContent}>
                {linePassengers.length === 0 ? (
                  <Text style={styles.emptyPassengers}>Nenhum passageiro matriculado nesta linha.</Text>
                ) : (
                  linePassengers.map((passenger) => {
                    const checked = selectedPassengerIds.includes(passenger.id);
                    return (
                      <Pressable
                        key={passenger.id}
                        style={[styles.passengerOption, checked && styles.passengerOptionSelected]}
                        onPress={() => togglePassenger(passenger.id)}
                      >
                        <Ionicons
                          name={checked ? "checkbox" : "square-outline"}
                          size={22}
                          color={checked ? theme.colors.brand.orange : theme.colors.text.muted}
                        />
                        <View style={styles.passengerOptionText}>
                          <Text style={styles.passengerName}>{passenger.name || passenger.id}</Text>
                          {(passenger.departureTime || passenger.arrivalTime) && (
                            <Text style={styles.passengerTimes}>
                              Ida {passenger.departureTime ?? "-"} • Volta {passenger.arrivalTime ?? "-"}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButton} onPress={closePassengerManager} disabled={savingPassengers}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, savingPassengers && styles.buttonDisabled]}
                onPress={savePointPassengers}
                disabled={savingPassengers || loadingPassengers}
              >
                {savingPassengers ? (
                  <ActivityIndicator size="small" color={theme.colors.text.inverse} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color={theme.colors.text.inverse} />
                    <Text style={styles.primaryButtonText}>Salvar</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getPassengerId(passenger: string | { id: string; name?: string }) {
  return typeof passenger === "string" ? passenger : passenger.id;
}

function getPassengerName(passenger: string | { id: string; name?: string }) {
  return typeof passenger === "string" ? passenger : passenger.name || passenger.id;
}

function getPointPassengerIds(point: LinePoint) {
  return (point.passengers ?? []).map(getPassengerId).filter(Boolean);
}

function compareLinePoints(a: LinePoint, b: LinePoint) {
  if (a.segment !== b.segment) return a.segment.localeCompare(b.segment);
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.id.localeCompare(b.id);
}

function getOrderedSegmentPoints(points: LinePoint[], segment: "ida" | "volta") {
  return points.filter((point) => point.segment === segment).sort(compareLinePoints);
}

function InfoRow({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function PointCard({
  point,
  orderNumber,
  onDrag,
  isDragging,
  onEdit,
  onManagePassengers,
  onRemove,
}: {
  point: LinePoint;
  orderNumber: number;
  onDrag: () => void;
  isDragging: boolean;
  onEdit: () => void;
  onManagePassengers: () => void;
  onRemove: () => void;
}) {
  const isPickup = point.type === "pickup";
  const passengerNames = (point.passengers ?? []).map(getPassengerName);
  return (
    <View style={[styles.pointCard, isDragging && styles.pointCardDragging]}>
      <View style={styles.pointType}>
        <Pressable style={styles.dragHandle} onLongPress={onDrag} delayLongPress={120}>
          <Ionicons name="reorder-three-outline" size={22} color={theme.colors.text.secondary} />
        </Pressable>
        <View style={styles.orderBadge}>
          <Text style={styles.orderBadgeText}>{orderNumber}</Text>
        </View>
        <Ionicons name={isPickup ? "arrow-up-circle" : "arrow-down-circle"} size={20} color={isPickup ? theme.colors.feedback.success : theme.colors.feedback.error} />
        <Text style={styles.pointTypeText}>{isPickup ? "Embarque" : "Desembarque"}</Text>
        <Text style={styles.pointSegment}>{point.segment === "ida" ? "Ida" : "Volta"}</Text>
      </View>
      <Text style={styles.pointAddress}>{point.address}</Text>
      <Text style={styles.pointPassengers}>
        {passengerNames.length > 0 ? passengerNames.join(", ") : "Nenhum passageiro vinculado"}
      </Text>
      <View style={styles.pointActions}>
        <Pressable style={styles.pointAction} onPress={onManagePassengers}>
          <Ionicons name="people-outline" size={16} color={theme.colors.brand.orange} />
          <Text style={styles.pointActionText}>Passageiros</Text>
        </Pressable>
        <Pressable style={styles.pointAction} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={16} color={theme.colors.brand.navy} />
          <Text style={styles.pointActionText}>Editar</Text>
        </Pressable>
        <Pressable style={styles.pointAction} onPress={onRemove}>
          <Ionicons name="trash-outline" size={16} color={theme.colors.feedback.error} />
          <Text style={[styles.pointActionText, { color: theme.colors.feedback.error }]}>Remover</Text>
        </Pressable>
      </View>
    </View>
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
  backButton: { padding: theme.spacing.xs },
  headerInfo: { flex: 1 },
  title: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  subtitle: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  infoCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    ...theme.shadow.card,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  infoLabel: { fontSize: theme.font.sm, color: theme.colors.text.secondary, width: 60 },
  infoValue: { flex: 1, fontSize: theme.font.md, color: theme.colors.text.primary, fontWeight: "600" },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  actionButton: {
    position: "relative",
    width: "48%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border.soft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  actionText: {
    flexShrink: 1,
    fontSize: theme.font.sm,
    fontWeight: "700",
    color: theme.colors.brand.orange,
    textAlign: "center",
  },
  actionBadge: {
    position: "absolute",
    top: -7,
    right: -7,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.feedback.warning,
    borderWidth: 2,
    borderColor: theme.colors.background.screen,
  },
  actionBadgeText: {
    fontSize: theme.font.xs,
    fontWeight: "800",
    color: theme.colors.text.inverse,
  },
  pointsHeader: {
    gap: theme.spacing.sm,
  },
  sectionTitle: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.primary },
  sectionHint: { fontSize: theme.font.sm, color: theme.colors.text.secondary, marginTop: 2 },
  segmentTabs: {
    flexDirection: "row",
    padding: 3,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.muted,
  },
  segmentTab: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
  },
  segmentTabActive: {
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
  },
  segmentTabText: {
    fontSize: theme.font.sm,
    fontWeight: "700",
    color: theme.colors.text.secondary,
  },
  segmentTabTextActive: {
    color: theme.colors.brand.navy,
  },
  emptyPoints: { fontSize: theme.font.sm, color: theme.colors.text.secondary, lineHeight: 20 },
  pointCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    gap: theme.spacing.sm,
    ...theme.shadow.card,
  },
  pointCardDragging: {
    opacity: 0.9,
    borderColor: theme.colors.brand.orange,
  },
  pointType: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  dragHandle: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.muted,
  },
  orderBadge: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: theme.colors.brand.navy,
  },
  orderBadgeText: {
    fontSize: theme.font.xs,
    fontWeight: "800",
    color: theme.colors.text.inverse,
  },
  pointTypeText: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.primary },
  pointSegment: {
    fontSize: theme.font.xs,
    color: theme.colors.text.muted,
    backgroundColor: theme.colors.background.muted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    marginLeft: "auto",
  },
  pointAddress: { fontSize: theme.font.md, color: theme.colors.text.primary },
  pointPassengers: { fontSize: theme.font.sm, color: theme.colors.text.secondary, lineHeight: 20 },
  pointActions: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  pointAction: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.muted,
  },
  pointActionText: { fontSize: theme.font.sm, fontWeight: "600", color: theme.colors.brand.navy },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalPanel: {
    maxHeight: "82%",
    backgroundColor: theme.colors.background.card,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md },
  modalTitleWrap: { flex: 1 },
  modalTitle: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  modalSubtitle: { fontSize: theme.font.sm, color: theme.colors.text.secondary, marginTop: 2 },
  modalCloseButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.muted,
  },
  modalLoading: { minHeight: 160, alignItems: "center", justifyContent: "center" },
  passengerList: { maxHeight: 360 },
  passengerListContent: { gap: theme.spacing.sm, paddingBottom: theme.spacing.sm },
  emptyPassengers: { fontSize: theme.font.sm, color: theme.colors.text.secondary, lineHeight: 20 },
  passengerOption: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    backgroundColor: theme.colors.background.card,
  },
  passengerOptionSelected: {
    borderColor: theme.colors.brand.orange,
    backgroundColor: theme.colors.background.muted,
  },
  passengerOptionText: { flex: 1 },
  passengerName: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.primary },
  passengerTimes: { fontSize: theme.font.xs, color: theme.colors.text.secondary, marginTop: 2 },
  modalActions: { flexDirection: "row", gap: theme.spacing.sm },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
  },
  secondaryButtonText: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.primary },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brand.orange,
  },
  primaryButtonText: { fontSize: theme.font.md, fontWeight: "800", color: theme.colors.text.inverse },
  buttonDisabled: { opacity: 0.7 },
});
