import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import { apiService } from "../../../services/api";
import { ApiEndpoints } from "../../../constants/api";

const DRIVER_CRITERIA = [
  { key: "punctuality", label: "Pontualidade" },
  { key: "driving", label: "Qualidade da direção" },
  { key: "friendliness", label: "Simpatia" },
];

const VEHICLE_CRITERIA = [
  { key: "comfort", label: "Conforto" },
  { key: "vehicleQuality", label: "Qualidade do veículo" },
  { key: "hygiene", label: "Manutenção e higiene" },
];

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.starRow}>
      <Text style={styles.starLabel}>{label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Pressable key={s} onPress={() => onChange(s)} hitSlop={6}>
            <Ionicons
              name={s <= value ? "star" : "star-outline"}
              size={28}
              color={s <= value ? "#F59E0B" : theme.colors.text.muted}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function RateScreen() {
  const { lineId, driverId: initialDriverId, vehicleId: initialVehicleId, lineName } = useLocalSearchParams<{
    lineId: string;
    driverId: string;
    vehicleId?: string;
    lineName?: string;
  }>();
  const router = useRouter();

  const month = new Date().toISOString().slice(0, 7);
  const [driverId, setDriverId] = useState(initialDriverId ?? "");
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? "");

  const [scores, setScores] = useState<Record<string, number>>({
    punctuality: 5, driving: 5, friendliness: 5,
    comfort: 5, vehicleQuality: 5, hygiene: 5,
  });
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingLine, setLoadingLine] = useState(!initialDriverId);

  const setScore = (key: string, val: number) => setScores((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (initialDriverId || !lineId) {
      setLoadingLine(false);
      return;
    }

    let active = true;
    async function loadLineContext() {
      setLoadingLine(true);
      try {
        const response = await apiService.get<{
          success: boolean;
          lines?: {
            lineId: string;
            driverId?: string | null;
            ownerDriverId?: string | null;
            vehicleId?: string | null;
          }[];
        }>(ApiEndpoints.GET_MY_SUMMARY);
        const line = response.data.lines?.find((item) => item.lineId === lineId);
        if (active && line) {
          setDriverId(line.driverId || line.ownerDriverId || "");
          setVehicleId(line.vehicleId || "");
        }
      } catch {
        // O envio exibirá a mensagem de dados incompletos.
      } finally {
        if (active) setLoadingLine(false);
      }
    }

    loadLineContext();
    return () => { active = false; };
  }, [initialDriverId, lineId]);

  const handleSubmit = async () => {
    if (!lineId || !driverId) {
      Alert.alert("Erro", "Não foi possível identificar a linha e o motorista para avaliação.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiService.post<{ success: boolean; error?: { message?: string } }>(
        ApiEndpoints.POST_RATING,
        { lineId, driverId, vehicleId: vehicleId || undefined, month, ...scores, comment: comment.trim() || undefined },
      );
      if (res.data.success) {
        Alert.alert("Avaliação enviada!", "Obrigado pelo seu feedback.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Erro", res.data.error?.message ?? "Não foi possível enviar a avaliação.");
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.error?.message ?? "Não foi possível enviar a avaliação.");
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Avaliar viagem</Text>
          {lineName && <Text style={styles.headerSub}>{lineName}</Text>}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loadingLine && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.brand.orange} />
            <Text style={styles.loadingText}>Carregando dados da linha...</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Motorista</Text>
        <View style={styles.card}>
          {DRIVER_CRITERIA.map((c) => (
            <StarRow key={c.key} label={c.label} value={scores[c.key]} onChange={(v) => setScore(c.key, v)} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Veículo</Text>
        <View style={styles.card}>
          {VEHICLE_CRITERIA.map((c) => (
            <StarRow key={c.key} label={c.label} value={scores[c.key]} onChange={(v) => setScore(c.key, v)} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Comentário (opcional)</Text>
        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder="Conte como foi a sua viagem..."
          placeholderTextColor={theme.colors.text.muted}
          multiline
          numberOfLines={3}
          maxLength={300}
        />
        <Text style={styles.charCount}>{comment.length}/300</Text>

        <Pressable
          style={[styles.submitBtn, saving && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={saving || loadingLine}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>Enviar avaliação</Text>
          }
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border.soft, gap: theme.spacing.md },
  backBtn: { padding: theme.spacing.xs },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  headerSub: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    padding: theme.spacing.md,
  },
  loadingText: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  sectionTitle: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.8 },
  card: { backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border.soft },
  starRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  starLabel: { fontSize: theme.font.md, color: theme.colors.text.primary, fontWeight: "600", flex: 1 },
  stars: { flexDirection: "row", gap: 4 },
  commentInput: { borderWidth: 1.5, borderColor: theme.colors.border.default, borderRadius: theme.radius.md, padding: theme.spacing.md, fontSize: theme.font.md, color: theme.colors.text.primary, backgroundColor: theme.colors.background.card, minHeight: 80, textAlignVertical: "top" },
  charCount: { fontSize: theme.font.xs, color: theme.colors.text.muted, textAlign: "right" },
  submitBtn: { backgroundColor: theme.colors.brand.orange, paddingVertical: theme.spacing.lg, borderRadius: theme.radius.pill, alignItems: "center", marginTop: theme.spacing.sm },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: theme.font.md },
  btnDisabled: { opacity: 0.6 },
});
