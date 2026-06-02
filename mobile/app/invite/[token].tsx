import { useEffect, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../constants/theme";
import { ApiEndpoints } from "../../constants/api";
import { getSession } from "../../services/session";
import { apiService } from "../../services/api";

const PENDING_INVITE_KEY = "pendingInviteToken";

interface LinePreview {
  id: string;
  name: string;
  originCity: string;
  destinationPlace: string;
  capacity: number;
}

interface InvitePreview {
  lineId: string;
  expiresAt: string;
  line: LinePreview | null;
}

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [session, setSession] = useState<{ role: string; name?: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([fetchPreview(), loadSession()]);
  }, [token]);

  const fetchPreview = async () => {
    try {
      const url = ApiEndpoints.PREVIEW_INVITE.replace(":token", token!);
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setPreview(json.invite);
      else setPreviewError(json.error?.message ?? "Convite inválido ou expirado.");
    } catch {
      setPreviewError("Não foi possível carregar os detalhes do convite.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const loadSession = async () => {
    const s = await getSession();
    if (s) setSession({ role: s.userRole, name: s.userName });
  };

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await apiService.post(ApiEndpoints.ACCEPT_LINE_INVITE, { token });
      if (res.data?.success) {
        router.replace("/(app)/(passenger)/lines");
      } else {
        Alert.alert("Erro", res.data?.error?.message ?? "Não foi possível entrar na linha.");
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.error?.message ?? "Não foi possível entrar na linha.");
    } finally {
      setAccepting(false);
    }
  };

  const goToAuth = async (path: "/(auth)/login" | "/(auth)/register") => {
    await AsyncStorage.setItem(PENDING_INVITE_KEY, token!);
    router.push({ pathname: path, params: { inviteToken: token } });
  };

  if (loadingPreview) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand.orange} />
          <Text style={styles.loadingText}>Carregando convite...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (previewError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.feedback.error} style={{ marginBottom: 16 }} />
          <Text style={styles.errorTitle}>Convite inválido</Text>
          <Text style={styles.errorText}>{previewError}</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.secondaryBtnText}>Ir para o início</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const line = preview?.line;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="bus" size={40} color={theme.colors.brand.orange} />
        </View>

        <Text style={styles.headline}>Você foi convidado!</Text>
        <Text style={styles.sub}>Um motorista quer te adicionar à linha:</Text>

        <View style={styles.lineCard}>
          {line?.name && <Text style={styles.lineName}>{line.name}</Text>}
          {line && (
            <View style={styles.routeRow}>
              <Ionicons name="radio-button-on" size={14} color={theme.colors.brand.orange} />
              <Text style={styles.routeText}>{line.originCity}</Text>
              <Ionicons name="arrow-forward" size={14} color={theme.colors.text.muted} />
              <Ionicons name="location" size={14} color={theme.colors.brand.navy} />
              <Text style={styles.routeText}>{line.destinationPlace}</Text>
            </View>
          )}
          {line?.capacity && (
            <Text style={styles.capacityText}>{line.capacity} lugares</Text>
          )}
        </View>

        {session?.role === "PASSENGER" ? (
          <>
            <Text style={styles.loggedAs}>
              Entrando como <Text style={styles.loggedName}>{session.name ?? "você"}</Text>
            </Text>
            <Pressable
              style={[styles.primaryBtn, accepting && styles.btnDisabled]}
              onPress={handleAccept}
              disabled={accepting}
            >
              {accepting
                ? <ActivityIndicator color={theme.colors.text.inverse} />
                : <>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.text.inverse} />
                    <Text style={styles.primaryBtnText}>Confirmar entrada na linha</Text>
                  </>
              }
            </Pressable>
          </>
        ) : session?.role === "DRIVER" ? (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.brand.navy} />
            <Text style={styles.infoText}>
              Motoristas não podem entrar como passageiro. Faça login com uma conta de passageiro.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.authPrompt}>Para entrar na linha, faça login ou crie uma conta:</Text>
            <Pressable style={styles.primaryBtn} onPress={() => goToAuth("/(auth)/login")}>
              <Ionicons name="log-in-outline" size={20} color={theme.colors.text.inverse} />
              <Text style={styles.primaryBtnText}>Fazer Login</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => goToAuth("/(auth)/register")}>
              <Text style={styles.secondaryBtnText}>Criar conta</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

export { PENDING_INVITE_KEY };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: theme.spacing.xl },
  content: { flex: 1, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xxl, gap: theme.spacing.lg, alignItems: "center" },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.brand.orange + "15", justifyContent: "center", alignItems: "center" },
  headline: { fontSize: theme.font.xxl, fontWeight: "800", color: theme.colors.text.primary, textAlign: "center" },
  sub: { fontSize: theme.font.md, color: theme.colors.text.secondary, textAlign: "center" },
  lineCard: { width: "100%", backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border.soft, ...theme.shadow.card },
  lineName: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  routeRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, flexWrap: "wrap" },
  routeText: { fontSize: theme.font.md, color: theme.colors.text.primary, fontWeight: "600" },
  capacityText: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  loggedAs: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  loggedName: { fontWeight: "700", color: theme.colors.text.primary },
  authPrompt: { fontSize: theme.font.md, color: theme.colors.text.secondary, textAlign: "center" },
  primaryBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm, backgroundColor: theme.colors.brand.orange, paddingVertical: theme.spacing.lg, borderRadius: theme.radius.pill },
  primaryBtnText: { color: theme.colors.text.inverse, fontSize: theme.font.md, fontWeight: "800" },
  btnDisabled: { opacity: 0.6 },
  secondaryBtn: { width: "100%", alignItems: "center", paddingVertical: theme.spacing.md, borderRadius: theme.radius.pill, borderWidth: 1.5, borderColor: theme.colors.border.default },
  secondaryBtnText: { color: theme.colors.text.primary, fontSize: theme.font.md, fontWeight: "700" },
  infoBox: { flexDirection: "row", gap: theme.spacing.sm, backgroundColor: theme.colors.brand.navy + "10", borderRadius: theme.radius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.brand.navy + "30" },
  infoText: { flex: 1, fontSize: theme.font.sm, color: theme.colors.brand.navy, lineHeight: 20 },
  loadingText: { marginTop: theme.spacing.md, color: theme.colors.text.secondary },
  errorTitle: { fontSize: theme.font.lg, fontWeight: "700", color: theme.colors.text.primary, marginBottom: theme.spacing.sm },
  errorText: { fontSize: theme.font.md, color: theme.colors.text.secondary, textAlign: "center", marginBottom: theme.spacing.xl },
});
