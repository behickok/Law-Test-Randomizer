-- Add question_id column to questions table to support upserts
ALTER TABLE questions ADD COLUMN question_id TEXT;