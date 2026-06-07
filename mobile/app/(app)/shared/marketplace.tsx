import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { theme } from "../../../constants/theme";
import { ApiEndpoints } from "../../../constants/api";
import { apiService } from "../../../services/api";
import { getSession } from "../../../services/session";
import { createPrivateConversation } from "../../../services/chat";
import { searchIBGECities, type IBGECity } from "../../../services/driverLines";

type Role = "DRIVER" | "PASSENGER";
type FilterType = "all" | "line" | "event" | "b2b";
type CreateMode = "event" | "b2b" | null;

interface MarketplaceLine {
  id: string;
  name: string;
  originCity: string;
  destinationPlace: string;
  ownerDriverId: string;
  ownerDriverName?: string;
  arrivalTimes?: string[];
  departureTimes?: string[];
  daysOfWeek?: string;
  capacity: number;
  passengerCount: number;
  availableSeats: number;
  marketplaceEnabled: boolean;
}

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

interface MarketplaceItem {
  id: string;
  type: Exclude<FilterType, "all">;
  title: string;
  subtitle: string;
  originCity: string;
  destination: string;
  raw: MarketplaceLine | EventRequest | B2bRequest;
}

interface GoogleSuggestion {
  description: string;
  place_id: string;
}

const TYPE_META = {
  all: { label: "Tudo", icon: "apps-outline" },
  line: { label: "Linhas", icon: "bus-outline" },
  event: { label: "Eventos", icon: "ticket-outline" },
  b2b: { label: "B2B", icon: "business-outline" },
} as const;

const DAYS_MAP: Record<string, string> = { seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom" };
const DAY_OPTIONS = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
] as const;

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatDays(days: string) {
  return days.split(",").map((d) => DAYS_MAP[d.trim()] ?? d.trim()).join(" • ");
}

