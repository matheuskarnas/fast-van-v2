import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  createGroupChat,
  getGroupMessages,
  sendGroupMessage,
} from "../../../services/chat";
import { getSession } from "../../../services/session";
import { theme } from "../../../constants/theme";
import { MessageBubble } from "../../../components/chat/MessageBubble";
import { ChatComposer } from "../../../components/chat/ChatComposer";
import { apiService } from "../../../services/api";
import { ApiEndpoints } from "../../../constants/api";

interface PollOption { id: string; text: string; votes: string[] }
interface Poll { id: string; question: string; options: PollOption[]; creatorId: string; closed: boolean }

export default function ChatGroupScreen() {
  const { lineId, lineName } = useLocalSearchParams<{ lineId: string; lineName?: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [polls, setPolls] = useState<Record<string, Poll>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [role, setRole] = useState<"DRIVER" | "PASSENGER" | undefined>();
  const [userId, setUserId] = useState("");

  // Poll modal state
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [creatingPoll, setCreatingPoll] = useState(false);

  const load = useCallback(async () => {
    if (!lineId) return;
    setLoading(true);
    try {
      const session = await getSession();
      setRole(session?.userRole);
      setUserId(session?.userId ?? "");

      // Auto-cria grupo se não existir
      if (session?.userRole === "DRIVER") {
        await createGroupChat({ lineId }).catch(() => {});
      }

      const result = await getGroupMessages(lineId, true);
      if (result.success) {
        setMessages(result.messages ?? []);
        // Indexa polls
        const pollMap: Record<string, Poll> = {};
        (result.polls ?? []).forEach((p: Poll) => { pollMap[p.id] = p; });
        setPolls(pollMap);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [lineId]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    if (!message.trim() || !lineId) return;
    setSending(true);
    const text = message.trim();
    setMessage("");
    try {
      const result = await sendGroupMessage(lineId, text);
      if (result?.success && result.message) {
        setMessages((prev) => [...prev, result.message]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch { /* silent */ }
    setSending(false);
  };

  const handleCreatePoll = async () => {
    const opts = pollOptions.filter((o) => o.trim());
    if (!pollQuestion.trim() || opts.length < 2) {
      Alert.alert("Atenção", "Informe a pergunta e pelo menos 2 opções.");
      return;
    }
    setCreatingPoll(true);
    try {
      const url = ApiEndpoints.CREATE_POLL.replace(":lineId", lineId!);
      const res = await apiService.post<{ success: boolean; poll?: Poll; error?: any }>(url, {
        question: pollQuestion.trim(),
        options: opts,
      });
      if (res.data.success && res.data.poll) {
        setPolls((prev) => ({ ...prev, [res.data.poll!.id]: res.data.poll! }));
        await load(); // reload to get poll message
        setShowPollModal(false);
        setPollQuestion("");
        setPollOptions(["", ""]);
      } else {
        Alert.alert("Erro", res.data.error?.message ?? "Não foi possível criar a enquete.");
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.error?.message ?? "Falha ao criar enquete.");
    }
    setCreatingPoll(false);
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      const url = ApiEndpoints.VOTE_POLL.replace(":lineId", lineId!).replace(":pollId", pollId);
      const res = await apiService.post<{ success: boolean; poll?: Poll }>(url, { optionId });
      if (res.data.success && res.data.poll) {
        setPolls((prev) => ({ ...prev, [pollId]: res.data.poll! }));
      }
    } catch { /* silent */ }
  };

  const renderMessage = ({ item }: { item: any }) => {
    if (item.type === "poll") {
      const poll = polls[item.pollId];
      if (!poll) return null;
      const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0);
      const myVote = poll.options.find((o) => o.votes.includes(userId));
      return (
        <View style={styles.pollCard}>
          <View style={styles.pollHeader}>
            <Ionicons name="bar-chart-outline" size={16} color={theme.colors.brand.navy} />
            <Text style={styles.pollTitle}>Enquete</Text>
          </View>
          <Text style={styles.pollQuestion}>{poll.question}</Text>
          {poll.options.map((opt) => {
            const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
            const voted = myVote?.id === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.pollOption, voted && styles.pollOptionVoted]}
                onPress={() => handleVote(poll.id, opt.id)}
              >
                <View style={[styles.pollBar, { width: `${pct}%` as any }]} />
                <Text style={[styles.pollOptionText, voted && styles.pollOptionTextVoted]}>{opt.text}</Text>
                <Text style={styles.pollPct}>{pct}%</Text>
              </Pressable>
            );
          })}
          <Text style={styles.pollTotal}>
            {totalVotes} voto(s){myVote ? " · toque em outra opção para alterar" : ""}
          </Text>
        </View>
      );
    }

    return (
      <MessageBubble
        sender={
          item.senderId === userId
            ? "Você"
            : item.senderName || item.senderId
        }
        text={item.text}
        time={item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined}
        variant={item.senderId === userId ? "outgoing" : "incoming"}
      />
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
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{lineName || "Chat do grupo"}</Text>
          <Text style={styles.headerSub}>Grupo da linha</Text>
        </View>
        {role === "DRIVER" && (
          <Pressable style={styles.pollBtn} onPress={() => setShowPollModal(true)}>
            <Ionicons name="bar-chart-outline" size={22} color={theme.colors.brand.orange} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={renderMessage}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.text.muted} />
              <Text style={styles.emptyText}>Nenhuma mensagem ainda. Diga olá!</Text>
            </View>
          }
        />
        <ChatComposer
          value={message}
          onChangeText={setMessage}
          onSend={handleSend}
          sendLabel={sending ? "..." : "→"}
          disabled={sending}
          placeholder="Mensagem para o grupo..."
        />
      </KeyboardAvoidingView>

      {/* Modal de criação de enquete (RF29) */}
      <Modal visible={showPollModal} animationType="slide" transparent onRequestClose={() => setShowPollModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nova enquete</Text>

            <Text style={styles.inputLabel}>Pergunta</Text>
            <TextInput
              style={styles.input}
              value={pollQuestion}
              onChangeText={setPollQuestion}
              placeholder="Ex: Podemos sair 30 min mais cedo na sexta?"
              placeholderTextColor={theme.colors.text.muted}
              multiline
            />

            <Text style={styles.inputLabel}>Opções (2 a 4)</Text>
            {pollOptions.map((opt, i) => (
              <View key={i} style={styles.optionRow}>
                <TextInput
                  style={[styles.input, styles.optionInput]}
                  value={opt}
                  onChangeText={(v) => {
                    const copy = [...pollOptions];
                    copy[i] = v;
                    setPollOptions(copy);
                  }}
                  placeholder={`Opção ${i + 1}`}
                  placeholderTextColor={theme.colors.text.muted}
                />
                {pollOptions.length > 2 && (
                  <Pressable onPress={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.feedback.error} />
                  </Pressable>
                )}
              </View>
            ))}
            {pollOptions.length < 4 && (
              <Pressable style={styles.addOptionBtn} onPress={() => setPollOptions([...pollOptions, ""])}>
                <Ionicons name="add-circle-outline" size={16} color={theme.colors.brand.orange} />
                <Text style={styles.addOptionText}>Adicionar opção</Text>
              </Pressable>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowPollModal(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, creatingPoll && { opacity: 0.6 }]} onPress={handleCreatePoll} disabled={creatingPoll}>
                {creatingPoll ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Criar enquete</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border.soft, gap: theme.spacing.md },
  backBtn: { padding: theme.spacing.xs },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: theme.font.md, fontWeight: "800", color: theme.colors.text.primary },
  headerSub: { fontSize: theme.font.xs, color: theme.colors.text.secondary },
  pollBtn: { padding: theme.spacing.xs },
  messageList: { padding: theme.spacing.lg, gap: theme.spacing.sm, paddingBottom: theme.spacing.xl },
  empty: { flex: 1, alignItems: "center", paddingTop: 60, gap: theme.spacing.md },
  emptyText: { fontSize: theme.font.sm, color: theme.colors.text.muted, textAlign: "center" },
  // Poll message
  pollCard: { backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.brand.navy + "30", marginVertical: theme.spacing.xs },
  pollHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  pollTitle: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.brand.navy, textTransform: "uppercase" },
  pollQuestion: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.primary },
  pollOption: { borderRadius: theme.radius.md, overflow: "hidden", borderWidth: 1.5, borderColor: theme.colors.border.default, padding: theme.spacing.md, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, position: "relative" },
  pollOptionVoted: { borderColor: theme.colors.brand.navy },
  pollBar: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: theme.colors.brand.navy + "15", borderRadius: theme.radius.md },
  pollOptionText: { flex: 1, fontSize: theme.font.sm, color: theme.colors.text.primary },
  pollOptionTextVoted: { fontWeight: "700", color: theme.colors.brand.navy },
  pollPct: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.text.secondary },
  pollTotal: { fontSize: theme.font.xs, color: theme.colors.text.muted },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: theme.colors.background.card, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, padding: theme.spacing.xl, gap: theme.spacing.md },
  modalTitle: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  inputLabel: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary },
  input: { borderWidth: 1.5, borderColor: theme.colors.border.default, borderRadius: theme.radius.md, padding: theme.spacing.md, fontSize: theme.font.md, color: theme.colors.text.primary, backgroundColor: theme.colors.background.screen },
  optionRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  optionInput: { flex: 1 },
  addOptionBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  addOptionText: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.brand.orange },
  modalActions: { flexDirection: "row", gap: theme.spacing.md },
  cancelBtn: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.pill, alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border.default },
  cancelBtnText: { fontWeight: "700", color: theme.colors.text.secondary },
  saveBtn: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.pill, alignItems: "center", backgroundColor: theme.colors.brand.orange },
  saveBtnText: { fontWeight: "700", color: "#fff" },
});
