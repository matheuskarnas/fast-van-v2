CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  line_id TEXT NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  passenger_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  month TEXT NOT NULL,          -- YYYY-MM
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid'
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (line_id, passenger_id, month)
);
