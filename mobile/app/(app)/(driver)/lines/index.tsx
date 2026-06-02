import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../../constants/theme";
import { getDriverLines, type Line } from "../../../../services/driverLines";

export default function LinesListScreen() {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLines = useCallback(async () => {
    setError(null);
    const result = await getDriverLines();
    if (result.success) {
      setLines(result.lines ?? []);
    } else {
      setError(result.error?.message ?? "Erro ao carregar linhas.");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadLines(); }, [loadLines]));

  const onRefresh = () => { setRefreshing(true); loadLines(); };

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
      </View>

      {error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.text.muted} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadLines}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : lines.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="map-outline" size={64} color={theme.colors.text.muted} style={{ opacity: 0.5, marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Nenhuma linha cadastrada</Text>
          <Text style={styles.emptyText}>Toque no botão abaixo para criar sua primeira linha</Text>
        </View>
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => <LineCard line={item} onPress={() => router.push(`/lines/${item.id}`)} />}
        />
      )}

      <Pressable style={styles.fab} onPress={() => router.push("/lines/create")}>
        <Ionicons name="add" size={28} color={theme.colors.text.inverse} />
      </Pressable>
    </SafeAreaView>
  );
}

function countPassengers(line: Line): number {
  const ids = new Set<string>();
  (line.points ?? []).forEach((p) => (p.passengers ?? []).forEach((id) => ids.add(id)));
  return ids.size;
}

function LineCard({ line, onPress }: { line: Line; onPress: () => void }) {
  const passengers = countPassengers(line);
  const occupancyColor =
    passengers >= line.capacity
      ? theme.colors.feedback.error
      : passengers >= line.capacity * 0.8
        ? theme.colors.feedback.warning
        : theme.colors.feedback.success;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardRoute}>
        {!!line.name && <Text style={styles.lineName} numberOfLines={1}>{line.name}</Text>}
        <View style={styles.routeRow}>
          <Ionicons name="radio-button-on" size={14} color={theme.colors.brand.orange} />
          <Text style={styles.routeText} numberOfLines={1}>{line.originCity}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <Ionicons name="location" size={14} color={theme.colors.brand.navy} />
          <Text style={styles.routeText} numberOfLines={1}>{line.destinationPlace}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <Text style={[styles.capacityText, { color: occupancyColor, fontWeight: "700" }]}>
          {passengers}/{line.capacity}
        </Text>
        <Text style={styles.pointsText}>lugares</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.soft,
  },
  title: { fontSize: theme.font.xl, fontWeight: "800", color: theme.colors.text.primary },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: theme.spacing.xl },
  emptyTitle: { fontSize: theme.font.lg, fontWeight: "700", color: theme.colors.text.primary, marginBottom: theme.spacing.sm },
  emptyText: { fontSize: theme.font.md, color: theme.colors.text.secondary, textAlign: "center" },
  errorText: { fontSize: theme.font.md, color: theme.colors.feedback.error, textAlign: "center", marginTop: theme.spacing.md },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.brand.orange,
    borderRadius: theme.radius.pill,
  },
  retryText: { color: theme.colors.text.inverse, fontWeight: "700" },
  listContent: { padding: theme.spacing.lg, gap: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    flexDirection: "row",
    alignItems: "center",
    ...theme.shadow.card,
  },
  cardRoute: { flex: 1, gap: theme.spacing.xs },
  lineName: { fontSize: theme.font.md, fontWeight: "800", color: theme.colors.text.primary, marginBottom: 2 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  routeLine: { width: 1, height: 12, backgroundColor: theme.colors.border.default, marginLeft: 7, marginVertical: 2 },
  routeText: { fontSize: theme.font.md, color: theme.colors.text.primary, fontWeight: "600", flex: 1 },
  cardMeta: { alignItems: "flex-end", gap: theme.spacing.xs },
  capacityText: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  pointsText: { fontSize: theme.font.sm, color: theme.colors.text.muted },
  fab: {
    position: "absolute",
    bottom: theme.spacing.xl,
    right: theme.spacing.xl,
    backgroundColor: theme.colors.brand.orange,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadow.card,
  },
});
