import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";

type ActionCardProps = {
  title: string;
  description: string;
  onPress?: () => void;
};

export function ActionCard({ title, description, onPress }: ActionCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.card,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    gap: 6,
    ...theme.shadow.card,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text.brand,
  },
  description: {
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
});
