import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import { apiService } from "../../../services/api";
import { ApiEndpoints } from "../../../constants/api";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

interface PlaceResult { placeId: string; description: string }

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
  const [type, setType] = useState<"pickup" | "dropoff">("pickup");
  const [segment, setSegment] = useState<"ida" | "volta">("ida");
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

  const handleSubmit = async () => {
    if (!selectedAddress) { Alert.alert("Atenção", "Selecione um endereço da lista."); return; }
    setSaving(true);
    try {
      const url = ApiEndpoints.POST_SUGGESTION.replace(":lineId", lineId!);
      const res = await apiService.post<{ success: boolean; error?: any }>(url, {
        address: selectedAddress,
        type,
        segment,
        latitude: selectedLat,
        longitude: selectedLng,
        placeId: selectedPlaceId || undefined,
      });
      if ((res.data as any).success) {
        Alert.alert("Sugestão enviada!", "O motorista irá analisar e aprovar seu novo ponto.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Erro", (res.data as any).error?.message ?? "Não foi possível enviar a sugestão.");
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
        <Text style={styles.label}>Endereço (Google Places)</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color={theme.colors.text.muted} style={styles.inputIcon} />
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.input, selectedAddress ? styles.inputSelected : {}]}
              onPress={() => { if (selectedAddress) { setSelectedAddress(""); setAddressQuery(""); } }}
            >
              {selectedAddress || addressQuery || "Buscar endereço..."}
            </Text>
          </View>
        </View>

        {/* TextInput real escondido */}
        <View style={styles.searchInputWrap}>
          <Ionicons name="location-outline" size={18} color={theme.colors.text.muted} />
          <Text
            style={styles.searchHint}
            onPress={() => {}}
          >
            {searching ? "Buscando..." : "Digite o endereço acima"}
          </Text>
        </View>

        {/* Campo de busca real */}
        <View style={styles.searchBox}>
          {[addressQuery].map((_, i) => (
            <View key={i}>
              <Text style={styles.label}>Digite para buscar</Text>
              <View style={styles.row}>
                <Text
                  style={styles.searchField}
                  onPress={() => {}}
                >
                  {addressQuery}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Autocomplete real usando TextInput */}
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

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.toggleRow}>
          {(["pickup", "dropoff"] as const).map((t) => (
            <Pressable key={t} style={[styles.toggleBtn, type === t && styles.toggleBtnActive]} onPress={() => setType(t)}>
              <Ionicons name={t === "pickup" ? "arrow-up-circle-outline" : "arrow-down-circle-outline"} size={18} color={type === t ? "#fff" : theme.colors.text.secondary} />
              <Text style={[styles.toggleBtnText, type === t && styles.toggleBtnTextActive]}>
                {t === "pickup" ? "Embarque" : "Desembarque"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Segmento</Text>
        <View style={styles.toggleRow}>
          {(["ida", "volta"] as const).map((s) => (
            <Pressable key={s} style={[styles.toggleBtn, segment === s && styles.toggleBtnActive]} onPress={() => setSegment(s)}>
              <Ionicons name={s === "ida" ? "arrow-forward-circle-outline" : "return-down-back-outline"} size={18} color={segment === s ? "#fff" : theme.colors.text.secondary} />
              <Text style={[styles.toggleBtnText, segment === s && styles.toggleBtnTextActive]}>
                {s === "ida" ? "Ida" : "Volta"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.submitBtn, saving && styles.btnDisabled]} onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Enviar sugestão</Text>}
        </Pressable>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.brand.navy} />
          <Text style={styles.infoText}>O motorista receberá sua sugestão e precisará aprovar antes que o ponto entre em operação.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { TextInput } from "react-native";

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border.soft, gap: theme.spacing.md },
  backBtn: { padding: theme.spacing.xs },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  headerSub: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  label: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary },
  inputWrap: { display: "none" },
  inputIcon: { position: "absolute" },
  input: { fontSize: theme.font.md, color: theme.colors.text.muted },
  inputSelected: { color: theme.colors.text.primary },
  searchInputWrap: { display: "none" },
  searchHint: { fontSize: theme.font.sm, color: theme.colors.text.muted },
  searchBox: { display: "none" },
  searchField: {},
  row: {},
  autocompleteContainer: { gap: theme.spacing.xs },
  textInput: { borderWidth: 1.5, borderColor: theme.colors.border.default, borderRadius: theme.radius.md, padding: theme.spacing.md, fontSize: theme.font.md, color: theme.colors.text.primary, backgroundColor: theme.colors.background.card },
  suggestionItem: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm, padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border.soft, backgroundColor: theme.colors.background.card },
  suggestionText: { flex: 1, fontSize: theme.font.sm, color: theme.colors.text.primary },
  selectedBox: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, padding: theme.spacing.md, backgroundColor: theme.colors.feedback.success + "10", borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.feedback.success + "30" },
  selectedText: { flex: 1, fontSize: theme.font.sm, color: theme.colors.text.primary, fontWeight: "600" },
  toggleRow: { flexDirection: "row", gap: theme.spacing.md },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.border.default, backgroundColor: theme.colors.background.muted },
  toggleBtnActive: { backgroundColor: theme.colors.brand.orange, borderColor: theme.colors.brand.orange },
  toggleBtnText: { fontSize: theme.font.sm, fontWeight: "600", color: theme.colors.text.secondary },
  toggleBtnTextActive: { color: "#fff" },
  submitBtn: { backgroundColor: theme.colors.brand.orange, paddingVertical: theme.spacing.lg, borderRadius: theme.radius.pill, alignItems: "center", marginTop: theme.spacing.sm },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: theme.font.md },
  btnDisabled: { opacity: 0.6 },
  infoBox: { flexDirection: "row", gap: theme.spacing.sm, backgroundColor: theme.colors.brand.navy + "10", borderRadius: theme.radius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.brand.navy + "30" },
  infoText: { flex: 1, fontSize: theme.font.sm, color: theme.colors.brand.navy, lineHeight: 20 },
});
