import { Stack } from 'expo-router';

export default function SharedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="alerts"
        options={{
          title: 'Alertas',
        }}
      />
      <Stack.Screen
        name="maps"
        options={{
          title: 'Mapa',
        }}
      />
      <Stack.Screen
        name="chat-group"
        options={{
          title: 'Chat do Grupo',
        }}
      />
    </Stack>
  );
}
