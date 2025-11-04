CREATE TABLE IF NOT EXISTS auth_sessions (
	id TEXT PRIMARY KEY,
	token_hash TEXT NOT NULL,
	user_id INTEGER NOT NULL,
	role TEXT NOT NULL,
	user_payload TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id, role);

CREATE TABLE IF NOT EXISTS auth_login_limits (
	identifier_hash TEXT PRIMARY KEY,
	fail_count INTEGER NOT NULL DEFAULT 0,
	locked_until TIMESTAMP,
	last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
