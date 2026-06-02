-- Atualiza payments para garantir estrutura correta
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Receitas extras e despesas do motorista
CREATE TABLE IF NOT EXISTS financial_entries (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,           -- 'income' | 'expense'
  category TEXT NOT NULL,       -- 'fuel' | 'maintenance' | 'toll' | 'extra_trip' | 'other'
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  entry_date TEXT NOT NULL,     -- YYYY-MM-DD
  month TEXT NOT NULL,          -- YYYY-MM
  created_at TIMESTAMP DEFAULT NOW()
);
