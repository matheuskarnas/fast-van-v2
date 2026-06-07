import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { theme } from "../../../../../constants/theme";
import { getLineById } from "../../../../../services/driverLines";
import { getOperationsDashboard, type RoutePoint } from "../../../../../services/operations";

type Segment = "ida" | "volta";

const SEGMENT_COLORS: Record<Segment, string> = {
  ida: theme.colors.brand.orange,
  volta: theme.colors.brand.navy,
};

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface DestinationPoint extends Coordinate {
  address: string;
}

interface RouteInfo {
  distanceM: number;
  durationS: number;
  coordinates: Coordinate[];
}

interface DirectionsResult {
  route: RouteInfo | null;
  error?: string;
}

const FATEC_SJC_COORDINATE: DestinationPoint = {
  address: "FATEC São José dos Campos - Prof. Jessen Vidal",
  latitude: -23.162919,
  longitude: -45.795046,
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function decodePolyline(encoded: string): Coordinate[] {
  const coordinates: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coordinates;
}

function looksLikeFatecSjc(address: string) {
  const normalized = address.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalized.includes("fatec") && (
    normalized.includes("sjc") ||
    normalized.includes("sao jose") ||
    normalized.includes("jose dos campos")
  );
}

async function resolveDestinationPlace(address: string, city?: string): Promise<DestinationPoint | null> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!address) return null;
  if (looksLikeFatecSjc(address)) return FATEC_SJC_COORDINATE;
  if (!key) return null;
  const searches = [
    `${address}, São José dos Campos, SP, Brasil`,
    city ? `${address}, ${city}, SP, Brasil` : "",
    `${address}, Brasil`,
    address,
  ].filter(Boolean);

  try {
    for (const search of searches) {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({
          textQuery: search,
          languageCode: "pt-BR",
          regionCode: "BR",
          maxResultCount: 1,
        }),
      });
      const json = await response.json();
      const place = json.places?.[0];
      const location = place?.location;
      if (location) {
        return {
          address: place.formattedAddress || place.displayName?.text || address,
          latitude: location.latitude,
          longitude: location.longitude,
        };
      }
    }
    return looksLikeFatecSjc(address) ? FATEC_SJC_COORDINATE : null;
  } catch {
    return looksLikeFatecSjc(address) ? FATEC_SJC_COORDINATE : null;
  }
}

