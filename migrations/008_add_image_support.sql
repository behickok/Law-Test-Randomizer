-- Add image support to questions
-- This migration adds support for images in questions with base64 encoded data
CREATE SEQUENCE IF NOT EXISTS images_seq;
-- Create images table to store base64 encoded image data
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY DEFAULT nextval('images_seq'),
    name TEXT NOT NULL,
    description TEXT,
    mime_type TEXT NOT NULL,
    base64_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER REFERENCES teachers(id),
    file_size INTEGER,
    UNIQUE(name, uploaded_by)
);

-- Create sequence for images
CREATE SEQUENCE IF NOT EXISTS images_seq;

-- Add processed_question_text column to questions table
-- This will store the question text with template variables replaced with actual image references
ALTER TABLE questions ADD COLUMN IF NOT EXISTS processed_question_text TEXT;

-- Add image_references column to track which images are used in each question
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_references TEXT; -- JSON array of image IDs

-- Create index for faster image lookups
CREATE INDEX IF NOT EXISTS idx_images_name_teacher ON images(name, uploaded_by);
CREATE INDEX IF NOT EXISTS idx_questions_image_refs ON questions(image_references);

-- Sample data for testing (optional)
-- You can uncomment this if you want some test image placeholders
/*
INSERT INTO images (name, description, mime_type, base64_data, uploaded_by, file_size) 
VALUES 
  ('test_image', 'Sample test image', 'image/png', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 1, 100),
  ('diagram_a', 'Sample diagram A', 'image/jpeg', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAABAAAAAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', 1, 150);
*/