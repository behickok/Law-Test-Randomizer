ALTER TABLE teachers ADD COLUMN invite_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_invite_code ON teachers(invite_code);
