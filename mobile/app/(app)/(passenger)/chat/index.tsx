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
import { apiService } from "../../../../services/api";
import { ApiEndpoints } from "../../../../constants/api";
import { getSession } from "../../../../services/session";
import { createPrivateConversation } from "../../../../services/chat";
import type { PresenceLineSummary } from "../../../../services/presence";

export default function PassengerChatListScreen() {
  const router = useRouter();
  const [lines, setLines] = useState<PresenceLineSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [passengerId, setPassengerId] = useState<string>("");
  const [openingChat, setOpeningChat] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const [session, linesRes] = await Promise.all([
      getSession(),
      apiService.get<{ success: boolean; lines: PresenceLineSummary[] }>(
        `${ApiEndpoints.GET_MY_PRESENCE_LINES}?date=${today}`,
      ).catch(() => ({ data: { success: false, lines: [] } })),
    ]);
    if (session?.userId) setPassengerId(session.userId);
    if ((linesRes as any).data?.success) setLines((linesRes as any).data.lines ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openGroupChat = (line: PresenceLineSummary) => {
    router.push({ pathname: "/(app)/shared/chat-group", params: { lineId: line.lineId, lineName: line.name } } as any);
  };

  const openPrivateChat = async (line: PresenceLineSummary) => {
    if (!passengerId) return;
    setOpeningChat(line.lineId);
    try {
      // Pega o driverId da linha
      const lineRes = await apiService.get<any>(`${ApiEndpoints.GET_LINE.replace(":id", line.lineId)}`).catch(() => null);
      const driverId = lineRes?.data?.line?.ownerDriverId;
      if (!driverId) return;

      const result = await createPrivateConversation({ passengerId, driverId, context: "line" }) as any;
      if (result?.success && result.conversation?.id) {
        router.push(`/(app)/(passenger)/chat/${result.conversation.id}` as any);
      }
    } catch { /* silent */ }
    setOpeningChat(null);
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
          <Text style={styles.emptyTitle}>Nenhuma linha ativa</Text>
          <Text style={styles.emptyText}>Entre em uma linha para acessar o chat do grupo e falar com o motorista.</Text>
        </View>
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(item: PresenceLineSummary) => item.lineId}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.sectionLabel}>Minhas linhas</Text>}
          renderItem={({ item }: { item: PresenceLineSummary }) => (
            <View style={styles.lineCard}>
              <View style={styles.lineInfo}>
                <Text style={styles.lineName} numberOfLines={1}>{item.name || item.lineId}</Text>
                <Text style={styles.lineRoute} numberOfLines={1}>
                  {item.originCity} → {item.destinationPlace}
                </Text>
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => openGroupChat(item)}
                >
                  <Ionicons name="people" size={16} color={theme.colors.brand.navy} />
                  <Text style={styles.actionBtnText}>Grupo</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, openingChat === item.lineId && styles.actionBtnDisabled]}
                  onPress={() => openPrivateChat(item)}
                  disabled={openingChat === item.lineId}
                >
                  {openingChat === item.lineId
                    ? <ActivityIndicator size="small" color={theme.colors.brand.orange} />
                    : <Ionicons name="person" size={16} color={theme.colors.brand.orange} />
                  }
                  <Text style={[styles.actionBtnText, { color: theme.colors.brand.orange }]}>Motorista</Text>
                </Pressable>
              </View>
            </View>
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
  lineInfo: { flex: 1, gap: 2 },
  lineName: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.primary },
  lineRoute: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  actions: { flexDirection: "row", gap: theme.spacing.sm },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: theme.spacing.sm, paddingVertical: 6, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border.default },
  actionBtnText: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.brand.navy },
  actionBtnDisabled: { opacity: 0.5 },
});
