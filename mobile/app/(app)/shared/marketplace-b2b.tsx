import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

interface B2bRequest {
  id: string;
  companyId: string;
  companyName?: string;
  destination: string;
  originCity: string;
  arrivalTime: string;
  departureTime: string;
  passengerCount: number;
  daysOfWeek: string;
  notes?: string;
  status: string;
}

const DAYS_MAP: Record<string, string> = { seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom" };
function formatDays(days: string) { return days.split(",").map((d) => DAYS_MAP[d.trim()] ?? d).join(" • "); }

export default function MarketplaceB2bScreen() {
  const router = useRouter();
  const [role, setRole] = useState<"DRIVER" | "PASSENGER" | undefined>();
  const [userId, setUserId] = useState("");
  const [requests, setRequests] = useState<B2bRequest[]>([]);
  const [myRequests, setMyRequests] = useState<B2bRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openingChat, setOpeningChat] = useState<string | null>(null);

  // Form state
  const [destination, setDestination] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [arrivalTime, setArrivalTime] = useState("09:00");
  const [departureTime, setDepartureTime] = useState("18:00");
  const [passengerCount, setPassengerCount] = useState("10");
  const [daysOfWeek, setDaysOfWeek] = useState("seg,ter,qua,qui,sex");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const session = await getSession();
    setRole(session?.userRole);
    setUserId(session?.userId ?? "");

    try {
      if (session?.userRole === "DRIVER") {
        const res = await apiService.get<{ success: boolean; requests: B2bRequest[] }>(ApiEndpoints.LIST_B2B_REQUESTS);
        if ((res.data as any).success) setRequests((res.data as any).requests ?? []);
      } else {
        const [openRes, myRes] = await Promise.all([
          apiService.get<{ success: boolean; requests: B2bRequest[] }>(ApiEndpoints.LIST_B2B_REQUESTS),
          apiService.get<{ success: boolean; requests: B2bRequest[] }>(ApiEndpoints.LIST_MY_B2B_REQUESTS),
        ]);
        if ((openRes.data as any).success) setRequests((openRes.data as any).requests ?? []);
        if ((myRes.data as any).success) setMyRequests((myRes.data as any).requests ?? []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCreate = async () => {
    if (!destination.trim() || !originCity.trim()) { Alert.alert("Atenção", "Destino e cidade são obrigatórios."); return; }
    setSaving(true);
    try {
      const res = await apiService.post<{ success: boolean; error?: any }>(ApiEndpoints.CREATE_B2B_REQUEST, {
        destination: destination.trim(), originCity: originCity.trim(),
        arrivalTime, departureTime,
        passengerCount: parseInt(passengerCount) || 10,
        daysOfWeek, notes: notes.trim() || undefined,
      });
      if ((res.data as any).success) {
        setShowCreateModal(false);
        setDestination(""); setOriginCity(""); setNotes("");
        load();
        Alert.alert("Solicitação publicada!", "Motoristas disponíveis poderão entrar em contato.");
      } else {
        Alert.alert("Erro", (res.data as any).error?.message ?? "Não foi possível publicar.");
      }
    } catch (e: any) { Alert.alert("Erro", e?.response?.data?.error?.message ?? "Falha ao publicar."); }
    setSaving(false);
  };

  const handleContactDriver = async (req: B2bRequest) => {
    if (!userId) return;
    setOpeningChat(req.id);
    try {
      const result = await createPrivateConversation({ passengerId: userId, driverId: req.companyId, context: "b2b" }) as any;
      if (result?.success && result.conversation?.id) {
        router.push(`/(app)/(driver)/chat/${result.conversation.id}` as any);
      }
    } catch { /* silent */ }
    setOpeningChat(null);
  };

  const handleCloseRequest = async (req: B2bRequest) => {
    try {
      const url = ApiEndpoints.UPDATE_B2B_REQUEST.replace(":id", req.id);
      await apiService.patch(url, { status: "closed" });
      load();
    } catch { /* silent */ }
  };

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
          <Text style={styles.title}>Marketplace B2B</Text>
          <Text style={styles.subtitle}>Solicitações de transporte empresarial</Text>
        </View>
        {role === "PASSENGER" && (
          <Pressable style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Publicar</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Minhas solicitações (empresa) */}
        {role === "PASSENGER" && myRequests.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Minhas solicitações</Text>
            {myRequests.map((req) => (
              <RequestCard key={req.id} req={req} role="PASSENGER" onClose={() => handleCloseRequest(req)} />
            ))}
          </>
        )}

        {/* Solicitações abertas */}
        <Text style={styles.sectionTitle}>
          {role === "DRIVER" ? "Oportunidades disponíveis" : "Todas as solicitações"}
        </Text>
        {requests.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={48} color={theme.colors.text.muted} style={{ opacity: 0.4, marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Nenhuma solicitação aberta</Text>
            <Text style={styles.emptyText}>
              {role === "DRIVER" ? "Não há empresas buscando transporte agora." : "Seja a primeira a publicar uma solicitação!"}
            </Text>
          </View>
        ) : (
          requests.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              role={role}
              onContact={role === "DRIVER" ? () => handleContactDriver(req) : undefined}
              contactLoading={openingChat === req.id}
            />
          ))
        )}
      </ScrollView>

      {/* Modal criar solicitação */}
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Nova solicitação B2B</Text>

              <Text style={styles.inputLabel}>Destino (endereço da empresa) *</Text>
              <TextInput style={styles.input} value={destination} onChangeText={setDestination} placeholder="Ex: Av. Industrial, 500 - São José dos Campos" placeholderTextColor={theme.colors.text.muted} />

              <Text style={styles.inputLabel}>Cidade de origem dos funcionários *</Text>
              <TextInput style={styles.input} value={originCity} onChangeText={setOriginCity} placeholder="Ex: Caçapava" placeholderTextColor={theme.colors.text.muted} />

              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.inputLabel}>Chegada na empresa</Text>
                  <TextInput style={styles.input} value={arrivalTime} onChangeText={setArrivalTime} placeholder="09:00" placeholderTextColor={theme.colors.text.muted} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.inputLabel}>Saída da empresa</Text>
                  <TextInput style={styles.input} value={departureTime} onChangeText={setDepartureTime} placeholder="18:00" placeholderTextColor={theme.colors.text.muted} />
                </View>
              </View>

              <Text style={styles.inputLabel}>Número de funcionários</Text>
              <TextInput style={styles.input} value={passengerCount} onChangeText={setPassengerCount} placeholder="10" placeholderTextColor={theme.colors.text.muted} keyboardType="numeric" />

              <Text style={styles.inputLabel}>Dias da semana</Text>
              <TextInput style={styles.input} value={daysOfWeek} onChangeText={setDaysOfWeek} placeholder="seg,ter,qua,qui,sex" placeholderTextColor={theme.colors.text.muted} autoCapitalize="none" />

              <Text style={styles.inputLabel}>Observações (opcional)</Text>
              <TextInput style={[styles.input, { minHeight: 60 }]} value={notes} onChangeText={setNotes} placeholder="Informações adicionais..." placeholderTextColor={theme.colors.text.muted} multiline />

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

function RequestCard({ req, role, onContact, onClose, contactLoading }: { req: B2bRequest; role?: string; onContact?: () => void; onClose?: () => void; contactLoading?: boolean }) {
  const statusColor = req.status === "open" ? theme.colors.feedback.success : req.status === "contracted" ? theme.colors.brand.orange : theme.colors.text.muted;
  const statusLabel = req.status === "open" ? "Aberta" : req.status === "contracted" ? "Contratada" : "Fechada";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardDestination} numberOfLines={1}>{req.destination}</Text>
          <Text style={styles.cardOrigin}>{req.originCity} → empresa</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={14} color={theme.colors.text.muted} />
          <Text style={styles.detailText}>{req.arrivalTime} chegada • {req.departureTime} saída</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="people-outline" size={14} color={theme.colors.text.muted} />
          <Text style={styles.detailText}>{req.passengerCount} funcionários</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.text.muted} />
          <Text style={styles.detailText}>{formatDays(req.daysOfWeek)}</Text>
        </View>
        {req.companyName && (
          <View style={styles.detailItem}>
            <Ionicons name="business-outline" size={14} color={theme.colors.text.muted} />
            <Text style={styles.detailText}>{req.companyName}</Text>
          </View>
        )}
        {req.notes && <Text style={styles.notes}>{req.notes}</Text>}
      </View>
      {role === "DRIVER" && req.status === "open" && onContact && (
        <Pressable style={[styles.contactBtn, contactLoading && { opacity: 0.6 }]} onPress={onContact} disabled={contactLoading}>
          {contactLoading ? <ActivityIndicator size="small" color="#fff" /> : (
            <><Ionicons name="chatbubble-outline" size={16} color="#fff" /><Text style={styles.contactBtnText}>Tenho interesse</Text></>
          )}
        </Pressable>
      )}
      {role === "PASSENGER" && req.status === "open" && onClose && (
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Fechar solicitação</Text>
        </Pressable>
      )}
    </View>
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
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  sectionTitle: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.8 },
  empty: { alignItems: "center", paddingVertical: theme.spacing.xxl },
  emptyTitle: { fontSize: theme.font.lg, fontWeight: "700", color: theme.colors.text.primary, marginBottom: theme.spacing.sm },
  emptyText: { fontSize: theme.font.sm, color: theme.colors.text.secondary, textAlign: "center" },
  card: { backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border.soft, ...theme.shadow.card },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: theme.spacing.md },
  cardInfo: { flex: 1 },
  cardDestination: { fontSize: theme.font.md, fontWeight: "800", color: theme.colors.text.primary },
  cardOrigin: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  statusBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.pill },
  statusText: { fontSize: theme.font.xs, fontWeight: "700" },
  cardDetails: { gap: theme.spacing.xs },
  detailItem: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  detailText: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  notes: { fontSize: theme.font.sm, color: theme.colors.text.muted, fontStyle: "italic" },
  contactBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm, backgroundColor: theme.colors.brand.orange, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md },
  contactBtnText: { color: "#fff", fontWeight: "700", fontSize: theme.font.sm },
  closeBtn: { alignItems: "center", paddingVertical: theme.spacing.sm },
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
