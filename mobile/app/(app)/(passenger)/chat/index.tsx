import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  createPrivateConversation,
  validateUserExists,
} from "../../../../services/chat";
import { getSession } from "../../../../services/session";
import { theme } from "../../../../constants/theme";

export default function PassengerChatListScreen() {
  const router = useRouter();
  const [driverId, setDriverId] = useState("");
  const [loading, setLoading] = useState(false);

  const startChat = async () => {
    if (!driverId.trim()) {
      Alert.alert(
        "ID do motorista obrigatório",
        "Informe o ID do motorista para iniciar uma conversa privada.",
      );
      return;
    }

    setLoading(true);
    try {
      const session = await getSession();
      if (!session?.userId) {
        Alert.alert(
          "Sessão expirada",
          "Sua sessão expirou. Faça login novamente para continuar.",
        );
        return;
      }

      // Validar se o usuário existe
      const userExists = await validateUserExists(driverId.trim());
      if (!userExists) {
        Alert.alert(
          "Motorista não encontrado",
          `Não encontramos um motorista com o ID "${driverId}". Verifique o código e tente novamente.`,
        );
        return;
      }

      const result = await createPrivateConversation({
        passengerId: session.userId,
        driverId: driverId.trim(),
        context: "marketplace",
      });

      if (result?.success && result.conversation?.id) {
        setDriverId("");
        router.push(`/(app)/(passenger)/chat/${result.conversation.id}`);
        return;
      }

      Alert.alert(
        "Não foi possível iniciar a conversa",
        result?.error?.message ||
          "Ocorreu um erro ao abrir o chat. Tente novamente em alguns instantes.",
      );
    } catch {
      Alert.alert(
        "Falha de conexão",
        "Não foi possível iniciar o chat por falta de conexão com o servidor. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>CHAT PRIVADO</Text>
      <Text style={styles.title}>Converse com o motorista</Text>
      <Text style={styles.subtitle}>
        Informe o ID do motorista para abrir uma conversa direta.
      </Text>
      <TextInput
        placeholder="ID do motorista"
        value={driverId}
        onChangeText={setDriverId}
        style={styles.input}
        placeholderTextColor={theme.colors.text.muted}
      />
      <Pressable style={styles.button} onPress={startChat} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={theme.colors.text.primary} />
        ) : (
          <Text style={styles.buttonText}>Abrir conversa</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 14,
    backgroundColor: theme.colors.background.app,
  },
  kicker: {
    marginTop: 12,
    color: theme.colors.text.accent,
    fontSize: theme.font.xs,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: theme.colors.text.brand,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.input,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.input,
    color: theme.colors.text.primary,
  },
  button: {
    backgroundColor: theme.colors.brand.orange,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: theme.colors.text.primary,
    fontWeight: "700",
  },
});
