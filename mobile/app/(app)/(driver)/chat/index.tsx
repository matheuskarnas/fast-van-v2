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
import { getDriverLines, type Line } from "../../../../services/driverLines";
import { getSession } from "../../../../services/session";
import {
  createPrivateConversation,
  getChatInbox,
  listLinePassengersForChat,
  type ChatInboxItem,
  type LinePassengerChat,
} from "../../../../services/chat";
import { UnreadBadge } from "../../../../components/chat/UnreadBadge";
import { useUnreadChatCount } from "../../../../hooks/useUnreadChatCount";

interface LinePassengersState {
  loading: boolean;
  passengers: LinePassengerChat[];
}

export default function DriverChatListScreen() {
  const router = useRouter();
  const { refresh: refreshBadge } = useUnreadChatCount();
  const [items, setItems] = useState<ChatInboxItem[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState("");
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [passengersByLine, setPassengersByLine] = useState<Record<string, LinePassengersState>>({});
  const [openingPassengerId, setOpeningPassengerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [session, linesRes, inboxRes] = await Promise.all([
        getSession(),
        getDriverLines(),
        getChatInbox(),
      ]);

      if (session?.userId) setDriverId(session.userId);
      if (linesRes.success) setLines(linesRes.lines ?? []);
      if (inboxRes.success) setItems(inboxRes.items ?? []);
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

  const openPrivateChat = async (passenger: LinePassengerChat) => {
    if (!driverId) return;
    setOpeningPassengerId(passenger.id);
    try {
      const result = (await createPrivateConversation({
        passengerId: passenger.id,
        driverId,
        context: "line",
      })) as any;

      if (result?.success && result.conversation?.id) {
        router.push({
          pathname: "/(app)/(driver)/chat/[id]",
          params: {
            id: result.conversation.id,
            otherUserName: passenger.name,
          },
        } as any);
      } else {
        Alert.alert("Erro", "Não foi possível abrir o chat com o passageiro.");
      }
    } catch {
      Alert.alert("Erro", "Não foi possível abrir o chat com o passageiro.");
    } finally {
      setOpeningPassengerId(null);
    }
  };

  const toggleLinePassengers = async (lineId: string) => {
    if (expandedLineId === lineId) {
      setExpandedLineId(null);
      return;
    }

    setExpandedLineId(lineId);

    if (passengersByLine[lineId]?.passengers?.length) return;

    setPassengersByLine((prev) => ({
      ...prev,
      [lineId]: { loading: true, passengers: [] },
    }));

    try {
      const result = await listLinePassengersForChat(lineId);
      setPassengersByLine((prev) => ({
        ...prev,
        [lineId]: {
          loading: false,
          passengers: result.success ? result.passengers ?? [] : [],
        },
      }));
    } catch {
      setPassengersByLine((prev) => ({
        ...prev,
        [lineId]: { loading: false, passengers: [] },
      }));
    }
  };

  const handleInboxPress = (item: ChatInboxItem) => {
    if (item.type === "group") {
      openGroupChat(item);
      return;
    }
    if (item.conversationId) {
      router.push({
        pathname: "/(app)/(driver)/chat/[id]",
        params: {
          id: item.conversationId,
          otherUserName: item.otherUserName || "Chat privado",
        },
      } as any);
    }
  };

  const renderInboxItem = ({ item }: { item: ChatInboxItem }) => {
    const isGroup = item.type === "group";
    const title = isGroup ? item.title : item.otherUserName;
    const subtitle = isGroup ? "Chat da linha" : "Chat privado";

    return (
      <Pressable style={styles.card} onPress={() => handleInboxPress(item)}>
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
          ) : null}
        </View>
        <UnreadBadge count={item.unreadCount} size="md" />
        <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
      </Pressable>
    );
  };

  const renderLinePassengers = (line: Line) => {
    const expanded = expandedLineId === line.id;
    const state = passengersByLine[line.id];

    return (
      <View key={`line-passengers-${line.id}`} style={styles.lineSection}>
        <Pressable style={styles.lineHeader} onPress={() => toggleLinePassengers(line.id)}>
          <View style={styles.lineHeaderInfo}>
            <Text style={styles.lineHeaderTitle} numberOfLines={1}>
              {line.name || line.originCity}
            </Text>
            <Text style={styles.lineHeaderSub}>
              {line.passengerCount ?? 0} passageiro(s) · toque para {expanded ? "fechar" : "ver"}
            </Text>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.colors.text.muted}
          />
        </Pressable>

        {expanded && (
          <View style={styles.passengerList}>
            {state?.loading ? (
              <ActivityIndicator size="small" color={theme.colors.brand.orange} style={{ padding: theme.spacing.md }} />
            ) : !state?.passengers?.length ? (
              <Text style={styles.emptyPassengers}>Nenhum passageiro nesta linha.</Text>
            ) : (
              state.passengers.map((passenger) => (
                <Pressable
                  key={passenger.id}
                  style={styles.passengerRow}
                  onPress={() => openPrivateChat(passenger)}
                  disabled={openingPassengerId === passenger.id}
                >
                  <View style={styles.passengerIcon}>
                    <Ionicons name="person-outline" size={18} color={theme.colors.brand.navy} />
                  </View>
                  <View style={styles.passengerInfo}>
                    <Text style={styles.passengerName}>{passenger.name}</Text>
                    {(passenger.departureTime || passenger.arrivalTime) && (
                      <Text style={styles.passengerSlot}>
                        Ida {passenger.departureTime || "—"} · Volta {passenger.arrivalTime || "—"}
                      </Text>
                    )}
                  </View>
                  {openingPassengerId === passenger.id ? (
                    <ActivityIndicator size="small" color={theme.colors.brand.orange} />
                  ) : (
                    <Ionicons name="chatbubble-outline" size={18} color={theme.colors.brand.orange} />
                  )}
                </Pressable>
              ))
            )}
          </View>
        )}
      </View>
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

      <FlatList
        data={items}
        keyExtractor={(item, index) =>
          item.type === "group"
            ? `group-${item.lineId}`
            : `private-${item.conversationId}-${index}`
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          items.length > 0 ? (
            <Text style={styles.sectionLabel}>Conversas</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
            <Text style={styles.emptyText}>
              Inicie um chat com um passageiro ou abra o chat da linha.
            </Text>
          </View>
        }
        renderItem={renderInboxItem}
        ListFooterComponent={
          lines.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.sectionLabel}>Iniciar chat privado</Text>
              {lines.map(renderLinePassengers)}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.soft,
  },
  title: { fontSize: theme.font.xl, fontWeight: "800", color: theme.colors.text.primary },
  list: { padding: theme.spacing.lg, gap: theme.spacing.sm, paddingBottom: theme.spacing.xxl },
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
  emptyBlock: { paddingVertical: theme.spacing.xl, alignItems: "center" },
  emptyTitle: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.primary },
  emptyText: { fontSize: theme.font.sm, color: theme.colors.text.secondary, textAlign: "center", marginTop: theme.spacing.sm },
  footer: { marginTop: theme.spacing.xl, gap: theme.spacing.sm },
  lineSection: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    overflow: "hidden",
    marginBottom: theme.spacing.sm,
  },
  lineHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  lineHeaderInfo: { flex: 1, gap: 2 },
  lineHeaderTitle: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.primary },
  lineHeaderSub: { fontSize: theme.font.xs, color: theme.colors.text.secondary },
  passengerList: { borderTopWidth: 1, borderTopColor: theme.colors.border.soft },
  emptyPassengers: {
    padding: theme.spacing.lg,
    fontSize: theme.font.sm,
    color: theme.colors.text.muted,
    textAlign: "center",
  },
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.soft,
  },
  passengerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.brand.navy + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  passengerInfo: { flex: 1, gap: 2 },
  passengerName: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.primary },
  passengerSlot: { fontSize: theme.font.xs, color: theme.colors.text.muted },
});
