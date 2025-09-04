-- Migration 012: Add All Students as Reviewers
-- This migration inserts all existing students into the reviewers table
-- so they can be assigned reviews while maintaining their student functionality

-- Insert students as reviewers, avoiding duplicates
INSERT INTO reviewers (name, email, pin, is_active, created_at)
SELECT 
    s.name,
    COALESCE(s.email, s.name || '@student.local') as email, -- Use email if exists, otherwise generate one
    s.pin,
    TRUE as is_active,
    CURRENT_TIMESTAMP as created_at
FROM students s
WHERE NOT EXISTS (
    SELECT 1 FROM reviewers r 
    WHERE r.pin = s.pin 
    AND r.name = s.name
);

-- Note: This allows students to login as either students (for taking tests) 
-- or reviewers (for reviewing questions) using the same PIN but different role selection