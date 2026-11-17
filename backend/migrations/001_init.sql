-- 001_init: esquema inicial (spec 4.1 a 4.5).
-- Sin BEGIN/COMMIT: el runner envuelve cada migración en su propia transacción (R-105).

-- 4.3 Tasas vigentes por país, en puntos básicos. Se editan a mano; sin triggers.
CREATE TABLE tax_rates (
  country_code TEXT PRIMARY KEY
    CHECK (length(country_code) = 2 AND country_code = upper(country_code)),
  rate_bp INTEGER NOT NULL CHECK (rate_bp BETWEEN 0 AND 10000)
) STRICT;

-- 4.4 Clientes, con los valores ya normalizados.
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL CHECK (length(company_name) BETWEEN 2 AND 100),
  company_name_search TEXT NOT NULL,
  tax_id TEXT NOT NULL CHECK (length(tax_id) BETWEEN 5 AND 20),
  email TEXT NOT NULL CHECK (length(email) <= 254),
  country_code TEXT NOT NULL REFERENCES tax_rates (country_code),
  plan TEXT NOT NULL CHECK (plan IN ('STARTER', 'BUSINESS', 'ENTERPRISE')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (country_code, tax_id)
) STRICT;

-- Orden de la búsqueda (RF-15).
CREATE INDEX customers_search_idx ON customers (company_name_search, id);

-- Inmutabilidad del cliente (RF-10).
CREATE TRIGGER customers_no_update BEFORE UPDATE ON customers
BEGIN
  SELECT RAISE(ABORT, 'customers are immutable');
END;

CREATE TRIGGER customers_no_delete BEFORE DELETE ON customers
BEGIN
  SELECT RAISE(ABORT, 'customers are immutable');
END;

-- 4.5 Simulaciones guardadas, con el snapshot de tasa y tramos (RB-09).
-- tax_rate_bp no tiene FK, para que sobreviva a cambios en tax_rates.
CREATE TABLE simulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers (id) ON DELETE RESTRICT,
  users INTEGER NOT NULL CHECK (users BETWEEN 1 AND 1000),
  storage_gb INTEGER NOT NULL CHECK (storage_gb BETWEEN 0 AND 100000),
  api_calls_per_month INTEGER NOT NULL CHECK (api_calls_per_month BETWEEN 0 AND 1000000),
  tax_rate_bp INTEGER NOT NULL CHECK (tax_rate_bp BETWEEN 0 AND 10000),
  base_cents INTEGER NOT NULL CHECK (base_cents >= 0),
  tax_cents INTEGER NOT NULL CHECK (tax_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents = base_cents + tax_cents),
  tiers_json TEXT NOT NULL CHECK (json_valid(tiers_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Historial de RF-27; id desempata dos simulaciones con el mismo created_at.
CREATE INDEX simulations_history_idx ON simulations (customer_id, created_at DESC, id DESC);

-- Inmutabilidad de la simulación (RF-25).
CREATE TRIGGER simulations_no_update BEFORE UPDATE ON simulations
BEGIN
  SELECT RAISE(ABORT, 'simulations are immutable');
END;

CREATE TRIGGER simulations_no_delete BEFORE DELETE ON simulations
BEGIN
  SELECT RAISE(ABORT, 'simulations are immutable');
END;
