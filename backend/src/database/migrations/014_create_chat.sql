CREATE TABLE IF NOT EXISTS private_conversations (
  id TEXT PRIMARY KEY,
  passenger_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT 'marketplace',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT private_conversations_passenger_fk FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT private_conversations_driver_fk FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT private_conversations_unique UNIQUE (passenger_id, driver_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  private_conversation_id TEXT,
  line_id TEXT,
  sender_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  poll_id TEXT,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'delivered',
  retry_scheduled BOOLEAN NOT NULL DEFAULT false,
  read_by JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_messages_private_fk FOREIGN KEY (private_conversation_id) REFERENCES private_conversations(id) ON DELETE CASCADE,
  CONSTRAINT chat_messages_line_fk FOREIGN KEY (line_id) REFERENCES lines(id) ON DELETE CASCADE,
  CONSTRAINT chat_messages_sender_fk FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chat_messages_target_check CHECK (
    (private_conversation_id IS NOT NULL AND line_id IS NULL)
    OR (private_conversation_id IS NULL AND line_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS chat_messages_private_idx
  ON chat_messages (private_conversation_id, created_at);

CREATE INDEX IF NOT EXISTS chat_messages_group_idx
  ON chat_messages (line_id, created_at);

CREATE TABLE IF NOT EXISTS chat_polls (
  id TEXT PRIMARY KEY,
  line_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_polls_line_fk FOREIGN KEY (line_id) REFERENCES lines(id) ON DELETE CASCADE,
  CONSTRAINT chat_polls_creator_fk FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);