async function fetchDirections(waypoints: Coordinate[]): Promise<DirectionsResult> {
  if (waypoints.length < 2) return { route: null };
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return { route: null, error: "Chave do Google Maps não configurada." };

  const [origin, ...rest] = waypoints;
  const destination = rest[rest.length - 1];
  const intermediates = rest.slice(0, -1);

  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { location: { latLng: toRoutesLatLng(origin) } },
        destination: { location: { latLng: toRoutesLatLng(destination) } },
        intermediates: intermediates.map((point) => ({ location: { latLng: toRoutesLatLng(point) } })),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        computeAlternativeRoutes: false,
        languageCode: "pt-BR",
        units: "METRIC",
      }),
    });
    const json = await response.json();
    const route = json.routes?.[0];
    if (!response.ok || !route) {
      const message = json.error?.message || "Não foi possível calcular o trajeto pela Routes API.";
      console.warn("Routes API falhou", response.status, message);
      return { route: null, error: message };
    }
    const encodedPolyline = route.polyline?.encodedPolyline;
    if (!encodedPolyline) {
      return { route: null, error: "A API não retornou o desenho do trajeto." };
    }
    return {
      route: {
        distanceM: route.distanceMeters ?? 0,
        durationS: Number.parseInt(String(route.duration ?? "0s").replace("s", ""), 10) || 0,
        coordinates: decodePolyline(encodedPolyline),
      },
    };
  } catch {
    return { route: null, error: "Falha de rede ao calcular o trajeto." };
  }
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes} min`;
}

function hasCoordinates(point: RoutePoint): point is RoutePoint & Coordinate {
  return point.latitude != null && point.longitude != null;
}

function compareRoutePoints(a: RoutePoint, b: RoutePoint) {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.id.localeCompare(b.id);
}

function toRoutesLatLng(point: Coordinate) {
  return {
    latitude: point.latitude,
    longitude: point.longitude,
  };
}

export default function LineMapScreen() {
  const { lineId } = useLocalSearchParams<{ lineId: string }>();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [activeSegment, setActiveSegment] = useState<Segment>("ida");
  const [lineDestination, setLineDestination] = useState("");
  const [destination, setDestination] = useState<DestinationPoint | null>(null);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<RoutePoint | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeError, setRouteError] = useState("");
  const [loading, setLoading] = useState(true);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const date = todayISO();

  const load = useCallback(async () => {
    if (!lineId) return;
    setLoading(true);
    const [lineResult, dashboardResult] = await Promise.all([
      getLineById(lineId),
      getOperationsDashboard(lineId, date),
    ]);

    if (!lineResult.success || !lineResult.line) {
      Alert.alert("Erro", "Linha não encontrada.");
      router.back();
      return;
    }

    setLineDestination(lineResult.line.destinationPlace);
    setDestination(await resolveDestinationPlace(lineResult.line.destinationPlace, lineResult.line.originCity));

    if (dashboardResult.success) {
      setRoutePoints(dashboardResult.routePoints ?? []);
    } else {
      Alert.alert("Erro", dashboardResult.error?.message ?? "Não foi possível carregar a rota do dia.");
    }

    setLoading(false);
  }, [date, lineId, router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visiblePoints = useMemo(
    () => routePoints
      .filter((point) => point.segment === activeSegment && hasCoordinates(point))
      .sort(compareRoutePoints),
    [activeSegment, routePoints],
  );

  const routeWaypoints = useMemo(() => {
    const pointCoordinates: Coordinate[] = visiblePoints.map((point) => ({
      latitude: point.latitude!,
      longitude: point.longitude!,
    }));
    if (!destination) return pointCoordinates;
    if (activeSegment === "ida") return [...pointCoordinates, destination];
    return [destination, ...pointCoordinates];
  }, [activeSegment, destination, visiblePoints]);

  useEffect(() => {
    let active = true;
    async function calculate() {
      setRouteInfo(null);
      setRouteError("");
      if (routeWaypoints.length < 2) return;
      setCalculatingRoute(true);
      const result = await fetchDirections(routeWaypoints);
      if (active) {
        setRouteInfo(result.route);
        setRouteError(result.error ?? "");
        setCalculatingRoute(false);
      }
    }
    calculate();
    return () => { active = false; };
  }, [routeWaypoints]);

  useEffect(() => {
    const coordinates = routeInfo?.coordinates.length ? routeInfo.coordinates : routeWaypoints;
    if (coordinates.length === 0 || !mapRef.current) return;
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 110, right: 40, bottom: 170, left: 40 },
        animated: true,
      });
    }, 300);
  }, [routeInfo, routeWaypoints]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand.orange} />
        </View>
      </SafeAreaView>
    );
  }

  const center = routeWaypoints[0] || destination || { latitude: -23.1791, longitude: -45.8872 };
  const activeColor = SEGMENT_COLORS[activeSegment];

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{ ...center, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        showsUserLocation
        showsMyLocationButton
      >
        {routeInfo?.coordinates.length ? (
          <Polyline coordinates={routeInfo.coordinates} strokeColor={activeColor} strokeWidth={5} />
        ) : null}

        {destination && (
          <Marker
            identifier="destination"
            coordinate={destination}
            title={activeSegment === "ida" ? "Destino da ida" : "Origem da volta"}
            description={lineDestination}
            pinColor={theme.colors.feedback.success}
          />
        )}

        {visiblePoints.map((point) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.latitude!, longitude: point.longitude! }}
            title={point.address}
            description={`${activeSegment === "ida" ? "Ida" : "Volta"} · ${point.confirmedPassengerIds?.length ?? 0} passageiro(s) confirmado(s)`}
            onPress={() => setSelectedPoint(point)}
            pinColor={activeColor}
          />
        ))}
      </MapView>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtnOverlay}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text.primary} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Mapa da rota</Text>
            <Text style={styles.headerSub}>{date}</Text>
          </View>
        </View>

        <View style={styles.segmentToggle}>
          {(["ida", "volta"] as const).map((segment) => {
            const selected = activeSegment === segment;
            return (
              <Pressable
                key={segment}
                style={[styles.segmentButton, selected && { backgroundColor: SEGMENT_COLORS[segment], borderColor: SEGMENT_COLORS[segment] }]}
                onPress={() => { setActiveSegment(segment); setSelectedPoint(null); }}
              >
                <Ionicons
                  name={segment === "ida" ? "arrow-forward-circle" : "return-down-back"}
                  size={16}
                  color={selected ? theme.colors.text.inverse : SEGMENT_COLORS[segment]}
                />
                <Text style={[styles.segmentButtonText, selected && { color: theme.colors.text.inverse }]}>
                  {segment === "ida" ? "Ida" : "Volta"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      <View style={styles.routeInfoCard}>
        {calculatingRoute ? (
          <View style={styles.routeInfoRow}>
            <ActivityIndicator size="small" color={activeColor} />
            <Text style={styles.routeInfoLabel}>Calculando trajeto...</Text>
          </View>
        ) : routeInfo ? (
          <>
            <View style={styles.routeInfoRow}>
              <View style={[styles.routeInfoDot, { backgroundColor: activeColor }]} />
              <Text style={styles.routeInfoLabel}>{activeSegment === "ida" ? "Ida" : "Volta"}</Text>
              <Text style={styles.routeInfoValue}>{formatDistance(routeInfo.distanceM)}</Text>
              <Text style={styles.routeInfoSep}>·</Text>
              <Text style={styles.routeInfoValue}>{formatDuration(routeInfo.durationS)}</Text>
            </View>
            <Text style={styles.routeInfoHint}>
              {visiblePoints.length} ponto(s) ativo(s) com passageiros confirmados · {activeSegment === "ida" ? "termina no destino" : "começa no destino"}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.routeInfoHint}>
              {visiblePoints.length === 0
                ? "Nenhum ponto ativo para este trecho hoje."
                : routeError || "Selecione pelo menos um ponto com localização e o destino da linha."}
            </Text>
            {!!routeError && (
              <Text style={styles.routeErrorHint}>
                A linha reta foi removida; só vou desenhar quando a Routes API retornar o trajeto real.
              </Text>
            )}
          </>
        )}
      </View>

      {selectedPoint && (
        <View style={styles.pointCard}>
          <View style={styles.pointCardHeader}>
            <View style={[styles.pointTypeBadge, { backgroundColor: activeColor + "20" }]}>
              <Text style={[styles.pointTypeText, { color: activeColor }]}>
                {activeSegment === "ida" ? "Ida" : "Volta"} · {selectedPoint.confirmedPassengerIds?.length ?? 0} confirmado(s)
              </Text>
            </View>
            <Pressable onPress={() => setSelectedPoint(null)}>
              <Ionicons name="close" size={20} color={theme.colors.text.muted} />
            </Pressable>
          </View>
          <Text style={styles.pointAddress}>{selectedPoint.address}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.xl },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, gap: theme.spacing.sm },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  backBtnOverlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.card,
  },
  headerInfo: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.shadow.card,
  },
  headerTitle: { fontSize: theme.font.md, fontWeight: "800", color: theme.colors.text.primary },
  headerSub: { fontSize: theme.font.xs, color: theme.colors.text.secondary },
  segmentToggle: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: theme.radius.pill,
    padding: 4,
    gap: 4,
    ...theme.shadow.card,
  },
  segmentButton: {
    minWidth: 96,
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
  },
  segmentButtonText: { fontSize: theme.font.sm, fontWeight: "800", color: theme.colors.text.primary },
  routeInfoCard: {
    position: "absolute",
    bottom: theme.spacing.xl,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    ...theme.shadow.card,
  },
  routeInfoRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  routeInfoDot: { width: 10, height: 10, borderRadius: 5 },
  routeInfoLabel: { fontSize: theme.font.sm, color: theme.colors.text.secondary, fontWeight: "700" },
  routeInfoValue: { fontSize: theme.font.sm, color: theme.colors.text.primary, fontWeight: "800" },
  routeInfoSep: { fontSize: theme.font.sm, color: theme.colors.text.muted },
  routeInfoHint: { fontSize: theme.font.xs, color: theme.colors.text.secondary, lineHeight: 18 },
  routeErrorHint: { fontSize: theme.font.xs, color: theme.colors.feedback.error, lineHeight: 18 },
  pointCard: {
    position: "absolute",
    bottom: 110,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadow.card,
  },
  pointCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pointTypeBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.pill },
  pointTypeText: { fontSize: theme.font.xs, fontWeight: "800" },
  pointAddress: { fontSize: theme.font.md, fontWeight: "600", color: theme.colors.text.primary },
});
