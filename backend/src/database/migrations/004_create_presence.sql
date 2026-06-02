CREATE TABLE IF NOT EXISTS invites (
  token TEXT PRIMARY KEY,
  line_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT invites_line_fk FOREIGN KEY (line_id) REFERENCES lines(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS line_enrollments (
  id TEXT PRIMARY KEY,
  line_id TEXT NOT NULL,
  passenger_id TEXT NOT NULL,
  enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT line_enrollments_line_fk FOREIGN KEY (line_id) REFERENCES lines(id) ON DELETE CASCADE,
  CONSTRAINT line_enrollments_user_fk FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT line_enrollments_unique UNIQUE (line_id, passenger_id)
);

CREATE TABLE IF NOT EXISTS presence_records (
  id TEXT PRIMARY KEY,
  line_id TEXT NOT NULL,
  passenger_id TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'vai e volta',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT presence_records_line_fk FOREIGN KEY (line_id) REFERENCES lines(id) ON DELETE CASCADE,
  CONSTRAINT presence_records_user_fk FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT presence_records_unique UNIQUE (line_id, passenger_id, date)
);
