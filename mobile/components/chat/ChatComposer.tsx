import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "../../constants/theme";

interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  sendLabel?: string;
  disabled?: boolean;
}

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  placeholder = "Mensagem",
  sendLabel = "Enviar",
  disabled = false,
}: ChatComposerProps) {
  return (
    <View style={styles.container}>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholderTextColor={theme.colors.text.muted}
      />
      <Pressable style={styles.sendButton} onPress={onSend} disabled={disabled}>
        <Text style={styles.sendText}>{sendLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.soft,
    backgroundColor: theme.colors.background.card,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background.input,
    color: theme.colors.text.primary,
    fontSize: theme.font.md,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.brand.orange,
    shadowColor: theme.colors.text.brand,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 3,
  },
  sendText: {
    color: theme.colors.text.inverse,
    fontSize: 18,
    fontWeight: "900",
  },
});
