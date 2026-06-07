ALTER TABLE lines
  ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_lines_marketplace_enabled
  ON lines(marketplace_enabled)
  WHERE marketplace_enabled = TRUE;
