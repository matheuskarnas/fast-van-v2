CREATE TABLE IF NOT EXISTS daily_van_decisions (
  id TEXT PRIMARY KEY,
  line_id TEXT NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,                    -- YYYY-MM-DD
  decision TEXT NOT NULL,                -- 'single_van' | 'double_van_fleet' | 'double_van_app'
  vehicle_id TEXT REFERENCES vehicles(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (line_id, date)
);
