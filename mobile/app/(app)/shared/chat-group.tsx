import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  addGroupMember,
  createGroupChat,
  getGroupMessages,
  sendGroupMessage,
} from "../../../services/chat";
import { getSession } from "../../../services/session";
import { theme } from "../../../constants/theme";
import { ChatComposer } from "../../../components/chat/ChatComposer";
import { ChatTopBar } from "../../../components/chat/ChatTopBar";
import { MessageBubble } from "../../../components/chat/MessageBubble";

export default function ChatGroupScreen() {
  const [lineId, setLineId] = useState("");
  const [message, setMessage] = useState("");
  const [memberId, setMemberId] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [role, setRole] = useState<"DRIVER" | "PASSENGER" | undefined>();
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const bootstrap = async () => {
      const session = await getSession();
      setRole(session?.userRole);
      setUserId(session?.userId ?? "");
    };

    bootstrap();
  }, []);

  const loadMessages = async () => {
    if (!lineId.trim()) {
      return;
    }

    setLoading(true);
    try {
      const result = await getGroupMessages(lineId.trim(), true);
      if (result.success) {
        setMessages(result.messages ?? []);
      } else {
        Alert.alert(
          "Não foi possível carregar o grupo",
          result?.error?.message ||
            "Verifique o ID da linha e tente novamente.",
        );
      }
    } catch {
      Alert.alert(
        "Grupo indisponível",
        "Não foi possível carregar as mensagens do grupo. Verifique o ID da linha e sua conexão.",
      );
    } finally {
      setLoading(false);
    }
  };

  const createOrRefreshGroup = async () => {
    if (!lineId.trim()) {
      Alert.alert(
        "ID da linha obrigatório",
        "Informe o ID da linha para abrir ou criar o chat do grupo.",
      );
      return;
    }

    const session = await getSession();
    if (!session?.userId) {
      Alert.alert(
        "Sessão expirada",
        "Sua sessão expirou. Faça login novamente para continuar.",
      );
      return;
    }

    if (role === "DRIVER") {
      const result = await createGroupChat({ lineId: lineId.trim() });
      if (!result?.success) {
        Alert.alert(
          "Não foi possível criar o grupo",
          result?.error?.message ||
            "Verifique os dados da linha e tente novamente.",
        );
        return;
      }
    }

    await loadMessages();
  };

  const handleAddMember = async () => {
    if (role !== "DRIVER") {
      Alert.alert(
        "Ação não permitida",
        "Somente motoristas podem adicionar membros ao grupo da linha.",
      );
      return;
    }

    if (!memberId.trim() || !lineId.trim()) {
      Alert.alert(
        "Dados incompletos",
        "Informe o ID da linha e o ID do passageiro para adicionar um membro.",
      );
      return;
    }

    const result = await addGroupMember(
      lineId.trim(),
      memberId.trim(),
      "PASSENGER",
    );
    if (result?.success) {
      Alert.alert(
        "Membro adicionado",
        "O passageiro foi adicionado ao grupo com sucesso.",
      );
      return;
    }

    Alert.alert(
      "Não foi possível adicionar membro",
      result?.error?.message ||
        "Verifique os IDs informados e tente novamente.",
    );
  };

  const handleSend = async () => {
    if (!lineId.trim() || !message.trim()) {
      return;
    }

    setSending(true);
    try {
      const result = await sendGroupMessage(lineId.trim(), message.trim());
      if (result.success) {
        setMessage("");
        await loadMessages();
      } else {
        Alert.alert(
          "Não foi possível enviar",
          result?.error?.message ||
            "Não foi possível enviar a mensagem para o grupo.",
        );
      }
    } catch {
      Alert.alert(
        "Falha de conexão",
        "Não foi possível enviar a mensagem por falta de conexão. Tente novamente.",
      );
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
        title={lineId.trim() ? `Linha ${lineId.trim()}` : "Chat do grupo"}
        subtitle="Conversa da linha em tempo real"
        statusLabel={role === "DRIVER" ? "MOTORISTA" : "PASSAGEIRO"}
      />
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Aguardando mensagens do grupo</Text>
            <Text style={styles.subtitle}>
              Use o código da linha para carregar ou criar o grupo da viagem.
            </Text>

            <TextInput
              placeholder="ID da linha"
              value={lineId}
              onChangeText={setLineId}
              style={styles.input}
              placeholderTextColor={theme.colors.text.muted}
            />

            <View style={styles.actionsRow}>
              <Pressable style={styles.button} onPress={createOrRefreshGroup}>
                <Text style={styles.buttonText}>
                  {role === "DRIVER" ? "Criar/abrir grupo" : "Carregar grupo"}
                </Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={loadMessages}>
                <Text style={styles.secondaryButtonText}>Atualizar</Text>
              </Pressable>
            </View>

            {role === "DRIVER" ? (
              <View style={styles.memberBox}>
                <Text style={styles.sectionTitle}>Gerenciar membros</Text>
                <TextInput
                  placeholder="ID do passageiro"
                  value={memberId}
                  onChangeText={setMemberId}
                  style={styles.input}
                  placeholderTextColor={theme.colors.text.muted}
                />
                <Pressable
                  style={styles.secondaryButton}
                  onPress={handleAddMember}
                >
                  <Text style={styles.secondaryButtonText}>
                    Adicionar ao grupo
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {loading ? (
              <ActivityIndicator
                style={{ marginTop: 8 }}
                color={theme.colors.brand.orangeDark}
              />
            ) : null}
          </View>
        }
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
      <ChatComposer
        value={message}
        onChangeText={setMessage}
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
  list: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: 12,
  },
  header: {
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.text.brand,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.brand,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.input,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.input,
    color: theme.colors.text.primary,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    backgroundColor: theme.colors.brand.orange,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: theme.colors.background.muted,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  buttonText: {
    color: theme.colors.text.primary,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: theme.colors.text.brand,
    fontWeight: "700",
  },
  memberBox: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
  },
});
