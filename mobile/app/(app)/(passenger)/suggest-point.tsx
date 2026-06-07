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
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import { apiService } from "../../../services/api";
import { ApiEndpoints } from "../../../constants/api";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

interface PlaceResult { placeId: string; description: string }
type Segment = "ida" | "volta";

function segmentToType(segment: Segment) {
  return segment === "ida" ? "pickup" : "dropoff";
}

async function searchPlaces(input: string): Promise<PlaceResult[]> {
  if (!input.trim() || !GOOGLE_KEY) return [];
  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_KEY}&language=pt-BR&components=country:br`;
    const res = await fetch(url);
    const json = await res.json();
    return (json.predictions ?? []).map((p: any) => ({ placeId: p.place_id, description: p.description }));
  } catch { return []; }
}

async function getPlaceDetails(placeId: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const loc = json.result?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch { return null; }
}

export default function SuggestPointScreen() {
  const { lineId, lineName } = useLocalSearchParams<{ lineId: string; lineName?: string }>();
  const router = useRouter();

  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [segments, setSegments] = useState<Set<Segment>>(new Set(["ida"]));
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSearch = async (text: string) => {
    setAddressQuery(text);
    setSelectedAddress("");
    if (text.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    const results = await searchPlaces(text);
    setSuggestions(results);
    setSearching(false);
  };

  const handleSelect = async (place: PlaceResult) => {
    setSelectedAddress(place.description);
    setSelectedPlaceId(place.placeId);
    setAddressQuery(place.description);
    setSuggestions([]);
    const coords = await getPlaceDetails(place.placeId);
    if (coords) { setSelectedLat(coords.lat); setSelectedLng(coords.lng); }
  };

  const toggleSegment = (selectedSegment: Segment) => {
    setSegments((current) => {
      const next = new Set(current);
      if (next.has(selectedSegment) && next.size === 1) return next;
      if (next.has(selectedSegment)) {
        next.delete(selectedSegment);
      } else {
        next.add(selectedSegment);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedAddress) { Alert.alert("Atenção", "Selecione um endereço da lista."); return; }
    setSaving(true);
    try {
      const url = ApiEndpoints.POST_SUGGESTION.replace(":lineId", lineId!);
      const results = await Promise.all(
        [...segments].map((segment) => apiService.post<{ success: boolean; error?: any }>(url, {
          address: selectedAddress,
          type: segmentToType(segment),
          segment,
          latitude: selectedLat,
          longitude: selectedLng,
          placeId: selectedPlaceId || undefined,
        })),
      );
      const failed = results.find((res) => !(res.data as any).success);
      if (!failed) {
        Alert.alert("Sugestão enviada!", "O motorista irá analisar e aprovar seu novo ponto.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Erro", (failed.data as any).error?.message ?? "Não foi possível enviar a sugestão.");
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.error?.message ?? "Falha ao enviar sugestão.");
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
          <Text style={styles.headerTitle}>Sugerir ponto</Text>
          {lineName && <Text style={styles.headerSub}>{lineName}</Text>}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Endereço</Text>
        <View style={styles.autocompleteContainer}>
          <AddressInput
            value={addressQuery}
            onChangeText={handleSearch}
            onSelect={handleSelect}
            suggestions={suggestions}
            searching={searching}
            selectedAddress={selectedAddress}
          />
        </View>

        <Text style={styles.label}>Trecho</Text>
        <Text style={styles.hint}>Pode selecionar os dois para sugerir o ponto na ida e na volta</Text>
        <View style={styles.toggleRow}>
          <ToggleButton
            label="Ida"
            icon="arrow-forward-circle"
            active={segments.has("ida")}
            onPress={() => toggleSegment("ida")}
          />
          <ToggleButton
            label="Volta"
            icon="return-down-back"
            active={segments.has("volta")}
            onPress={() => toggleSegment("volta")}
          />
        </View>

        <Pressable style={[styles.submitBtn, saving && styles.btnDisabled]} onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.submitBtnText}>
              {segments.size === 2 ? "Enviar sugestões" : "Enviar sugestão"}
            </Text>
          )}
        </Pressable>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.brand.navy} />
          <Text style={styles.infoText}>O motorista receberá sua sugestão e precisará aprovar antes que o ponto entre em operação.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AddressInput({ value, onChangeText, onSelect, suggestions, searching, selectedAddress }: any) {
  if (selectedAddress) {
    return (
      <View style={styles.selectedBox}>
        <Ionicons name="location" size={16} color={theme.colors.feedback.success} />
        <Text style={styles.selectedText} numberOfLines={2}>{selectedAddress}</Text>
        <Pressable onPress={() => onChangeText("")}>
          <Ionicons name="close-circle" size={18} color={theme.colors.text.muted} />
        </Pressable>
      </View>
    );
  }
  return (
    <View>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholder="Ex: Rua das Flores, 100, Caçapava"
        placeholderTextColor={theme.colors.text.muted}
        autoCorrect={false}
      />
      {searching && <ActivityIndicator size="small" color={theme.colors.brand.orange} style={{ marginTop: 8 }} />}
      {suggestions.map((s: PlaceResult) => (
        <Pressable key={s.placeId} style={styles.suggestionItem} onPress={() => onSelect(s)}>
          <Ionicons name="location-outline" size={14} color={theme.colors.text.muted} />
          <Text style={styles.suggestionText} numberOfLines={2}>{s.description}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ToggleButton({ label, icon, active, onPress }: {
  label: string; icon: string; active: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.toggleBtn, active && styles.toggleBtnActive]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={20} color={active ? theme.colors.brand.navy : theme.colors.text.muted} />
      <Text style={[styles.toggleBtnText, active && styles.toggleBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border.soft, gap: theme.spacing.md },
  backBtn: { padding: theme.spacing.xs },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  headerSub: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: 48 },
  label: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 },
  hint: { fontSize: theme.font.xs, color: theme.colors.text.muted, marginTop: -theme.spacing.sm },
  autocompleteContainer: { gap: theme.spacing.xs },
  textInput: { borderWidth: 1.5, borderColor: theme.colors.border.default, borderRadius: theme.radius.md, padding: theme.spacing.md, fontSize: theme.font.md, color: theme.colors.text.primary, backgroundColor: theme.colors.background.card },
  suggestionItem: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm, padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border.soft, backgroundColor: theme.colors.background.card },
  suggestionText: { flex: 1, fontSize: theme.font.sm, color: theme.colors.text.primary },
  selectedBox: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, padding: theme.spacing.md, backgroundColor: theme.colors.feedback.success + "10", borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.feedback.success + "30" },
  selectedText: { flex: 1, fontSize: theme.font.sm, color: theme.colors.text.primary, fontWeight: "600" },
  toggleRow: { flexDirection: "row", gap: theme.spacing.md },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.border.default, backgroundColor: theme.colors.background.card },
  toggleBtnActive: { backgroundColor: theme.colors.brand.navy + "15", borderColor: theme.colors.brand.navy },
  toggleBtnText: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.muted },
  toggleBtnTextActive: { color: theme.colors.brand.navy },
  submitBtn: { backgroundColor: theme.colors.brand.orange, paddingVertical: theme.spacing.lg, borderRadius: theme.radius.pill, alignItems: "center", marginTop: theme.spacing.sm },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: theme.font.md },
  btnDisabled: { opacity: 0.6 },
  infoBox: { flexDirection: "row", gap: theme.spacing.sm, backgroundColor: theme.colors.brand.navy + "10", borderRadius: theme.radius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.brand.navy + "30" },
  infoText: { flex: 1, fontSize: theme.font.sm, color: theme.colors.brand.navy, lineHeight: 20 },
});
