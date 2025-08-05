---------------------------------------------------------------------
-- Create teachers and students tables
---------------------------------------------------------------------
CREATE SEQUENCE teachers_seq;
CREATE SEQUENCE students_seq;

CREATE TABLE IF NOT EXISTS teachers (
    id   INTEGER PRIMARY KEY DEFAULT nextval('teachers_seq'),
    name TEXT NOT NULL,
    pin  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS students (
    id   INTEGER PRIMARY KEY DEFAULT nextval('students_seq'),
    name TEXT NOT NULL,
    pin  TEXT NOT NULL UNIQUE
);
