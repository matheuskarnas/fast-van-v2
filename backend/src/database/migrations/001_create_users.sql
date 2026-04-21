CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cpf VARCHAR(11) NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('DRIVER', 'PASSENGER')),
  cnh TEXT,
  birth_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  CONSTRAINT cnh_required_for_driver CHECK (
    role <> 'DRIVER' OR cnh IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS users_cnh_unique_idx
  ON users (cnh)
  WHERE cnh IS NOT NULL;
