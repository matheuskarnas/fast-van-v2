import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { getSession } from "../../../../services/session";
import {
  createPrivateConversation,
  getChatInbox,
  type ChatInboxItem,
} from "../../../../services/chat";
import { UnreadBadge } from "../../../../components/chat/UnreadBadge";
import { useUnreadChatCount } from "../../../../hooks/useUnreadChatCount";

export default function PassengerChatListScreen() {
  const router = useRouter();
  const { refresh: refreshBadge } = useUnreadChatCount();
  const [items, setItems] = useState<ChatInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [passengerId, setPassengerId] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (session?.userId) setPassengerId(session.userId);

      const result = await getChatInbox();
      if (result.success) {
        setItems(result.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      refreshBadge();
    }, [load, refreshBadge]),
  );

  const openGroupChat = (item: ChatInboxItem) => {
    if (!item.lineId) return;
    router.push({
      pathname: "/(app)/shared/chat-group",
      params: { lineId: item.lineId, lineName: item.title || item.lineName },
    } as any);
  };

  const openPrivateChat = async (item: ChatInboxItem) => {
    if (!passengerId || !item.otherUserId) return;

    if (item.conversationId) {
      router.push({
        pathname: "/(app)/(passenger)/chat/[id]",
        params: {
          id: item.conversationId,
          otherUserName: item.otherUserName || "Motorista",
        },
      } as any);
      return;
    }

    setOpeningId(item.otherUserId);
    try {
      const result = (await createPrivateConversation({
        passengerId,
        driverId: item.otherUserId,
        context: "line",
      })) as any;

      if (result?.success && result.conversation?.id) {
        router.push({
          pathname: "/(app)/(passenger)/chat/[id]",
          params: {
            id: result.conversation.id,
            otherUserName: item.otherUserName || "Motorista",
          },
        } as any);
      } else {
        Alert.alert("Erro", "Não foi possível abrir o chat com o motorista.");
      }
    } catch {
      Alert.alert("Erro", "Não foi possível abrir o chat com o motorista.");
    } finally {
      setOpeningId(null);
    }
  };

  const handlePress = (item: ChatInboxItem) => {
    if (item.type === "group") {
      openGroupChat(item);
      return;
    }
    openPrivateChat(item);
  };

  const renderItem = ({ item }: { item: ChatInboxItem }) => {
    const isGroup = item.type === "group";
    const title = isGroup ? item.title : item.otherUserName;
    const subtitle = isGroup
      ? "Chat da linha"
      : item.lineName || item.subtitle || "Chat privado";
    const opening = !isGroup && openingId === item.otherUserId;

    return (
      <Pressable
        style={styles.card}
        onPress={() => handlePress(item)}
        disabled={opening}
      >
        <View style={[styles.iconWrap, isGroup ? styles.iconGroup : styles.iconPrivate]}>
          <Ionicons
            name={isGroup ? "people" : "person"}
            size={20}
            color={isGroup ? theme.colors.brand.orange : theme.colors.brand.navy}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          {item.lastMessage ? (
            <Text style={styles.preview} numberOfLines={1}>{item.lastMessage}</Text>
          ) : item.isNew ? (
            <Text style={styles.previewNew}>Toque para iniciar conversa</Text>
          ) : null}
        </View>
        {opening ? (
          <ActivityIndicator size="small" color={theme.colors.brand.orange} />
        ) : (
          <UnreadBadge count={item.unreadCount} size="md" />
        )}
        <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
      </Pressable>
    );
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

      {items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="chatbubbles-outline"
            size={56}
            color={theme.colors.text.muted}
            style={{ opacity: 0.4, marginBottom: 16 }}
          />
          <Text style={styles.emptyTitle}>Nenhuma conversa</Text>
          <Text style={styles.emptyText}>
            Entre em uma linha para acessar o chat do grupo e falar com o motorista.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) =>
            item.type === "group"
              ? `group-${item.lineId}`
              : `private-${item.conversationId || item.otherUserId}-${index}`
          }
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.sectionLabel}>Conversas</Text>}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.xl },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.soft,
  },
  title: { fontSize: theme.font.xl, fontWeight: "800", color: theme.colors.text.primary },
  emptyTitle: {
    fontSize: theme.font.lg,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  emptyText: { fontSize: theme.font.sm, color: theme.colors.text.secondary, textAlign: "center" },
  list: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  sectionLabel: {
    fontSize: theme.font.xs,
    fontWeight: "700",
    color: theme.colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },
  card: {
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGroup: { backgroundColor: theme.colors.brand.orange + "15" },
  iconPrivate: { backgroundColor: theme.colors.brand.navy + "15" },
  info: { flex: 1, gap: 2 },
  name: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.primary },
  subtitle: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  preview: { fontSize: theme.font.xs, color: theme.colors.text.muted, marginTop: 2 },
  previewNew: { fontSize: theme.font.xs, color: theme.colors.brand.orange, marginTop: 2 },
});
