import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { theme } from "../../../../../constants/theme";
import { addLinePoint, updateLinePoint } from "../../../../../services/driverLines";

type PointType = "pickup" | "dropoff";
type Segment = "ida" | "volta";

function segmentToType(seg: Segment): PointType {
  return seg === "ida" ? "pickup" : "dropoff";
}

interface PlaceSuggestion {
  place_id: string;
  description: string;
}

interface PlaceDetail {
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

async function fetchPlaceSuggestions(input: string): Promise<PlaceSuggestion[]> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key || input.length < 3) return [];
  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&language=pt-BR&key=${key}`;
    const res = await fetch(url);
    const json = await res.json();
    return (json.predictions ?? []).slice(0, 5);
  } catch {
    return [];
  }
}

async function fetchPlaceDetails(placeId: string): Promise<PlaceDetail | null> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry&language=pt-BR&key=${key}`;
    const res = await fetch(url);
    const json = await res.json();
    const result = json.result;
    if (!result) return null;
    return {
      address: result.formatted_address,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      placeId,
    };
  } catch {
    return null;
  }
}

export default function PointFormScreen() {
  const {
    lineId,
    pointId,
    address: initAddress,
    type: initType,
    segment: initSegment,
  } = useLocalSearchParams<{ lineId: string; pointId?: string; address?: string; type?: string; segment?: string }>();
  const router = useRouter();
  const isEdit = !!pointId;

  const [selectedPlace, setSelectedPlace] = useState<PlaceDetail | null>(
    initAddress ? { address: initAddress, latitude: 0, longitude: 0, placeId: "" } : null,
  );
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [segments, setSegments] = useState<Set<Segment>>(
    new Set([(initSegment as Segment) ?? "ida"]),
  );
  const [submitting, setSubmitting] = useState(false);

  const toggleSegment = (seg: Segment) => {
    setSegments((prev) => {
      const next = new Set(prev);
      if (next.has(seg) && next.size === 1) return next; // pelo menos um selecionado
      next.has(seg) ? next.delete(seg) : next.add(seg);
      return next;
    });
  };

  useEffect(() => {
    if (searchText.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await fetchPlaceSuggestions(searchText);
      setSuggestions(results);
      setSearching(false);
    }, 400);
    return () => { clearTimeout(timer); setSearching(false); };
  }, [searchText]);

  const handleSelectPlace = async (suggestion: PlaceSuggestion) => {
    setSuggestions([]);
    setSearchText("");
    setLoadingDetail(true);
    const detail = await fetchPlaceDetails(suggestion.place_id);
    setLoadingDetail(false);
    if (detail) {
      setSelectedPlace(detail);
    } else {
      setSelectedPlace({ address: suggestion.description, latitude: 0, longitude: 0, placeId: suggestion.place_id });
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlace?.address) {
      Alert.alert("Atenção", "Selecione um endereço.");
      return;
    }
    if (!lineId) return;

    setSubmitting(true);
    const makePayload = (seg: Segment) => ({
      address: selectedPlace.address,
      type: segmentToType(seg),
      segment: seg,
      latitude: selectedPlace.latitude || null,
      longitude: selectedPlace.longitude || null,
      placeId: selectedPlace.placeId || null,
    });

    if (isEdit) {
      const seg = [...segments][0];
      const result = await updateLinePoint(lineId, pointId!, makePayload(seg));
      setSubmitting(false);
      if (result.success) { router.back(); }
      else { Alert.alert("Erro", result.error?.message ?? "Não foi possível salvar o ponto."); }
      return;
    }

    const results = await Promise.all(
      [...segments].map((seg) => addLinePoint(lineId, makePayload(seg))),
    );
    setSubmitting(false);

    const failed = results.find((r) => !r.success);
    if (failed) {
      Alert.alert("Erro", failed.error?.message ?? "Não foi possível salvar o ponto.");
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>{isEdit ? "Editar Ponto" : "Adicionar Ponto"}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

          <Text style={styles.label}>Endereço</Text>

          {selectedPlace ? (
            <Pressable
              style={styles.selectedPlace}
              onPress={() => { setSelectedPlace(null); setSearchText(""); }}
            >
              <Ionicons name="location" size={18} color={theme.colors.brand.orange} />
              <View style={styles.selectedPlaceInfo}>
                <Text style={styles.selectedPlaceText} numberOfLines={2}>{selectedPlace.address}</Text>
                {selectedPlace.latitude !== 0 && (
                  <Text style={styles.coordsText}>
                    {selectedPlace.latitude.toFixed(5)}, {selectedPlace.longitude.toFixed(5)}
                  </Text>
                )}
              </View>
              <Ionicons name="close-circle" size={20} color={theme.colors.text.muted} />
            </Pressable>
          ) : (
            <>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Buscar endereço ou local..."
                  placeholderTextColor={theme.colors.text.muted}
                  value={searchText}
                  onChangeText={setSearchText}
                  autoFocus={!isEdit}
                />
                {(searching || loadingDetail) && (
                  <ActivityIndicator size="small" color={theme.colors.brand.orange} style={{ marginRight: 12 }} />
                )}
              </View>
              {suggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {suggestions.map((s) => (
                    <Pressable key={s.place_id} style={styles.suggestionItem} onPress={() => handleSelectPlace(s)}>
                      <Ionicons name="location-outline" size={14} color={theme.colors.text.secondary} />
                      <Text style={styles.suggestionText} numberOfLines={2}>{s.description}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Text style={styles.hint}>Pesquise pelo nome do local ou endereço completo</Text>
            </>
          )}

          <Text style={styles.label}>Trecho</Text>
          <Text style={styles.hint}>Pode selecionar os dois para criar o ponto na ida e na volta</Text>
          <View style={styles.toggleRow}>
            <ToggleButton
              label="Ida"
              icon="arrow-forward-circle"
              active={segments.has("ida")}
              onPress={() => toggleSegment("ida")}
              activeColor={theme.colors.brand.navy}
            />
            <ToggleButton
              label="Volta"
              icon="return-down-back"
              active={segments.has("volta")}
              onPress={() => toggleSegment("volta")}
              activeColor={theme.colors.brand.navy}
            />
          </View>

          <Pressable
            style={[styles.submitButton, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color={theme.colors.text.inverse} />
              : <Text style={styles.submitText}>
                  {isEdit
                    ? "Salvar alterações"
                    : segments.size === 2
                      ? "Adicionar ponto na ida e na volta"
                      : "Adicionar ponto"
                  }
                </Text>
            }
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ToggleButton({ label, icon, active, onPress, activeColor }: {
  label: string; icon: string; active: boolean; onPress: () => void; activeColor: string;
}) {
  return (
    <Pressable
      style={[styles.toggle, active && { borderColor: activeColor, backgroundColor: activeColor + "15" }]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={20} color={active ? activeColor : theme.colors.text.muted} />
      <Text style={[styles.toggleText, active && { color: activeColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.soft,
    gap: theme.spacing.md,
  },
  backButton: { padding: theme.spacing.xs },
  title: { fontSize: theme.font.xl, fontWeight: "800", color: theme.colors.text.primary },
  form: { padding: theme.spacing.xl, gap: theme.spacing.md, paddingBottom: 48 },
  label: {
    fontSize: theme.font.sm,
    fontWeight: "700",
    color: theme.colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hint: { fontSize: theme.font.xs, color: theme.colors.text.muted, marginTop: -theme.spacing.sm },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background.input,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.input,
  },
  inputFlex: {
    flex: 1,
    padding: theme.spacing.md,
    fontSize: theme.font.md,
    color: theme.colors.text.primary,
  },
  suggestions: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.soft,
  },
  suggestionText: { fontSize: theme.font.md, color: theme.colors.text.primary, flex: 1 },
  selectedPlace: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.brand.orange + "60",
    padding: theme.spacing.md,
  },
  selectedPlaceInfo: { flex: 1 },
  selectedPlaceText: {
    fontSize: theme.font.md,
    color: theme.colors.text.primary,
    fontWeight: "600",
  },
  coordsText: {
    fontSize: theme.font.xs,
    color: theme.colors.text.muted,
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  toggleRow: { flexDirection: "row", gap: theme.spacing.md },
  toggle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.card,
  },
  toggleText: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.muted },
  submitButton: {
    backgroundColor: theme.colors.brand.orange,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
    marginTop: theme.spacing.lg,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: theme.colors.text.inverse, fontSize: theme.font.md, fontWeight: "800" },
});
