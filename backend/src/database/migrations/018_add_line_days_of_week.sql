ALTER TABLE lines
  ADD COLUMN IF NOT EXISTS days_of_week TEXT NOT NULL DEFAULT 'seg,ter,qua,qui,sex';
