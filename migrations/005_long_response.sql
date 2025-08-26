ALTER TABLE questions ADD COLUMN points INTEGER DEFAULT 1;
ALTER TABLE attempt_answers ALTER COLUMN choice_id DROP NOT NULL;
ALTER TABLE attempt_answers ALTER COLUMN is_correct DROP NOT NULL;
ALTER TABLE attempt_answers ADD COLUMN answer_text TEXT;
ALTER TABLE attempt_answers ADD COLUMN points_awarded INTEGER;
