import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import * as Location from "expo-location";
import { theme } from "../../../../../constants/theme";
import { getLineById, type LinePoint } from "../../../../../services/driverLines";
import {
  createGeofenceLine,
  startLineExecution,
  processGeofenceCheckIn,
  getLineExecutionState,
} from "../../../../../services/geofencing";
import { apiService } from "../../../../../services/api";
import { ApiEndpoints } from "../../../../../constants/api";

const OCCURRENCE_TYPES = [
  { key: "slow_traffic", label: "Trânsito lento", icon: "car-outline" },
  { key: "passenger_late", label: "Passageiro atrasado", icon: "time-outline" },
  { key: "passenger_no_show", label: "Não apareceu", icon: "person-remove-outline" },
  { key: "other", label: "Outro", icon: "alert-circle-outline" },
] as const;

const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT_RADIUS_M = 150;

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type ExecutionStatus = "idle" | "starting" | "running" | "checking_in";

interface PointStatus {
  pointId: string;
  done: boolean;
}

export default function LineOperationScreen() {
  const { lineId } = useLocalSearchParams<{ lineId: string }>();
  const router = useRouter();

  const [points, setPoints] = useState<LinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [pointStatuses, setPointStatuses] = useState<PointStatus[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [occurrenceType, setOccurrenceType] = useState<string>("slow_traffic");
  const [occurrenceNotes, setOccurrenceNotes] = useState("");
  const [savingOccurrence, setSavingOccurrence] = useState(false);
  // RF25: passageiros confirmados (carregados da API de presença)
  const [confirmedPassengers, setConfirmedPassengers] = useState<{ passengerId: string; name?: string; status: string }[]>([]);
  const [noShowDone, setNoShowDone] = useState<Set<string>>(new Set());

  const loadLine = useCallback(async () => {
    if (!lineId) return;
    const res = await getLineById(lineId);
    if (res.success && res.line) {
      const geoPoints = (res.line.points ?? []).filter(
        (p) => p.latitude != null && p.longitude != null,
      );
      setPoints(geoPoints);
      setPointStatuses(geoPoints.map((p) => ({ pointId: p.id, done: false })));
    } else {
      Alert.alert("Erro", "Linha não encontrada.");
      router.back();
    }
    setLoading(false);
  }, [lineId]);

  useEffect(() => { loadLine(); }, [loadLine]);

  const startGPS = async () => {
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== "granted") {
      setLocationError("Permissão de localização negada. O GPS não estará disponível.");
      return;
    }
    setLocationError(null);
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10 },
      (loc) => setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }),
    );
  };

  useEffect(() => {
    return () => { locationSub.current?.remove(); };
  }, []);

  const handleStart = async () => {
    if (!lineId || points.length === 0) {
      Alert.alert("Sem pontos", "Adicione pontos com localização antes de iniciar a rota.");
      return;
    }
    setStatus("starting");
    try {
      await createGeofenceLine({
        lineId,
        nextDate: TODAY,
        points: points.map((p) => ({
          id: p.id,
          segment: p.segment === "ida" ? "IDA" : "VOLTA",
          latitude: p.latitude!,
          longitude: p.longitude!,
          radiusMeters: DEFAULT_RADIUS_M,
        })),
      });
      const startRes = await startLineExecution({ lineId, date: TODAY }) as any;
      if (!startRes.success) throw new Error(startRes.error?.message ?? "Falha ao iniciar");
      await startGPS();
      setStatus("running");
    } catch (e: any) {
      Alert.alert("Erro ao iniciar", e.message ?? "Não foi possível iniciar a rota.");
      setStatus("idle");
    }
  };

  const handleCheckIn = async (point: LinePoint) => {
    setStatus("checking_in");
    try {
      let loc = currentLocation;
      if (!loc) {
        const pos = await Location.getCurrentPositionAsync({});
        loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCurrentLocation(loc);
      }
      const res = await processGeofenceCheckIn({
        lineId: lineId!,
        pointId: point.id,
        date: TODAY,
        location: loc,
      }) as any;
      if (res.success) {
        setPointStatuses((prev) =>
          prev.map((ps) => ps.pointId === point.id ? { ...ps, done: true } : ps),
        );
        await getLineExecutionState(lineId!, TODAY);
      } else {
        Alert.alert("Erro no check-in", res.error?.message ?? "Não foi possível registrar chegada.");
      }
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Falha ao registrar chegada.");
    } finally {
      setStatus("running");
    }
  };

  const handleNoShow = useCallback(async (passengerId: string, segment: string) => {
    if (!lineId) return;
    try {
      const url = ApiEndpoints.POST_NO_SHOW.replace(":lineId", lineId);
      await apiService.post(url, {
        passengerId,
        segment,
        date: TODAY,
        latitude: currentLocation?.latitude ?? null,
        longitude: currentLocation?.longitude ?? null,
      });
      setNoShowDone((prev) => new Set([...prev, passengerId]));
      Alert.alert("Registrado", "Passageiro marcado como não embarcou.");
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.error?.message ?? "Não foi possível registrar.");
    }
  }, [lineId, currentLocation]);

  const handleOccurrence = useCallback(async () => {
    if (!lineId) return;
    setSavingOccurrence(true);
    try {
      const url = ApiEndpoints.POST_OCCURRENCE.replace(":lineId", lineId);
      await apiService.post(url, {
        type: occurrenceType,
        notes: occurrenceNotes.trim() || undefined,
        latitude: currentLocation?.latitude ?? null,
        longitude: currentLocation?.longitude ?? null,
      });
      setShowOccurrenceModal(false);
      setOccurrenceNotes("");
      Alert.alert("Ocorrência registrada", "Log salvo com data, hora e localização.");
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.error?.message ?? "Não foi possível registrar a ocorrência.");
    }
    setSavingOccurrence(false);
  }, [lineId, occurrenceType, occurrenceNotes, currentLocation]);

  const distanceTo = (point: LinePoint): number | null => {
    if (!currentLocation || point.latitude == null || point.longitude == null) return null;
    return haversineDistance(
      currentLocation.latitude, currentLocation.longitude,
      point.latitude!, point.longitude!,
    );
  };

  const isNear = (point: LinePoint) => {
    const d = distanceTo(point);
    return d !== null && d <= DEFAULT_RADIUS_M;
  };

  const allDone = pointStatuses.every((ps) => ps.done);
  const nextPendingId = pointStatuses.find((ps) => !ps.done)?.pointId;
  const isStarting = (status as string) === "starting";
  const isRunning = (status as string) === "running" || (status as string) === "checking_in";
  const isCheckingIn = (status as string) === "checking_in";

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand.orange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Operação da rota</Text>
          <Text style={styles.headerDate}>{TODAY}</Text>
        </View>
        {isRunning && (
          <>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>AO VIVO</Text>
            </View>
            <Pressable style={styles.occBtn} onPress={() => setShowOccurrenceModal(true)}>
              <Ionicons name="warning-outline" size={20} color={theme.colors.feedback.warning} />
            </Pressable>
          </>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {locationError && (
          <View style={styles.warnBox}>
            <Ionicons name="warning-outline" size={16} color={theme.colors.feedback.warning} />
            <Text style={styles.warnText}>{locationError}</Text>
          </View>
        )}

        {currentLocation && (
          <View style={styles.gpsBox}>
            <Ionicons name="navigate" size={14} color={theme.colors.feedback.success} />
            <Text style={styles.gpsText}>
              GPS ativo — {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
            </Text>
          </View>
        )}

        {!isRunning && !isStarting && (
          <>
            <Text style={styles.sectionTitle}>Pontos da rota ({points.length})</Text>
            {points.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="map-outline" size={40} color={theme.colors.text.muted} />
                <Text style={styles.emptyText}>
                  Nenhum ponto com localização cadastrado. Adicione pontos com endereço via Google Places antes de iniciar.
                </Text>
              </View>
            ) : (
              points.map((p, i) => (
                <View key={p.id} style={styles.pointPreview}>
                  <Text style={styles.pointIndex}>{i + 1}</Text>
                  <View style={styles.pointInfo}>
                    <Text style={styles.pointAddress} numberOfLines={1}>{p.address}</Text>
                    <Text style={styles.pointMeta}>
                      {p.segment === "ida" ? "Ida" : "Volta"} · {p.type === "pickup" ? "Embarque" : "Desembarque"}
                    </Text>
                  </View>
                </View>
              ))
            )}

            {points.length > 0 && (
              <Pressable
                style={[styles.startBtn, isStarting && styles.btnDisabled]}
                onPress={handleStart}
                disabled={isStarting}
              >
                {isStarting
                  ? <ActivityIndicator color={theme.colors.text.inverse} />
                  : <>
                      <Ionicons name="play-circle" size={22} color={theme.colors.text.inverse} />
                      <Text style={styles.startBtnText}>Iniciar rota de hoje</Text>
                    </>
                }
              </Pressable>
            )}
          </>
        )}

        {isRunning ? (
          <>
            {allDone ? (
              <View style={styles.doneBox}>
                <Ionicons name="checkmark-circle" size={48} color={theme.colors.feedback.success} />
                <Text style={styles.doneTitle}>Rota concluída!</Text>
                <Text style={styles.doneSub}>Todos os pontos foram confirmados.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Pontos da rota</Text>
                {points.map((p) => {
                  const ps = pointStatuses.find((s) => s.pointId === p.id);
                  const done = ps?.done ?? false;
                  const isNext = p.id === nextPendingId;
                  const near = isNear(p);
                  const dist = distanceTo(p);

                  return (
                    <View
                      key={p.id}
                      style={[
                        styles.pointCard,
                        done && styles.pointCardDone,
                        isNext && !done && styles.pointCardActive,
                      ]}
                    >
                      <View style={styles.pointCardHeader}>
                        <Ionicons
                          name={done ? "checkmark-circle" : isNext ? "ellipse" : "ellipse-outline"}
                          size={20}
                          color={done ? theme.colors.feedback.success : isNext ? theme.colors.brand.orange : theme.colors.text.muted}
                        />
                        <View style={styles.pointInfo}>
                          <Text style={[styles.pointAddress, done && styles.textDone]} numberOfLines={1}>
                            {p.address}
                          </Text>
                          <Text style={styles.pointMeta}>
                            {p.segment === "ida" ? "Ida" : "Volta"} · {p.type === "pickup" ? "Embarque" : "Desembarque"}
                            {dist !== null && !done && ` · ${dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`}`}
                          </Text>
                        </View>
                        {near && !done && (
                          <View style={styles.nearBadge}>
                            <Text style={styles.nearText}>Próximo</Text>
                          </View>
                        )}
                      </View>

                      {isNext && !done && (
                        <>
                          {/* RF25: passageiros confirmados neste ponto */}
                          {(p.passengers ?? []).length > 0 && (
                            <View style={styles.passengersSection}>
                              <Text style={styles.passengersSectionTitle}>Passageiros esperados</Text>
                              {(p.passengers ?? []).map((pid: string) => {
                                const alreadyNoShow = noShowDone.has(pid);
                                return (
                                  <View key={pid} style={styles.passengerRow}>
                                    <Ionicons
                                      name={alreadyNoShow ? "close-circle" : "person-outline"}
                                      size={16}
                                      color={alreadyNoShow ? theme.colors.feedback.error : theme.colors.text.secondary}
                                    />
                                    <Text style={[styles.passengerName, alreadyNoShow && { color: theme.colors.feedback.error, textDecorationLine: "line-through" }]}>
                                      {pid}
                                    </Text>
                                    {!alreadyNoShow && (
                                      <Pressable
                                        style={styles.noShowBtn}
                                        onPress={() => handleNoShow(pid, p.segment ?? "ida")}
                                      >
                                        <Text style={styles.noShowBtnText}>Não embarcou</Text>
                                      </Pressable>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          )}
                          <Pressable
                            style={[styles.checkinBtn, isCheckingIn && styles.btnDisabled]}
                            onPress={() => handleCheckIn(p)}
                            disabled={isCheckingIn}
                          >
                            {isCheckingIn
                              ? <ActivityIndicator size="small" color={theme.colors.text.inverse} />
                              : <>
                                  <Ionicons name="location" size={16} color={theme.colors.text.inverse} />
                                  <Text style={styles.checkinBtnText}>Registrar chegada</Text>
                                </>
                            }
                          </Pressable>
                        </>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </>
        ) : null}
      </ScrollView>

      {/* Modal de ocorrência (RF23) */}
      <Modal visible={showOccurrenceModal} animationType="slide" transparent onRequestClose={() => setShowOccurrenceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Registrar ocorrência</Text>

            <View style={styles.occTypeGrid}>
              {OCCURRENCE_TYPES.map((t) => (
                <Pressable
                  key={t.key}
                  style={[styles.occTypeBtn, occurrenceType === t.key && styles.occTypeBtnSelected]}
                  onPress={() => setOccurrenceType(t.key)}
                >
                  <Ionicons name={t.icon as any} size={20} color={occurrenceType === t.key ? theme.colors.feedback.warning : theme.colors.text.muted} />
                  <Text style={[styles.occTypeBtnText, occurrenceType === t.key && { color: theme.colors.feedback.warning, fontWeight: "700" }]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.occNotesInput}
              value={occurrenceNotes}
              onChangeText={setOccurrenceNotes}
              placeholder="Nota adicional (opcional)..."
              placeholderTextColor={theme.colors.text.muted}
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowOccurrenceModal(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, savingOccurrence && { opacity: 0.6 }]} onPress={handleOccurrence} disabled={savingOccurrence}>
                {savingOccurrence
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>Registrar</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.soft,
    gap: theme.spacing.md,
  },
  backBtn: { padding: theme.spacing.xs },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  headerDate: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: theme.colors.feedback.error + "15", paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.radius.pill },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.feedback.error },
  liveText: { fontSize: theme.font.xs, fontWeight: "800", color: theme.colors.feedback.error },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  warnBox: { flexDirection: "row", gap: theme.spacing.sm, backgroundColor: theme.colors.feedback.warning + "15", borderRadius: theme.radius.md, padding: theme.spacing.md },
  warnText: { flex: 1, fontSize: theme.font.sm, color: theme.colors.feedback.warning },
  gpsBox: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, backgroundColor: theme.colors.feedback.success + "10", borderRadius: theme.radius.md, padding: theme.spacing.sm },
  gpsText: { fontSize: theme.font.xs, color: theme.colors.feedback.success, fontWeight: "600" },
  sectionTitle: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.8 },
  emptyBox: { alignItems: "center", gap: theme.spacing.md, paddingVertical: theme.spacing.xl },
  emptyText: { fontSize: theme.font.sm, color: theme.colors.text.secondary, textAlign: "center", lineHeight: 20 },
  pointPreview: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, padding: theme.spacing.md, backgroundColor: theme.colors.background.card, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border.soft },
  pointIndex: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.brand.orange + "20", textAlign: "center", lineHeight: 24, fontSize: theme.font.sm, fontWeight: "800", color: theme.colors.brand.orange },
  pointInfo: { flex: 1 },
  pointAddress: { fontSize: theme.font.md, fontWeight: "600", color: theme.colors.text.primary },
  pointMeta: { fontSize: theme.font.xs, color: theme.colors.text.muted, marginTop: 2 },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm, backgroundColor: theme.colors.brand.orange, paddingVertical: theme.spacing.lg, borderRadius: theme.radius.pill, marginTop: theme.spacing.sm },
  startBtnText: { color: theme.colors.text.inverse, fontSize: theme.font.md, fontWeight: "800" },
  btnDisabled: { opacity: 0.6 },
  doneBox: { alignItems: "center", gap: theme.spacing.md, paddingVertical: theme.spacing.xxl },
  doneTitle: { fontSize: theme.font.xl, fontWeight: "800", color: theme.colors.feedback.success },
  doneSub: { fontSize: theme.font.md, color: theme.colors.text.secondary },
  pointCard: { backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border.soft },
  pointCardDone: { opacity: 0.5 },
  pointCardActive: { borderColor: theme.colors.brand.orange, borderWidth: 2 },
  pointCardHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  textDone: { textDecorationLine: "line-through", color: theme.colors.text.muted },
  nearBadge: { backgroundColor: theme.colors.feedback.success + "15", paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radius.pill },
  nearText: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.feedback.success },
  checkinBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm, backgroundColor: theme.colors.brand.navy, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md },
  checkinBtnText: { color: theme.colors.text.inverse, fontSize: theme.font.sm, fontWeight: "700" },
  passengersSection: { gap: theme.spacing.sm, paddingVertical: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border.soft },
  passengersSectionTitle: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 },
  passengerRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  passengerName: { flex: 1, fontSize: theme.font.sm, color: theme.colors.text.secondary },
  noShowBtn: { paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.feedback.error + "60", backgroundColor: theme.colors.feedback.error + "10" },
  noShowBtnText: { fontSize: theme.font.xs, fontWeight: "700", color: theme.colors.feedback.error },
  occBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.feedback.warning + "20", alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: theme.colors.background.card, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, padding: theme.spacing.xl, gap: theme.spacing.md },
  modalTitle: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  occTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  occTypeBtn: { flex: 1, minWidth: "45%", flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.border.default, backgroundColor: theme.colors.background.muted },
  occTypeBtnSelected: { borderColor: theme.colors.feedback.warning, backgroundColor: theme.colors.feedback.warning + "15" },
  occTypeBtnText: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  occNotesInput: { borderWidth: 1.5, borderColor: theme.colors.border.default, borderRadius: theme.radius.md, padding: theme.spacing.md, fontSize: theme.font.md, color: theme.colors.text.primary, backgroundColor: theme.colors.background.screen, minHeight: 60, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: theme.spacing.md },
  cancelBtn: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.pill, alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border.default },
  cancelBtnText: { fontWeight: "700", color: theme.colors.text.secondary },
  saveBtn: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.pill, alignItems: "center", backgroundColor: theme.colors.feedback.warning },
  saveBtnText: { fontWeight: "700", color: "#fff" },
});
