-- La primera sentencia es válida; la segunda falla y debe revertir las dos.
CREATE TABLE half_done (id INTEGER PRIMARY KEY) STRICT;
INSERT INTO missing_table (id) VALUES (1);
