import { useCallback, useEffect, useRef, useState } from "react";
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
import { getLineById, type LinePoint } from "../../../../../services/driverLines";

const SEGMENT_COLORS = {
  ida: theme.colors.brand.orange,
  volta: theme.colors.brand.navy,
};

const TYPE_ICONS = {
  pickup: "↑",
  dropoff: "↓",
};

interface RouteInfo {
  distanceM: number;
  durationS: number;
}

async function fetchRouteInfo(waypoints: { latitude: number; longitude: number }[]): Promise<RouteInfo | null> {
  if (waypoints.length < 2) return null;
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const origin = `${waypoints[0].latitude},${waypoints[0].longitude}`;
  const destination = `${waypoints[waypoints.length - 1].latitude},${waypoints[waypoints.length - 1].longitude}`;
  const mid = waypoints.slice(1, -1).map((p) => `${p.latitude},${p.longitude}`).join("|");
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${mid ? `&waypoints=${encodeURIComponent(mid)}` : ""}&key=${key}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== "OK" || !json.routes[0]) return null;
    const legs = json.routes[0].legs as any[];
    const distanceM = legs.reduce((s: number, l: any) => s + l.distance.value, 0);
    const durationS = legs.reduce((s: number, l: any) => s + l.duration.value, 0);
    return { distanceM, durationS };
  } catch { return null; }
}

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const min = Math.round((s % 3600) / 60);
  if (h > 0) return `${h}h ${min}min`;
  return `${min} min`;
}

