drop table if exists classes;

-- Create classes table linking teachers and students
CREATE TABLE IF NOT EXISTS classes (
    teacher_id INTEGER NOT NULL REFERENCES teachers(id),
    student_id INTEGER NOT NULL REFERENCES students(id),
     status TEXT NOT NULL DEFAULT 'active',
    PRIMARY KEY (teacher_id, student_id)
);

-- Seed default association for initial teacher and student if they exist
INSERT INTO classes (teacher_id, student_id)
SELECT t.id, s.id FROM teachers t, students s
WHERE t.name = 'Test Teacher' AND s.name = 'Test Student'
ON CONFLICT DO NOTHING;
