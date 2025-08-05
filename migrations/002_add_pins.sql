---------------------------------------------------------------------
-- Add PIN support for teachers and students and test activation flag
---------------------------------------------------------------------
ALTER TABLE tests ADD COLUMN teacher_pin TEXT DEFAULT '0000';
ALTER TABLE tests ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE test_attempts ADD COLUMN student_pin TEXT  DEFAULT '0000';
