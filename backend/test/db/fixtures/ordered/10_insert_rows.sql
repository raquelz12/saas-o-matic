-- Depende de 2: si el orden fuera alfabético ("10" < "2"), fallaría.
INSERT INTO accounts (id, name) VALUES (1, 'first');
INSERT INTO notes (account_id, body) VALUES (1, 'hello');
