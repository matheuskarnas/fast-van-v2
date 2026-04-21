import { Link } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { getSession } from "../../../services/session";
import { ActionCard } from "../../../components/common/ActionCard";
import { theme } from "../../../constants/theme";

export default function PassengerHomeScreen() {
  const [name, setName] = useState("Passageiro");

  useEffect(() => {
    const loadSession = async () => {
      const session = await getSession();
      if (session?.userName) {
        setName(session.userName);
      }
    };

    loadSession();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Bem-vindo</Text>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.subtitle}>
        Acompanhe linhas, chat privado e o chat do grupo da sua viagem.
      </Text>

      <Link href="/(app)/(passenger)/lines" asChild>
        <ActionCard
          title="RF3 - Linhas e presença"
          description="Consultar e confirmar presença nas próximas viagens."
        />
      </Link>

      <Link href="/(app)/(passenger)/chat" asChild>
        <ActionCard
          title="Chat privado"
          description="Abrir conversa com motorista por ID."
        />
      </Link>

      <Link href="/(app)/shared/chat-group" asChild>
        <ActionCard
          title="RF13 - Chat do grupo"
          description="Entrar no chat da linha quando já houver grupo criado."
        />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background.app,
    gap: 16,
  },
  kicker: {
    marginTop: 12,
    color: theme.colors.text.brand,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: theme.colors.text.brand,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    marginBottom: 8,
  },
});
