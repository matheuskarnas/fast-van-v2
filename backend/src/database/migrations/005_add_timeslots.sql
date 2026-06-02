-- RF2/RF6: Adiciona horário fixo do passageiro na linha
ALTER TABLE line_enrollments
  ADD COLUMN IF NOT EXISTS departure_time TEXT,
  ADD COLUMN IF NOT EXISTS arrival_time TEXT;

-- RF6: Fila de espera quando passageiro quer trocar de slot em um dia específico
CREATE TABLE IF NOT EXISTS slot_waitlist (
  id TEXT PRIMARY KEY,
  line_id TEXT NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  passenger_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,                         -- YYYY-MM-DD do dia da solicitação
  requested_departure_time TEXT NOT NULL,     -- slot desejado (ex: "08:00")
  requested_arrival_time TEXT NOT NULL,       -- slot de volta desejado
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (line_id, passenger_id, date, requested_departure_time)
);

-- RF6: Presença com solicitação de slot alternativo no dia
ALTER TABLE presence_records
  ADD COLUMN IF NOT EXISTS alternate_departure_time TEXT,
  ADD COLUMN IF NOT EXISTS alternate_arrival_time TEXT,
  ADD COLUMN IF NOT EXISTS slot_status TEXT DEFAULT 'confirmed';
  -- slot_status: 'confirmed' | 'waitlist' | 'switched'
