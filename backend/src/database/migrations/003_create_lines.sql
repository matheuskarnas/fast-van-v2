CREATE TABLE IF NOT EXISTS lines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_driver_id TEXT NOT NULL,
  driver_id TEXT,
  vehicle_id TEXT NOT NULL,
  origin_city TEXT NOT NULL,
  destination_place TEXT NOT NULL,
  arrival_times JSONB NOT NULL DEFAULT '[]',
  departure_times JSONB NOT NULL DEFAULT '[]',
  capacity INTEGER NOT NULL DEFAULT 16,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT lines_owner_fk FOREIGN KEY (owner_driver_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT lines_vehicle_fk FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS line_points (
  id TEXT PRIMARY KEY,
  line_id TEXT NOT NULL,
  address TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pickup', 'dropoff')),
  segment TEXT NOT NULL DEFAULT 'ida',
  passengers JSONB NOT NULL DEFAULT '[]',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT line_points_line_fk FOREIGN KEY (line_id) REFERENCES lines(id) ON DELETE CASCADE
);
