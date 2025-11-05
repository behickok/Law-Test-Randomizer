-- Migration 010: Add Reviewer Role
-- Creates a separate reviewers table and updates the review system

-- Create reviewers table
CREATE TABLE IF NOT EXISTS reviewers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE, -- Email for reviewer identification
    pin TEXT NOT NULL UNIQUE, -- PIN for authentication
    invite_code TEXT UNIQUE, -- For inviting reviewers to join
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create reviewer invitations table to track invites from teachers
CREATE TABLE IF NOT EXISTS reviewer_invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id),
    reviewer_email TEXT NOT NULL,
    reviewer_name TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP
);

-- Update question_reviews table to reference reviewers instead of teachers
DROP VIEW IF EXISTS review_summary;
DROP VIEW IF EXISTS reviewer_summary;
DROP TABLE IF EXISTS question_reviews_new;

-- First, create a new table with the correct structure
CREATE TABLE IF NOT EXISTS question_reviews_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    reviewer_id INTEGER NOT NULL REFERENCES reviewers(id), -- Now references reviewers table
    assignment_id INTEGER NOT NULL REFERENCES review_assignments(id),
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

-- Copy any existing data (though there shouldn't be any yet)
INSERT INTO question_reviews_new (
    id, question_id, reviewer_id, assignment_id, status, rating, feedback, suggestions,
    difficulty_rating, clarity_rating, relevance_rating, created_at, completed_at
)
SELECT 
    id, question_id, reviewer_id, assignment_id, status, rating, feedback, suggestions,
    difficulty_rating, clarity_rating, relevance_rating, created_at, completed_at
FROM question_reviews
WHERE EXISTS (SELECT 1 FROM reviewers WHERE id = question_reviews.reviewer_id);

-- Drop old table and rename new one
DROP TABLE IF EXISTS question_reviews;
ALTER TABLE question_reviews_new RENAME TO question_reviews;

-- Create indexes for the new table
CREATE INDEX IF NOT EXISTS idx_question_reviews_assignment_id ON question_reviews(assignment_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_reviewer_id ON question_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_question_id ON question_reviews(question_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_status ON question_reviews(status);

-- Create indexes for reviewer tables
CREATE INDEX IF NOT EXISTS idx_reviewers_email ON reviewers(email);
CREATE INDEX IF NOT EXISTS idx_reviewers_pin ON reviewers(pin);
CREATE INDEX IF NOT EXISTS idx_reviewers_invite_code ON reviewers(invite_code);
CREATE INDEX IF NOT EXISTS idx_reviewer_invitations_teacher_id ON reviewer_invitations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_invitations_invite_code ON reviewer_invitations(invite_code);

-- Update the review_summary view to work with reviewers
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

-- Add a reviewer summary view
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
