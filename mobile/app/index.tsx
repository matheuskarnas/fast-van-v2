import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getSession, getHomeRoute } from "../services/session";
import { theme } from "../constants/theme";

export default function AppIndex() {
  const router = useRouter();
  const [message, setMessage] = useState("Carregando sessão...");

  useEffect(() => {
    const bootstrap = async () => {
      const session = await getSession();
      router.replace(
        session ? getHomeRoute(session.userRole) : "/(auth)/login",
      );
      setMessage("Redirecionando...");
    };

    bootstrap();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.background.screen,
  },
  text: {
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
});
