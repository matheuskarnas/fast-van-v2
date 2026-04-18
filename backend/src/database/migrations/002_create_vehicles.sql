CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL,
  plate TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT vehicles_driver_fk
    FOREIGN KEY (driver_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT vehicles_year_valid CHECK (year >= 1980),
  CONSTRAINT vehicles_capacity_valid CHECK (capacity >= 1 AND capacity <= 80)
);
