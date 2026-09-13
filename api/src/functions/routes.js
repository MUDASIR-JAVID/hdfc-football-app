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
app.http("login", { methods: ["POST", "OPTIONS"], authLevel: "anonymous", route: "auth/login",
  handler: async (request) => {
    if (request.method === "OPTIONS") return options();
    try {
      return await login(request);
    } catch (error) {
      console.error("Login failed", error);
      const configurationError = /JWT_SECRET_KEY|DATABASE_URL|ADMIN_PASSCODE/i.test(error?.message || "");
      return json(configurationError ? 503 : 500, { detail: configurationError ? "Authentication service is not configured correctly." : "Authentication service is temporarily unavailable." });
    }
  } });

app.http("players", { methods: ["GET", "POST", "OPTIONS"], authLevel: "anonymous", route: "players",
  handler: async (request) => {
    if (request.method === "OPTIONS") return options();
    const checked = await access(request, request.method === "POST");
    if (checked.response) return checked.response;
    if (request.method === "GET") {
      const result = await query("SELECT player_id, name, position, profile_image_url, active FROM players WHERE active = TRUE ORDER BY name");
      return json(200, result.rows);
    }
    const body = await request.json().catch(() => ({}));
    const playerId = String(body.player_id || "").trim();
    const name = String(body.name || "").trim();
    const passcode = String(body.passcode || "");
    if (!/^[A-Za-z0-9_-]+$/.test(playerId) || !name || passcode.length < 8) return json(400, { detail: "player_id, name and an 8-character passcode are required" });
    try {
      const result = await query(
        "INSERT INTO players (player_id, passcode_hash, name, position, profile_image_url) VALUES ($1, $2, $3, $4, $5) RETURNING player_id, name, position, profile_image_url, active",
        [playerId, await bcrypt.hash(passcode, 12), name, body.position ? String(body.position) : null, body.profile_image_url ? String(body.profile_image_url) : null],
      );
      return json(201, result.rows[0]);
    } catch (error) {
      if (error.code === "23505") return json(409, { detail: "Player ID already exists" });
      throw error;
    }
  } });

app.http("deletePlayer", { methods: ["DELETE", "OPTIONS"], authLevel: "anonymous", route: "players/{playerId}",
  handler: async (request) => {
    if (request.method === "OPTIONS") return options();
    const checked = await access(request, true);
    if (checked.response) return checked.response;
    const result = await query("UPDATE players SET active = FALSE WHERE player_id = $1", [request.params.playerId]);
    return result.rowCount ? { status: 204, headers: corsHeaders() } : json(404, { detail: "Player not found" });
  } });

app.http("attendance", { methods: ["GET", "POST", "OPTIONS"], authLevel: "anonymous", route: "attendance",
  handler: async (request) => {
    if (request.method === "OPTIONS") return options();
    const checked = await access(request);
    if (checked.response) return checked.response;
    if (request.method === "GET") {
      const requested = request.query.get("player_id") || (checked.user.role === "player" ? checked.user.player_id : null);
      if (checked.user.role === "player" && requested !== checked.user.player_id) return json(403, { detail: "Players may only view their own attendance" });
      const params = requested ? [requested] : [];
      const result = await query(
        `SELECT a.date::text AS date, a.status, p.player_id FROM attendance a JOIN players p ON p.id = a.player_id WHERE p.active = TRUE${requested ? " AND p.player_id = $1" : ""} ORDER BY a.date DESC`,
        params,
      );
      return json(200, result.rows);
    }
    const body = await request.json().catch(() => ({}));
    const playerId = String(body.player_id || "");
    const date = String(body.date || "");
    const status = String(body.status || "");
    if (checked.user.role !== "admin" && checked.user.player_id !== playerId) return json(403, { detail: "Players may only update their own attendance" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["present", "absent", "late", "excused"].includes(status)) return json(400, { detail: "Invalid attendance date or status" });
    const player = await query("SELECT id FROM players WHERE player_id = $1 AND active = TRUE", [playerId]);
    if (!player.rowCount) return json(404, { detail: "Player not found" });
    await query(
      "INSERT INTO attendance (player_id, date, status) VALUES ($1, $2, $3) ON CONFLICT (player_id, date) DO UPDATE SET status = EXCLUDED.status",
      [player.rows[0].id, date, status],
    );
    return json(200, { date, status, player_id: playerId });
  } });
