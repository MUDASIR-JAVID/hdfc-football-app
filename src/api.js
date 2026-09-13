export const API_ENABLED = Boolean(import.meta.env.VITE_API_BASE_URL);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request(path, options = {}, token) {
  if (!API_ENABLED) throw new Error("Backend is not configured; using local storage fallback.");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || `Request failed (${response.status})`);
  return response.status === 204 ? null : response.json();
}

export const api = {
  login: (username, passcode) => request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, passcode }) }),
  players: (token) => request("/api/players", {}, token),
  createPlayer: (player, token) => request("/api/players", { method: "POST", body: JSON.stringify(player) }, token),
  deletePlayer: (playerId, token) => request(`/api/players/${encodeURIComponent(playerId)}`, { method: "DELETE" }, token),
  attendance: (token, playerId) => request(`/api/attendance${playerId ? `?player_id=${encodeURIComponent(playerId)}` : ""}`, {}, token),
  recordAttendance: (entry, token) => request("/api/attendance", { method: "POST", body: JSON.stringify(entry) }, token),
};
