import AsyncStorage from "@react-native-async-storage/async-storage";

export interface StoredSession {
  token: string;
  userId: string;
  userRole: "DRIVER" | "PASSENGER";
  userName?: string;
  userEmail?: string;
}

const SESSION_KEYS = {
  token: "userToken",
  role: "userRole",
  id: "userId",
  name: "userName",
  email: "userEmail",
} as const;

export async function saveSession(session: StoredSession): Promise<void> {
  await AsyncStorage.multiSet([
    [SESSION_KEYS.token, session.token],
    [SESSION_KEYS.role, session.userRole],
    [SESSION_KEYS.id, session.userId],
    [SESSION_KEYS.name, session.userName ?? ""],
    [SESSION_KEYS.email, session.userEmail ?? ""],
  ]);
}

export async function getSession(): Promise<StoredSession | null> {
  const values = await AsyncStorage.multiGet([
    SESSION_KEYS.token,
    SESSION_KEYS.role,
    SESSION_KEYS.id,
    SESSION_KEYS.name,
    SESSION_KEYS.email,
  ]);

  const parsed = Object.fromEntries(values);
  const token = parsed[SESSION_KEYS.token];
  const userRole = parsed[SESSION_KEYS.role] as
    | StoredSession["userRole"]
    | undefined;
  const userId = parsed[SESSION_KEYS.id];

  if (!token || !userRole || !userId) {
    return null;
  }

  return {
    token,
    userRole,
    userId,
    userName: parsed[SESSION_KEYS.name] || undefined,
    userEmail: parsed[SESSION_KEYS.email] || undefined,
  };
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(SESSION_KEYS));
}

export function getHomeRoute(userRole?: "DRIVER" | "PASSENGER") {
  return userRole === "DRIVER"
    ? "/(app)/(driver)/home"
    : "/(app)/(passenger)/home";
}
