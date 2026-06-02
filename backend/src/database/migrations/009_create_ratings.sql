CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  line_id TEXT NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  passenger_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id TEXT REFERENCES vehicles(id),
  month TEXT NOT NULL,              -- YYYY-MM
  -- Motorista
  punctuality SMALLINT NOT NULL CHECK (punctuality BETWEEN 1 AND 5),
  driving SMALLINT NOT NULL CHECK (driving BETWEEN 1 AND 5),
  friendliness SMALLINT NOT NULL CHECK (friendliness BETWEEN 1 AND 5),
  -- Veículo
  comfort SMALLINT NOT NULL CHECK (comfort BETWEEN 1 AND 5),
  vehicle_quality SMALLINT NOT NULL CHECK (vehicle_quality BETWEEN 1 AND 5),
  hygiene SMALLINT NOT NULL CHECK (hygiene BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (line_id, passenger_id, month)
);
