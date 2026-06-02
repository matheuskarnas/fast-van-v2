import { useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import { ApiEndpoints } from "../../../constants/api";
import { apiService } from "../../../services/api";

interface LinePreview {
  id: string;
  name: string;
  originCity: string;
  destinationPlace: string;
  capacity: number;
  arrivalTimes: string[];
  departureTimes: string[];
}

function SlotChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function AcceptInviteScreen() {
  const [token, setToken] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [preview, setPreview] = useState<LinePreview | null>(null);
  const [selectedDeparture, setSelectedDeparture] = useState<string | null>(null);
  const [selectedArrival, setSelectedArrival] = useState<string | null>(null);

  const handleFetchPreview = async () => {
    const t = token.trim();
    if (!t) { Alert.alert("Atenção", "Cole o token do convite."); return; }
    setLoadingPreview(true);
    try {
      const url = ApiEndpoints.PREVIEW_INVITE.replace(":token", t);
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.invite?.line) {
        setPreview(json.invite.line);
        setSelectedDeparture(json.invite.line.departureTimes?.[0] ?? null);
        setSelectedArrival(json.invite.line.arrivalTimes?.[0] ?? null);
      } else {
        Alert.alert("Convite inválido", json.error?.message ?? "Token não encontrado ou expirado.");
      }
    } catch {
      Alert.alert("Erro", "Não foi possível buscar o convite. Verifique sua conexão.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedDeparture || !selectedArrival) {
      Alert.alert("Atenção", "Selecione seu horário de ida e de volta.");
      return;
    }
    setAccepting(true);
    try {
      const res = await apiService.post<{ success: boolean; error?: { code?: string; message?: string } }>(ApiEndpoints.ACCEPT_LINE_INVITE, {
        token: token.trim(),
        departureTime: selectedDeparture,
        arrivalTime: selectedArrival,
      });
      if (res.data?.success) {
        Alert.alert("Sucesso!", "Você entrou na linha com sucesso!", [
          { text: "Ver minhas linhas", onPress: () => router.replace("/(app)/(passenger)/lines") },
        ]);
      } else {
        const code = res.data?.error?.code;
        if (code === "SLOT_FULL") {
          Alert.alert("Slot lotado", `O horário das ${selectedDeparture} está cheio. Tente outro horário ou aguarde uma vaga.`);
        } else {
          Alert.alert("Erro", res.data?.error?.message ?? "Não foi possível entrar na linha.");
        }
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.error?.message ?? "Não foi possível entrar na linha.");
    } finally {
      setAccepting(false);
    }
  };

  const hasSlots = (preview?.departureTimes?.length ?? 0) > 0 || (preview?.arrivalTimes?.length ?? 0) > 0;
  const canConfirm = preview && (!hasSlots || (!!selectedDeparture && !!selectedArrival));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Entrar em uma linha</Text>
        <Text style={styles.subtitle}>Cole o token que o motorista enviou</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, preview && styles.inputFilled]}
            placeholder="Token do convite..."
            placeholderTextColor={theme.colors.text.muted}
            value={token}
            onChangeText={(v: string) => { setToken(v); setPreview(null); }}
            editable={!loadingPreview && !preview}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!preview && (
            <Pressable style={styles.fetchBtn} onPress={handleFetchPreview} disabled={loadingPreview}>
              {loadingPreview
                ? <ActivityIndicator size="small" color={theme.colors.text.inverse} />
                : <Ionicons name="search" size={20} color={theme.colors.text.inverse} />
              }
            </Pressable>
          )}
        </View>

        {preview && (
          <>
            <View style={styles.lineCard}>
              {preview.name && <Text style={styles.lineName}>{preview.name}</Text>}
              <View style={styles.routeRow}>
                <Ionicons name="radio-button-on" size={14} color={theme.colors.brand.orange} />
                <Text style={styles.routeText}>{preview.originCity}</Text>
                <Ionicons name="arrow-forward" size={12} color={theme.colors.text.muted} />
                <Ionicons name="location" size={14} color={theme.colors.brand.navy} />
                <Text style={styles.routeText}>{preview.destinationPlace}</Text>
              </View>
              <Text style={styles.capacityText}>{preview.capacity} lugares por slot</Text>
            </View>

            {hasSlots && (
              <View style={styles.slotCard}>
                <Text style={styles.slotTitle}>Escolha seus horários fixos</Text>
                <Text style={styles.slotSub}>Esta será sua alocação padrão. Você poderá solicitar troca pontual depois.</Text>

                {(preview.departureTimes?.length ?? 0) > 0 && (
                  <View style={styles.slotSection}>
                    <Text style={styles.slotLabel}>Horário de ida</Text>
                    <View style={styles.chipRow}>
                      {preview.departureTimes.map((s) => (
                        <SlotChip key={s} label={s} selected={selectedDeparture === s} onPress={() => setSelectedDeparture(s)} />
                      ))}
                    </View>
                  </View>
                )}

                {(preview.arrivalTimes?.length ?? 0) > 0 && (
                  <View style={styles.slotSection}>
                    <Text style={styles.slotLabel}>Horário de volta</Text>
                    <View style={styles.chipRow}>
                      {preview.arrivalTimes.map((s) => (
                        <SlotChip key={s} label={s} selected={selectedArrival === s} onPress={() => setSelectedArrival(s)} />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            <Pressable
              style={[styles.confirmBtn, (!canConfirm || accepting) && styles.btnDisabled]}
              onPress={handleAccept}
              disabled={!canConfirm || accepting}
            >
              {accepting
                ? <ActivityIndicator color={theme.colors.text.inverse} />
                : <Text style={styles.confirmBtnText}>Confirmar entrada na linha</Text>
              }
            </Pressable>

            <Pressable onPress={() => { setPreview(null); setToken(""); }} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Usar outro token</Text>
            </Pressable>
          </>
        )}

        <View style={styles.tip}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.brand.navy} />
          <Text style={styles.tipText}>
            Se o motorista compartilhou um link, toque nele diretamente. O token será carregado automaticamente.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  content: { padding: theme.spacing.xl, gap: theme.spacing.lg },
  title: { fontSize: theme.font.xl, fontWeight: "800", color: theme.colors.text.primary },
  subtitle: { fontSize: theme.font.md, color: theme.colors.text.secondary },
  inputRow: { flexDirection: "row", gap: theme.spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.font.md,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.card,
  },
  inputFilled: { borderColor: theme.colors.feedback.success },
  fetchBtn: {
    backgroundColor: theme.colors.brand.orange,
    borderRadius: theme.radius.md,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  lineCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    ...theme.shadow.card,
  },
  lineName: { fontSize: theme.font.md, fontWeight: "800", color: theme.colors.text.primary },
  routeRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, flexWrap: "wrap" },
  routeText: { fontSize: theme.font.sm, fontWeight: "600", color: theme.colors.text.primary },
  capacityText: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  slotCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
  },
  slotTitle: { fontSize: theme.font.md, fontWeight: "800", color: theme.colors.text.primary },
  slotSub: { fontSize: theme.font.sm, color: theme.colors.text.secondary, lineHeight: 20 },
  slotSection: { gap: theme.spacing.sm },
  slotLabel: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.screen,
  },
  chipSelected: { borderColor: theme.colors.brand.orange, backgroundColor: theme.colors.brand.orange + "15" },
  chipText: { fontSize: theme.font.md, fontWeight: "600", color: theme.colors.text.secondary },
  chipTextSelected: { color: theme.colors.brand.orange, fontWeight: "800" },
  confirmBtn: {
    backgroundColor: theme.colors.brand.orange,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
  },
  confirmBtnText: { color: theme.colors.text.inverse, fontSize: theme.font.md, fontWeight: "800" },
  btnDisabled: { opacity: 0.5 },
  cancelBtn: { alignItems: "center" },
  cancelText: { fontSize: theme.font.sm, color: theme.colors.text.secondary, textDecorationLine: "underline" },
  tip: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.brand.navy + "10",
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.brand.navy + "30",
  },
  tipText: { flex: 1, fontSize: theme.font.sm, color: theme.colors.brand.navy, lineHeight: 20 },
});
