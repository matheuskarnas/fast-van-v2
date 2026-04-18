export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  createdAt: string;
}

export interface GroupChat {
  id: string;
  lineId: string;
  members: string[];
  messages: ChatMessage[];
  createdAt: string;
}
