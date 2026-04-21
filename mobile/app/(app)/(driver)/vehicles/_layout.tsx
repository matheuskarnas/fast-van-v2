import { Stack } from "expo-router";
import { theme } from "../../../../constants/theme";

export default function VehiclesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background.screen,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="create"
        options={{
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
