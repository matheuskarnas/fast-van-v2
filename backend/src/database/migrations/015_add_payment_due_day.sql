ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS due_day INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'payments_due_day_check'
       AND conrelid = 'payments'::regclass
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_due_day_check
      CHECK (due_day IS NULL OR (due_day >= 1 AND due_day <= 31))
      NOT VALID;
  END IF;
END $$;

ALTER TABLE payments VALIDATE CONSTRAINT payments_due_day_check;
