import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { theme } from "../../constants/theme";

export default function LoginScreen() {
  const { authContext } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const errorMessages: Record<string, Record<string, string>> = {
    INVALID_CREDENTIALS: {
      general:
        "Não foi possível entrar. Verifique email e senha e tente novamente.",
    },
    USER_NOT_FOUND: {
      email:
        "Não encontramos uma conta com este email. Confira o endereço digitado.",
    },
    INVALID_EMAIL: {
      email: "O email informado não é válido. Exemplo: nome@dominio.com.",
    },
    INVALID_PASSWORD: {
      password: "A senha informada está incorreta. Tente novamente.",
    },
    NETWORK_ERROR: {
      general:
        "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
    },
    INTERNAL_ERROR: {
      general:
        "Ocorreu um erro interno ao processar seu login. Tente novamente em instantes.",
    },
  };

  const handleLogin = async () => {
    setLoading(true);
    setErrors({});

    // Validações locais
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "Email é obrigatório";
    }
    if (!password) {
      newErrors.password = "Senha é obrigatória";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const result = await authContext.signIn(email.trim(), password);
      if (!result?.success) {
        const errorCode = result?.error?.code;
        const errorField = result?.error?.field;
        const backendMessage = result?.error?.message;

        // Procura mensagem específica do código
        if (errorCode && errorMessages[errorCode]) {
          const fieldMessage =
            errorMessages[errorCode][errorField] ||
            errorMessages[errorCode].general;
          setErrors({ [errorField || "general"]: fieldMessage });
        } else {
          setErrors({
            general:
              backendMessage ||
              "Não conseguimos concluir seu login agora. Tente novamente em alguns segundos.",
          });
        }
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
      <View style={styles.card}>
        <Text style={styles.kicker}>FastVan</Text>
        <Text style={styles.title}>Entrar</Text>
        <Text style={styles.subtitle}>
          Acesse sua conta para gerenciar rotas
        </Text>

        {/* General error */}
        {errors.general && <Text style={styles.error}>{errors.general}</Text>}

        {/* Email field */}
        <View style={styles.formGroup}>
          <TextInput
            placeholder="Email"
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

        {/* Password field */}
        <View style={styles.formGroup}>
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Senha"
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

        <Pressable
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>{"Entrar ->"}</Text>
          )}
        </Pressable>

        <Link href="/(auth)/role" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Nao tem conta? </Text>
            <Text style={styles.linkTextAccent}>Cadastre-se</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background.auth,
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
    fontSize: 28,
    fontWeight: "900",
  },
  title: {
    fontSize: theme.font.xxl,
    fontWeight: "800",
    color: theme.colors.text.brand,
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
  passwordContainer: {
    position: "relative",
    width: "100%",
  },
  passwordInputField: {
    borderWidth: 1,
    borderColor: theme.colors.border.input,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingRight: 50,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.input,
  },
  passwordToggleButton: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  passwordToggleIcon: {
    fontSize: 18,
  },
  button: {
    backgroundColor: theme.colors.brand.orange,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  buttonText: {
    color: theme.colors.text.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  error: {
    color: theme.colors.feedback.error,
    fontSize: 14,
  },
  fieldError: {
    color: theme.colors.feedback.error,
    fontSize: 12,
    fontWeight: "500",
  },
  linkButton: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: theme.spacing.md,
  },
  linkText: {
    color: theme.colors.text.secondary,
    fontWeight: "600",
  },
  linkTextAccent: {
    color: theme.colors.brand.orangeDark,
    fontWeight: "800",
  },
});
