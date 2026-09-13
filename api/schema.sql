CREATE TABLE players (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  player_id NVARCHAR(64) NOT NULL UNIQUE,
  passcode_hash NVARCHAR(255) NOT NULL,
  name NVARCHAR(160) NOT NULL,
  position NVARCHAR(80) NULL,
  profile_image_url NVARCHAR(2048) NULL,
  active BIT NOT NULL CONSTRAINT DF_players_active DEFAULT 1
);
CREATE TABLE attendance (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  player_id INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  [date] DATE NOT NULL,
  status NVARCHAR(20) NOT NULL,
  CONSTRAINT UQ_attendance_player_date UNIQUE (player_id, [date])
);
