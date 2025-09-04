-- Migration 011: Fix Review System
-- Fixes the inconsistencies in the review assignment system

-- Check if question_reviews_new exists and handle it
-- DuckDB doesn't support procedural blocks, so we'll handle this with conditional statements

-- DuckDB doesn't have complex conditional logic, so we'll use a simpler approach
-- Drop and recreate the question_reviews table with the correct structure

-- Drop the question_reviews table if it exists (it may have wrong structure)
DROP TABLE IF EXISTS question_reviews;

-- Also drop question_reviews_new if it exists from failed migration
DROP TABLE IF EXISTS question_reviews_new;

-- Ensure the sequence exists
CREATE SEQUENCE IF NOT EXISTS question_reviews_seq;

-- Create the correct question_reviews table structure
CREATE TABLE question_reviews (
    id INTEGER PRIMARY KEY DEFAULT nextval('question_reviews_seq'),
    question_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL, -- References reviewers.id, not teachers.id
    assignment_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    suggestions TEXT,
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    clarity_rating INTEGER CHECK (clarity_rating >= 1 AND clarity_rating <= 5),
    relevance_rating INTEGER CHECK (relevance_rating >= 1 AND relevance_rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(question_id, reviewer_id, assignment_id)
);

-- Add foreign key constraints
ALTER TABLE question_reviews ADD CONSTRAINT fk_question_reviews_question_id 
    FOREIGN KEY (question_id) REFERENCES questions(id);
    
ALTER TABLE question_reviews ADD CONSTRAINT fk_question_reviews_reviewer_id 
    FOREIGN KEY (reviewer_id) REFERENCES reviewers(id);
    
ALTER TABLE question_reviews ADD CONSTRAINT fk_question_reviews_assignment_id 
    FOREIGN KEY (assignment_id) REFERENCES review_assignments(id);

-- Create indexes for better performance (DuckDB compatible)
CREATE INDEX idx_question_reviews_assignment_id ON question_reviews(assignment_id);
CREATE INDEX idx_question_reviews_reviewer_id ON question_reviews(reviewer_id);
CREATE INDEX idx_question_reviews_question_id ON question_reviews(question_id);
CREATE INDEX idx_question_reviews_status ON question_reviews(status);

-- Update the review_summary view to work correctly with the new schema
DROP VIEW IF EXISTS review_summary;
CREATE VIEW review_summary AS
SELECT 
    ra.id as assignment_id,
    ra.title as assignment_title,
    ra.test_id,
    t.title as test_title,
    ra.assigner_id,
    teacher.name as assigner_name,
    COUNT(qr.id) as total_reviews_assigned,
    COUNT(CASE WHEN qr.status = 'completed' THEN 1 END) as reviews_completed,
    COUNT(CASE WHEN qr.status = 'pending' THEN 1 END) as reviews_pending,
    ROUND(AVG(CASE WHEN qr.rating IS NOT NULL THEN qr.rating END), 2) as avg_rating,
    ra.status as assignment_status,
    ra.created_at
FROM review_assignments ra
JOIN tests t ON ra.test_id = t.id
JOIN teachers teacher ON ra.assigner_id = teacher.id
LEFT JOIN question_reviews qr ON ra.id = qr.assignment_id
GROUP BY ra.id, ra.title, ra.test_id, t.title, ra.assigner_id, teacher.name, ra.status, ra.created_at
ORDER BY ra.created_at DESC;

-- Update the reviewer_summary view to work correctly
DROP VIEW IF EXISTS reviewer_summary;
CREATE VIEW reviewer_summary AS
SELECT 
    r.id as reviewer_id,
    r.name as reviewer_name,
    r.email as reviewer_email,
    r.is_active,
    COUNT(qr.id) as total_reviews_assigned,
    COUNT(CASE WHEN qr.status = 'completed' THEN 1 END) as reviews_completed,
    COUNT(CASE WHEN qr.status = 'pending' THEN 1 END) as reviews_pending,
    ROUND(AVG(CASE WHEN qr.rating IS NOT NULL THEN qr.rating END), 2) as avg_rating_given,
    r.created_at
FROM reviewers r
LEFT JOIN question_reviews qr ON r.id = qr.reviewer_id
GROUP BY r.id, r.name, r.email, r.is_active, r.created_at
ORDER BY r.created_at DESC;

-- Clean up any orphaned data
-- Remove any question_reviews that reference non-existent reviewers
DELETE FROM question_reviews 
WHERE reviewer_id NOT IN (SELECT id FROM reviewers WHERE is_active = TRUE);

-- Remove any question_reviews that reference non-existent assignments
DELETE FROM question_reviews 
WHERE assignment_id NOT IN (SELECT id FROM review_assignments WHERE status = 'active');