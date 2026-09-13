import express from "express";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";
import jwt from "jsonwebtoken";

const { Pool } = pg;
const PORT = Number(process.env.PORT || 5000);
const app = express();
app.use(express.json({ limit: "2mb" }));
let pool;
let schemaPromise;
function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: /sslmode=require/i.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined });
  }
  return pool;
}
async function ensureSchema() {
  if (!schemaPromise) schemaPromise = database().query(`
    CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY, username text UNIQUE NOT NULL, passcode text NOT NULL, role text NOT NULL CHECK (role IN ('admin','player')), name text NOT NULL, player_id text UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS players (id uuid PRIMARY KEY, user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE, player_id text UNIQUE NOT NULL, passcode text UNIQUE NOT NULL, name text NOT NULL, position text, initials text, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS attendance (player_id uuid REFERENCES players(id) ON DELETE CASCADE, date date NOT NULL, status text NOT NULL CHECK (status IN ('present','absent')), PRIMARY KEY (player_id, date));
    CREATE TABLE IF NOT EXISTS announcements (id uuid PRIMARY KEY, text text NOT NULL, cadence text NOT NULL DEFAULT 'Anytime', created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS funds (id uuid PRIMARY KEY, player text NOT NULL, player_id uuid REFERENCES players(id) ON DELETE SET NULL, amount numeric NOT NULL, date date NOT NULL, status text NOT NULL DEFAULT 'Paid', note text, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS payment_requests (id uuid PRIMARY KEY, player text NOT NULL, player_id uuid REFERENCES players(id) ON DELETE CASCADE, amount numeric NOT NULL, date date NOT NULL, reference text, evidence text, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value text NOT NULL);
  `).catch((error) => { schemaPromise = null; throw error; });
  return schemaPromise;
}
const route = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((error) => { console.error(error); res.status(error.status || 500).json({ error: error.message || "Server error" }); });
function secret() { if (!process.env.JWT_SECRET_KEY) { const e = new Error("JWT_SECRET_KEY is not configured"); e.status = 503; throw e; } return process.env.JWT_SECRET_KEY; }
function auth(req, res, next) { try { const token = req.headers.authorization?.replace(/^Bearer\s+/i, ""); if (!token) return res.status(401).json({ error: "Bearer token required" }); req.user = jwt.verify(token, secret()); next(); } catch { res.status(401).json({ error: "Invalid or expired bearer token" }); } }
function admin(req, res, next) { if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required" }); next(); }
app.get("/api/health", route(async (_req, res) => { await ensureSchema(); res.json({ ok: true }); }));
app.post("/api/login", route(async (req, res) => {
  await ensureSchema(); const { mode = "player", credential, username } = req.body || {}; const value = String(credential || username || "").trim(); let user;
  if (mode === "admin" && process.env.ADMIN_PASSCODE && value === process.env.ADMIN_PASSCODE) {
    const result = await database().query("INSERT INTO users (id,username,passcode,role,name) VALUES ($1,$2,$3,'admin',$4) ON CONFLICT (username) DO UPDATE SET passcode=EXCLUDED.passcode RETURNING id,role,name,player_id", [randomUUID(), process.env.ADMIN_USERNAME || "admin", process.env.ADMIN_PASSCODE, process.env.ADMIN_USERNAME || "Admin"]); user = result.rows[0];
  } else {
    const result = await database().query("SELECT id,role,name,player_id FROM users WHERE role='player' AND (upper(player_id)=upper($1) OR upper(passcode)=upper($1))", [value]); user = result.rows[0];
  }
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ sub: user.id, role: user.role, playerId: user.player_id }, secret(), { expiresIn: "30d" });
  res.json({ token, user: { role: user.role, name: user.name, playerId: user.player_id } });
}));
app.get("/api/players", auth, route(async (_req, res) => { await ensureSchema(); res.json((await database().query('SELECT id, player_id AS "playerId", passcode, name, position, initials FROM players ORDER BY name')).rows); }));
app.post("/api/players", auth, admin, route(async (req, res) => { await ensureSchema(); const { name, position = "" } = req.body || {}; if (!String(name || "").trim()) return res.status(400).json({ error: "Name is required" }); const playerId = `SDFC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`; const passcode = Math.random().toString(36).slice(2, 10).toUpperCase(); const initials = name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase(); const userId = randomUUID(); const playerDbId = randomUUID(); const result = await database().query("WITH u AS (INSERT INTO users (id,username,passcode,role,name,player_id) VALUES ($1,$2,$3,'player',$4,$2) RETURNING id) INSERT INTO players (id,user_id,player_id,passcode,name,position,initials) SELECT $5,id,$2,$3,$4,$6,$7 FROM u RETURNING id,player_id AS \"playerId\",passcode,name,position,initials", [userId, playerId, passcode, name.trim(), playerDbId, position, initials]); res.status(201).json(result.rows[0]); }));
app.delete("/api/players/:id", auth, admin, route(async (req, res) => { await ensureSchema(); await database().query("DELETE FROM players WHERE id=$1", [req.params.id]); res.sendStatus(204); }));
app.get("/api/attendance", auth, route(async (req, res) => { await ensureSchema(); res.json((await database().query("SELECT player_id AS \"playerId\", to_char(date,'YYYY-MM-DD') AS date,status FROM attendance WHERE ($1::date IS NULL OR date=$1::date)", [req.query.date || null])).rows); }));
app.put("/api/attendance", auth, route(async (req, res) => { await ensureSchema(); const { playerId, date, status } = req.body || {}; if (req.user.role !== "admin") { const owner = await database().query("SELECT 1 FROM players WHERE id=$1 AND player_id=$2", [playerId, req.user.playerId]); if (!owner.rowCount) return res.status(403).json({ error: "Cannot update another player" }); } const result = await database().query("INSERT INTO attendance (player_id,date,status) VALUES ($1,$2,$3) ON CONFLICT (player_id,date) DO UPDATE SET status=EXCLUDED.status RETURNING player_id AS \"playerId\",to_char(date,'YYYY-MM-DD') AS date,status", [playerId, date, status]); res.json(result.rows[0]); }));
app.get("/api/announcements", auth, route(async (_req, res) => { await ensureSchema(); res.json((await database().query('SELECT id,text,cadence,created_at AS "createdAt" FROM announcements ORDER BY created_at DESC')).rows); }));
app.post("/api/announcements", auth, admin, route(async (req, res) => { await ensureSchema(); const result = await database().query('INSERT INTO announcements (id,text,cadence) VALUES ($1,$2,$3) RETURNING id,text,cadence,created_at AS "createdAt"', [randomUUID(), req.body.text?.trim(), req.body.cadence || "Anytime"]); res.status(201).json(result.rows[0]); }));
app.delete("/api/announcements/:id", auth, admin, route(async (req, res) => { await ensureSchema(); await database().query("DELETE FROM announcements WHERE id=$1", [req.params.id]); res.sendStatus(204); }));
app.get("/api/funds", auth, route(async (_req, res) => { await ensureSchema(); res.json((await database().query('SELECT id,player,player_id AS "playerId",amount,date,status,note FROM funds ORDER BY date DESC,created_at DESC')).rows); }));
app.post("/api/funds", auth, admin, route(async (req, res) => { await ensureSchema(); const { player, playerId, amount, date, status = "Paid", note = "" } = req.body; const result = await database().query('INSERT INTO funds (id,player,player_id,amount,date,status,note) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,player,player_id AS "playerId",amount,date,status,note', [randomUUID(), player, playerId || null, amount, date, status, note]); res.status(201).json(result.rows[0]); }));
app.delete("/api/funds/:id", auth, admin, route(async (req, res) => { await ensureSchema(); await database().query("DELETE FROM funds WHERE id=$1", [req.params.id]); res.sendStatus(204); }));
app.get("/api/payment-requests", auth, admin, route(async (_req, res) => { await ensureSchema(); res.json((await database().query('SELECT id,player,player_id AS "playerId",amount,date,reference,evidence FROM payment_requests WHERE status=\'pending\' ORDER BY created_at DESC')).rows); }));
app.post("/api/payment-requests", auth, route(async (req, res) => { await ensureSchema(); const { player, playerId, amount, date, reference, evidence } = req.body; if (req.user.role !== "admin" && !playerId) return res.status(400).json({ error: "Player is required" }); const result = await database().query('INSERT INTO payment_requests (id,player,player_id,amount,date,reference,evidence) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,player,player_id AS "playerId",amount,date,reference,evidence', [randomUUID(), player, playerId || null, amount, date, reference || "", evidence || ""]); res.status(201).json(result.rows[0]); }));
app.post("/api/payment-requests/:id/approve", auth, admin, route(async (req, res) => { await ensureSchema(); const client = await database().connect(); try { await client.query("BEGIN"); const request = (await client.query("UPDATE payment_requests SET status='approved' WHERE id=$1 AND status='pending' RETURNING *", [req.params.id])).rows[0]; if (!request) return res.status(404).json({ error: "Payment request not found" }); const fund = (await client.query('INSERT INTO funds (id,player,player_id,amount,date,status,note) VALUES ($1,$2,$3,$4,$5,\'Paid\',$6) RETURNING id,player,player_id AS "playerId",amount,date,status,note', [randomUUID(), request.player, request.player_id, request.amount, request.date, `EasyPaisa verified (${request.reference || "no reference"})`])).rows[0]; await client.query("COMMIT"); res.json(fund); } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); } }));
app.get("/api/settings", auth, route(async (_req, res) => { await ensureSchema(); const result = await database().query("SELECT key,value FROM settings WHERE key IN ('fundRequirement','easyPaisaNumber')"); res.json(Object.fromEntries(result.rows.map((r) => [r.key, r.value]))); }));
app.put("/api/settings", auth, admin, route(async (req, res) => { await ensureSchema(); for (const [key, value] of Object.entries(req.body || {})) await database().query("INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [key, String(value)]); res.json(req.body); }));
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "dist")));
app.get("*splat", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
if (process.env.NODE_ENV !== "test") app.listen(PORT, "0.0.0.0", () => console.log(`SDFC server listening on port ${PORT}`));
export { app, ensureSchema };
