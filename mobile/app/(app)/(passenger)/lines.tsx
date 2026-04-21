import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { ActionCard } from "../../../components/common/ActionCard";
import { theme } from "../../../constants/theme";

export default function PassengerLinesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Linhas e presença</Text>
      <Text style={styles.subtitle}>
        O backend de presença ainda é consumido principalmente pelo fluxo de
        RF3. Use os atalhos abaixo para acompanhar os outros fluxos integrados.
      </Text>

      <Link href="/(app)/shared/maps" asChild>
        <ActionCard
          title="Geofencing da linha"
          description="Abrir o painel do motorista para criar e iniciar execuções."
        />
      </Link>

      <Link href="/(app)/shared/chat-group" asChild>
        <ActionCard
          title="Chat do grupo"
          description="Acompanhar a conversa da sua linha quando o grupo estiver criado."
        />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background.screen,
    gap: theme.spacing.md,
  },
  title: {
    marginTop: theme.spacing.sm,
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text.primary,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
});
