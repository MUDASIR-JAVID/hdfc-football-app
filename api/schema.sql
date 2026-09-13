CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL UNIQUE,
  passcode_hash VARCHAR(255) NOT NULL,
  name VARCHAR(160) NOT NULL,
  position VARCHAR(80),
  profile_image_url VARCHAR(2048),
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  CONSTRAINT attendance_player_date_key UNIQUE (player_id, date)
);
CREATE INDEX IF NOT EXISTS players_active_name_idx ON players (active, name);
CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance (date DESC);
