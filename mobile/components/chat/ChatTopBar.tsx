import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";

interface ChatTopBarProps {
  title: string;
  subtitle?: string;
  rightLabel?: string;
  statusLabel?: string;
  onPressRight?: () => void;
}

export function ChatTopBar({
  title,
  subtitle,
  rightLabel,
  statusLabel,
  onPressRight,
}: ChatTopBarProps) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.rightArea}>
        {statusLabel ? <Text style={styles.status}>{statusLabel}</Text> : null}
        {rightLabel ? (
          <Pressable style={styles.actionButton} onPress={onPressRight}>
            <Text style={styles.actionText}>{rightLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.soft,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    color: theme.colors.text.brand,
    fontSize: theme.font.xl,
    fontWeight: "900",
  },
  subtitle: {
    color: theme.colors.text.muted,
    marginTop: theme.spacing.xs,
    fontSize: theme.font.sm,
    fontWeight: "600",
  },
  rightArea: {
    alignItems: "flex-end",
    gap: theme.spacing.xs,
  },
  status: {
    color: theme.colors.text.accent,
    fontWeight: "800",
    fontSize: theme.font.xs,
    textTransform: "uppercase",
  },
  actionButton: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border.input,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.background.card,
  },
  actionText: {
    color: theme.colors.text.brand,
    fontWeight: "700",
    fontSize: theme.font.xs,
  },
});
