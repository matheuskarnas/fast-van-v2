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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../../../constants/theme";
import { apiService } from "../../../../../services/api";
import { ApiEndpoints } from "../../../../../constants/api";

interface Suggestion {
  id: string;
  passengerId: string;
  passengerName?: string;
  address: string;
  type: string;
  segment: string;
  status: string;
  rejectionReason?: string;
}

export default function LineSuggestionsScreen() {
  const { lineId } = useLocalSearchParams<{ lineId: string }>();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!lineId) return;
    setLoading(true);
    try {
      const url = ApiEndpoints.GET_SUGGESTIONS.replace(":lineId", lineId);
      const res = await apiService.get<{ success: boolean; suggestions: Suggestion[] }>(url);
      if ((res.data as any).success) setSuggestions((res.data as any).suggestions ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, [lineId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDecide = async (sugg: Suggestion, decision: "approved" | "rejected") => {
    if (decision === "rejected") {
      Alert.prompt(
        "Motivo da rejeição (opcional)",
        "Informe o motivo para o passageiro:",
        async (reason) => { await doDecide(sugg.id, decision, reason || undefined); },
        "plain-text",
        "",
      );
      return;
    }
    await doDecide(sugg.id, decision);
  };

  const doDecide = async (suggId: string, decision: "approved" | "rejected", rejectionReason?: string) => {
    setDeciding(suggId);
    try {
      const url = ApiEndpoints.DECIDE_SUGGESTION.replace(":lineId", lineId!).replace(":suggId", suggId);
      const res = await apiService.patch<{ success: boolean; suggestion?: Suggestion; error?: any }>(url, { decision, rejectionReason });
      if ((res.data as any).success) {
        setSuggestions((prev) => prev.filter((s) => s.id !== suggId));
        Alert.alert(decision === "approved" ? "Ponto aprovado!" : "Sugestão rejeitada", decision === "approved" ? "O ponto foi adicionado à linha." : "O passageiro será informado.");
      } else {
        Alert.alert("Erro", (res.data as any).error?.message ?? "Não foi possível processar.");
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.error?.message ?? "Falha ao processar.");
    }
    setDeciding(null);
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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Sugestões de pontos</Text>
        <View style={[styles.badge, suggestions.length > 0 && styles.badgeActive]}>
          <Text style={styles.badgeText}>{suggestions.length}</Text>
        </View>
      </View>

      {suggestions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle-outline" size={56} color={theme.colors.feedback.success} style={{ opacity: 0.5, marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Nenhuma sugestão pendente</Text>
          <Text style={styles.emptyText}>Passageiros podem sugerir pontos para rotinas variadas.</Text>
        </View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item: Suggestion) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: Suggestion }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name={item.type === "pickup" ? "arrow-up-circle" : "arrow-down-circle"}
                  size={20}
                  color={item.type === "pickup" ? theme.colors.feedback.success : theme.colors.feedback.error}
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardAddress} numberOfLines={2}>{item.address}</Text>
                  <Text style={styles.cardMeta}>
                    {item.segment === "ida" ? "Ida" : "Volta"} · {item.type === "pickup" ? "Embarque" : "Desembarque"}
                  </Text>
                  {item.passengerName && <Text style={styles.cardPassenger}>Por: {item.passengerName}</Text>}
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={[styles.approveBtn, deciding === item.id && styles.btnDisabled]}
                  onPress={() => handleDecide(item, "approved")}
                  disabled={deciding === item.id}
                >
                  {deciding === item.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={styles.approveBtnText}>Aprovar</Text></>
                  }
                </Pressable>
                <Pressable
                  style={[styles.rejectBtn, deciding === item.id && styles.btnDisabled]}
                  onPress={() => handleDecide(item, "rejected")}
                  disabled={deciding === item.id}
                >
                  <Ionicons name="close" size={16} color={theme.colors.feedback.error} />
                  <Text style={styles.rejectBtnText}>Rejeitar</Text>
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border.soft, gap: theme.spacing.md },
  backBtn: { padding: theme.spacing.xs },
  headerTitle: { flex: 1, fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  badge: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.border.soft, alignItems: "center", justifyContent: "center" },
  badgeActive: { backgroundColor: theme.colors.feedback.warning },
  badgeText: { fontSize: theme.font.xs, fontWeight: "800", color: "#fff" },
  emptyTitle: { fontSize: theme.font.lg, fontWeight: "700", color: theme.colors.text.primary, marginBottom: theme.spacing.sm, textAlign: "center" },
  emptyText: { fontSize: theme.font.sm, color: theme.colors.text.secondary, textAlign: "center" },
  list: { padding: theme.spacing.lg, gap: theme.spacing.md },
  card: { backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border.soft, ...theme.shadow.card },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md },
  cardInfo: { flex: 1, gap: 3 },
  cardAddress: { fontSize: theme.font.md, fontWeight: "600", color: theme.colors.text.primary },
  cardMeta: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  cardPassenger: { fontSize: theme.font.xs, color: theme.colors.text.muted },
  actions: { flexDirection: "row", gap: theme.spacing.md },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm, backgroundColor: theme.colors.feedback.success, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md },
  approveBtnText: { color: "#fff", fontWeight: "700", fontSize: theme.font.sm },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm, borderWidth: 1.5, borderColor: theme.colors.feedback.error, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md },
  rejectBtnText: { color: theme.colors.feedback.error, fontWeight: "700", fontSize: theme.font.sm },
  btnDisabled: { opacity: 0.5 },
});
