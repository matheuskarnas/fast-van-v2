CREATE TABLE IF NOT EXISTS b2b_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,        -- endereço da empresa (destino)
  origin_city TEXT NOT NULL,        -- cidade de partida dos funcionários
  arrival_time TEXT NOT NULL,       -- HH:MM chegada na empresa
  departure_time TEXT NOT NULL,     -- HH:MM saída da empresa
  passenger_count INT NOT NULL,     -- número estimado de funcionários
  days_of_week TEXT NOT NULL,       -- ex: "seg,ter,qua,qui,sex"
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',  -- open | contracted | closed
  contracted_line_id TEXT REFERENCES lines(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
