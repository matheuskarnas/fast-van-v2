import { useCallback, useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { theme } from "../../../../constants/theme";
import { apiService } from "../../../../services/api";
import { ApiEndpoints } from "../../../../constants/api";
import { createLine, searchIBGECities, type IBGECity } from "../../../../services/driverLines";

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  capacity: number;
}

const DAY_OPTIONS = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
] as const;

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

export default function CreateLineScreen() {
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [lineName, setLineName] = useState("");

  const [originCity, setOriginCity] = useState("");
  const [originCitySearch, setOriginCitySearch] = useState("");
  const [ibgeSuggestions, setIbgeSuggestions] = useState<IBGECity[]>([]);
  const [searchingIBGE, setSearchingIBGE] = useState(false);

  const [destinationPlace, setDestinationPlace] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");
  const [googleSuggestions, setGoogleSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [searchingGoogle, setSearchingGoogle] = useState(false);

  const [arrivalTimes, setArrivalTimes] = useState<string[]>([]);
  const [departureTimes, setDepartureTimes] = useState<string[]>([]);
  const [daysOfWeek, setDaysOfWeek] = useState("seg,ter,qua,qui,sex");

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"arrival" | "departure">("arrival");
  const [pickerDate, setPickerDate] = useState(new Date());

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadVehicles(); }, []);

  const loadVehicles = async () => {
    try {
      const response = await apiService.get<{ success: boolean; vehicles: Vehicle[] }>(ApiEndpoints.GET_VEHICLES);
      if (response.data?.success) {
        const list = response.data.vehicles ?? [];
        setVehicles(list);
        if (list.length === 1) setSelectedVehicle(list[0]);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar seus veículos.");
    } finally {
      setLoadingVehicles(false);
    }
  };

  // Busca IBGE com debounce
  useEffect(() => {
    if (originCitySearch.length < 2) { setIbgeSuggestions([]); return; }
    setSearchingIBGE(true);
    const timer = setTimeout(async () => {
      const results = await searchIBGECities(originCitySearch);
      setIbgeSuggestions(results.slice(0, 6));
      setSearchingIBGE(false);
    }, 500);
    return () => { clearTimeout(timer); setSearchingIBGE(false); };
  }, [originCitySearch]);

  // Busca Google Places com debounce
  useEffect(() => {
    if (destinationSearch.length < 3) { setGoogleSuggestions([]); return; }
    const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return;
    const timer = setTimeout(async () => {
      setSearchingGoogle(true);
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(destinationSearch)}&language=pt-BR&key=${key}`;
        const res = await fetch(url);
        const json = await res.json();
        setGoogleSuggestions((json.predictions ?? []).slice(0, 5));
      } catch {
        setGoogleSuggestions([]);
      } finally {
        setSearchingGoogle(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [destinationSearch]);

  const openTimePicker = (mode: "arrival" | "departure") => {
    setPickerMode(mode);
    setPickerDate(new Date());
    setShowPicker(true);
  };

  const onTimeSelected = (_: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    if (!date) return;
    const time = formatTime(date);
    if (pickerMode === "arrival") {
      setArrivalTimes((prev) => prev.includes(time) ? prev : [...prev, time].sort());
    } else {
      setDepartureTimes((prev) => prev.includes(time) ? prev : [...prev, time].sort());
    }
  };

  const removeTime = (list: string[], setList: (v: string[]) => void, time: string) => {
    setList(list.filter((t) => t !== time));
  };

  const toggleDay = (day: string) => {
    setDaysOfWeek((current) => {
      const selected = current.split(",").filter(Boolean);
      const next = selected.includes(day)
        ? selected.filter((item) => item !== day)
        : [...selected, day];
      return DAY_OPTIONS
        .map((option) => option.key)
        .filter((key) => next.includes(key))
        .join(",");
    });
  };

  const handleSubmit = async () => {
    if (!lineName.trim()) { Alert.alert("Atenção", "Informe o nome da linha."); return; }
    if (!originCity) { Alert.alert("Atenção", "Selecione a cidade de origem."); return; }
    if (!destinationPlace) { Alert.alert("Atenção", "Selecione o destino."); return; }
    if (!selectedVehicle) { Alert.alert("Atenção", "Selecione um veículo."); return; }
    if (!daysOfWeek) { Alert.alert("Atenção", "Selecione pelo menos um dia de operação."); return; }
    if (arrivalTimes.length === 0) { Alert.alert("Atenção", "Informe pelo menos um horário de chegada."); return; }
    if (departureTimes.length === 0) { Alert.alert("Atenção", "Informe pelo menos um horário de saída."); return; }

    setSubmitting(true);
    const result = await createLine({
      name: lineName.trim(),
      originCity,
      destinationPlace,
      vehicleId: selectedVehicle.id,
      arrivalTimes,
      departureTimes,
      daysOfWeek,
    });
    setSubmitting(false);

    if (result.success && result.line) {
      router.back();
    } else {
      Alert.alert("Erro ao criar linha", result.error?.message ?? "Tente novamente.");
    }
  };

  if (loadingVehicles) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand.orange} />
        </View>
      </SafeAreaView>
    );
  }

  if (vehicles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} />
        <View style={styles.center}>
          <Ionicons name="car-outline" size={64} color={theme.colors.text.muted} style={{ opacity: 0.5, marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Nenhum veículo cadastrado</Text>
          <Text style={styles.emptyText}>Você precisa cadastrar um veículo antes de criar uma linha.</Text>
          <Pressable style={styles.ctaButton} onPress={() => router.push("/vehicles/create")}>
            <Text style={styles.ctaText}>Cadastrar veículo</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header onBack={() => router.back()} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

          {/* Nome da linha */}
          <Text style={styles.label}>Nome da linha</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Linha Manhã Fatec-SJC"
            placeholderTextColor={theme.colors.text.muted}
            value={lineName}
            onChangeText={setLineName}
          />

          {/* Veículo */}
          <Text style={styles.label}>Veículo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {vehicles.map((v) => (
              <Pressable
                key={v.id}
                style={[styles.chip, selectedVehicle?.id === v.id && styles.chipActive]}
                onPress={() => setSelectedVehicle(v)}
              >
                <Text style={[styles.chipText, selectedVehicle?.id === v.id && styles.chipTextActive]}>{v.plate}</Text>
                <Text style={[styles.chipSub, selectedVehicle?.id === v.id && styles.chipTextActive]}>{v.model} • {v.capacity} lug.</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Origem */}
          <Text style={styles.label}>Cidade de origem</Text>
          {originCity ? (
            <Pressable style={styles.selectedChip} onPress={() => { setOriginCity(""); setOriginCitySearch(""); setIbgeSuggestions([]); }}>
              <Ionicons name="radio-button-on" size={16} color={theme.colors.brand.orange} />
              <Text style={styles.selectedChipText}>{originCity}</Text>
              <Ionicons name="close-circle" size={18} color={theme.colors.text.muted} />
            </Pressable>
          ) : (
            <>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Buscar cidade..."
                  placeholderTextColor={theme.colors.text.muted}
                  value={originCitySearch}
                  onChangeText={(t) => { setOriginCitySearch(t); setIbgeSuggestions([]); }}
                />
                {searchingIBGE && <ActivityIndicator size="small" color={theme.colors.brand.orange} style={{ marginRight: 12 }} />}
              </View>
              {ibgeSuggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {ibgeSuggestions.map((c) => (
                    <Pressable key={c.id} style={styles.suggestionItem} onPress={() => { setOriginCity(c.nome); setOriginCitySearch(""); setIbgeSuggestions([]); }}>
                      <Ionicons name="location-outline" size={14} color={theme.colors.text.secondary} />
                      <Text style={styles.suggestionText}>{c.nome}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Destino */}
          <Text style={styles.label}>Destino</Text>
          {destinationPlace ? (
            <Pressable style={styles.selectedChip} onPress={() => { setDestinationPlace(""); setDestinationSearch(""); setGoogleSuggestions([]); }}>
              <Ionicons name="location" size={16} color={theme.colors.brand.navy} />
              <Text style={styles.selectedChipText}>{destinationPlace}</Text>
              <Ionicons name="close-circle" size={18} color={theme.colors.text.muted} />
            </Pressable>
          ) : (
            <>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Buscar local de destino..."
                  placeholderTextColor={theme.colors.text.muted}
                  value={destinationSearch}
                  onChangeText={setDestinationSearch}
                />
                {searchingGoogle && <ActivityIndicator size="small" color={theme.colors.brand.orange} style={{ marginRight: 12 }} />}
              </View>
              {googleSuggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {googleSuggestions.map((s) => (
                    <Pressable key={s.place_id} style={styles.suggestionItem} onPress={() => { setDestinationPlace(s.description); setDestinationSearch(""); setGoogleSuggestions([]); }}>
                      <Ionicons name="business-outline" size={14} color={theme.colors.text.secondary} />
                      <Text style={styles.suggestionText} numberOfLines={1}>{s.description}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Dias de operação */}
          <Text style={styles.label}>Dias de operação</Text>
          <View style={styles.dayGrid}>
            {DAY_OPTIONS.map((day) => {
              const selected = daysOfWeek.split(",").includes(day.key);
              return (
                <Pressable
                  key={day.key}
                  style={[styles.dayButton, selected && styles.dayButtonActive]}
                  onPress={() => toggleDay(day.key)}
                >
                  <Text style={[styles.dayButtonText, selected && styles.dayButtonTextActive]}>
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Horários de chegada */}
          <Text style={styles.label}>Horários de chegada no destino</Text>
          <Text style={styles.hint}>Ex: 07:00, 08:00 (quando a van chega na faculdade)</Text>
          <View style={styles.timeChips}>
            {arrivalTimes.map((t) => (
              <View key={t} style={styles.timeChip}>
                <Text style={styles.timeChipText}>{t}</Text>
                <Pressable onPress={() => removeTime(arrivalTimes, setArrivalTimes, t)}>
                  <Ionicons name="close" size={14} color={theme.colors.text.inverse} />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addTimeButton} onPress={() => openTimePicker("arrival")}>
              <Ionicons name="add" size={18} color={theme.colors.brand.orange} />
              <Text style={styles.addTimeText}>Adicionar</Text>
            </Pressable>
          </View>

          {/* Horários de saída */}
          <Text style={styles.label}>Horários de saída do destino</Text>
          <Text style={styles.hint}>Ex: 11:00, 12:35 (quando a van sai da faculdade)</Text>
          <View style={styles.timeChips}>
            {departureTimes.map((t) => (
              <View key={t} style={[styles.timeChip, { backgroundColor: theme.colors.brand.navy }]}>
                <Text style={styles.timeChipText}>{t}</Text>
                <Pressable onPress={() => removeTime(departureTimes, setDepartureTimes, t)}>
                  <Ionicons name="close" size={14} color={theme.colors.text.inverse} />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addTimeButton} onPress={() => openTimePicker("departure")}>
              <Ionicons name="add" size={18} color={theme.colors.brand.navy} />
              <Text style={[styles.addTimeText, { color: theme.colors.brand.navy }]}>Adicionar</Text>
            </Pressable>
          </View>

          <Pressable style={[styles.submitButton, submitting && styles.submitDisabled]} onPress={handleSubmit} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color={theme.colors.text.inverse} />
              : <Text style={styles.submitText}>Criar Linha</Text>
            }
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {showPicker && (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "clock"}
          onChange={onTimeSelected}
        />
      )}
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
      </Pressable>
      <Text style={styles.title}>Nova Linha</Text>
    </View>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: theme.spacing.xl },
  emptyTitle: { fontSize: theme.font.lg, fontWeight: "700", color: theme.colors.text.primary, marginBottom: theme.spacing.sm, textAlign: "center" },
  emptyText: { fontSize: theme.font.md, color: theme.colors.text.secondary, textAlign: "center", marginBottom: theme.spacing.xl },
  ctaButton: { backgroundColor: theme.colors.brand.orange, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, borderRadius: theme.radius.pill },
  ctaText: { color: theme.colors.text.inverse, fontWeight: "700" },
  form: { padding: theme.spacing.xl, gap: theme.spacing.md, paddingBottom: 48 },
  label: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 },
  hint: { fontSize: theme.font.xs, color: theme.colors.text.muted, marginTop: -theme.spacing.sm },
  input: {
    backgroundColor: theme.colors.background.input,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.input,
    padding: theme.spacing.md,
    fontSize: theme.font.md,
    color: theme.colors.text.primary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background.input,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.input,
  },
  inputFlex: { flex: 1, padding: theme.spacing.md, fontSize: theme.font.md, color: theme.colors.text.primary },
  chipRow: { flexGrow: 0, marginBottom: theme.spacing.xs },
  chip: {
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    minWidth: 120,
  },
  chipActive: { borderColor: theme.colors.brand.orange, backgroundColor: theme.colors.brand.orange + "15" },
  chipText: { fontSize: theme.font.md, fontWeight: "700", color: theme.colors.text.primary },
  chipTextActive: { color: theme.colors.brand.orangeDark },
  chipSub: { fontSize: theme.font.xs, color: theme.colors.text.secondary, marginTop: 2 },
  suggestions: { backgroundColor: theme.colors.background.card, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border.soft, overflow: "hidden" },
  suggestionItem: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border.soft },
  suggestionText: { fontSize: theme.font.md, color: theme.colors.text.primary, flex: 1 },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    padding: theme.spacing.md,
  },
  selectedChipText: { flex: 1, fontSize: theme.font.md, color: theme.colors.text.primary, fontWeight: "600" },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  dayButton: {
    width: 58,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.card,
  },
  dayButtonActive: {
    borderColor: theme.colors.brand.orange,
    backgroundColor: theme.colors.brand.orange,
  },
  dayButtonText: {
    fontSize: theme.font.sm,
    fontWeight: "800",
    color: theme.colors.text.secondary,
  },
  dayButtonTextActive: {
    color: theme.colors.text.inverse,
  },
  timeChips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.brand.orange,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
  },
  timeChipText: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.inverse },
  addTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    borderWidth: 1.5,
    borderColor: theme.colors.brand.orange,
    borderStyle: "dashed",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
  },
  addTimeText: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.brand.orange },
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
