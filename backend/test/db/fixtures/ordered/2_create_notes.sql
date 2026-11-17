-- Depende de 1: referencia a accounts.
CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts (id),
  body TEXT NOT NULL
) STRICT;
