const { app } = require("@azure/functions");
const bcrypt = require("bcryptjs");
const { query } = require("../sql");
const { authenticate, corsHeaders, json, login } = require("../auth");

async function access(request, adminOnly = false) {
  const user = await authenticate(request);
  if (!user) return { response: json(401, { detail: "Invalid or missing bearer token" }) };
  if (adminOnly && user.role !== "admin") return { response: json(403, { detail: "Administrator access required" }) };
  return { user };
}
const options = () => ({ status: 204, headers: corsHeaders() });

app.http("health", { methods: ["GET", "OPTIONS"], authLevel: "anonymous", route: "health",
  handler: async (request) => request.method === "OPTIONS" ? options() : json(200, { status: "ok" }) });
app.http("login", { methods: ["POST", "OPTIONS"], authLevel: "anonymous", route: "api/auth/login",
  handler: async (request) => request.method === "OPTIONS" ? options() : login(request) });

app.http("players", { methods: ["GET", "POST", "OPTIONS"], authLevel: "anonymous", route: "api/players",
  handler: async (request) => {
    if (request.method === "OPTIONS") return options();
    const checked = await access(request, request.method === "POST");
    if (checked.response) return checked.response;
    if (request.method === "GET") {
      const result = await query("SELECT player_id, name, position, profile_image_url, active FROM players WHERE active = 1 ORDER BY name");
      return json(200, result.recordset);
    }
    const body = await request.json().catch(() => ({}));
    const playerId = String(body.player_id || "").trim();
    const name = String(body.name || "").trim();
    const passcode = String(body.passcode || "");
    if (!/^[A-Za-z0-9_-]+$/.test(playerId) || !name || passcode.length < 8) return json(400, { detail: "player_id, name and an 8-character passcode are required" });
    try {
      const result = await query(
        "INSERT INTO players (player_id, passcode_hash, name, position, profile_image_url, active) OUTPUT INSERTED.player_id, INSERTED.name, INSERTED.position, INSERTED.profile_image_url, INSERTED.active VALUES (@playerId, @hash, @name, @position, @image, 1)",
        { playerId, hash: await bcrypt.hash(passcode, 12), name, position: body.position ? String(body.position) : null, image: body.profile_image_url ? String(body.profile_image_url) : null }
      );
      return json(201, result.recordset[0]);
    } catch (error) {
      if (error.number === 2627 || error.number === 2601) return json(409, { detail: "Player ID already exists" });
      throw error;
    }
  } });

app.http("deletePlayer", { methods: ["DELETE", "OPTIONS"], authLevel: "anonymous", route: "api/players/{playerId}",
  handler: async (request) => {
    if (request.method === "OPTIONS") return options();
    const checked = await access(request, true);
    if (checked.response) return checked.response;
    const result = await query("UPDATE players SET active = 0 WHERE player_id = @playerId", { playerId: request.params.playerId });
    return result.rowsAffected[0] ? { status: 204, headers: corsHeaders() } : json(404, { detail: "Player not found" });
  } });

app.http("attendance", { methods: ["GET", "POST", "OPTIONS"], authLevel: "anonymous", route: "api/attendance",
  handler: async (request) => {
    if (request.method === "OPTIONS") return options();
    const checked = await access(request);
    if (checked.response) return checked.response;
    if (request.method === "GET") {
      const requested = request.query.get("player_id") || (checked.user.role === "player" ? checked.user.player_id : null);
      if (checked.user.role === "player" && requested !== checked.user.player_id) return json(403, { detail: "Players may only view their own attendance" });
      const result = await query(
        `SELECT a.date, a.status, p.player_id FROM attendance a JOIN players p ON p.id = a.player_id WHERE p.active = 1${requested ? " AND p.player_id = @playerId" : ""} ORDER BY a.date DESC`,
        requested ? { playerId: requested } : {}
      );
      return json(200, result.recordset.map((row) => ({ ...row, date: row.date.toISOString().slice(0, 10) })));
    }
    const body = await request.json().catch(() => ({}));
    const playerId = String(body.player_id || "");
    const date = String(body.date || "");
    const status = String(body.status || "");
    if (checked.user.role !== "admin" && checked.user.player_id !== playerId) return json(403, { detail: "Players may only update their own attendance" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["present", "absent", "late", "excused"].includes(status)) return json(400, { detail: "Invalid attendance date or status" });
    const player = await query("SELECT id FROM players WHERE player_id = @playerId AND active = 1", { playerId });
    if (!player.recordset.length) return json(404, { detail: "Player not found" });
    await query("MERGE attendance AS target USING (SELECT @playerDbId AS player_id, @date AS date, @status AS status) AS source ON target.player_id = source.player_id AND target.date = source.date WHEN MATCHED THEN UPDATE SET status = source.status WHEN NOT MATCHED THEN INSERT (player_id, date, status) VALUES (source.player_id, source.date, source.status);", { playerDbId: player.recordset[0].id, date: new Date(`${date}T00:00:00Z`), status });
    return json(200, { date, status, player_id: playerId });
  } });
