CREATE TABLE IF NOT EXISTS event_requests (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_date TEXT NOT NULL,       -- YYYY-MM-DD
  start_time TEXT NOT NULL,       -- HH:MM
  end_time TEXT,                  -- HH:MM (opcional)
  origin_city TEXT NOT NULL,
  destination TEXT NOT NULL,      -- local do evento
  initial_count INT NOT NULL DEFAULT 1,  -- quantos amigos já confirmados ao criar
  interested_count INT NOT NULL DEFAULT 1, -- total atual (creator + interessados)
  status TEXT NOT NULL DEFAULT 'open',   -- open | closed
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_interests (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES event_requests(id) ON DELETE CASCADE,
  passenger_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (request_id, passenger_id)
);
