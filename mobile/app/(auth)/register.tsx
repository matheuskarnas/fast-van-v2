import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { theme } from "../../constants/theme";
import { DatePickerInput } from "../../components/common/DatePickerInput";

export default function RegisterScreen() {
  const { authContext } = useAuth();
  const params = useLocalSearchParams<{ role?: string }>();
  const currentRole = params.role === "DRIVER" ? "DRIVER" : "PASSENGER";
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [cnh, setCnh] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const errorMessages: Record<string, Record<string, string>> = {
    MISSING_REQUIRED_FIELD: {
      name: "Informe seu nome completo para continuar.",
      cpf: "Informe seu CPF para concluir o cadastro.",
      email: "Informe um email válido para criar sua conta.",
      password: "Crie uma senha para proteger sua conta.",
      role: "Selecione o perfil de uso para finalizar o cadastro.",
      birthDate: "Informe sua data de nascimento para validar sua idade.",
      cnh: "Para perfil motorista, a CNH é obrigatória.",
      default:
        "Há campos obrigatórios sem preenchimento. Revise e tente novamente.",
    },
    INVALID_CPF: {
      cpf: "O CPF informado é inválido. Confira os números e tente novamente.",
    },
    INVALID_EMAIL: {
      email: "O email informado não é válido. Exemplo: nome@dominio.com.",
    },
    WEAK_PASSWORD: {
      password:
        "Sua senha está fraca. Use no mínimo 6 caracteres com letra maiúscula, minúscula, número e símbolo.",
    },
    INVALID_CNH: {
      cnh: "A CNH informada é inválida. Revise os dados e tente novamente.",
    },
    INVALID_BIRTH_DATE: {
      birthDate: "A idade permitida para cadastro é entre 18 e 150 anos.",
      default: "A data de nascimento informada é inválida.",
    },
    CPF_ALREADY_EXISTS: {
      cpf: "Este CPF já possui cadastro no sistema. Faça login ou use outro CPF.",
    },
    EMAIL_ALREADY_EXISTS: {
      email: "Este email já está em uso. Faça login ou use outro email.",
    },
    CNH_ALREADY_EXISTS: {
      cnh: "Esta CNH já está vinculada a outra conta de motorista.",
    },
    NETWORK_ERROR: {
      default:
        "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",
    },
    INTERNAL_ERROR: {
      default:
        "Ocorreu um erro interno ao criar sua conta. Tente novamente em instantes.",
    },
  };

  const normalizeErrorField = (field?: string) => {
    if (!field) return "general";
    if (field === "birthYear" || field === "age") return "birthDate";
    return field;
  };

  const handleRegister = async () => {
    setLoading(true);
    setErrors({});

    // Validações locais
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }
    if (!cpf.trim()) {
      newErrors.cpf = "CPF é obrigatório";
    }
    if (!email.trim()) {
      newErrors.email = "Email é obrigatório";
    }
    if (!password) {
      newErrors.password = "Senha é obrigatória";
    }
    if (!passwordConfirm) {
      newErrors.passwordConfirm = "Confirmação de senha é obrigatória";
    }
    if (password && passwordConfirm && password !== passwordConfirm) {
      newErrors.passwordConfirm = "As senhas não coincidem";
    }
    if (!birthDate) {
      newErrors.birthDate = "Data de nascimento é obrigatória";
    }
    if (currentRole === "DRIVER" && !cnh.trim()) {
      newErrors.cnh = "CNH é obrigatória";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      // Converte a data para timestamp ISO normalizando para midnight UTC
      // Pega apenas a data (sem hora) e converte para string ISO
      const year = birthDate.getFullYear();
      const month = String(birthDate.getMonth() + 1).padStart(2, "0");
      const day = String(birthDate.getDate()).padStart(2, "0");
      const isoDateString = `${year}-${month}-${day}T00:00:00.000Z`;

      console.log("📱 Enviando dados para registro:", {
        birthDate: isoDateString,
        role: currentRole,
      });

      const result = await authContext.signUp({
        name: name.trim(),
        cpf: cpf.trim(),
        email: email.trim(),
        password,
        role: currentRole,
        birthDate: isoDateString,
        cnh: currentRole === "DRIVER" ? cnh.trim() : undefined,
      });

      if (!result?.success) {
        console.log("❌ Erro no cadastro (API):", result?.error);
        const errorCode = result?.error?.code;
        const errorField = normalizeErrorField(result?.error?.field);
        const backendMessage = result?.error?.message;

        // Procura mensagem específica do campo
        if (errorCode && errorMessages[errorCode]) {
          const fieldMessage =
            errorMessages[errorCode][errorField] ||
            errorMessages[errorCode].default;
          setErrors({ [errorField || "general"]: fieldMessage });
        } else {
          setErrors({
            general:
              backendMessage ||
              "Não foi possível concluir seu cadastro agora. Revise os dados e tente novamente.",
          });
        }
      } else {
        Alert.alert(
          "Cadastro concluído",
          "Sua conta foi criada com sucesso. Você será redirecionado para a área inicial.",
        );
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
        <View style={styles.card}>
          <Text style={styles.kicker}>FastVan</Text>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.roleTag}>
            {currentRole === "DRIVER" ? "DONO DE VAN" : "PASSAGEIRO"}
          </Text>
          <Text style={styles.subtitle}>
            {currentRole === "DRIVER"
              ? "Preencha os dados para gerenciar linhas e motoristas."
              : "Preencha os dados para entrar na sua linha."}
          </Text>

          {/* General error */}
          {errors.general && <Text style={styles.error}>{errors.general}</Text>}

          {/* Nome */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              placeholder="Ex: João Silva"
              value={name}
              onChangeText={setName}
              style={[styles.input, errors.name && styles.inputError]}
              editable={!loading}
            />
            {errors.name && (
              <Text style={styles.fieldError}>{errors.name}</Text>
            )}
          </View>

          {/* CPF */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>CPF</Text>
            <TextInput
              placeholder="123.456.789-00"
              value={cpf}
              onChangeText={setCpf}
              style={[styles.input, errors.cpf && styles.inputError]}
              editable={!loading}
              keyboardType="numeric"
            />
            {errors.cpf && <Text style={styles.fieldError}>{errors.cpf}</Text>}
          </View>

          {/* Email */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              style={[styles.input, errors.email && styles.inputError]}
              editable={!loading}
            />
            {errors.email && (
              <Text style={styles.fieldError}>{errors.email}</Text>
            )}
          </View>

          {/* Senha */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Mínimo 6 caracteres"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                style={[
                  styles.passwordInputField,
                  errors.password && styles.inputError,
                ]}
                editable={!loading}
              />
              <Pressable
                style={styles.passwordToggleButton}
                onPress={() => setShowPassword((current) => !current)}
              >
                <Text style={styles.passwordToggleIcon}>
                  {showPassword ? "👁‍🗨" : "👁"}
                </Text>
              </Pressable>
            </View>
            {errors.password && (
              <Text style={styles.fieldError}>{errors.password}</Text>
            )}
          </View>

          {/* Confirmar Senha */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirmar Senha</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Repita a senha"
                secureTextEntry={!showPasswordConfirm}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                style={[
                  styles.passwordInputField,
                  errors.passwordConfirm && styles.inputError,
                ]}
                editable={!loading}
              />
              <Pressable
                style={styles.passwordToggleButton}
                onPress={() => setShowPasswordConfirm((current) => !current)}
              >
                <Text style={styles.passwordToggleIcon}>
                  {showPasswordConfirm ? "👁‍🗨" : "👁"}
                </Text>
              </Pressable>
            </View>
            {errors.passwordConfirm && (
              <Text style={styles.fieldError}>{errors.passwordConfirm}</Text>
            )}
          </View>

          {/* Data de Nascimento */}
          <DatePickerInput
            label="Data de Nascimento"
            placeholder="Selecione sua data de nascimento"
            value={birthDate}
            onChange={setBirthDate}
            maximumDate={
              new Date(
                new Date().getFullYear() - 18,
                new Date().getMonth(),
                new Date().getDate(),
              )
            }
          />
          {errors.birthDate && (
            <Text style={styles.fieldError}>{errors.birthDate}</Text>
          )}

          {/* Driver specific fields */}
          {currentRole === "DRIVER" ? (
            <View style={styles.formGroup}>
              <Text style={styles.label}>CNH</Text>
              <TextInput
                placeholder="Sua CNH"
                value={cnh}
                onChangeText={setCnh}
                style={[styles.input, errors.cnh && styles.inputError]}
                editable={!loading}
              />
              {errors.cnh && (
                <Text style={styles.fieldError}>{errors.cnh}</Text>
              )}
            </View>
          ) : null}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.text.inverse} />
            ) : (
              <Text style={styles.buttonText}>Criar conta</Text>
            )}
          </Pressable>

          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.linkButton}>
              <Text style={styles.linkText}>← Voltar para o login</Text>
            </Pressable>
          </Link>
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
    justifyContent: "center",
    padding: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    ...theme.shadow.card,
  },
  kicker: {
    color: theme.colors.text.brand,
    fontSize: theme.font.xs,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    fontSize: theme.font.xl,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  roleTag: {
    fontSize: theme.font.sm,
    fontWeight: "600",
    color: theme.colors.text.secondary,
  },
  subtitle: {
    fontSize: theme.font.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  error: {
    fontSize: theme.font.sm,
    color: theme.colors.feedback.error,
    fontWeight: "600",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
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
  },
  fieldError: {
    fontSize: theme.font.xs,
    color: theme.colors.feedback.error,
    marginTop: theme.spacing.xs,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border.input,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.input,
  },
  passwordInputField: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  passwordToggleButton: {
    paddingHorizontal: theme.spacing.lg,
  },
  passwordToggleIcon: {
    fontSize: 20,
  },
  button: {
    backgroundColor: theme.colors.brand.orange,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.font.base,
    fontWeight: "700",
  },
  linkButton: {
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  linkText: {
    color: theme.colors.brand.orange,
    fontSize: theme.font.sm,
    fontWeight: "500",
  },
});
