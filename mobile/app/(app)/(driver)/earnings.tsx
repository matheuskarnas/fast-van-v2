import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../../constants/theme";

export default function DriverEarningsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ganhos</Text>
      <Text style={styles.subtitle}>
        Esta área fica como painel informativo enquanto o módulo financeiro não
        é integrado ao backend.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background.screen,
    gap: theme.spacing.sm,
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
