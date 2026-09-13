export const API_ENABLED = import.meta.env.PROD || Boolean(import.meta.env.VITE_API_BASE_URL);
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const AUTH_STORAGE_KEY = "sdfc-auth-v3";
const TOKEN_STORAGE_KEY = "token";

function storedToken() {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)?.trim();
    if (token) return token;
    const auth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
    return auth?.access_token || auth?.accessToken || "";
  } catch {
    return "";
  }
}

async function request(path, options = {}, token) {
  if (!API_ENABLED) throw new Error("Backend is not configured; using local storage fallback.");
  // Authenticated calls always use the current browser token, not a stale
  // token captured in a component closure. A null token is reserved for login.
  const rawToken = token === null ? "" : storedToken();
  const accessToken = String(rawToken).replace(/^Bearer\s+/i, "").trim();
  const requestOptions = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  };
  const response = await fetch(`${API_BASE_URL}${path}`, requestOptions);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || payload.error || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

export const api = {
  login: (username, passcode) => request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, passcode }) }, null),
  players: (token) => request("/api/players", {}, token),
  createPlayer: (player, token) => request("/api/players", { method: "POST", body: JSON.stringify(player) }, token),
  deletePlayer: (playerId, token) => request(`/api/players/${encodeURIComponent(playerId)}`, { method: "DELETE" }, token),
  attendance: (token, playerId) => request(`/api/attendance${playerId ? `?player_id=${encodeURIComponent(playerId)}` : ""}`, {}, token),
  recordAttendance: (entry, token) => request("/api/attendance", { method: "POST", body: JSON.stringify(entry) }, token),
};
