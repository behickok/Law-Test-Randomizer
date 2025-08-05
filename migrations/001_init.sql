---------------------------------------------------------------------
-- 1. Sequences (provide auto-increment behaviour)
---------------------------------------------------------------------
CREATE SEQUENCE tests_seq;
CREATE SEQUENCE questions_seq;
CREATE SEQUENCE choices_seq;
CREATE SEQUENCE test_attempts_seq;
CREATE SEQUENCE attempt_answers_seq;

---------------------------------------------------------------------
-- 2. Tables
---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tests (
    id          INTEGER PRIMARY KEY DEFAULT nextval('tests_seq'),
    title       TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
    id            INTEGER PRIMARY KEY DEFAULT nextval('questions_seq'),
    test_id       INTEGER NOT NULL REFERENCES tests(id),
    question_text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS choices (
    id          INTEGER PRIMARY KEY DEFAULT nextval('choices_seq'),
    question_id INTEGER NOT NULL REFERENCES questions(id),
    choice_text TEXT NOT NULL,
    is_correct  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS test_attempts (
    id           INTEGER PRIMARY KEY DEFAULT nextval('test_attempts_seq'),
    test_id      INTEGER NOT NULL REFERENCES tests(id),
    student_name TEXT NOT NULL,
    started_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    score        INTEGER
);

CREATE TABLE IF NOT EXISTS attempt_answers (
    id          INTEGER PRIMARY KEY DEFAULT nextval('attempt_answers_seq'),
    attempt_id  INTEGER NOT NULL REFERENCES test_attempts(id),
    question_id INTEGER NOT NULL REFERENCES questions(id),
    choice_id   INTEGER NOT NULL REFERENCES choices(id),
    is_correct  BOOLEAN NOT NULL DEFAULT FALSE
);

---------------------------------------------------------------------
-- 3. Seed data
---------------------------------------------------------------------

-- sample test
INSERT INTO tests (title, description)
VALUES ('Civics Sample', 'Basic questions about U.S. law');

-- sample questions
INSERT INTO questions (test_id, question_text) VALUES
    (1, 'What is the supreme law of the land?'),
    (1, 'Who is in charge of the executive branch?');

-- choices for question 1
INSERT INTO choices (question_id, choice_text, is_correct) VALUES
    (1, 'The Constitution', TRUE),
    (1, 'The Federalist Papers', FALSE),
    (1, 'The Declaration of Independence', FALSE),
    (1, 'The Articles of Confederation', FALSE);

-- choices for question 2
INSERT INTO choices (question_id, choice_text, is_correct) VALUES
    (2, 'The President', TRUE),
    (2, 'The Chief Justice', FALSE),
    (2, 'The Speaker of the House', FALSE),
    (2, 'The Senate Majority Leader', FALSE);
