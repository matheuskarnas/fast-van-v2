import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";

function RoleOption({
  emoji,
  title,
  description,
  href,
}: {
  emoji: string;
  title: string;
  description: string;
  href: "/(auth)/register?role=PASSENGER" | "/(auth)/register?role=DRIVER";
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.optionCard}>
        <Text style={styles.icon}>{emoji}</Text>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
        <Text style={styles.optionCta}>{"SELECIONAR PERFIL ->"}</Text>
      </Pressable>
    </Link>
  );
}

export default function RoleSelectionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>FastVan</Text>
      <Text style={styles.title}>Como voce usa o FastVan?</Text>
      <Text style={styles.subtitle}>Escolha seu perfil para continuar</Text>

      <RoleOption
        emoji="🎓"
        title="Sou passageiro"
        description="Aluno ou trabalhador que usa a van"
        href="/(auth)/register?role=PASSENGER"
      />

      <RoleOption
        emoji="🚐"
        title="Sou dono de van"
        description="Gerencio linhas e motoristas"
        href="/(auth)/register?role=DRIVER"
      />

      <Link href="/(auth)/login" asChild>
        <Pressable style={styles.backButton}>
          <Text style={styles.backText}>← Voltar para o login</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  logo: {
    marginTop: theme.spacing.xl,
    color: theme.colors.text.brand,
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
  },
  title: {
    color: theme.colors.text.brand,
    fontSize: 38,
    textAlign: "center",
    fontWeight: "800",
    lineHeight: 44,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: theme.font.lg,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  optionCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    gap: theme.spacing.md,
    ...theme.shadow.card,
  },
  icon: {
    width: 54,
    height: 54,
    borderRadius: theme.radius.md,
    textAlign: "center",
    lineHeight: 54,
    fontSize: 28,
    backgroundColor: `${theme.colors.brand.orange}26`,
  },
  optionTitle: {
    color: theme.colors.text.brand,
    fontSize: 30,
    fontWeight: "800",
  },
  optionDescription: {
    color: theme.colors.text.secondary,
    fontSize: theme.font.lg,
  },
  optionCta: {
    color: theme.colors.brand.orangeDark,
    fontWeight: "800",
    fontSize: theme.font.sm,
    marginTop: theme.spacing.xs,
  },
  backButton: {
    alignItems: "center",
    marginTop: "auto",
    paddingVertical: theme.spacing.md,
  },
  backText: {
    color: theme.colors.text.brand,
    fontWeight: "700",
  },
});
