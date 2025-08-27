-- Migration to add sections support for question randomization
-- Sections allow grouping questions and randomly selecting a specified number from each group

-- Add sections table
CREATE SEQUENCE IF NOT EXISTS sections_seq;

CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY DEFAULT nextval('sections_seq'),
    test_id INTEGER NOT NULL REFERENCES tests(id),
    section_name TEXT NOT NULL,
    section_order INTEGER NOT NULL DEFAULT 1,
    total_questions INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(test_id, section_name),
    UNIQUE(test_id, section_order)
);

-- Add section_id to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES sections(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_questions_section_id ON questions(section_id);
CREATE INDEX IF NOT EXISTS idx_sections_test_id ON sections(test_id);