import { apiService } from "./api";
import { ApiEndpoints } from "../constants/api";

export interface CreatePrivateConversationPayload {
  passengerId: string;
  driverId: string;
  context?: string;
}

export interface CreateGroupChatPayload {
  lineId: string;
  driverIds?: string[];
  passengerIds?: string[];
}

export async function validateUserExists(userId: string) {
  try {
    const response = await apiService.get(
      ApiEndpoints.GET_USER.replace(":id", userId),
    );
    return response.data?.success ?? false;
  } catch {
    return false;
  }
}

export async function createPrivateConversation(
  payload: CreatePrivateConversationPayload,
) {
  const response = await apiService.post(
    ApiEndpoints.CREATE_PRIVATE_CONVERSATION,
    payload,
  );
  return response.data;
}

export async function getPrivateMessages(conversationId: string) {
  const response = await apiService.get(
    ApiEndpoints.GET_PRIVATE_MESSAGES.replace(":id", conversationId),
  );
  return response.data;
}

export async function sendPrivateMessage(
  conversationId: string,
  text: string,
  forceRealtimeFailure?: boolean,
) {
  const response = await apiService.post(
    ApiEndpoints.SEND_PRIVATE_MESSAGE.replace(":id", conversationId),
    { text, forceRealtimeFailure },
  );
  return response.data;
}

export async function markPrivateMessagesAsRead(conversationId: string) {
  const response = await apiService.patch(
    ApiEndpoints.MARK_PRIVATE_MESSAGES_READ.replace(":id", conversationId),
    {},
  );
  return response.data;
}

export async function createGroupChat(payload: CreateGroupChatPayload) {
  const response = await apiService.post(
    ApiEndpoints.CREATE_GROUP_CHAT,
    payload,
  );
  return response.data;
}

export async function getGroupMessages(lineId: string, markAsRead = false) {
  const response = await apiService.get(
    `${ApiEndpoints.GET_GROUP_MESSAGES.replace(":lineId", lineId)}?markAsRead=${markAsRead}`,
  );
  return response.data;
}

export async function sendGroupMessage(lineId: string, text: string) {
  const response = await apiService.post(
    ApiEndpoints.SEND_GROUP_MESSAGE.replace(":lineId", lineId),
    { text },
  );
  return response.data;
}

export async function addGroupMember(
  lineId: string,
  userId: string,
  role: "DRIVER" | "PASSENGER",
) {
  const response = await apiService.post(
    ApiEndpoints.GROUP_CHAT_MEMBERS.replace(":lineId", lineId),
    {
      userId,
      role,
    },
  );
  return response.data;
}

export async function removeGroupMember(lineId: string, userId: string) {
  const response = await apiService.delete(
    ApiEndpoints.GROUP_CHAT_MEMBERS.replace(":lineId", lineId).replace(
      ":userId",
      userId,
    ),
  );
  return response.data;
}
