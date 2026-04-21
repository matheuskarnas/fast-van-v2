import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { theme } from "../../../constants/theme";
import {
  createGeofenceLine,
  getLineExecutionState,
  processGeofenceCheckIn,
  startLineExecution,
} from "../../../services/geofencing";
import { getSession } from "../../../services/session";

export default function MapsScreen() {
  const [role, setRole] = useState<"DRIVER" | "PASSENGER" | undefined>();
  const [lineId, setLineId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pointId, setPointId] = useState("ponto-1");
  const [segment, setSegment] = useState<"IDA" | "VOLTA">("IDA");
  const [latitude, setLatitude] = useState("-23.55052");
  const [longitude, setLongitude] = useState("-46.633308");
  const [radiusMeters, setRadiusMeters] = useState("120");
  const [confirmedPassengerIds, setConfirmedPassengerIds] = useState("");
  const [linkedDriverId, setLinkedDriverId] = useState("");
  const [checkInLatitude, setCheckInLatitude] = useState("-23.55052");
  const [checkInLongitude, setCheckInLongitude] = useState("-46.63330");
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const session = await getSession();
      setRole(session?.userRole);
      if (session?.userRole === "DRIVER") {
        setLinkedDriverId(session.userId);
      }
    };

    bootstrap();
  }, []);

  const refreshExecution = async () => {
    if (!lineId.trim()) {
      return;
    }

    try {
      const result = await getLineExecutionState(lineId.trim(), date);
      setExecutionResult(result);
    } catch {
      setExecutionResult({
        success: false,
        message: "Não foi possível carregar a execução.",
      });
    }
  };

  const handleCreateLine = async () => {
    if (role !== "DRIVER") {
      Alert.alert(
        "Ação não permitida",
        "Somente motoristas podem criar linhas de geofencing.",
      );
      return;
    }

    if (!lineId.trim()) {
      Alert.alert(
        "ID da linha obrigatório",
        "Informe o ID da linha para criar a configuração de geofencing.",
      );
      return;
    }

    setLoading(true);
    try {
      const result = await createGeofenceLine({
        lineId: lineId.trim(),
        driverId: linkedDriverId.trim() || undefined,
        nextDate: date,
        points: [
          {
            id: pointId.trim(),
            segment,
            latitude: Number(latitude),
            longitude: Number(longitude),
            radiusMeters: Number(radiusMeters),
            confirmedPassengerIds: confirmedPassengerIds
              ? confirmedPassengerIds
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              : [],
          },
        ],
      });

      if (result.success) {
        Alert.alert(
          "Linha criada",
          "A linha de geofencing foi criada com sucesso e já pode ser iniciada.",
        );
      } else {
        Alert.alert(
          "Não foi possível criar a linha",
          result?.error?.message ||
            "Verifique os dados da linha e tente novamente.",
        );
      }
    } catch {
      Alert.alert(
        "Falha de conexão",
        "Não foi possível criar a linha por falta de conexão com o servidor.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartExecution = async () => {
    setLoading(true);
    try {
      const result = await startLineExecution({ lineId: lineId.trim(), date });
      if (result.success) {
        Alert.alert(
          "Execução iniciada",
          "A linha foi iniciada com sucesso para a data informada.",
        );
        await refreshExecution();
      } else {
        Alert.alert(
          "Não foi possível iniciar",
          result?.error?.message ||
            "Verifique os dados da linha e tente novamente.",
        );
      }
    } catch {
      Alert.alert(
        "Falha de conexão",
        "Não foi possível iniciar a linha por falta de conexão com o servidor.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const result = await processGeofenceCheckIn({
        lineId: lineId.trim(),
        pointId: pointId.trim(),
        date,
        location: {
          latitude: Number(checkInLatitude),
          longitude: Number(checkInLongitude),
        },
      });

      if (result.success) {
        Alert.alert(
          "Check-in confirmado",
          "O check-in do ponto foi processado com sucesso.",
        );
        await refreshExecution();
      } else {
        Alert.alert(
          "Não foi possível processar o check-in",
          result?.error?.message ||
            "Verifique os dados de localização e tente novamente.",
        );
      }
    } catch {
      Alert.alert(
        "Falha de conexão",
        "Não foi possível processar o check-in por falta de conexão com o servidor.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>RF7</Text>
      <Text style={styles.title}>Geofencing e check-in</Text>
      <Text style={styles.subtitle}>
        Crie a linha, inicie a execução e simule a chegada em um ponto.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Linha e ponto</Text>
        <TextInput
          placeholder="ID da linha"
          value={lineId}
          onChangeText={setLineId}
          style={styles.input}
        />
        {role === "DRIVER" ? (
          <TextInput
            placeholder="Motorista vinculado"
            value={linkedDriverId}
            onChangeText={setLinkedDriverId}
            style={styles.input}
          />
        ) : null}
        <TextInput
          placeholder="Data (YYYY-MM-DD)"
          value={date}
          onChangeText={setDate}
          style={styles.input}
        />
        <TextInput
          placeholder="ID do ponto"
          value={pointId}
          onChangeText={setPointId}
          style={styles.input}
        />
        <View style={styles.row}>
          <TextInput
            placeholder="Latitude"
            value={latitude}
            onChangeText={setLatitude}
            style={[styles.input, styles.flex]}
          />
          <TextInput
            placeholder="Longitude"
            value={longitude}
            onChangeText={setLongitude}
            style={[styles.input, styles.flex]}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            placeholder="Raio (m)"
            value={radiusMeters}
            onChangeText={setRadiusMeters}
            style={[styles.input, styles.flex]}
          />
          <TextInput
            placeholder="Segmento (IDA/VOLTA)"
            value={segment}
            onChangeText={(value) =>
              setSegment(value === "VOLTA" ? "VOLTA" : "IDA")
            }
            style={[styles.input, styles.flex]}
          />
        </View>
        <TextInput
          placeholder="IDs de passageiros confirmados separados por vírgula"
          value={confirmedPassengerIds}
          onChangeText={setConfirmedPassengerIds}
          style={styles.input}
        />

        <Pressable
          style={styles.button}
          onPress={handleCreateLine}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>Criar linha geofence</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Execução</Text>
        <View style={styles.row}>
          <Pressable
            style={styles.secondaryButton}
            onPress={handleStartExecution}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Iniciar linha</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={handleCheckIn}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Simular check-in</Text>
          </Pressable>
        </View>
        <View style={styles.row}>
          <TextInput
            placeholder="Lat. check-in"
            value={checkInLatitude}
            onChangeText={setCheckInLatitude}
            style={[styles.input, styles.flex]}
          />
          <TextInput
            placeholder="Lng. check-in"
            value={checkInLongitude}
            onChangeText={setCheckInLongitude}
            style={[styles.input, styles.flex]}
          />
        </View>
        <Pressable style={styles.secondaryButton} onPress={refreshExecution}>
          <Text style={styles.secondaryButtonText}>Atualizar estado</Text>
        </Pressable>
      </View>

      {executionResult ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Estado atual</Text>
          <Text style={styles.resultText}>
            {JSON.stringify(executionResult, null, 2)}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background.screen,
  },
  kicker: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text.accent,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text.primary,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    padding: theme.spacing.lg,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.colors.background.card,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  button: {
    backgroundColor: theme.colors.text.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.background.muted,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: theme.colors.text.inverse,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: theme.colors.text.primary,
    fontWeight: "700",
  },
  resultText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
});
