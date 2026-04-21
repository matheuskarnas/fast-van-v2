import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  getPrivateMessages,
  markPrivateMessagesAsRead,
  sendPrivateMessage,
} from "../../../../services/chat";
import { getSession } from "../../../../services/session";
import { theme } from "../../../../constants/theme";
import { ChatComposer } from "../../../../components/chat/ChatComposer";
import { ChatTopBar } from "../../../../components/chat/ChatTopBar";
import { MessageBubble } from "../../../../components/chat/MessageBubble";

export default function DriverChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const conversationId = typeof id === "string" ? id : String(id?.[0] ?? "");
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState("");

  const conversationLabel = useMemo(
    () => `Conversa ${conversationId || "privada"}`,
    [conversationId],
  );

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPrivateMessages(conversationId);
      if (result.success) {
        setMessages(result.messages ?? []);
        await markPrivateMessagesAsRead(conversationId);
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const bootstrap = async () => {
      const session = await getSession();
      setUserId(session?.userId ?? "");
    };

    bootstrap();
    loadMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [conversationId, loadMessages]);

  const handleSend = async () => {
    if (!text.trim()) {
      return;
    }

    setSending(true);
    try {
      const result = await sendPrivateMessage(conversationId, text.trim());
      if (result.success) {
        setText("");
        await loadMessages();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ChatTopBar
        title={conversationLabel}
        subtitle="Chat privado com o motorista"
        statusLabel="AGUARDANDO RESPOSTA"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.brand.orangeDark} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MessageBubble
              sender={item.senderId === userId ? "Você" : item.senderId}
              text={item.text}
              time={
                item.timestamp
                  ? new Date(item.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : undefined
              }
              variant={item.senderId === userId ? "outgoing" : "incoming"}
            />
          )}
        />
      )}

      <ChatComposer
        value={text}
        onChangeText={setText}
        onSend={handleSend}
        sendLabel={sending ? "..." : "→"}
        disabled={sending}
        placeholder="Mensagem"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messages: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
});
