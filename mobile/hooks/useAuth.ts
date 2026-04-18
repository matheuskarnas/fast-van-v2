import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthState {
  isLoading: boolean;
  isSignout: boolean;
  userToken?: string;
  userRole?: 'DRIVER' | 'PASSENGER';
}

export const useAuth = () => {
  const [state, dispatch] = useState<AuthState>({
    isLoading: true,
    isSignout: false,
  });
  const router = useRouter();

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        const userRole = await AsyncStorage.getItem('userRole');

        dispatch({
          isLoading: false,
          isSignout: !userToken,
          userToken,
          userRole: (userRole as 'DRIVER' | 'PASSENGER') || undefined,
        });
      } catch (e) {
        console.error('Failed to restore session:', e);
        dispatch({
          isLoading: false,
          isSignout: true,
        });
      }
    };

    bootstrapAsync();
  }, []);

  const authContext = {
    signIn: async (email: string, password: string) => {
      // TODO: Implement sign in logic
    },
    signUp: async (data: any) => {
      // TODO: Implement sign up logic
    },
    signOut: async () => {
      try {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userRole');
        dispatch({
          isLoading: false,
          isSignout: true,
        });
        router.replace('/(auth)/login');
      } catch (e) {
        console.error('Failed to sign out:', e);
      }
    },
  };

  return {
    state,
    authContext,
  };
};
