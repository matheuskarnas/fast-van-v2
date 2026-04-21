import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login, register } from "../services/auth";
import { clearSession, getHomeRoute, saveSession } from "../services/session";
import { AuthResponse, RegisterRequest } from "../types/auth";

export interface AuthState {
  isLoading: boolean;
  isSignout: boolean;
  userToken?: string;
  userRole?: "DRIVER" | "PASSENGER";
  userId?: string;
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
        const userToken = await AsyncStorage.getItem("userToken");
        const userRole = await AsyncStorage.getItem("userRole");

        dispatch({
          isLoading: false,
          isSignout: !userToken,
          userToken,
          userRole: (userRole as "DRIVER" | "PASSENGER") || undefined,
          userId: (await AsyncStorage.getItem("userId")) || undefined,
        });
      } catch (e) {
        console.error("Failed to restore session:", e);
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
      const result: AuthResponse = await login({ email, password });

      if (!result.success || !result.user || !result.token) {
        return result;
      }

      await saveSession({
        token: result.token,
        userId: result.user.id,
        userRole: result.user.role,
        userName: result.user.name,
        userEmail: result.user.email,
      });

      dispatch({
        isLoading: false,
        isSignout: false,
        userToken: result.token,
        userRole: result.user.role,
        userId: result.user.id,
      });

      router.replace(getHomeRoute(result.user.role));
      return result;
    },
    signUp: async (data: any) => {
      const payload = data as RegisterRequest;
      const result: AuthResponse = await register(payload);

      if (!result.success || !result.user || !result.token) {
        return result;
      }

      await saveSession({
        token: result.token,
        userId: result.user.id,
        userRole: result.user.role,
        userName: result.user.name,
        userEmail: result.user.email,
      });

      dispatch({
        isLoading: false,
        isSignout: false,
        userToken: result.token,
        userRole: result.user.role,
        userId: result.user.id,
      });

      router.replace(getHomeRoute(result.user.role));
      return result;
    },
    signOut: async () => {
      try {
        await clearSession();
        dispatch({
          isLoading: false,
          isSignout: true,
        });
        router.replace("/(auth)/login");
      } catch (e) {
        console.error("Failed to sign out:", e);
      }
    },
  };

  return {
    state,
    authContext,
  };
};
