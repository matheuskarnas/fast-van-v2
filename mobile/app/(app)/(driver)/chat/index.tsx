import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import { apiService } from "../../../../services/api";
import { ApiEndpoints } from "../../../../constants/api";
import { getSession } from "../../../../services/session";

export default function DriverChatListScreen() {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const [session, linesRes] = await Promise.all([
      getSession(),
      getDriverLines(),
    ]);
    if (session?.userId) setDriverId(session.userId);
    if (linesRes.success) setLines(linesRes.lines ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openGroupChat = async (line: Line) => {
    // Auto-cria grupo se não existir
    try {
      await apiService.post(ApiEndpoints.CREATE_GROUP_CHAT, {
        lineId: line.id,
        ownerDriverId: driverId,
      });
    } catch { /* group may already exist */ }
    router.push({ pathname: "/(app)/shared/chat-group", params: { lineId: line.id, lineName: line.name } } as any);
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
      </View>

      {lines.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={56} color={theme.colors.text.muted} style={{ opacity: 0.4, marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Nenhuma linha cadastrada</Text>
          <Text style={styles.emptyText}>Crie uma linha para acessar o chat do grupo.</Text>
        </View>
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(item: Line) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.sectionLabel}>Chats do grupo</Text>}
          renderItem={({ item }: { item: Line }) => (
            <Pressable style={styles.lineCard} onPress={() => openGroupChat(item)}>
              <View style={styles.lineIcon}>
                <Ionicons name="people" size={20} color={theme.colors.brand.orange} />
              </View>
              <View style={styles.lineInfo}>
                <Text style={styles.lineName} numberOfLines={1}>{item.name || item.originCity}</Text>
                <Text style={styles.lineRoute} numberOfLines={1}>{item.originCity} → {item.destinationPlace}</Text>
                <Text style={styles.linePassengers}>{item.passengerCount ?? 0} passageiro(s)</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.xl },
  header: { paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border.soft },
  title: { fontSize: theme.font.xl, fontWeight: "800", color: theme.colors.text.primary },
  emptyTitle: { fontSize: theme.font.lg, fontWeight: "700", color: theme.colors.text.primary, marginBottom: theme.spacing.sm, textAlign: "center" },
  emptyText: { fontSize: theme.font.sm, color: theme.colors.text.secondary, textAlign: "center" },
  list: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  sectionLabel: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: theme.spacing.sm },
  lineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    ...theme.shadow.card,
  },
  lineIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.brand.orange + "15", alignItems: "center", justifyContent: "center" },
  lineInfo: { flex: 1, gap: 2 },
  lineName: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.primary },
  lineRoute: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  linePassengers: { fontSize: theme.font.xs, color: theme.colors.text.muted },
});
