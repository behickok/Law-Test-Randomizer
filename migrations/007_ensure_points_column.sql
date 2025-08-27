-- Ensure the points column exists in questions table
-- This is a safety migration in case 005_long_response.sql wasn't applied

ALTER TABLE questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 1;

-- Also ensure other columns from the long response migration exist
ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS answer_text TEXT;
ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS points_awarded INTEGER;

-- Make choice_id nullable if it isn't already (for long response questions)
-- Note: DuckDB may not support conditional column modifications, so this might need to be handled differently