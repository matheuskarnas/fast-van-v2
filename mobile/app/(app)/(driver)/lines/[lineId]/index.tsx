import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../../../constants/theme";
import {
  getLineById,
  generateLineInvite,
  removeLinePoint,
  type Line,
  type LinePoint,
} from "../../../../../services/driverLines";

export default function LineDetailsScreen() {
  const { lineId } = useLocalSearchParams<{ lineId: string }>();
  const router = useRouter();
  const [line, setLine] = useState<Line | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

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
  }, [lineId]);

  useFocusEffect(useCallback(() => { loadLine(); }, [loadLine]));

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

      <FlatList
        data={line.points ?? []}
        keyExtractor={(item) => item.id}
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
              <Pressable style={styles.actionButton} onPress={() => router.push(`/lines/${lineId}/operation`)}>
                <Ionicons name="play-circle-outline" size={20} color={theme.colors.brand.navy} />
                <Text style={[styles.actionText, { color: theme.colors.brand.navy }]}>Operar</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => router.push(`/lines/${lineId}/point`)}>
                <Ionicons name="add-circle-outline" size={20} color={theme.colors.brand.navy} />
                <Text style={[styles.actionText, { color: theme.colors.brand.navy }]}>Ponto</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Pontos de embarque/desembarque</Text>
            {(line.points?.length ?? 0) === 0 && (
              <Text style={styles.emptyPoints}>Nenhum ponto cadastrado. Adicione os pontos conforme os passageiros entram na linha.</Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <PointCard
            point={item}
            onEdit={() => router.push({ pathname: `/lines/${lineId}/point`, params: { pointId: item.id, address: item.address, type: item.type, segment: item.segment } })}
            onRemove={() => handleRemovePoint(item)}
          />
        )}
      />
    </SafeAreaView>
  );
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

function PointCard({ point, onEdit, onRemove }: { point: LinePoint; onEdit: () => void; onRemove: () => void }) {
  const isPickup = point.type === "pickup";
  return (
    <View style={styles.pointCard}>
      <View style={styles.pointType}>
        <Ionicons name={isPickup ? "arrow-up-circle" : "arrow-down-circle"} size={20} color={isPickup ? theme.colors.feedback.success : theme.colors.feedback.error} />
        <Text style={styles.pointTypeText}>{isPickup ? "Embarque" : "Desembarque"}</Text>
        <Text style={styles.pointSegment}>{point.segment === "ida" ? "Ida" : "Volta"}</Text>
      </View>
      <Text style={styles.pointAddress}>{point.address}</Text>
      <Text style={styles.pointPassengers}>{point.passengers?.length ?? 0} passageiro(s)</Text>
      <View style={styles.pointActions}>
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
  actionsRow: { flexDirection: "row", gap: theme.spacing.md },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border.soft,
    paddingVertical: theme.spacing.md,
  },
  actionText: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.brand.orange },
  sectionTitle: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.primary },
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
  pointType: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
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
  pointPassengers: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  pointActions: { flexDirection: "row", gap: theme.spacing.lg, marginTop: theme.spacing.xs },
  pointAction: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs },
  pointActionText: { fontSize: theme.font.sm, fontWeight: "600", color: theme.colors.brand.navy },
});
