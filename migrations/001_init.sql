---------------------------------------------------------------------
-- Reset schema: drop existing tables and sequences
---------------------------------------------------------------------
DROP TABLE IF EXISTS attempt_answers;
DROP TABLE IF EXISTS test_attempts;
DROP TABLE IF EXISTS choices;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS tests;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS teachers;

DROP SEQUENCE IF EXISTS attempt_answers_seq;
DROP SEQUENCE IF EXISTS test_attempts_seq;
DROP SEQUENCE IF EXISTS choices_seq;
DROP SEQUENCE IF EXISTS questions_seq;
DROP SEQUENCE IF EXISTS tests_seq;
DROP SEQUENCE IF EXISTS students_seq;
DROP SEQUENCE IF EXISTS teachers_seq;

---------------------------------------------------------------------
-- 1. Sequences (provide auto-increment behaviour)
---------------------------------------------------------------------
CREATE SEQUENCE teachers_seq;
CREATE SEQUENCE students_seq;
CREATE SEQUENCE tests_seq;
CREATE SEQUENCE questions_seq;
CREATE SEQUENCE choices_seq;
CREATE SEQUENCE test_attempts_seq;
CREATE SEQUENCE attempt_answers_seq;

---------------------------------------------------------------------
-- 2. Tables
---------------------------------------------------------------------
CREATE TABLE teachers (
    id   INTEGER PRIMARY KEY DEFAULT nextval('teachers_seq'),
    name TEXT NOT NULL,
    pin  TEXT NOT NULL UNIQUE
);

CREATE TABLE students (
    id   INTEGER PRIMARY KEY DEFAULT nextval('students_seq'),
    name TEXT NOT NULL,
    pin  TEXT NOT NULL UNIQUE
);

CREATE TABLE tests (
    id          INTEGER PRIMARY KEY DEFAULT nextval('tests_seq'),
    title       TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active   BOOLEAN DEFAULT TRUE,
    teacher_id  INTEGER REFERENCES teachers(id)
);

CREATE TABLE questions (
    id            INTEGER PRIMARY KEY DEFAULT nextval('questions_seq'),
    test_id       INTEGER NOT NULL REFERENCES tests(id),
    question_text TEXT NOT NULL
);

CREATE TABLE choices (
    id          INTEGER PRIMARY KEY DEFAULT nextval('choices_seq'),
    question_id INTEGER NOT NULL REFERENCES questions(id),
    choice_text TEXT NOT NULL,
    is_correct  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE test_attempts (
    id           INTEGER PRIMARY KEY DEFAULT nextval('test_attempts_seq'),
    test_id      INTEGER NOT NULL REFERENCES tests(id),
    student_name TEXT NOT NULL,
    started_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    score        INTEGER,
    student_id   INTEGER REFERENCES students(id)
);

CREATE TABLE attempt_answers (
    id          INTEGER PRIMARY KEY DEFAULT nextval('attempt_answers_seq'),
    attempt_id  INTEGER NOT NULL REFERENCES test_attempts(id),
    question_id INTEGER NOT NULL REFERENCES questions(id),
    choice_id   INTEGER NOT NULL REFERENCES choices(id),
    is_correct  BOOLEAN NOT NULL DEFAULT FALSE
);

---------------------------------------------------------------------
-- 3. Seed data
---------------------------------------------------------------------
INSERT INTO teachers (name, pin) VALUES ('Test Teacher', '1111');
INSERT INTO students (name, pin) VALUES ('Test Student', '2222');
