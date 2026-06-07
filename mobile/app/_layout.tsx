import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

const prefix = linking.createURL('/');

const linking_config = {
  prefixes: [prefix, 'fastvan://', 'https://fastvan.app'],
  config: {
    screens: {
      invite: '/invite/:token',
      '(auth)': {
        screens: {
          login: '/login',
          register: '/register',
          role: '/role',
        },
      },
      '(app)': {
        screens: {
          '(driver)': {
            screens: {
              home: '/driver/home',
              'register-vehicle': '/driver/register-vehicle',
            },
          },
          '(passenger)': {
            screens: {
              home: '/passenger/home',
              lines: '/passenger/lines',
              'accept-invite': '/passenger/accept-invite/:token',
            },
          },
          shared: {
            screens: {
              alerts: '/alerts',
              maps: '/maps',
              'chat-group': '/chat-group/:lineId',
            },
          },
        },
      },
    },
  },
};

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, linking: linking_config }}>
        <Stack.Screen name="invite" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
