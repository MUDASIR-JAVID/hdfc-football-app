const sql = require("mssql");

let poolPromise;
let schemaPromise;
function getPool() {
  if (!process.env.AZURE_SQL_CONNECTION_STRING) throw new Error("AZURE_SQL_CONNECTION_STRING is not configured");
  if (!poolPromise) {
    poolPromise = sql.connect(process.env.AZURE_SQL_CONNECTION_STRING).catch((error) => {
      poolPromise = undefined;
      throw error;
    });
  }
  return poolPromise;
}
async function query(text, inputs = {}) {
  const pool = await getPool();
  await ensureSchema(pool);
  const request = pool.request();
  for (const [name, value] of Object.entries(inputs)) request.input(name, value);
  return request.query(text);
}

async function ensureSchema(pool) {
  if (!schemaPromise) {
    schemaPromise = pool.request().batch(`
      IF OBJECT_ID(N'dbo.players', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.players (
          id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
          player_id NVARCHAR(64) NOT NULL UNIQUE,
          passcode_hash NVARCHAR(255) NOT NULL,
          name NVARCHAR(160) NOT NULL,
          position NVARCHAR(80) NULL,
          profile_image_url NVARCHAR(2048) NULL,
          active BIT NOT NULL CONSTRAINT DF_players_active DEFAULT 1
        );
      END;
      IF OBJECT_ID(N'dbo.attendance', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.attendance (
          id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
          player_id INT NOT NULL,
          [date] DATE NOT NULL,
          status NVARCHAR(20) NOT NULL,
          CONSTRAINT UQ_attendance_player_date UNIQUE (player_id, [date]),
          CONSTRAINT FK_attendance_player FOREIGN KEY (player_id)
            REFERENCES dbo.players(id) ON DELETE CASCADE
        );
      END;
    `).catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }
  await schemaPromise;
}
module.exports = { sql, query, ensureSchema };
