import { Platform } from "react-native";

const DEFAULT_API_URL = Platform.select({
  android: "http://10.0.2.2:3001",
  ios: "http://localhost:3001",
  default: "http://localhost:3001",
});

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL || "http://localhost:3001";

export const ApiEndpoints = {
  // Auth
  LOGIN: `${API_URL}/api/v1/auth/login`,
  REGISTER: `${API_URL}/api/v1/auth/register`,
  REFRESH_TOKEN: `${API_URL}/api/v1/auth/refresh`,
  LOGOUT: `${API_URL}/api/v1/auth/logout`,

  // Users
  GET_USER: `${API_URL}/api/v1/users/:id`,
  UPDATE_USER: `${API_URL}/api/v1/users/:id`,
  GET_PROFILE: `${API_URL}/api/v1/users/profile`,

  // Vehicles
  REGISTER_VEHICLE: `${API_URL}/api/v1/vehicles`,
  GET_VEHICLES: `${API_URL}/api/v1/vehicles`,
  UPDATE_VEHICLE: `${API_URL}/api/v1/vehicles/:id`,

  // Lines
  CREATE_LINE: `${API_URL}/api/v1/lines`,
  GET_LINES: `${API_URL}/api/v1/lines`,
  GET_LINE: `${API_URL}/api/v1/lines/:id`,
  UPDATE_LINE: `${API_URL}/api/v1/lines/:id`,
  JOIN_LINE: `${API_URL}/api/v1/lines/:id/join`,

  // Presence (RF3)
  GET_MY_PRESENCE_LINES: `${API_URL}/api/v1/presence/me/lines`,
  UPDATE_MY_PRESENCE_STATUS: `${API_URL}/api/v1/presence/lines/:lineId/me/status`,

  // Chat
  CREATE_PRIVATE_CONVERSATION: `${API_URL}/api/v1/chat/private/conversations`,
  GET_PRIVATE_MESSAGES: `${API_URL}/api/v1/chat/private/conversations/:id/messages`,
  SEND_PRIVATE_MESSAGE: `${API_URL}/api/v1/chat/private/conversations/:id/messages`,
  MARK_PRIVATE_MESSAGES_READ: `${API_URL}/api/v1/chat/private/conversations/:id/read`,
  PRIVATE_CONVERSATION_STREAM: `${API_URL}/api/v1/chat/private/conversations/:id/stream`,
  CREATE_GROUP_CHAT: `${API_URL}/api/v1/chat/groups`,
  GET_GROUP_MESSAGES: `${API_URL}/api/v1/chat/groups/:lineId/messages`,
  SEND_GROUP_MESSAGE: `${API_URL}/api/v1/chat/groups/:lineId/messages`,
  GROUP_CHAT_MEMBERS: `${API_URL}/api/v1/chat/groups/:lineId/members`,
  GROUP_CHAT_STREAM: `${API_URL}/api/v1/chat/groups/:lineId/stream`,

  // Geofencing
  CREATE_GEOFENCE_LINE: `${API_URL}/api/v1/geofencing/lines`,
  START_GEOFENCE_LINE: `${API_URL}/api/v1/geofencing/lines/:lineId/start`,
  PROCESS_GEOFENCE_CHECKIN: `${API_URL}/api/v1/geofencing/lines/:lineId/check-ins`,
  GET_GEOFENCE_EXECUTION: `${API_URL}/api/v1/geofencing/lines/:lineId/execution`,
  GEOFENCE_STREAM: `${API_URL}/api/v1/geofencing/lines/:lineId/notifications/stream`,

  // Operations dashboard (RF4/RF5)
  GET_OPERATIONS_DASHBOARD: `${API_URL}/api/v1/operations/lines/:lineId/dashboard`,
};

export const API_TIMEOUT = 30000; // 30 seconds
export const REQUEST_RETRY_COUNT = 3;
export const REQUEST_RETRY_DELAY = 1000; // 1 second
