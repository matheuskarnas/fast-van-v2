import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiService } from "../../../../services/api";
import { ApiEndpoints } from "../../../../constants/api";
import { theme } from "../../../../constants/theme";

export default function CreateVehicleScreen() {
  const router = useRouter();
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [capacity, setCapacity] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const errorMessages: Record<string, Record<string, string>> = {
    MISSING_REQUIRED_FIELD: {
      plate: "Informe a placa do veículo para continuar.",
      model: "Informe o modelo do veículo para continuar.",
      year: "Informe o ano do veículo para continuar.",
      capacity: "Informe a capacidade do veículo para continuar.",
      default:
        "Há campos obrigatórios sem preenchimento. Revise e tente novamente.",
    },
    INVALID_VEHICLE_PLATE: {
      plate: "Placa inválida. Use o formato ABC1234 ou ABC1D23 (Mercosul).",
    },
    INVALID_VEHICLE_YEAR: {
      year:
        "Ano inválido. O ano deve estar entre 1980 e " +
        (new Date().getFullYear() + 1) +
        ".",
    },
    INVALID_VEHICLE_CAPACITY: {
      capacity:
        "Capacidade inválida. Informe um valor entre 1 e 80 passageiros.",
    },
    PLATE_ALREADY_EXISTS: {
      plate: "Esta placa já está cadastrada em outro veículo.",
    },
    NETWORK_ERROR: {
      default:
        "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",
    },
    INTERNAL_ERROR: {
      default:
        "Ocorreu um erro interno ao cadastrar o veículo. Tente novamente em instantes.",
    },
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});

    // Validações locais
    const newErrors: Record<string, string> = {};

    if (!plate.trim()) {
      newErrors.plate = "Placa é obrigatória";
    }
    if (!brand.trim()) {
      newErrors.brand = "Marca é obrigatória";
    }
    if (!model.trim()) {
      newErrors.model = "Modelo é obrigatório";
    }
    if (!year.trim()) {
      newErrors.year = "Ano é obrigatório";
    } else if (isNaN(Number(year))) {
      newErrors.year = "Ano deve ser um número";
    }
    if (!capacity.trim()) {
      newErrors.capacity = "Capacidade é obrigatória";
    } else if (isNaN(Number(capacity))) {
      newErrors.capacity = "Capacidade deve ser um número";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await apiService.post(ApiEndpoints.REGISTER_VEHICLE, {
        plate: plate.trim().toUpperCase(),
        brand: brand.trim(),
        model: model.trim(),
        year: Number(year),
        capacity: Number(capacity),
      });

      if (response.data?.success) {
        Alert.alert(
          "Cadastro concluído",
          "Veículo cadastrado com sucesso. Ele já está disponível na sua lista.",
          [
            {
              text: "OK",
              onPress: () => {
                router.back();
              },
            },
          ],
        );
      } else {
        const errorCode = response.data?.error?.code;
        const errorField = response.data?.error?.field;
        const backendMessage = response.data?.error?.message;

        if (errorCode && errorMessages[errorCode]) {
          const fieldMessage =
            errorMessages[errorCode][errorField] ||
            errorMessages[errorCode].default;
          setErrors({ [errorField || "general"]: fieldMessage });
        } else {
          setErrors({
            general:
              backendMessage ||
              "Não foi possível concluir o cadastro do veículo agora. Revise os dados e tente novamente.",
          });
        }
      }
    } catch (err: any) {
      const errorCode = err?.response?.data?.error?.code;
      const errorField = err?.response?.data?.error?.field;
      const backendMessage = err?.response?.data?.error?.message;

      if (errorCode && errorMessages[errorCode]) {
        const fieldMessage =
          errorMessages[errorCode][errorField] ||
          errorMessages[errorCode].default;
        setErrors({ [errorField || "general"]: fieldMessage });
      } else {
        setErrors({
          general:
            backendMessage ||
            "Erro ao cadastrar o veículo. Verifique sua conexão e tente novamente.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons
              name="close"
              size={24}
              color={theme.colors.text.primary}
            />
          </Pressable>
          <Text style={styles.title}>Novo Veículo</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.subtitle}>
            Adicione os dados da sua van para começar a operar
          </Text>

          {/* General error */}
          {errors.general && <Text style={styles.error}>{errors.general}</Text>}

          {/* Placa */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Placa</Text>
            <TextInput
              placeholder="ABC1234 ou ABC1D23"
              value={plate}
              onChangeText={setPlate}
              style={[styles.input, errors.plate && styles.inputError]}
              editable={!loading}
              autoCapitalize="characters"
            />
            {errors.plate && (
              <Text style={styles.fieldError}>{errors.plate}</Text>
            )}
          </View>

          {/* Marca */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Marca</Text>
            <TextInput
              placeholder="Ex: Fiat"
              value={brand}
              onChangeText={setBrand}
              style={[styles.input, errors.brand && styles.inputError]}
              editable={!loading}
            />
            {errors.brand && (
              <Text style={styles.fieldError}>{errors.brand}</Text>
            )}
          </View>

          {/* Modelo */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Modelo</Text>
            <TextInput
              placeholder="Ex: Ducato"
              value={model}
              onChangeText={setModel}
              style={[styles.input, errors.model && styles.inputError]}
              editable={!loading}
            />
            {errors.model && (
              <Text style={styles.fieldError}>{errors.model}</Text>
            )}
          </View>

          {/* Ano e Capacidade em linha */}
          <View style={styles.row}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>Ano</Text>
              <TextInput
                placeholder={String(new Date().getFullYear())}
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                style={[styles.input, errors.year && styles.inputError]}
                editable={!loading}
              />
              {errors.year && (
                <Text style={styles.fieldError}>{errors.year}</Text>
              )}
            </View>

            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>Capacidade</Text>
              <TextInput
                placeholder="1-80 pessoas"
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="numeric"
                style={[styles.input, errors.capacity && styles.inputError]}
                editable={!loading}
              />
              {errors.capacity && (
                <Text style={styles.fieldError}>{errors.capacity}</Text>
              )}
            </View>
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.text.inverse} />
            ) : (
              <Text style={styles.buttonText}>Cadastrar Veículo</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.auth,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: theme.font.xl,
    fontWeight: "800",
    color: theme.colors.text.primary,
    flex: 1,
    textAlign: "center",
  },
  card: {
    backgroundColor: theme.colors.background.card,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    ...theme.shadow.card,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: theme.font.md,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  formGroup: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: theme.font.sm,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.input,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.input,
  },
  inputError: {
    borderColor: theme.colors.feedback.error,
    backgroundColor: `${theme.colors.feedback.error}08`,
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  error: {
    color: theme.colors.feedback.error,
    fontSize: 14,
    fontWeight: "600",
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.feedback.error}12`,
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
  fieldError: {
    color: theme.colors.feedback.error,
    fontSize: 12,
    fontWeight: "500",
  },
  button: {
    backgroundColor: theme.colors.brand.orange,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.text.primary,
    fontWeight: "700",
    fontSize: 16,
  },
});
