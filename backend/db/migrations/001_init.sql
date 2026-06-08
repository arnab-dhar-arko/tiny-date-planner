CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  currency_preference CHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_budget NUMERIC(14,2) NOT NULL CHECK (total_budget >= 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  base_currency CHAR(3) NOT NULL,
  is_group BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS trip_members (
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, user_id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  paid_by_user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount_base NUMERIC(14,2) NOT NULL CHECK (amount_base >= 0),
  amount_local NUMERIC(14,2) NOT NULL CHECK (amount_local >= 0),
  local_currency CHAR(3) NOT NULL,
  exchange_rate NUMERIC(16,6) NOT NULL CHECK (exchange_rate > 0),
  split_type TEXT NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'exact', 'percentage')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  amount_owed NUMERIC(14,2) NOT NULL CHECK (amount_owed >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (expense_id, user_id)
);

CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id),
  to_user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_user_id <> to_user_id)
);

CREATE TABLE IF NOT EXISTS sync_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trips_owner ON trips(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user ON trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses(trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_settlements_trip ON settlements(trip_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sync_events_user_created ON sync_events(user_id, created_at, id);

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_users_updated_at ON users;
CREATE TRIGGER touch_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_trips_updated_at ON trips;
CREATE TRIGGER touch_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_expenses_updated_at ON expenses;
CREATE TRIGGER touch_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
