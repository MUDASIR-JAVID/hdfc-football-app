const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { query } = require("./sql");
const DEFAULT_JWT_SECRET = "SDFC-development-only-jwt-secret-change-this-in-production-2026";

function configuredValue(name, fallback) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function corsHeaders() {
  const origins = process.env.CORS_ORIGINS || "*";
  return { "Access-Control-Allow-Origin": origins === "*" ? "*" : origins.split(",")[0].trim(), "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS" };
}
function json(status, body) { return { status, headers: { "Content-Type": "application/json", ...corsHeaders() }, jsonBody: body }; }
function tokenFor(subject, role, playerId) {
  const secret = configuredValue("JWT_SECRET_KEY", DEFAULT_JWT_SECRET);
  return jwt.sign({ sub: subject, role, ...(playerId ? { player_id: playerId } : {}) }, secret, { expiresIn: "7d" });
}
async function authenticate(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), configuredValue("JWT_SECRET_KEY", DEFAULT_JWT_SECRET));
    if (!payload.sub || !["admin", "player"].includes(payload.role)) return null;
    if (payload.role === "player") {
      const result = await query("SELECT player_id FROM players WHERE player_id = $1 AND active = TRUE", [payload.player_id]);
      if (!result.rowCount) return null;
    }
    return payload;
  } catch { return null; }
}
async function login(request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const passcode = String(body.passcode || "");
  const adminUsername = configuredValue("ADMIN_USERNAME", "admin");
  const hash = String(process.env.ADMIN_PASSCODE_HASH || "").trim();
  const plainPasscode = configuredValue("ADMIN_PASSCODE", "SDFC-ADMIN");
  let adminValid = false;
  if (username === adminUsername) {
    try {
      const looksLikeBcryptHash = /^\$2[aby]?\$\d{2}\$/.test(hash);
      adminValid = looksLikeBcryptHash
        ? await bcrypt.compare(passcode, hash)
        : passcode === plainPasscode;
    } catch {
      adminValid = false;
    }
    if (!adminValid) return json(401, { detail: "Invalid admin credentials" });
    return json(200, { access_token: tokenFor(username, "admin"), token_type: "bearer", role: "admin" });
  }
  const result = await query("SELECT player_id, passcode_hash FROM players WHERE player_id = $1 AND active = TRUE", [username]);
  const player = result.rows[0];
  let playerValid = false;
  if (player) {
    try {
      playerValid = await bcrypt.compare(passcode, player.passcode_hash);
    } catch {
      playerValid = false;
    }
  }
  if (!playerValid) return json(401, { detail: "Invalid credentials" });
  return json(200, { access_token: tokenFor(player.player_id, "player", player.player_id), token_type: "bearer", role: "player", player_id: player.player_id });
}
module.exports = { authenticate, corsHeaders, json, login };
