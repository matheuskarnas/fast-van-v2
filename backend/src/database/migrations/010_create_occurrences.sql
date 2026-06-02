CREATE TABLE IF NOT EXISTS occurrences (
  id TEXT PRIMARY KEY,
  line_id TEXT NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL REFERENCES users(id),
  passenger_id TEXT REFERENCES users(id),   -- opcional: passageiro_late / no_show
  type TEXT NOT NULL,                        -- slow_traffic | passenger_late | passenger_no_show | other
  notes TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
);
