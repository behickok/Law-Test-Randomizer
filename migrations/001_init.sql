-- Migration script to set up initial database schema for test randomizer.

CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS choices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    choice_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS test_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    score INTEGER
);

CREATE TABLE IF NOT EXISTS attempt_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    choice_id INTEGER NOT NULL REFERENCES choices(id),
    is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------------
-- Sample seed data to make the application usable out of the box.
-- ---------------------------------------------------------------------------

INSERT INTO tests (title, description) VALUES
    ('Civics Sample', 'Basic questions about U.S. law');

-- Questions for test id 1
INSERT INTO questions (test_id, question_text) VALUES
    (1, 'What is the supreme law of the land?'),
    (1, 'Who is in charge of the executive branch?');

-- Choices for question 1
INSERT INTO choices (question_id, choice_text, is_correct) VALUES
    (1, 'The Constitution', TRUE),
    (1, 'The Federalist Papers', FALSE),
    (1, 'The Declaration of Independence', FALSE),
    (1, 'The Articles of Confederation', FALSE);

-- Choices for question 2
INSERT INTO choices (question_id, choice_text, is_correct) VALUES
    (2, 'The President', TRUE),
    (2, 'The Chief Justice', FALSE),
    (2, 'The Speaker of the House', FALSE),
    (2, 'The Senate Majority Leader', FALSE);

