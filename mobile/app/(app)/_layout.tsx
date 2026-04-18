import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="(passenger)"
        options={{
          title: 'Passenger',
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="(driver)"
        options={{
          title: 'Driver',
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="shared"
        options={{
          title: 'Shared',
          animationEnabled: true,
        }}
      />
    </Stack>
  );
}