export default function LineMapScreen() {
  const { lineId } = useLocalSearchParams<{ lineId: string }>();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [points, setPoints] = useState<LinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<LinePoint | null>(null);
  const [idaRoute, setIdaRoute] = useState<RouteInfo | null>(null);
  const [voltaRoute, setVoltaRoute] = useState<RouteInfo | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  const load = useCallback(async () => {
    if (!lineId) return;
    const res = await getLineById(lineId);
    if (res.success && res.line) {
      const geoPoints = (res.line.points ?? []).filter(
        (p) => p.latitude != null && p.longitude != null,
      );
      setPoints(geoPoints);

      // Ajusta câmera para mostrar todos os pontos
      if (geoPoints.length > 0 && mapRef.current) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(
            geoPoints.map((p) => ({ latitude: p.latitude!, longitude: p.longitude! })),
            { edgePadding: { top: 80, right: 40, bottom: 120, left: 40 }, animated: true },
          );
        }, 500);
      }
    } else {
      Alert.alert("Erro", "Linha não encontrada.");
      router.back();
    }
    setLoading(false);
  }, [lineId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // RF22: calcula rota após pontos carregados
  useEffect(() => {
    if (points.length < 2) return;
    const calc = async () => {
      setCalculatingRoute(true);
      const idaPoints = points.filter((p) => p.segment === "ida").map((p) => ({ latitude: p.latitude!, longitude: p.longitude! }));
      const voltaPoints = points.filter((p) => p.segment === "volta").map((p) => ({ latitude: p.latitude!, longitude: p.longitude! }));
      const [ida, volta] = await Promise.all([
        fetchRouteInfo(idaPoints),
        fetchRouteInfo(voltaPoints),
      ]);
      setIdaRoute(ida);
      setVoltaRoute(volta);
      setCalculatingRoute(false);
    };
    calc();
  }, [points]);

  const idaPoints = points.filter((p) => p.segment === "ida");
  const voltaPoints = points.filter((p) => p.segment === "volta");

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand.orange} />
        </View>
      </SafeAreaView>
    );
  }

  if (points.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Mapa da rota</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="map-outline" size={64} color={theme.colors.text.muted} style={{ opacity: 0.4, marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Nenhum ponto com localização</Text>
          <Text style={styles.emptyText}>Adicione pontos com endereço via Google Places para visualizá-los no mapa.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const center = {
    latitude: points.reduce((s, p) => s + p.latitude!, 0) / points.length,
    longitude: points.reduce((s, p) => s + p.longitude!, 0) / points.length,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{ ...center, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Linha de ida */}
        {idaPoints.length > 1 && (
          <Polyline
            coordinates={idaPoints.map((p) => ({ latitude: p.latitude!, longitude: p.longitude! }))}
            strokeColor={SEGMENT_COLORS.ida}
            strokeWidth={3}
            lineDashPattern={[0]}
          />
        )}

        {/* Linha de volta */}
        {voltaPoints.length > 1 && (
          <Polyline
            coordinates={voltaPoints.map((p) => ({ latitude: p.latitude!, longitude: p.longitude! }))}
            strokeColor={SEGMENT_COLORS.volta}
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        )}

        {/* Marcadores */}
        {points.map((point, index) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.latitude!, longitude: point.longitude! }}
            title={point.address}
            description={`${point.segment === "ida" ? "Ida" : "Volta"} · ${point.type === "pickup" ? "Embarque" : "Desembarque"}`}
            onPress={() => setSelectedPoint(point)}
            pinColor={SEGMENT_COLORS[point.segment ?? "ida"]}
          />
        ))}
      </MapView>

      {/* Header sobreposto */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtnOverlay}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text.primary} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Mapa da rota</Text>
            <Text style={styles.headerSub}>{points.length} pontos cadastrados</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Legenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: SEGMENT_COLORS.ida }]} />
          <Text style={styles.legendText}>Ida ({idaPoints.length})</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: SEGMENT_COLORS.volta, borderStyle: "dashed" }]} />
          <Text style={styles.legendText}>Volta ({voltaPoints.length})</Text>
        </View>
      </View>

      {/* RF22: Painel de distância e tempo */}
      {(idaRoute || voltaRoute || calculatingRoute) && !selectedPoint && (
        <View style={styles.routeInfoCard}>
          {calculatingRoute ? (
            <View style={styles.routeInfoRow}>
              <ActivityIndicator size="small" color={theme.colors.brand.orange} />
              <Text style={styles.routeInfoLabel}>Calculando rota...</Text>
            </View>
          ) : (
            <>
              {idaRoute && (
                <View style={styles.routeInfoRow}>
                  <View style={[styles.routeInfoDot, { backgroundColor: SEGMENT_COLORS.ida }]} />
                  <Text style={styles.routeInfoLabel}>Ida</Text>
                  <Text style={styles.routeInfoValue}>{formatDistance(idaRoute.distanceM)}</Text>
                  <Text style={styles.routeInfoSep}>·</Text>
                  <Text style={styles.routeInfoValue}>{formatDuration(idaRoute.durationS)}</Text>
                </View>
              )}
              {voltaRoute && (
                <View style={styles.routeInfoRow}>
                  <View style={[styles.routeInfoDot, { backgroundColor: SEGMENT_COLORS.volta }]} />
                  <Text style={styles.routeInfoLabel}>Volta</Text>
                  <Text style={styles.routeInfoValue}>{formatDistance(voltaRoute.distanceM)}</Text>
                  <Text style={styles.routeInfoSep}>·</Text>
                  <Text style={styles.routeInfoValue}>{formatDuration(voltaRoute.durationS)}</Text>
                </View>
              )}
              {idaRoute && voltaRoute && (
                <View style={[styles.routeInfoRow, styles.routeInfoTotal]}>
                  <Ionicons name="swap-vertical-outline" size={14} color={theme.colors.text.secondary} />
                  <Text style={styles.routeInfoLabel}>Total</Text>
                  <Text style={[styles.routeInfoValue, { fontWeight: "800" }]}>
                    {formatDistance(idaRoute.distanceM + voltaRoute.distanceM)}
                  </Text>
                  <Text style={styles.routeInfoSep}>·</Text>
                  <Text style={[styles.routeInfoValue, { fontWeight: "800" }]}>
                    {formatDuration(idaRoute.durationS + voltaRoute.durationS)}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Card do ponto selecionado */}
      {selectedPoint && (
        <View style={styles.pointCard}>
          <View style={styles.pointCardHeader}>
            <View style={[styles.pointTypeBadge, { backgroundColor: SEGMENT_COLORS[selectedPoint.segment ?? "ida"] + "20" }]}>
              <Text style={[styles.pointTypeText, { color: SEGMENT_COLORS[selectedPoint.segment ?? "ida"] }]}>
                {selectedPoint.segment === "ida" ? "Ida" : "Volta"} · {selectedPoint.type === "pickup" ? "Embarque" : "Desembarque"}
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
  overlay: { position: "absolute", top: 0, left: 0, right: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.soft,
  },
  backBtn: { padding: theme.spacing.xs },
  backBtnOverlay: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center", ...theme.shadow.card },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  headerSub: { fontSize: theme.font.xs, color: theme.colors.text.secondary },
  emptyTitle: { fontSize: theme.font.lg, fontWeight: "700", color: theme.colors.text.primary, marginBottom: theme.spacing.sm, textAlign: "center" },
  emptyText: { fontSize: theme.font.sm, color: theme.colors.text.secondary, textAlign: "center", lineHeight: 20 },
  legend: {
    position: "absolute",
    bottom: 140,
    right: theme.spacing.md,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow.card,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  legendLine: { width: 24, height: 3, borderRadius: 2 },
  legendText: { fontSize: theme.font.xs, fontWeight: "600", color: theme.colors.text.primary },
  pointCard: {
    position: "absolute",
    bottom: theme.spacing.xl,
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
  pointTypeText: { fontSize: theme.font.xs, fontWeight: "700" },
  pointAddress: { fontSize: theme.font.md, fontWeight: "600", color: theme.colors.text.primary },
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
  routeInfoTotal: { borderTopWidth: 1, borderTopColor: theme.colors.border.soft, paddingTop: theme.spacing.xs, marginTop: theme.spacing.xs },
  routeInfoDot: { width: 10, height: 10, borderRadius: 5 },
  routeInfoLabel: { fontSize: theme.font.sm, color: theme.colors.text.secondary, width: 36 },
  routeInfoValue: { fontSize: theme.font.sm, color: theme.colors.text.primary, fontWeight: "600" },
  routeInfoSep: { fontSize: theme.font.sm, color: theme.colors.text.muted },
});
