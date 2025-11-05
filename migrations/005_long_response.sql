ALTER TABLE questions ADD COLUMN points INTEGER DEFAULT 1;

CREATE TABLE attempt_answers_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL REFERENCES test_attempts(id),
    question_id INTEGER NOT NULL REFERENCES questions(id),
    choice_id INTEGER REFERENCES choices(id),
    is_correct BOOLEAN,
    answer_text TEXT,
    points_awarded INTEGER
);

INSERT INTO attempt_answers_new (id, attempt_id, question_id, choice_id, is_correct)
SELECT id, attempt_id, question_id, choice_id, is_correct FROM attempt_answers;

DROP TABLE attempt_answers;
ALTER TABLE attempt_answers_new RENAME TO attempt_answers;
