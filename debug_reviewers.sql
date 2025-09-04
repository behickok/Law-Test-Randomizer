-- Debug queries to check reviewer assignment system

-- 1. Check if there are any reviewers in the reviewers table
SELECT 'Reviewers in reviewers table:' as description;
SELECT id, name, email, is_active FROM reviewers;

[
  {
    "id": 1,
    "name": "Test Reviewer",
    "email": "reviewer@test.com",
    "is_active": true
  }
]

-- 2. Check if there are any review assignments
SELECT 'Review assignments:' as description;
SELECT id, title, test_id, assigner_id, status FROM review_assignments;

[
  {
    "id": 1,
    "title": "Appellate Law Review Assignment",
    "test_id": 16,
    "assigner_id": 1,
    "status": "active"
  },
  {
    "id": 2,
    "title": "Test Review",
    "test_id": 17,
    "assigner_id": 2,
    "status": "active"
  }
]

-- 3. Check if there are any question reviews
SELECT 'Question reviews:' as description;  
SELECT id, question_id, reviewer_id, assignment_id, status FROM question_reviews LIMIT 10;

-- 4. Check if the reviewer who is logging in exists
-- Replace X with the actual reviewer ID from login
-- SELECT 'Specific reviewer check:' as description;
-- SELECT id, name FROM reviewers WHERE id = X AND is_active = TRUE;

-- 5. Check the join that getReviewerAssignments uses
-- Replace X with the actual reviewer ID from login
-- SELECT 'Assignments for reviewer X:' as description;
-- SELECT DISTINCT ra.id, ra.title, t.title as test_title
-- FROM review_assignments ra
-- JOIN tests t ON ra.test_id = t.id  
-- JOIN question_reviews qr ON ra.id = qr.assignment_id
-- WHERE qr.reviewer_id = X AND ra.status = 'active';