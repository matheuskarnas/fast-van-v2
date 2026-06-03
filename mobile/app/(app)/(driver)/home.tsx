import { Link } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { getSession } from "../../../services/session";
import { ActionCard } from "../../../components/common/ActionCard";
import { theme } from "../../../constants/theme";

export default function DriverHomeScreen() {
  const [name, setName] = useState("Motorista");

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
        Acesse os fluxos de linha, geofencing e chat pelo painel abaixo.
      </Text>

      <Link href={"/(app)/shared/marketplace-b2b" as any} asChild>
        <ActionCard
          title="Marketplace B2B"
          description="Veja solicitações de transporte de empresas e entre em contato."
        />
      </Link>

      <Link href="/(app)/shared/maps" asChild>
        <ActionCard
          title="RF7 - Geofencing"
          description="Criar linha, iniciar execução e registrar check-ins."
        />
      </Link>

      <Link href="/(app)/(driver)/chat" asChild>
        <ActionCard
          title="Chat privado"
          description="Iniciar conversa com passageiro por ID."
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
