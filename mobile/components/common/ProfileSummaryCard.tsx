import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";

type ProfileSummaryCardProps = {
  title: string;
  name: string;
  email?: string;
  onSignOut: () => void;
};

export function ProfileSummaryCard({
  title,
  name,
  email,
  onSignOut,
}: ProfileSummaryCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Nome</Text>
        <Text style={styles.value}>{name}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{email || "Não informado"}</Text>
      </View>

      <Pressable style={styles.logoutButton} onPress={onSignOut}>
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
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
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.text.muted,
    fontSize: theme.font.xs,
    textTransform: "uppercase",
    fontWeight: "700",
    marginTop: theme.spacing.sm,
  },
  value: {
    color: theme.colors.text.primary,
    fontSize: theme.font.md,
    fontWeight: "600",
  },
  logoutButton: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.feedback.error,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  logoutText: {
    color: theme.colors.text.inverse,
    fontWeight: "700",
  },
});
