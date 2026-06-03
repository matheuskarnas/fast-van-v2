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

  // Presence (RF3/RF26)
  GET_MY_PRESENCE_LINES: `${API_URL}/api/v1/presence/me/lines`,
  UPDATE_MY_PRESENCE_STATUS: `${API_URL}/api/v1/presence/lines/:lineId/me/status`,
  GET_MY_SUMMARY: `${API_URL}/api/v1/presence/me/summary`,
  // RF6: Troca de slot
  POST_SLOT_REQUEST: `${API_URL}/api/v1/presence/lines/:lineId/me/slot-request`,
  DELETE_SLOT_REQUEST: `${API_URL}/api/v1/presence/lines/:lineId/me/slot-request`,

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
  CREATE_POLL: `${API_URL}/api/v1/chat/groups/:lineId/polls`,
  VOTE_POLL: `${API_URL}/api/v1/chat/groups/:lineId/polls/:pollId/vote`,
  GET_POLL: `${API_URL}/api/v1/chat/groups/:lineId/polls/:pollId`,

  // Driver Dashboard (RF15/30)
  GET_DRIVER_DASHBOARD: `${API_URL}/api/v1/driver/dashboard`,
  // Marketplace B2B (RF10/11)
  CREATE_B2B_REQUEST: `${API_URL}/api/v1/marketplace/b2b`,
  LIST_B2B_REQUESTS: `${API_URL}/api/v1/marketplace/b2b`,
  LIST_MY_B2B_REQUESTS: `${API_URL}/api/v1/marketplace/b2b/mine`,
  UPDATE_B2B_REQUEST: `${API_URL}/api/v1/marketplace/b2b/:id`,
  // Geofencing
  CREATE_GEOFENCE_LINE: `${API_URL}/api/v1/geofencing/lines`,
  START_GEOFENCE_LINE: `${API_URL}/api/v1/geofencing/lines/:lineId/start`,
  PROCESS_GEOFENCE_CHECKIN: `${API_URL}/api/v1/geofencing/lines/:lineId/check-ins`,
  GET_GEOFENCE_EXECUTION: `${API_URL}/api/v1/geofencing/lines/:lineId/execution`,
  GEOFENCE_STREAM: `${API_URL}/api/v1/geofencing/lines/:lineId/notifications/stream`,

  // Operations dashboard (RF4/RF5)
  LIST_OPERATIONS_LINES: `${API_URL}/api/v1/operations/lines`,
  GET_OPERATIONS_DASHBOARD: `${API_URL}/api/v1/operations/lines/:lineId/dashboard`,
  POST_VAN_DECISION: `${API_URL}/api/v1/operations/lines/:lineId/decision`,
  GET_VAN_DECISION: `${API_URL}/api/v1/operations/lines/:lineId/decision`,
  // Finance (RF24)
  GET_FINANCE_DASHBOARD: `${API_URL}/api/v1/finance/dashboard`,
  GET_LINE_PAYMENTS: `${API_URL}/api/v1/finance/lines/:lineId/payments`,
  UPSERT_PAYMENT: `${API_URL}/api/v1/finance/lines/:lineId/payments/:passengerId`,
  POST_FINANCE_ENTRY: `${API_URL}/api/v1/finance/entries`,
  GET_MY_PAYMENT_STATUS: `${API_URL}/api/v1/finance/me/payment-status`,
  // Line invites
  CREATE_LINE_INVITE: `${API_URL}/api/v1/lines/:lineId/invite`,
  ACCEPT_LINE_INVITE: `${API_URL}/api/v1/lines/invite/accept`,
  PREVIEW_INVITE: `${API_URL}/api/v1/lines/invite/:token/preview`,

  // Ratings (RF14)
  POST_RATING: `${API_URL}/api/v1/ratings`,
  GET_DRIVER_RATINGS: `${API_URL}/api/v1/ratings/driver/:driverId`,
  GET_MY_RATING: `${API_URL}/api/v1/ratings/me`,
  // Occurrences (RF23)
  POST_OCCURRENCE: `${API_URL}/api/v1/lines/:lineId/occurrences`,
  GET_OCCURRENCES: `${API_URL}/api/v1/lines/:lineId/occurrences`,
  // No-show (RF25)
  POST_NO_SHOW: `${API_URL}/api/v1/lines/:lineId/no-show`,
  // Point suggestions (RF19/20)
  POST_SUGGESTION: `${API_URL}/api/v1/lines/:lineId/point-suggestions`,
  GET_SUGGESTIONS: `${API_URL}/api/v1/lines/:lineId/point-suggestions`,
  GET_MY_SUGGESTIONS: `${API_URL}/api/v1/lines/:lineId/point-suggestions/me`,
  DECIDE_SUGGESTION: `${API_URL}/api/v1/lines/:lineId/point-suggestions/:suggId`,
  // Line points
  ADD_LINE_POINT: `${API_URL}/api/v1/lines/:lineId/points`,
  UPDATE_LINE_POINT: `${API_URL}/api/v1/lines/:lineId/points/:pointId`,
  DELETE_LINE_POINT: `${API_URL}/api/v1/lines/:lineId/points/:pointId`,
};

export const API_TIMEOUT = 30000; // 30 seconds
export const REQUEST_RETRY_COUNT = 3;
export const REQUEST_RETRY_DELAY = 1000; // 1 second
