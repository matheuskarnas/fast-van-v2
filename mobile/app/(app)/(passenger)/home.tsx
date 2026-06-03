import { Link, useRouter } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSession } from "../../../services/session";
import { ActionCard } from "../../../components/common/ActionCard";
import { theme } from "../../../constants/theme";

const PENDING_INVITE_KEY = "pendingInviteToken";

export default function PassengerHomeScreen() {
  const [name, setName] = useState("Passageiro");
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      if (session?.userName) setName(session.userName);

      // Redireciona para tela de convite se tiver token pendente pós-login
      const pendingToken = await AsyncStorage.getItem(PENDING_INVITE_KEY);
      if (pendingToken) {
        await AsyncStorage.removeItem(PENDING_INVITE_KEY);
        router.replace(`/invite/${pendingToken}`);
      }
    };
    init();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Bem-vindo</Text>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.subtitle}>
        Acompanhe linhas, chat privado e o chat do grupo da sua viagem.
      </Text>

      <Link href={"/(app)/shared/marketplace-events" as any} asChild>
        <ActionCard
          title="Eventos e viagens"
          description="Encontre ou crie uma demanda de transporte para eventos."
        />
      </Link>

      <Link href={"/(app)/shared/marketplace-b2b" as any} asChild>
        <ActionCard
          title="Marketplace B2B"
          description="Publique uma solicitação de transporte para sua empresa."
        />
      </Link>

      <Link href={"/(app)/(passenger)/dashboard" as any} asChild>
        <ActionCard
          title="Meu dashboard"
          description="Próximas viagens, histórico de presenças e situação de pagamentos."
        />
      </Link>

      <Link href="/(app)/(passenger)/lines" asChild>
        <ActionCard
          title="Confirmar presença"
          description="Confirmar presença nas viagens de amanhã."
        />
      </Link>

      <Link href="/(app)/(passenger)/accept-invite" asChild>
        <ActionCard
          title="Entrar em uma linha"
          description="Tem um código de convite do motorista? Cole aqui para entrar na linha."
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
