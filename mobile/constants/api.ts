const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const ApiEndpoints = {
  // Auth
  LOGIN: `${API_URL}/auth/login`,
  REGISTER: `${API_URL}/auth/register`,
  REFRESH_TOKEN: `${API_URL}/auth/refresh`,
  LOGOUT: `${API_URL}/auth/logout`,

  // Users
  GET_USER: `${API_URL}/users/:id`,
  UPDATE_USER: `${API_URL}/users/:id`,
  GET_PROFILE: `${API_URL}/users/profile`,

  // Vehicles
  REGISTER_VEHICLE: `${API_URL}/vehicles`,
  GET_VEHICLES: `${API_URL}/vehicles`,
  UPDATE_VEHICLE: `${API_URL}/vehicles/:id`,

  // Lines
  CREATE_LINE: `${API_URL}/lines`,
  GET_LINES: `${API_URL}/lines`,
  GET_LINE: `${API_URL}/lines/:id`,
  UPDATE_LINE: `${API_URL}/lines/:id`,
  JOIN_LINE: `${API_URL}/lines/:id/join`,

  // Chat
  GET_CONVERSATIONS: `${API_URL}/chat/conversations`,
  GET_MESSAGES: `${API_URL}/chat/conversations/:id/messages`,
  SEND_MESSAGE: `${API_URL}/chat/messages`,

  // Location
  UPDATE_LOCATION: `${API_URL}/location/update`,
};

export const API_TIMEOUT = 30000; // 30 seconds
export const REQUEST_RETRY_COUNT = 3;
export const REQUEST_RETRY_DELAY = 1000; // 1 second
