---------------------------------------------------------------------
-- Refactor authentication to use foreign keys to users tables
---------------------------------------------------------------------

-- Add teacher_id to tests table and populate it from existing teacher_pin
ALTER TABLE tests ADD COLUMN teacher_id INTEGER REFERENCES teachers(id);
UPDATE tests SET teacher_id = (SELECT id FROM teachers WHERE teachers.pin = tests.teacher_pin);
ALTER TABLE tests DROP COLUMN teacher_pin;

-- Add student_id to test_attempts table and populate it from existing student_pin
ALTER TABLE test_attempts ADD COLUMN student_id INTEGER REFERENCES students(id);
UPDATE test_attempts SET student_id = (SELECT id FROM students WHERE students.pin = test_attempts.student_pin);
ALTER TABLE test_attempts DROP COLUMN student_pin;
