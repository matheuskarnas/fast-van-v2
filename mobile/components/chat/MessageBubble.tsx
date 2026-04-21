import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";

export type ChatBubbleVariant = "incoming" | "outgoing" | "system";

export interface MessageBubbleProps {
  sender: string;
  text: string;
  time?: string;
  variant?: ChatBubbleVariant;
}

export function MessageBubble({
  sender,
  text,
  time,
  variant = "incoming",
}: MessageBubbleProps) {
  const isOutgoing = variant === "outgoing";
  const isSystem = variant === "system";

  return (
    <View
      style={[
        styles.container,
        isOutgoing && styles.outgoingContainer,
        isSystem && styles.systemContainer,
      ]}
    >
      {!isSystem ? (
        <Text style={[styles.sender, isOutgoing && styles.senderOutgoing]}>
          {sender}
        </Text>
      ) : null}
      <View
        style={[
          styles.bubble,
          isOutgoing && styles.outgoingBubble,
          isSystem && styles.systemBubble,
        ]}
      >
        <Text
          style={[
            styles.text,
            isOutgoing && styles.outgoingText,
            isSystem && styles.systemText,
          ]}
        >
          {text}
        </Text>
        {time ? (
          <Text style={[styles.time, isOutgoing && styles.outgoingTime]}>
            {time}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  outgoingContainer: {
    alignItems: "flex-end",
  },
  systemContainer: {
    alignItems: "center",
  },
  sender: {
    fontSize: theme.font.xs,
    fontWeight: "700",
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },
  senderOutgoing: {
    marginLeft: 0,
    marginRight: theme.spacing.xs,
    color: theme.colors.text.brand,
  },
  bubble: {
    maxWidth: "86%",
    borderRadius: 22,
    borderTopLeftRadius: 8,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    ...theme.shadow.card,
  },
  outgoingBubble: {
    backgroundColor: theme.colors.brand.navy,
    borderColor: theme.colors.brand.navy,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 8,
  },
  systemBubble: {
    backgroundColor: `${theme.colors.brand.orange}26`,
    borderColor: `${theme.colors.brand.orange}80`,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    color: theme.colors.text.primary,
    fontSize: theme.font.md,
    lineHeight: 22,
  },
  outgoingText: {
    color: theme.colors.text.inverse,
  },
  systemText: {
    color: theme.colors.text.accent,
    fontSize: theme.font.sm,
    fontWeight: "700",
  },
  time: {
    marginTop: theme.spacing.xs,
    alignSelf: "flex-end",
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  outgoingTime: {
    color: `${theme.colors.text.inverse}B8`,
  },
});
