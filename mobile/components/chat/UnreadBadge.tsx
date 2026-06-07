import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";
import { formatUnreadBadge } from "../../hooks/useUnreadChatCount";

interface UnreadBadgeProps {
  count: number;
  size?: "sm" | "md";
}

export function UnreadBadge({ count, size = "sm" }: UnreadBadgeProps) {
  const label = formatUnreadBadge(count);
  if (!label) return null;

  return (
    <View style={[styles.badge, size === "md" && styles.badgeMd]}>
      <Text style={[styles.text, size === "md" && styles.textMd]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.feedback.error,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeMd: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
  },
  text: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  textMd: {
    fontSize: 11,
  },
});
