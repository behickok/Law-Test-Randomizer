-- Migration 009: Add Review System
-- Creates tables for question review assignments and feedback

-- Review assignments table - manages the overall review process
CREATE TABLE IF NOT EXISTS review_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL REFERENCES tests(id),
    assigner_id INTEGER NOT NULL REFERENCES teachers(id), -- teacher who created the assignment
    title TEXT NOT NULL,
    description TEXT,
    questions_per_reviewer INTEGER DEFAULT 40,
    overlap_factor INTEGER DEFAULT 2, -- how many times each question should be reviewed
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Individual question reviews
CREATE TABLE IF NOT EXISTS question_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    reviewer_id INTEGER NOT NULL REFERENCES teachers(id), -- teacher acting as reviewer
    assignment_id INTEGER NOT NULL REFERENCES review_assignments(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 scale
    feedback TEXT,
    suggestions TEXT,
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    clarity_rating INTEGER CHECK (clarity_rating >= 1 AND clarity_rating <= 5),
    relevance_rating INTEGER CHECK (relevance_rating >= 1 AND relevance_rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(question_id, reviewer_id, assignment_id) -- prevent duplicate reviews
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_assignments_test_id ON review_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_review_assignments_assigner_id ON review_assignments(assigner_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_assignment_id ON question_reviews(assignment_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_reviewer_id ON question_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_question_id ON question_reviews(question_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_status ON question_reviews(status);

-- Add a view for easy review summary queries
CREATE VIEW IF NOT EXISTS review_summary AS
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
