import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import { apiService } from "../../../services/api";
import { ApiEndpoints } from "../../../constants/api";
import { getSession } from "../../../services/session";
import { createPrivateConversation } from "../../../services/chat";
import { useRouter } from "expo-router";

interface EventRequest {
  id: string;
  creatorId: string;
  creatorName?: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime?: string;
  originCity: string;
  destination: string;
  interestedCount: number;
  status: string;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function MarketplaceEventsScreen() {
  const router = useRouter();
  const [role, setRole] = useState<"DRIVER" | "PASSENGER" | undefined>();
  const [userId, setUserId] = useState("");
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [myRequests, setMyRequests] = useState<EventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Form
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("22:00");
  const [originCity, setOriginCity] = useState("");
  const [destination, setDestination] = useState("");
  const [initialCount, setInitialCount] = useState("1");

  const load = useCallback(async () => {
    setLoading(true);
    const session = await getSession();
    setRole(session?.userRole);
    setUserId(session?.userId ?? "");
    try {
      const [allRes, myRes] = await Promise.all([
        apiService.get<any>(ApiEndpoints.LIST_EVENT_REQUESTS),
        apiService.get<any>(ApiEndpoints.LIST_MY_EVENT_REQUESTS),
      ]);
      if (allRes.data?.success) setRequests(allRes.data.requests ?? []);
      if (myRes.data?.success) setMyRequests(myRes.data.requests ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCreate = async () => {
    if (!eventName.trim() || !eventDate || !originCity.trim() || !destination.trim()) {
      Alert.alert("Atenção", "Preencha todos os campos obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiService.post<any>(ApiEndpoints.CREATE_EVENT_REQUEST, {
        eventName: eventName.trim(), eventDate, startTime, endTime,
        originCity: originCity.trim(), destination: destination.trim(),
        initialCount: parseInt(initialCount) || 1,
      });
      if (res.data?.success) {
        setShowCreateModal(false);
        setEventName(""); setEventDate(""); setOriginCity(""); setDestination(""); setInitialCount("1");
        load();
        Alert.alert("Demanda publicada!", "Motoristas poderão ver e entrar em contato.");
      } else {
        Alert.alert("Erro", res.data?.error?.message ?? "Não foi possível publicar.");
      }
    } catch (e: any) { Alert.alert("Erro", e?.response?.data?.error?.message ?? "Falha."); }
    setSaving(false);
  };

  const handleInterest = async (req: EventRequest) => {
    setActionId(req.id);
    try {
      const url = ApiEndpoints.ADD_EVENT_INTEREST.replace(":id", req.id);
      const res = await apiService.post<any>(url);
      if (res.data?.success) {
        setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, interestedCount: res.data.interestedCount } : r));
        Alert.alert("Interesse registrado!", `Total de interessados: ${res.data.interestedCount}`);
      } else {
        Alert.alert("Aviso", res.data?.error?.message ?? "Não foi possível registrar interesse.");
      }
    } catch (e: any) { Alert.alert("Erro", e?.response?.data?.error?.message ?? "Falha."); }
    setActionId(null);
  };

  const handleContact = async (req: EventRequest) => {
    if (!userId) return;
    setActionId(req.id);
    try {
      const result = await createPrivateConversation({ passengerId: req.creatorId, driverId: userId, context: "event" }) as any;
      if (result?.success && result.conversation?.id) {
        router.push(`/(app)/(driver)/chat/${result.conversation.id}` as any);
      }
    } catch { /* silent */ }
    setActionId(null);
  };

  const handleClose = async (req: EventRequest) => {
    try {
      const url = ApiEndpoints.CLOSE_EVENT_REQUEST.replace(":id", req.id);
      await apiService.patch(url);
      load();
    } catch { /* silent */ }
  };

  const displayList = tab === "mine" ? myRequests : requests;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.brand.orange} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Eventos</Text>
          <Text style={styles.subtitle}>Transporte para shows, jogos e eventos</Text>
        </View>
        {role === "PASSENGER" && (
          <Pressable style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Criar</Text>
          </Pressable>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === "all" && styles.tabActive]} onPress={() => setTab("all")}>
          <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>Todas</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === "mine" && styles.tabActive]} onPress={() => setTab("mine")}>
          <Text style={[styles.tabText, tab === "mine" && styles.tabTextActive]}>Minhas</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {displayList.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="ticket-outline" size={48} color={theme.colors.text.muted} style={{ opacity: 0.4, marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>{tab === "mine" ? "Nenhuma demanda criada" : "Nenhum evento aberto"}</Text>
            <Text style={styles.emptyText}>
              {tab === "mine" ? "Crie uma demanda para encontrar transporte para seu evento." : "Seja o primeiro a publicar uma demanda de transporte!"}
            </Text>
          </View>
        ) : (
          displayList.map((req) => (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.eventName} numberOfLines={1}>{req.eventName}</Text>
                  <Text style={styles.eventLocation}>{req.destination}</Text>
                </View>
                <View style={[styles.dateBadge, req.status === "closed" && styles.closedBadge]}>
                  <Text style={[styles.dateText, req.status === "closed" && styles.closedText]}>
                    {req.status === "closed" ? "Encerrada" : formatDate(req.eventDate)}
                  </Text>
                </View>
              </View>

              <View style={styles.details}>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={14} color={theme.colors.text.muted} />
                  <Text style={styles.detailText}>{req.startTime}{req.endTime ? ` às ${req.endTime}` : ""}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={14} color={theme.colors.text.muted} />
                  <Text style={styles.detailText}>Saída de {req.originCity}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="people-outline" size={14} color={theme.colors.brand.orange} />
                  <Text style={[styles.detailText, { color: theme.colors.brand.orange, fontWeight: "700" }]}>
                    {req.interestedCount} interessado(s)
                  </Text>
                </View>
                {req.creatorName && (
                  <View style={styles.detailRow}>
                    <Ionicons name="person-outline" size={14} color={theme.colors.text.muted} />
                    <Text style={styles.detailText}>Publicado por {req.creatorName}</Text>
                  </View>
                )}
              </View>

              {req.status === "open" && (
                <View style={styles.actions}>
                  {role === "PASSENGER" && req.creatorId !== userId && (
                    <Pressable
                      style={[styles.interestBtn, actionId === req.id && { opacity: 0.6 }]}
                      onPress={() => handleInterest(req)}
                      disabled={actionId === req.id}
                    >
                      {actionId === req.id ? <ActivityIndicator size="small" color={theme.colors.brand.orange} /> : (
                        <><Ionicons name="hand-right-outline" size={16} color={theme.colors.brand.orange} /><Text style={styles.interestBtnText}>Quero ir também</Text></>
                      )}
                    </Pressable>
                  )}
                  {role === "DRIVER" && (
                    <Pressable
                      style={[styles.contactBtn, actionId === req.id && { opacity: 0.6 }]}
                      onPress={() => handleContact(req)}
                      disabled={actionId === req.id}
                    >
                      {actionId === req.id ? <ActivityIndicator size="small" color="#fff" /> : (
                        <><Ionicons name="chatbubble-outline" size={16} color="#fff" /><Text style={styles.contactBtnText}>Oferecer transporte</Text></>
                      )}
                    </Pressable>
                  )}
                  {role === "PASSENGER" && req.creatorId === userId && (
                    <Pressable style={styles.closeBtn} onPress={() => handleClose(req)}>
                      <Text style={styles.closeBtnText}>Encerrar demanda</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal criar demanda */}
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Nova demanda de evento</Text>

              <Text style={styles.inputLabel}>Nome do evento *</Text>
              <TextInput style={styles.input} value={eventName} onChangeText={setEventName} placeholder="Ex: Jogo do Corinthians" placeholderTextColor={theme.colors.text.muted} />

              <Text style={styles.inputLabel}>Data do evento (YYYY-MM-DD) *</Text>
              <TextInput style={styles.input} value={eventDate} onChangeText={setEventDate} placeholder="2026-12-25" placeholderTextColor={theme.colors.text.muted} />

              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.inputLabel}>Início</Text>
                  <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="16:00" placeholderTextColor={theme.colors.text.muted} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.inputLabel}>Término</Text>
                  <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="22:00" placeholderTextColor={theme.colors.text.muted} />
                </View>
              </View>

              <Text style={styles.inputLabel}>Cidade de partida *</Text>
              <TextInput style={styles.input} value={originCity} onChangeText={setOriginCity} placeholder="Ex: Caçapava" placeholderTextColor={theme.colors.text.muted} />

              <Text style={styles.inputLabel}>Local do evento *</Text>
              <TextInput style={styles.input} value={destination} onChangeText={setDestination} placeholder="Ex: Arena Corinthians, São Paulo" placeholderTextColor={theme.colors.text.muted} />

              <Text style={styles.inputLabel}>Amigos já confirmados (incluindo você)</Text>
              <TextInput style={styles.input} value={initialCount} onChangeText={setInitialCount} placeholder="1" placeholderTextColor={theme.colors.text.muted} keyboardType="numeric" />

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Publicar</Text>}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border.soft },
  title: { fontSize: theme.font.xl, fontWeight: "800", color: theme.colors.text.primary },
  subtitle: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.colors.brand.orange, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.pill },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: theme.font.sm },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: theme.colors.border.soft },
  tab: { flex: 1, paddingVertical: theme.spacing.md, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: theme.colors.brand.orange },
  tabText: { fontSize: theme.font.sm, fontWeight: "600", color: theme.colors.text.muted },
  tabTextActive: { color: theme.colors.brand.orange, fontWeight: "800" },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  empty: { alignItems: "center", paddingVertical: theme.spacing.xxl },
  emptyTitle: { fontSize: theme.font.lg, fontWeight: "700", color: theme.colors.text.primary, marginBottom: theme.spacing.sm, textAlign: "center" },
  emptyText: { fontSize: theme.font.sm, color: theme.colors.text.secondary, textAlign: "center" },
  card: { backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border.soft, ...theme.shadow.card },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: theme.spacing.md },
  cardInfo: { flex: 1 },
  eventName: { fontSize: theme.font.md, fontWeight: "800", color: theme.colors.text.primary },
  eventLocation: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  dateBadge: { backgroundColor: theme.colors.brand.orange + "15", paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.radius.pill },
  closedBadge: { backgroundColor: theme.colors.text.muted + "20" },
  dateText: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.brand.orange },
  closedText: { color: theme.colors.text.muted },
  details: { gap: theme.spacing.xs },
  detailRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  detailText: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  actions: { flexDirection: "row", gap: theme.spacing.md },
  interestBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm, borderWidth: 1.5, borderColor: theme.colors.brand.orange, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md },
  interestBtnText: { color: theme.colors.brand.orange, fontWeight: "700", fontSize: theme.font.sm },
  contactBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm, backgroundColor: theme.colors.brand.orange, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md },
  contactBtnText: { color: "#fff", fontWeight: "700", fontSize: theme.font.sm },
  closeBtn: { flex: 1, alignItems: "center", paddingVertical: theme.spacing.sm },
  closeBtnText: { fontSize: theme.font.sm, color: theme.colors.feedback.error, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: theme.colors.background.card, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, padding: theme.spacing.xl, gap: theme.spacing.md },
  modalTitle: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  inputLabel: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary },
  input: { borderWidth: 1.5, borderColor: theme.colors.border.default, borderRadius: theme.radius.md, padding: theme.spacing.md, fontSize: theme.font.md, color: theme.colors.text.primary, backgroundColor: theme.colors.background.screen },
  row: { flexDirection: "row", gap: theme.spacing.md },
  flex: { flex: 1, gap: theme.spacing.xs },
  modalActions: { flexDirection: "row", gap: theme.spacing.md },
  cancelBtn: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.pill, alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border.default },
  cancelText: { fontWeight: "700", color: theme.colors.text.secondary },
  saveBtn: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.pill, alignItems: "center", backgroundColor: theme.colors.brand.orange },
  saveText: { fontWeight: "700", color: "#fff" },
});
