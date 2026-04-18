import { Stack } from 'expo-router';

export default function DriverChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Mensagens',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Chat',
        }}
      />
    </Stack>
  );
}