function matchesText(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

function formatISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(date: Date) {
  return date.toTimeString().slice(0, 5);
}

async function fetchGoogleSuggestions(query: string): Promise<GoogleSuggestion[]> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key || query.length < 3) return [];
  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&language=pt-BR&key=${key}`;
    const res = await fetch(url);
    const json = await res.json();
    return (json.predictions ?? []).slice(0, 5);
  } catch {
    return [];
  }
}

export default function MarketplaceScreen() {
  const router = useRouter();
  const [role, setRole] = useState<Role | undefined>();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [originFilter, setOriginFilter] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [ibgeSuggestions, setIbgeSuggestions] = useState<IBGECity[]>([]);
  const [googleSuggestions, setGoogleSuggestions] = useState<GoogleSuggestion[]>([]);
  const [searchingIBGE, setSearchingIBGE] = useState(false);
  const [searchingGoogle, setSearchingGoogle] = useState(false);
  const [lines, setLines] = useState<MarketplaceLine[]>([]);
  const [myLines, setMyLines] = useState<MarketplaceLine[]>([]);
  const [events, setEvents] = useState<EventRequest[]>([]);
  const [b2bRequests, setB2bRequests] = useState<B2bRequest[]>([]);
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [showLineModal, setShowLineModal] = useState(false);

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("16:00");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventOriginCity, setEventOriginCity] = useState("");
  const [eventDestination, setEventDestination] = useState("");
  const [eventInitialCount, setEventInitialCount] = useState("1");
  const [eventCitySuggestions, setEventCitySuggestions] = useState<IBGECity[]>([]);
  const [eventDestinationSuggestions, setEventDestinationSuggestions] = useState<GoogleSuggestion[]>([]);
  const [searchingEventCity, setSearchingEventCity] = useState(false);
  const [searchingEventDestination, setSearchingEventDestination] = useState(false);

  const [b2bDestination, setB2bDestination] = useState("");
  const [b2bOriginCity, setB2bOriginCity] = useState("");
  const [b2bArrivalTime, setB2bArrivalTime] = useState("09:00");
  const [b2bDepartureTime, setB2bDepartureTime] = useState("18:00");
  const [b2bPassengerCount, setB2bPassengerCount] = useState("15");
  const [b2bDaysOfWeek, setB2bDaysOfWeek] = useState("seg,ter,qua,qui,sex");
  const [b2bNotes, setB2bNotes] = useState("");
  const [b2bCitySuggestions, setB2bCitySuggestions] = useState<IBGECity[]>([]);
  const [b2bDestinationSuggestions, setB2bDestinationSuggestions] = useState<GoogleSuggestion[]>([]);
  const [searchingB2bCity, setSearchingB2bCity] = useState(false);
  const [searchingB2bDestination, setSearchingB2bDestination] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<"eventStart" | "eventEnd" | "b2bArrival" | "b2bDeparture" | null>(null);

  useEffect(() => {
    if (originFilter.length < 2) {
      setIbgeSuggestions([]);
      return;
    }
    setSearchingIBGE(true);
    const timer = setTimeout(async () => {
      const results = await searchIBGECities(originFilter);
      setIbgeSuggestions(results.slice(0, 5));
      setSearchingIBGE(false);
    }, 450);
    return () => {
      clearTimeout(timer);
      setSearchingIBGE(false);
    };
  }, [originFilter]);

  useEffect(() => {
    if (destinationFilter.length < 3) {
      setGoogleSuggestions([]);
      return;
    }
    const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return;
    setSearchingGoogle(true);
    const timer = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(destinationFilter)}&language=pt-BR&key=${key}`;
        const res = await fetch(url);
        const json = await res.json();
        setGoogleSuggestions((json.predictions ?? []).slice(0, 5));
      } catch {
        setGoogleSuggestions([]);
      } finally {
        setSearchingGoogle(false);
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      setSearchingGoogle(false);
    };
  }, [destinationFilter]);

  useEffect(() => {
    if (eventOriginCity.length < 2) {
      setEventCitySuggestions([]);
      return;
    }
    setSearchingEventCity(true);
    const timer = setTimeout(async () => {
      const results = await searchIBGECities(eventOriginCity);
      setEventCitySuggestions(results.slice(0, 5));
      setSearchingEventCity(false);
    }, 450);
    return () => {
      clearTimeout(timer);
      setSearchingEventCity(false);
    };
  }, [eventOriginCity]);

  useEffect(() => {
    if (b2bOriginCity.length < 2) {
      setB2bCitySuggestions([]);
      return;
    }
    setSearchingB2bCity(true);
    const timer = setTimeout(async () => {
      const results = await searchIBGECities(b2bOriginCity);
      setB2bCitySuggestions(results.slice(0, 5));
      setSearchingB2bCity(false);
    }, 450);
    return () => {
      clearTimeout(timer);
      setSearchingB2bCity(false);
    };
  }, [b2bOriginCity]);

  useEffect(() => {
    if (eventDestination.length < 3) {
      setEventDestinationSuggestions([]);
      return;
    }
    setSearchingEventDestination(true);
    const timer = setTimeout(async () => {
      setEventDestinationSuggestions(await fetchGoogleSuggestions(eventDestination));
      setSearchingEventDestination(false);
    }, 450);
    return () => {
      clearTimeout(timer);
      setSearchingEventDestination(false);
    };
  }, [eventDestination]);

  useEffect(() => {
    if (b2bDestination.length < 3) {
      setB2bDestinationSuggestions([]);
      return;
    }
    setSearchingB2bDestination(true);
    const timer = setTimeout(async () => {
      setB2bDestinationSuggestions(await fetchGoogleSuggestions(b2bDestination));
      setSearchingB2bDestination(false);
    }, 450);
    return () => {
      clearTimeout(timer);
      setSearchingB2bDestination(false);
    };
  }, [b2bDestination]);

  const load = useCallback(async () => {
    setLoading(true);
    const session = await getSession();
    setRole(session?.userRole);
    setUserId(session?.userId ?? "");

    try {
      const requests = [
        apiService.get<{ success: boolean; lines?: MarketplaceLine[] }>(ApiEndpoints.LIST_MARKETPLACE_LINES),
        apiService.get<{ success: boolean; requests?: EventRequest[] }>(ApiEndpoints.LIST_EVENT_REQUESTS),
        apiService.get<{ success: boolean; requests?: B2bRequest[] }>(ApiEndpoints.LIST_B2B_REQUESTS),
      ] as const;

      const [lineRes, eventRes, b2bRes] = await Promise.all(requests);
      if (lineRes.data.success) setLines(lineRes.data.lines ?? []);
      if (eventRes.data.success) setEvents(eventRes.data.requests ?? []);
      if (b2bRes.data.success) setB2bRequests(b2bRes.data.requests ?? []);

      if (session?.userRole === "DRIVER") {
        const myLineRes = await apiService.get<{ success: boolean; lines?: MarketplaceLine[] }>(ApiEndpoints.LIST_MY_MARKETPLACE_LINES);
        if (myLineRes.data.success) setMyLines(myLineRes.data.lines ?? []);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar o marketplace.");
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const items = useMemo<MarketplaceItem[]>(() => {
    const next: MarketplaceItem[] = [
      ...lines.map((line) => ({
        id: `line-${line.id}`,
        type: "line" as const,
        title: line.name || `${line.originCity} → ${line.destinationPlace}`,
        subtitle: `${line.originCity} → ${line.destinationPlace}`,
        originCity: line.originCity,
        destination: line.destinationPlace,
        raw: line,
      })),
      ...events.map((event) => ({
        id: `event-${event.id}`,
        type: "event" as const,
        title: event.eventName,
        subtitle: event.destination,
        originCity: event.originCity,
        destination: event.destination,
        raw: event,
      })),
      ...b2bRequests.map((request) => ({
        id: `b2b-${request.id}`,
        type: "b2b" as const,
        title: request.destination,
        subtitle: `${request.originCity} → empresa`,
        originCity: request.originCity,
        destination: request.destination,
        raw: request,
      })),
    ];
    return next.filter((item) => {
      if (filterType !== "all" && item.type !== filterType) return false;
      if (originFilter.trim() && !matchesText(item.originCity, originFilter)) return false;
      if (destinationFilter.trim() && !matchesText(item.destination, destinationFilter)) return false;
      return true;
    });
  }, [b2bRequests, destinationFilter, events, filterType, lines, originFilter]);

  const openChat = async (item: MarketplaceItem) => {
    if (!userId || !role) return;
    setActionId(item.id);
    try {
      const raw: any = item.raw;
      const driverId = item.type === "line" ? raw.ownerDriverId : userId;
      const passengerId = item.type === "line" ? userId : item.type === "event" ? raw.creatorId : raw.companyId;
      const result = await createPrivateConversation({ passengerId, driverId, context: `marketplace-${item.type}` }) as any;
      if (result?.success && result.conversation?.id) {
        const base = role === "DRIVER" ? "/(app)/(driver)/chat" : "/(app)/(passenger)/chat";
        router.push(`${base}/${result.conversation.id}` as any);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível abrir o chat.");
    }
    setActionId(null);
  };

  const toggleLineAd = async (line: MarketplaceLine) => {
    setActionId(`my-line-${line.id}`);
    try {
      const url = ApiEndpoints.UPDATE_MARKETPLACE_LINE.replace(":id", line.id);
      const enabled = !line.marketplaceEnabled;
      const res = await apiService.patch<{ success: boolean; error?: { message?: string } }>(url, { enabled });
      if (res.data.success) {
        setMyLines((current) => current.map((item) => item.id === line.id ? { ...item, marketplaceEnabled: enabled } : item));
        await load();
      } else {
        Alert.alert("Erro", res.data.error?.message ?? "Não foi possível atualizar o anúncio.");
      }
    } catch (error: any) {
      Alert.alert("Erro", error?.response?.data?.error?.message ?? "Não foi possível atualizar o anúncio.");
    }
    setActionId(null);
  };

  const handleDateSelected = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (date) setEventDate(formatISODate(date));
  };

  const handleTimeSelected = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") setTimePickerTarget(null);
    if (!date || !timePickerTarget) return;
    const time = formatTime(date);
    if (timePickerTarget === "eventStart") setEventStartTime(time);
    if (timePickerTarget === "eventEnd") setEventEndTime(time);
    if (timePickerTarget === "b2bArrival") setB2bArrivalTime(time);
    if (timePickerTarget === "b2bDeparture") setB2bDepartureTime(time);
  };

  const createEvent = async () => {
    if (!eventName.trim() || !eventDate || !eventOriginCity.trim() || !eventDestination.trim()) {
      Alert.alert("Atenção", "Preencha os campos obrigatórios do evento.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiService.post<any>(ApiEndpoints.CREATE_EVENT_REQUEST, {
        eventName: eventName.trim(),
        eventDate,
        startTime: eventStartTime,
        endTime: eventEndTime || null,
        originCity: eventOriginCity.trim(),
        destination: eventDestination.trim(),
        initialCount: parseInt(eventInitialCount, 10) || 1,
      });
      if (res.data?.success) {
        setCreateMode(null);
        setEventName(""); setEventDate(""); setEventEndTime(""); setEventOriginCity(""); setEventDestination(""); setEventInitialCount("1");
        await load();
      } else {
        Alert.alert("Erro", res.data?.error?.message ?? "Não foi possível publicar.");
      }
    } catch (error: any) {
      Alert.alert("Erro", error?.response?.data?.error?.message ?? "Não foi possível publicar.");
    }
    setSaving(false);
  };

  const createB2b = async () => {
    if (!b2bDestination.trim() || !b2bOriginCity.trim()) {
      Alert.alert("Atenção", "Destino e cidade são obrigatórios.");
      return;
    }
    if (!b2bDaysOfWeek) {
      Alert.alert("Atenção", "Selecione pelo menos um dia da semana.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiService.post<any>(ApiEndpoints.CREATE_B2B_REQUEST, {
        destination: b2bDestination.trim(),
        originCity: b2bOriginCity.trim(),
        arrivalTime: b2bArrivalTime,
        departureTime: b2bDepartureTime,
        passengerCount: parseInt(b2bPassengerCount, 10) || 1,
        daysOfWeek: b2bDaysOfWeek,
        notes: b2bNotes.trim() || undefined,
      });
      if (res.data?.success) {
        setCreateMode(null);
        setB2bDestination(""); setB2bOriginCity(""); setB2bPassengerCount("15"); setB2bNotes("");
        await load();
      } else {
        Alert.alert("Erro", res.data?.error?.message ?? "Não foi possível publicar.");
      }
    } catch (error: any) {
      Alert.alert("Erro", error?.response?.data?.error?.message ?? "Não foi possível publicar.");
    }
    setSaving(false);
  };

  const toggleB2bDay = (day: string) => {
    setB2bDaysOfWeek((current) => {
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
        <View style={styles.headerText}>
          <Text style={styles.title}>Marketplace</Text>
          <Text style={styles.subtitle}>Linhas regulares, eventos e contratos B2B</Text>
        </View>
        {role === "DRIVER" ? (
          <Pressable style={styles.headerButton} onPress={() => setShowLineModal(true)}>
            <Ionicons name="megaphone-outline" size={18} color={theme.colors.text.inverse} />
            <Text style={styles.headerButtonText}>Linhas</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.headerButton} onPress={() => setCreateMode("event")}>
            <Ionicons name="add" size={18} color={theme.colors.text.inverse} />
            <Text style={styles.headerButtonText}>Criar</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilters}>
            {(["all", "line", "event", "b2b"] as const).map((type) => {
              const selected = filterType === type;
              return (
                <Pressable key={type} style={[styles.typeChip, selected && styles.typeChipActive]} onPress={() => setFilterType(type)}>
                  <Ionicons name={TYPE_META[type].icon as any} size={16} color={selected ? theme.colors.text.inverse : theme.colors.brand.navy} />
                  <Text style={[styles.typeChipText, selected && styles.typeChipTextActive]}>{TYPE_META[type].label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.filterInputs}>
            <View style={styles.filterField}>
              <View style={styles.filterInputRow}>
                <Ionicons name="business-outline" size={16} color={theme.colors.text.muted} />
                <TextInput
                  style={styles.filterInput}
                  value={originFilter}
                  onChangeText={setOriginFilter}
                  placeholder="Cidade de saída"
                  placeholderTextColor={theme.colors.text.muted}
                />
                {searchingIBGE && <ActivityIndicator size="small" color={theme.colors.brand.orange} />}
                {!!originFilter && !searchingIBGE && (
                  <Pressable onPress={() => { setOriginFilter(""); setIbgeSuggestions([]); }}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.text.muted} />
                  </Pressable>
                )}
              </View>
              {ibgeSuggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {ibgeSuggestions.map((city) => (
                    <Pressable
                      key={city.id}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setOriginFilter(city.nome);
                        setIbgeSuggestions([]);
                      }}
                    >
                      <Text style={styles.suggestionText}>{city.nome}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.filterField}>
              <View style={styles.filterInputRow}>
                <Ionicons name="location-outline" size={16} color={theme.colors.text.muted} />
                <TextInput
                  style={styles.filterInput}
                  value={destinationFilter}
                  onChangeText={setDestinationFilter}
                  placeholder="Destino"
                  placeholderTextColor={theme.colors.text.muted}
                />
                {searchingGoogle && <ActivityIndicator size="small" color={theme.colors.brand.orange} />}
                {!!destinationFilter && !searchingGoogle && (
                  <Pressable onPress={() => { setDestinationFilter(""); setGoogleSuggestions([]); }}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.text.muted} />
                  </Pressable>
                )}
              </View>
              {googleSuggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {googleSuggestions.map((place) => (
                    <Pressable
                      key={place.place_id}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setDestinationFilter(place.description);
                        setGoogleSuggestions([]);
                      }}
                    >
                      <Text style={styles.suggestionText}>{place.description}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={44} color={theme.colors.text.muted} />
            <Text style={styles.emptyTitle}>Nenhum anúncio encontrado</Text>
            <Text style={styles.emptyText}>Ajuste os filtros ou publique uma nova oportunidade.</Text>
          </View>
        ) : (
          items.map((item) => (
            <MarketplaceCard
              key={item.id}
              item={item}
              role={role}
              userId={userId}
              loading={actionId === item.id}
              onChat={() => openChat(item)}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={showLineModal} animationType="slide" transparent onRequestClose={() => setShowLineModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Anunciar minhas linhas</Text>
              <Pressable style={styles.closeIcon} onPress={() => setShowLineModal(false)}>
                <Ionicons name="close" size={22} color={theme.colors.text.primary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              {myLines.length === 0 ? (
                <Text style={styles.emptyText}>Você ainda não tem linhas cadastradas.</Text>
              ) : myLines.map((line) => (
                <View key={line.id} style={styles.lineAdRow}>
                  <View style={styles.lineAdInfo}>
                    <Text style={styles.lineAdTitle}>{line.name}</Text>
                    <Text style={styles.lineAdSubtitle}>{line.originCity} → {line.destinationPlace}</Text>
                  </View>
                  <Pressable
                    style={[styles.toggleButton, line.marketplaceEnabled && styles.toggleButtonActive]}
                    onPress={() => toggleLineAd(line)}
                    disabled={actionId === `my-line-${line.id}`}
                  >
                    {actionId === `my-line-${line.id}` ? (
                      <ActivityIndicator size="small" color={line.marketplaceEnabled ? theme.colors.text.inverse : theme.colors.brand.orange} />
                    ) : (
                      <Text style={[styles.toggleText, line.marketplaceEnabled && styles.toggleTextActive]}>
                        {line.marketplaceEnabled ? "Anunciada" : "Anunciar"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!createMode} animationType="slide" transparent onRequestClose={() => setCreateMode(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Criar anúncio</Text>
              <Pressable style={styles.closeIcon} onPress={() => setCreateMode(null)}>
                <Ionicons name="close" size={22} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <View style={styles.createTypeToggle}>
              {(["event", "b2b"] as const).map((mode) => {
                const selected = createMode === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[styles.createTypeButton, selected && styles.createTypeButtonActive]}
                    onPress={() => setCreateMode(mode)}
                  >
                    <Ionicons
                      name={mode === "event" ? "ticket-outline" : "business-outline"}
                      size={16}
                      color={selected ? theme.colors.text.inverse : theme.colors.brand.navy}
                    />
                    <Text style={[styles.createTypeText, selected && styles.createTypeTextActive]}>
                      {mode === "event" ? "Evento" : "B2B"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <ScrollView style={styles.createFormScroll} contentContainerStyle={styles.createFormContent} keyboardShouldPersistTaps="handled">

              {createMode === "event" ? (
                <>
                  <Input label="Evento *" value={eventName} onChangeText={setEventName} placeholder="Jogo do Corinthians" />
                  <PickerButton
                    label="Data do evento *"
                    value={eventDate ? formatDate(eventDate) : "Selecionar data"}
                    icon="calendar-outline"
                    onPress={() => setShowDatePicker(true)}
                  />
                  <View style={styles.inputRow}>
                    <PickerButton
                      label="Início"
                      value={eventStartTime}
                      icon="time-outline"
                      onPress={() => setTimePickerTarget("eventStart")}
                    />
                    <PickerButton
                      label="Fim opcional"
                      value={eventEndTime || "Sem fim"}
                      icon="time-outline"
                      onPress={() => setTimePickerTarget("eventEnd")}
                      onClear={eventEndTime ? () => setEventEndTime("") : undefined}
                    />
                  </View>
                  <AutocompleteInput
                    label="Cidade de saída *"
                    value={eventOriginCity}
                    onChangeText={setEventOriginCity}
                    placeholder="Caçapava"
                    icon="business-outline"
                    loading={searchingEventCity}
                    suggestions={eventCitySuggestions.map((city) => ({ id: String(city.id), label: city.nome }))}
                    onSelect={(label) => { setEventOriginCity(label); setEventCitySuggestions([]); }}
                    onClear={() => { setEventOriginCity(""); setEventCitySuggestions([]); }}
                  />
                  <AutocompleteInput
                    label="Local do evento *"
                    value={eventDestination}
                    onChangeText={setEventDestination}
                    placeholder="Arena Corinthians, São Paulo"
                    icon="location-outline"
                    loading={searchingEventDestination}
                    suggestions={eventDestinationSuggestions.map((place) => ({ id: place.place_id, label: place.description }))}
                    onSelect={(label) => { setEventDestination(label); setEventDestinationSuggestions([]); }}
                    onClear={() => { setEventDestination(""); setEventDestinationSuggestions([]); }}
                  />
                  <Input label="Amigos confirmados" value={eventInitialCount} onChangeText={setEventInitialCount} placeholder="3" keyboardType="numeric" />
                </>
              ) : (
                <>
                  <AutocompleteInput
                    label="Destino da empresa *"
                    value={b2bDestination}
                    onChangeText={setB2bDestination}
                    placeholder="Av. Industrial, 500 - São José dos Campos"
                    icon="location-outline"
                    loading={searchingB2bDestination}
                    suggestions={b2bDestinationSuggestions.map((place) => ({ id: place.place_id, label: place.description }))}
                    onSelect={(label) => { setB2bDestination(label); setB2bDestinationSuggestions([]); }}
                    onClear={() => { setB2bDestination(""); setB2bDestinationSuggestions([]); }}
                  />
                  <AutocompleteInput
                    label="Cidade de saída *"
                    value={b2bOriginCity}
                    onChangeText={setB2bOriginCity}
                    placeholder="Caçapava"
                    icon="business-outline"
                    loading={searchingB2bCity}
                    suggestions={b2bCitySuggestions.map((city) => ({ id: String(city.id), label: city.nome }))}
                    onSelect={(label) => { setB2bOriginCity(label); setB2bCitySuggestions([]); }}
                    onClear={() => { setB2bOriginCity(""); setB2bCitySuggestions([]); }}
                  />
                  <View style={styles.inputRow}>
                    <PickerButton
                      label="Chegada"
                      value={b2bArrivalTime}
                      icon="time-outline"
                      onPress={() => setTimePickerTarget("b2bArrival")}
                    />
                    <PickerButton
                      label="Saída"
                      value={b2bDepartureTime}
                      icon="time-outline"
                      onPress={() => setTimePickerTarget("b2bDeparture")}
                    />
                  </View>
                  <Input label="Funcionários" value={b2bPassengerCount} onChangeText={setB2bPassengerCount} placeholder="15" keyboardType="numeric" />
                  <DaySelector value={b2bDaysOfWeek} onToggle={toggleB2bDay} />
                  <Input label="Observações" value={b2bNotes} onChangeText={setB2bNotes} placeholder="Informações adicionais" multiline />
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setCreateMode(null)} disabled={saving}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, saving && styles.disabled]} onPress={createMode === "event" ? createEvent : createB2b} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={theme.colors.text.inverse} /> : <Text style={styles.saveText}>Publicar</Text>}
              </Pressable>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={eventDate ? new Date(`${eventDate}T12:00:00`) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={handleDateSelected}
              />
            )}

            {timePickerTarget && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                is24Hour
                onChange={handleTimeSelected}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MarketplaceCard({ item, role, userId, loading, onChat }: { item: MarketplaceItem; role?: Role; userId: string; loading: boolean; onChat: () => void }) {
  const color = item.type === "line" ? theme.colors.brand.navy : item.type === "event" ? theme.colors.brand.orange : theme.colors.feedback.success;
  const raw: any = item.raw;
  const canChat =
    (item.type === "line" && role === "PASSENGER" && raw.ownerDriverId !== userId) ||
    (item.type === "event" && role === "DRIVER" && raw.creatorId !== userId) ||
    (item.type === "b2b" && role === "DRIVER" && raw.companyId !== userId);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardMain}>
          <View style={[styles.kindBadge, { backgroundColor: color + "18" }]}>
            <Ionicons name={TYPE_META[item.type].icon as any} size={14} color={color} />
            <Text style={[styles.kindText, { color }]}>{TYPE_META[item.type].label}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </View>
      </View>

      {item.type === "line" && (
        <View style={styles.details}>
          <Detail icon="person-outline" text={`Motorista: ${raw.ownerDriverName ?? raw.ownerDriverId}`} />
          <Detail icon="people-outline" text={`${raw.availableSeats} vaga(s) livres de ${raw.capacity}`} />
          <Detail icon="calendar-outline" text={formatDays(raw.daysOfWeek ?? "seg,ter,qua,qui,sex")} />
          <Detail icon="flag-outline" text={`Chegada: ${(raw.arrivalTimes ?? []).join(" • ") || "-"}`} />
          <Detail icon="return-down-back-outline" text={`Saída: ${(raw.departureTimes ?? []).join(" • ") || "-"}`} />
        </View>
      )}

      {item.type === "event" && (
        <View style={styles.details}>
          <Detail icon="calendar-outline" text={formatDate(raw.eventDate)} />
          <Detail icon="time-outline" text={`${raw.startTime}${raw.endTime ? ` às ${raw.endTime}` : ""}`} />
          <Detail icon="location-outline" text={`Saída de ${raw.originCity}`} />
          <Detail icon="people-outline" text={`${raw.interestedCount} interessado(s)`} />
        </View>
      )}

      {item.type === "b2b" && (
        <View style={styles.details}>
          <Detail icon="location-outline" text={`Saída de ${raw.originCity}`} />
          <Detail icon="time-outline" text={`${raw.arrivalTime} chegada • ${raw.departureTime} saída`} />
          <Detail icon="people-outline" text={`${raw.passengerCount} funcionários`} />
          <Detail icon="calendar-outline" text={formatDays(raw.daysOfWeek)} />
          {!!raw.notes && <Text style={styles.notes}>{raw.notes}</Text>}
        </View>
      )}

      {canChat && (
        <Pressable style={[styles.chatButton, loading && styles.disabled]} onPress={onChat} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={theme.colors.text.inverse} /> : (
            <>
              <Ionicons name="chatbubble-outline" size={16} color={theme.colors.text.inverse} />
              <Text style={styles.chatButtonText}>{item.type === "line" ? "Conversar com motorista" : "Tenho interesse"}</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

function Detail({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={14} color={theme.colors.text.muted} />
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

function Input(props: ComponentProps<typeof TextInput> & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, rest.multiline && styles.inputMultiline, style]}
        placeholderTextColor={theme.colors.text.muted}
        {...rest}
      />
    </View>
  );
}

function AutocompleteInput({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  loading,
  suggestions,
  onSelect,
  onClear,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: string;
  loading: boolean;
  suggestions: { id: string; label: string }[];
  onSelect: (label: string) => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.autocompleteInputRow}>
        <Ionicons name={icon as any} size={16} color={theme.colors.text.muted} />
        <TextInput
          style={styles.autocompleteInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.muted}
        />
        {loading && <ActivityIndicator size="small" color={theme.colors.brand.orange} />}
        {!!value && !loading && (
          <Pressable onPress={onClear}>
            <Ionicons name="close-circle" size={18} color={theme.colors.text.muted} />
          </Pressable>
        )}
      </View>
      {suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {suggestions.map((suggestion) => (
            <Pressable key={suggestion.id} style={styles.suggestionItem} onPress={() => onSelect(suggestion.label)}>
              <Text style={styles.suggestionText}>{suggestion.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function PickerButton({
  label,
  value,
  icon,
  onPress,
  onClear,
}: {
  label: string;
  value: string;
  icon: string;
  onPress: () => void;
  onClear?: () => void;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable style={styles.pickerButton} onPress={onPress}>
        <Ionicons name={icon as any} size={16} color={theme.colors.text.muted} />
        <Text style={styles.pickerButtonText}>{value}</Text>
        {onClear ? (
          <Pressable style={styles.clearPickerButton} onPress={onClear}>
            <Ionicons name="close-circle" size={18} color={theme.colors.text.muted} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={16} color={theme.colors.text.muted} />
        )}
      </Pressable>
    </View>
  );
}

function DaySelector({ value, onToggle }: { value: string; onToggle: (day: string) => void }) {
  const selected = value.split(",").filter(Boolean);
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>Dias da semana *</Text>
      <View style={styles.dayGrid}>
        {DAY_OPTIONS.map((day) => {
          const isSelected = selected.includes(day.key);
          return (
            <Pressable
              key={day.key}
              style={[styles.dayButton, isSelected && styles.dayButtonActive]}
              onPress={() => onToggle(day.key)}
            >
              <Text style={[styles.dayButtonText, isSelected && styles.dayButtonTextActive]}>
                {day.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.soft,
  },
  headerText: { flex: 1 },
  title: { fontSize: theme.font.xl, fontWeight: "800", color: theme.colors.text.primary },
  subtitle: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  headerButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brand.orange,
    paddingHorizontal: theme.spacing.md,
  },
  headerButtonText: { fontSize: theme.font.sm, fontWeight: "800", color: theme.colors.text.inverse },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  filterPanel: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  typeFilters: { gap: theme.spacing.sm },
  typeChip: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    paddingHorizontal: theme.spacing.md,
  },
  typeChipActive: { backgroundColor: theme.colors.brand.navy, borderColor: theme.colors.brand.navy },
  typeChipText: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.brand.navy },
  typeChipTextActive: { color: theme.colors.text.inverse },
  filterInputs: { gap: theme.spacing.sm },
  filterField: { gap: theme.spacing.xs },
  filterInputRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background.screen,
  },
  filterInput: {
    flex: 1,
    minHeight: 40,
    color: theme.colors.text.primary,
  },
  suggestionsBox: {
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.card,
    overflow: "hidden",
  },
  suggestionItem: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.soft,
  },
  suggestionText: { fontSize: theme.font.sm, color: theme.colors.text.primary },
  empty: { alignItems: "center", paddingVertical: theme.spacing.xxl, gap: theme.spacing.sm },
  emptyTitle: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  emptyText: { fontSize: theme.font.sm, color: theme.colors.text.secondary, textAlign: "center", lineHeight: 20 },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadow.card,
  },
  cardHeader: { flexDirection: "row", gap: theme.spacing.md },
  cardMain: { flex: 1, gap: theme.spacing.xs },
  kindBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  kindText: { fontSize: theme.font.xs, fontWeight: "800" },
  cardTitle: { fontSize: theme.font.md, fontWeight: "800", color: theme.colors.text.primary },
  cardSubtitle: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  details: { gap: theme.spacing.xs },
  detailRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  detailText: { flex: 1, fontSize: theme.font.sm, color: theme.colors.text.secondary },
  notes: { fontSize: theme.font.sm, color: theme.colors.text.muted, fontStyle: "italic" },
  chatButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brand.orange,
  },
  chatButtonText: { fontSize: theme.font.sm, fontWeight: "800", color: theme.colors.text.inverse },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  modalCard: {
    maxHeight: "88%",
    minHeight: "62%",
    backgroundColor: theme.colors.background.card,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  modalTitle: { flex: 1, fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  createTypeToggle: {
    flexDirection: "row",
    padding: 3,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.muted,
  },
  createTypeButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  createTypeButtonActive: {
    backgroundColor: theme.colors.brand.navy,
  },
  createTypeText: {
    fontSize: theme.font.sm,
    fontWeight: "800",
    color: theme.colors.brand.navy,
  },
  createTypeTextActive: {
    color: theme.colors.text.inverse,
  },
  closeIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.muted,
  },
  modalList: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
  createFormScroll: { flex: 1 },
  createFormContent: { gap: theme.spacing.md, paddingBottom: theme.spacing.sm },
  lineAdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  lineAdInfo: { flex: 1 },
  lineAdTitle: { fontSize: theme.font.md, fontWeight: "800", color: theme.colors.text.primary },
  lineAdSubtitle: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  toggleButton: {
    minWidth: 92,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.brand.orange,
  },
  toggleButtonActive: { backgroundColor: theme.colors.brand.orange },
  toggleText: { fontSize: theme.font.sm, fontWeight: "800", color: theme.colors.brand.orange },
  toggleTextActive: { color: theme.colors.text.inverse },
  inputWrap: { flex: 1, gap: theme.spacing.xs },
  inputRow: { flexDirection: "row", gap: theme.spacing.md },
  inputLabel: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary },
  input: {
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.font.md,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.screen,
  },
  inputMultiline: { minHeight: 74, textAlignVertical: "top" },
  autocompleteInputRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background.screen,
  },
  autocompleteInput: {
    flex: 1,
    minHeight: 44,
    fontSize: theme.font.md,
    color: theme.colors.text.primary,
  },
  pickerButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background.screen,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: theme.font.md,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  clearPickerButton: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
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
    backgroundColor: theme.colors.background.screen,
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
  modalActions: { flexDirection: "row", gap: theme.spacing.md },
  cancelBtn: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
  },
  cancelText: { fontSize: theme.font.md, fontWeight: "800", color: theme.colors.text.primary },
  saveBtn: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brand.orange,
  },
  saveText: { fontSize: theme.font.md, fontWeight: "800", color: theme.colors.text.inverse },
  disabled: { opacity: 0.7 },
});
