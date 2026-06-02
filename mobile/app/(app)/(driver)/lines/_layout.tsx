import { Stack } from "expo-router";
import { theme } from "../../../../constants/theme";

export default function LinesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background.screen },
      }}
    />
  );
}
