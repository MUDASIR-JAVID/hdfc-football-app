import { Component, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Download,
  LayoutDashboard,
  LogIn,
  LogOut,
  LockKeyhole,
  Menu,
  MessageCircle,
  Megaphone,
  Plus,
  Search,
  Send,
  Settings,
  Shield,
  Trash2,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  Wifi,
  WalletCards,
  X,
} from "lucide-react";

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
};
const money = (value) => `Rs. ${Number(value).toLocaleString("en-PK")}`;
const formatDate = (date) => {
  const parsed = date ? new Date(`${date}T00:00:00`) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(parsed)
    : "Date unavailable";
};
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Good night";
};
const ADMIN_NAME = "Mudasir Javid";
const api = async (path, options = {}) => {
  const token = getBrowserStorage()?.getItem("sdfc-auth-token");
  const response = await fetch(`/api${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...(options.headers || {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      const storage = getBrowserStorage();
      storage?.removeItem("sdfc-auth-token");
      storage?.removeItem("sdfc-auth-user");
    }
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
};

function useStoredState(key, initial, persist = true) {
  const [value, setValue] = useState(() => {
    if (!persist) return initial;
    try {
      const stored = getBrowserStorage()?.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    if (!persist) return;
    try {
      const storage = getBrowserStorage();
      if (!storage) return;
      if (value === null || value === undefined) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable (private mode or quota exhaustion).
    }
  }, [key, value, persist]);
  return [value, setValue];
}

function getBrowserStorage() {
  try {
    if (window.localStorage) {
      const probe = "__sdfc_storage_probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return window.localStorage;
    }
  } catch {
    // Fall back to session storage on restricted mobile/private browsers.
  }
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.error("SDFC interface error:", error); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return <div className="auth-shell"><div className="auth-card"><div className="eyebrow">SDFC FOOTBALL CLUB</div><h1>Something went wrong</h1><p>The workspace could not render this view. Refresh to try again.</p><button className="primary-button" onClick={() => window.location.reload()}>Refresh workspace</button></div></div>;
  }
}

function App() {
  const [auth, setAuth] = useState(() => { try { return JSON.parse(getBrowserStorage()?.getItem("sdfc-auth-user") || "null"); } catch { return null; } });
  const [active, setActive] = useState("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  // Versioned keys intentionally start empty so the former demo records cannot leak into the real squad.
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [funds, setFunds] = useState([]);
  const [match, setMatch] = useStoredState("sdfc-match-v2", null);
  const [announcements, setAnnouncements] = useState([]);
  const [clubLogo, setClubLogo] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [profileImages, setProfileImages] = useState({});
  const [fundRequirement, setFundRequirement] = useState(0);
  const [easyPaisaNumber, setEasyPaisaNumber] = useState("03169057203");
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [chatMessages, setChatMessages] = useStoredState("sdfc-chat-v1", []);
  const [wallpaper, setWallpaper] = useState("");
  const [selectedDate, setSelectedDate] = useState(today());
  const notificationUserKey = auth ? `${auth.role || "user"}-${auth.playerId || auth.player_id || auth.name || "account"}` : "anonymous";
  const [readMarkerStore, setReadMarkerStore] = useStoredState("sdfc-notification-read-v1", {});
  const readMarkers = readMarkerStore && typeof readMarkerStore === "object" ? readMarkerStore[notificationUserKey] : null;
  const safeReadMarkers = readMarkers && typeof readMarkers === "object" ? readMarkers : {};
  const safePaymentRequests = Array.isArray(paymentRequests) ? paymentRequests.filter(Boolean) : [];
  const safeAttendanceRecords = Array.isArray(attendanceRecords) ? attendanceRecords.filter(Boolean) : [];
  const safeChatMessages = Array.isArray(chatMessages) ? chatMessages.filter(Boolean) : [];
  const itemKey = (item, type) => {
    if (!item || typeof item !== "object") return "";
    if (item.id) return `${type}:${item.id}`;
    if (type === "attendance") return `${type}:${item.playerId || ""}:${item.date || ""}:${item.status || ""}`;
    return `${type}:${item.createdAt || item.date || item.text || JSON.stringify(item)}`;
  };
  const unreadCount = (items, type) => {
    const read = Array.isArray(safeReadMarkers[type]) ? safeReadMarkers[type] : [];
    return items.reduce((count, item) => count + (itemKey(item, type) && !read.includes(itemKey(item, type)) ? 1 : 0), 0);
  };
  const markSectionRead = (section) => {
    const items = section === "funds" ? safePaymentRequests : section === "attendance" ? safeAttendanceRecords : safeChatMessages;
    const keys = items.map((item) => itemKey(item, section)).filter(Boolean);
    setReadMarkerStore((currentStore) => {
      const store = currentStore && typeof currentStore === "object" ? currentStore : {};
      const existing = store[notificationUserKey] && typeof store[notificationUserKey] === "object" ? store[notificationUserKey] : {};
      const next = [...new Set([...(Array.isArray(existing[section]) ? existing[section] : []), ...keys])].slice(-500);
      if (JSON.stringify(existing[section] || []) === JSON.stringify(next)) return currentStore;
      return { ...store, [notificationUserKey]: { ...existing, [section]: next } };
    });
  };
  const saveFundSettings = (requirement) => { const number = Number(requirement) || 0; setFundRequirement(number); api("/settings", { method: "PUT", body: JSON.stringify({ fundRequirement: number, easyPaisaNumber }) }).catch((error) => console.error("Unable to save fund settings:", error)); };
  const saveEasyPaisa = (number) => { setEasyPaisaNumber(number); api("/settings", { method: "PUT", body: JSON.stringify({ fundRequirement, easyPaisaNumber: number }) }).catch((error) => console.error("Unable to save EasyPaisa settings:", error)); };
  useEffect(() => {
    if (!auth) return;
    Promise.all([api("/players"), api("/attendance"), api("/announcements"), api("/funds"), api("/settings"), ...(auth.role === "admin" ? [api("/payment-requests")] : [])]).then(([players, records, notices, ledger, settings, requests]) => {
      const safePlayers = Array.isArray(players) ? players.filter((item) => item && typeof item === "object") : [];
      const safeRecords = Array.isArray(records) ? records.filter((item) => item && item.date && item.playerId) : [];
      setMembers(safePlayers);
      setProfileImages(safePlayers.reduce((images, player) => player.id && player.avatar ? { ...images, [player.id]: player.avatar } : images, {}));
      setAnnouncements(Array.isArray(notices) ? notices.filter(Boolean) : []);
      setFunds(Array.isArray(ledger) ? ledger.filter(Boolean) : []);
      setPaymentRequests(Array.isArray(requests) ? requests.filter(Boolean) : []);
      setAttendanceRecords(safeRecords);
      setFundRequirement(Number(settings && typeof settings === "object" ? settings.fundRequirement || 0 : 0));
      setEasyPaisaNumber(settings && typeof settings === "object" && settings.easyPaisaNumber ? String(settings.easyPaisaNumber) : "03169057203");
      if (settings && typeof settings === "object") {
        if (typeof settings.clubLogo === "string") setClubLogo(settings.clubLogo);
        if (typeof settings.wallpaper === "string") setWallpaper(settings.wallpaper);
        if (typeof settings.adminProfileImage === "string") setProfileImage(settings.adminProfileImage);
      }
      setAttendance(safeRecords.reduce((all, item) => ({ ...all, [item.date]: { ...(all[item.date] || {}), [item.playerId]: item.status } }), {}));
    }).catch((error) => { if (/token|401|expired/i.test(error.message)) { getBrowserStorage()?.removeItem("sdfc-auth-token"); getBrowserStorage()?.removeItem("sdfc-auth-user"); setAuth(null); } });
  }, [auth]);
  useEffect(() => {
    if (active === "funds" && auth?.role === "admin") markSectionRead("funds");
    if (active === "attendance" && auth?.role === "admin") markSectionRead("attendance");
    if (active === "chat") markSectionRead("chat");
  }, [active, auth, paymentRequests, attendanceRecords, chatMessages]);
  const handleLogin = (nextAuth) => { setAuth(nextAuth.user); getBrowserStorage()?.setItem("sdfc-auth-token", nextAuth.token); getBrowserStorage()?.setItem("sdfc-auth-user", JSON.stringify(nextAuth.user)); };
  const saveSharedSetting = (key, value, setter) => {
    setter(value);
    api("/settings", { method: "PUT", body: JSON.stringify({ [key]: value }) }).catch((error) => console.error(`Unable to save ${key}:`, error));
  };
  const saveProfileImage = (image) => {
    if (!image) return;
    if (isAdmin) saveSharedSetting("adminProfileImage", image, setProfileImage);
    else if (currentMember?.id) {
      setProfileImages((current) => ({ ...(current && typeof current === "object" ? current : {}), [currentMember.id]: image }));
      api("/profile", { method: "PUT", body: JSON.stringify({ avatar: image }) }).catch((error) => console.error("Unable to save profile image:", error));
    }
  };

  const present = members.filter((player) => attendance[selectedDate]?.[player.id] === "present").length;
  const totalCollected = funds.filter((fund) => fund.status === "Paid").reduce((sum, fund) => sum + Number(fund.amount), 0);

  const toggleAttendance = (playerId, status) => {
    api("/attendance", { method: "PUT", body: JSON.stringify({ playerId, date: selectedDate, status }) }).then(() => setAttendance((current) => ({ ...current, [selectedDate]: { ...(current[selectedDate] || {}), [playerId]: status } }))).catch((error) => console.error("Unable to save attendance:", error));
  };

  const addMember = (member) => {
    const name = member.name.trim();
    if (!name) return;
    return api("/players", { method: "POST", body: JSON.stringify({ name, position: member.position }) }).then((created) => {
      if (!created || typeof created !== "object") throw new Error("The server returned an invalid player record.");
      setMembers((current) => [...(Array.isArray(current) ? current : []), created]);
      return created;
    });
  };

  const addAnnouncement = (announcement) => {
    if (!announcement.text.trim()) return;
    return api("/announcements", { method: "POST", body: JSON.stringify(announcement) }).then((created) => {
      if (!created || typeof created !== "object") throw new Error("The server returned an invalid announcement.");
      setAnnouncements((current) => [created, ...(Array.isArray(current) ? current : [])]);
    });
  };

  const deleteMember = (id) => api(`/players/${id}`, { method: "DELETE" }).then(() => setMembers((current) => (Array.isArray(current) ? current.filter((member) => member && member.id !== id) : []))).catch((error) => console.error("Unable to delete player:", error));
  const deleteAnnouncement = (id) => api(`/announcements/${id}`, { method: "DELETE" }).then(() => setAnnouncements((current) => (Array.isArray(current) ? current.filter((item) => item && item.id !== id) : []))).catch((error) => console.error("Unable to delete announcement:", error));
  const deleteFund = (id) => api(`/funds/${id}`, { method: "DELETE" }).then(() => setFunds((current) => (Array.isArray(current) ? current.filter((item) => item && item.id !== id) : []))).catch((error) => console.error("Unable to delete fund:", error));
  const approveRequest = (request) => {
    if (!request?.id) return Promise.resolve();
    return api(`/payment-requests/${request.id}/approve`, { method: "POST" }).then((fund) => { if (!fund || typeof fund !== "object") throw new Error("The server returned an invalid fund record."); setFunds((current) => [fund, ...(Array.isArray(current) ? current : [])]); setPaymentRequests((current) => (Array.isArray(current) ? current.filter((item) => item && item.id !== request.id) : [])); }).catch((error) => console.error("Unable to approve payment request:", error));
  };

  const readImage = (event, setter) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result);
    reader.readAsDataURL(file);
  };

  const exportCsv = (filename, rows) => {
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const isAdmin = auth?.role === "admin";
  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "attendance", label: "Present", icon: ClipboardCheck },
    { id: "funds", label: "Fund", icon: WalletCards },
    { id: "chat", label: "Chat", icon: MessageCircle },
  ];
  const notificationCounts = {
    funds: isAdmin ? unreadCount(safePaymentRequests, "funds") : 0,
    attendance: isAdmin ? unreadCount(safeAttendanceRecords, "attendance") : 0,
    chat: unreadCount(safeChatMessages, "chat"),
  };

  if (!auth) {
    return     <LoginScreen onLogin={handleLogin} />;
  }

  const currentPlayerId = auth.playerId || auth.player_id;
  const currentMember = members.find((member) => member.playerId === currentPlayerId);
  const logout = () => {
    try {
      getBrowserStorage()?.removeItem("sdfc-auth-token"); getBrowserStorage()?.removeItem("sdfc-auth-user");
    } catch { /* best effort */ }
    setAuth(null);
  };

  return (
    <div className="app-shell" style={wallpaper ? { backgroundImage: `linear-gradient(#090b11cc,#090b11ee), url(${wallpaper})` } : undefined}>
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <label className={`brand-mark brand-image-control ${!isAdmin ? "brand-readonly" : ""}`} title={isAdmin ? "Upload team logo" : "SDFC logo"}>
            {clubLogo ? <img src={clubLogo} alt="SDFC logo" /> : <Shield size={22} fill="currentColor" />}
            {isAdmin && <input type="file" accept="image/*" onChange={(event) => readImage(event, (image) => saveSharedSetting("clubLogo", image, setClubLogo))} />}
          </label>
          <div><strong>SDFC</strong><span>Football Club</span></div>
        </div>
        <div className="club-card">
          <div className="club-ball"><Trophy size={18} /></div>
          <div><b>Season 2026</b><span>United by the game</span></div>
        </div>
        <nav className="nav-list">
          <small>MAIN MENU</small>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${active === id ? "active" : ""}`} onClick={() => { setActive(id); setMobileMenu(false); if (id === "funds" || id === "attendance" || id === "chat") markSectionRead(id); }}>
              <Icon size={18} /><span>{label}</span>{notificationCounts[id] > 0 && <span className="notification-badge" aria-label={`${notificationCounts[id]} unread`}>{notificationCounts[id] > 99 ? "99+" : notificationCounts[id]}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <label className="profile-mini profile-image-control" title="Upload profile picture">
            <div className={`avatar ${(isAdmin ? profileImage : profileImages?.[currentMember?.id]) ? "avatar-image" : "avatar-green"}`}>{(isAdmin ? profileImage : profileImages?.[currentMember?.id]) ? <img src={isAdmin ? profileImage : profileImages?.[currentMember.id]} alt="" /> : (isAdmin ? "MJ" : currentMember?.initials || "P")}</div>
            <input type="file" accept="image/*" onChange={(event) => readImage(event, saveProfileImage)} />
            <div><b>{isAdmin ? ADMIN_NAME : currentMember?.name}</b><span>{isAdmin ? "Team admin" : currentMember?.position || "Squad member"}</span></div>
            <input type="file" accept="image/*" onChange={(event) => readImage(event, saveProfileImage)} />
          </label>
          <div className="developer">Developer: <b>Mudasir Javid</b><button className="logout-button" onClick={logout}><LogOut size={13} /> Sign out</button></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Team workspace</span><ChevronRight size={14} /><b>{navItems.find((item) => item.id === active)?.label}</b></div>
          <div className="top-actions"><span className="live-dot"></span><span className="live-text">Synced with Neon</span><div className={`top-avatar ${(isAdmin ? profileImage : profileImages?.[currentMember?.id]) ? "avatar-image" : ""}`}>{(isAdmin ? profileImage : profileImages?.[currentMember?.id]) ? <img src={isAdmin ? profileImage : profileImages?.[currentMember.id]} alt="" /> : (isAdmin ? "MJ" : currentMember?.initials || "P")}</div></div>
        </header>

        <div className="page-wrap">
          {active === "overview" && <Overview isAdmin={isAdmin} currentMember={currentMember} members={members} profileImages={profileImages} profileImage={profileImage} present={present} totalCollected={totalCollected} setActive={setActive} addMember={addMember} deleteMember={deleteMember} match={match} setMatch={setMatch} announcements={announcements} addAnnouncement={addAnnouncement} deleteAnnouncement={deleteAnnouncement} wallpaper={wallpaper} setWallpaper={(image) => saveSharedSetting("wallpaper", image, setWallpaper)} />}
          {active === "attendance" && <Attendance isAdmin={isAdmin} currentMember={currentMember} members={members} profileImages={profileImages} attendance={attendance} selectedDate={selectedDate} setSelectedDate={setSelectedDate} toggleAttendance={toggleAttendance} onExport={() => exportCsv("sdfc-attendance.csv", [["Player", "Position", "Date", "Status"], ...members.map((member) => [member.name, member.position || "Squad member", selectedDate, attendance[selectedDate]?.[member.id] || "Unmarked"])])} />}
          {active === "funds" && <Funds isAdmin={isAdmin} currentMember={currentMember} members={members} profileImages={profileImages} funds={funds} setFunds={setFunds} totalCollected={totalCollected} requirement={fundRequirement} setRequirement={saveFundSettings} easyPaisaNumber={easyPaisaNumber} setEasyPaisaNumber={saveEasyPaisa} requests={paymentRequests} setRequests={setPaymentRequests} approveRequest={approveRequest} onDeleteFund={deleteFund} onExport={() => exportCsv("sdfc-funds.csv", [["Player", "Amount", "Date", "Status", "Note"], ...funds.map((fund) => [fund.player, fund.amount, fund.date, fund.status, fund.note])])} />}
          {active === "chat" && <Chat isAdmin={isAdmin} profileImage={profileImage} currentMember={currentMember} members={members} profileImages={profileImages} messages={chatMessages} setMessages={setChatMessages} />}
        </div>
      </main>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("player");
  const [credential, setCredential] = useState("");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const value = credential.trim();
    try {
      const result = await api("/login", { method: "POST", body: JSON.stringify({ mode, credential: value }) });
      onLogin(result);
    } catch (loginError) { setError(loginError.message || "Invalid credentials."); }
  };
  return <div className="auth-shell"><div className="auth-card"><div className="auth-logo"><Shield size={30} fill="currentColor" /></div><div className="eyebrow">SDFC FOOTBALL CLUB</div><h1>Team workspace</h1><p>Sign in to view the squad dashboard.</p><div className="auth-tabs"><button className={mode === "player" ? "active" : ""} onClick={() => { setMode("player"); setError(""); }}>Player</button><button className={mode === "admin" ? "active" : ""} onClick={() => { setMode("admin"); setError(""); }}>Admin</button></div><form onSubmit={submit}><label>{mode === "admin" ? "Admin passcode" : "Player ID or access code"}<input autoFocus required type={mode === "admin" ? "password" : "text"} value={credential} onChange={(event) => setCredential(event.target.value)} placeholder={mode === "admin" ? "Enter admin passcode" : "Enter your ID or access code"} /></label><button className="primary-button auth-submit" type="submit"><LogIn size={17} /> Sign in</button></form>{error && <div className="auth-error"><LockKeyhole size={14} /> {error}</div>}<small className="auth-help">{mode === "admin" ? "Use the configured administrator passcode." : "Use either your Player ID or generated access code."}</small></div></div>;
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function AnnouncementTicker({ announcements }) {
  const latest = announcements[0];
  if (!latest) return null;
  return <div className="announcement-ticker"><Megaphone size={17} /><b>Announcement</b><span>{latest.text}</span></div>;
}

function Overview({ isAdmin, currentMember, members, profileImages, profileImage, present, totalCollected, setActive, addMember, deleteMember, match, setMatch, announcements, addAnnouncement, deleteAnnouncement, wallpaper, setWallpaper }) {
  const [form, setForm] = useState({ name: "", position: "" });
  const [matchForm, setMatchForm] = useState({ opponent: match?.opponent || "", date: match?.date || "", time: match?.time || "", lineup: Array.isArray(match?.lineup) ? match.lineup : [] });
  const [announcementForm, setAnnouncementForm] = useState({ text: "", cadence: "Anytime" });
  const [credentials, setCredentials] = useState(null);
  const submitMember = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    addMember(form).then(setCredentials).catch((error) => setCredentials({ error: error.message }));
    setForm({ name: "", position: "" });
  };
  const submitMatch = (event) => {
    event.preventDefault();
    if (!matchForm.opponent.trim() || !matchForm.date || !matchForm.time) return;
    setMatch({ opponent: matchForm.opponent.trim(), date: matchForm.date, time: matchForm.time, lineup: matchForm.lineup });
  };
  const submitAnnouncement = (event) => {
    event.preventDefault();
    if (!announcementForm.text.trim()) return;
    addAnnouncement(announcementForm).catch((error) => console.error("Unable to publish announcement:", error));
    setAnnouncementForm({ text: "", cadence: "Anytime" });
  };
  return (
    <>
      <AnnouncementTicker announcements={announcements} />
      <PageHeading eyebrow={new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toUpperCase()} title={`${getGreeting()}, SDFC 👋`} description={isAdmin ? "Here is what is happening with SDFC today." : `Welcome, ${currentMember?.name || "player"}. You can view the team and mark your own attendance.`} action={<button className="primary-button" onClick={() => setActive("attendance")}><Plus size={17} /> Mark attendance</button>} />
      <div className="stat-grid">
        <StatCard icon={ClipboardCheck} label="Today's attendance" value={`${present}/${members.length}`} detail={present ? `${Math.round((present / members.length) * 100)}% of team present` : "No attendance marked yet"} accent="green" />
        <StatCard icon={CircleDollarSign} label="Total fund collected" value={money(totalCollected)} detail="Verified team contributions" accent="blue" />
        <StatCard icon={Users} label="Active players" value={members.length} detail="Add your squad members below" accent="purple" />
        <StatCard icon={TrendingUp} label="Team attendance" value={members.length ? `${Math.round((present / members.length) * 100)}%` : "0%"} detail="Today's attendance" accent="orange" />
      </div>
      <div className="overview-grid">
        <OnlineMembers members={members} profileImages={profileImages} adminImage={profileImage} />
        <section className="panel">
          <div className="panel-heading"><div><h2>Quick actions</h2><p>Keep your team records up to date.</p></div></div>
          <div className="quick-actions">
              <button onClick={() => setActive("attendance")} className="quick-card quick-green"><div className="quick-icon"><ClipboardCheck size={22} /></div><b>Present</b><span>Mark today&apos;s attendance</span><ChevronRight size={17} /></button>
              {isAdmin && <button onClick={() => setActive("funds")} className="quick-card quick-blue"><div className="quick-icon"><WalletCards size={22} /></div><b>Fund</b><span>Manage contributions</span><ChevronRight size={17} /></button>}
          </div>
        </section>
        <section className="panel match-panel">
          <div className="panel-heading"><div><h2>Next match</h2><p>Set your next fixture manually.</p></div><span className={`pill ${match ? "pill-green" : ""}`}>{match ? "SCHEDULED" : "NOT SET"}</span></div>
          {match && <div className="match-preview"><div className="match-date">{formatDate(match.date)} · {match.time} {isAdmin && <button className="delete-button" onClick={() => setMatch(null)}><Trash2 size={13} /></button>}</div><div className="match-teams"><div><div className="team-badge">S</div><b>SDFC</b></div><span>VS</span><div><div className="team-badge opponent">FC</div><b>{match.opponent}</b></div></div><div className="lineup-preview"><b>Selected lineup ({match.lineup?.length || 0})</b><div>{(Array.isArray(match.lineup) ? match.lineup : []).map((id) => { const player = members.find((item) => item.id === id); return player && <span className="lineup-chip" key={id}><Avatar member={player} image={profileImages?.[player.id]} />{player.name}</span>; })}</div></div></div>}
          {isAdmin && <form className="match-form" onSubmit={submitMatch}><label>Opponent team<input required value={matchForm.opponent} onChange={(event) => setMatchForm({ ...matchForm, opponent: event.target.value })} placeholder="Enter opponent name" /></label><label>Match date<input required type="date" value={matchForm.date} onChange={(event) => setMatchForm({ ...matchForm, date: event.target.value })} /></label><label>Match time<input required type="time" value={matchForm.time} onChange={(event) => setMatchForm({ ...matchForm, time: event.target.value })} /></label><fieldset className="lineup-select"><legend>Manual lineup ({matchForm.lineup.length}/14)</legend><div className="lineup-checkboxes">{members.length === 0 ? <span className="form-hint">Add registered players first.</span> : members.map((player) => <label key={player.id}><input type="checkbox" checked={matchForm.lineup.includes(player.id)} onChange={() => setMatchForm((current) => { const lineup = Array.isArray(current.lineup) ? current.lineup : []; return lineup.includes(player.id) ? { ...current, lineup: lineup.filter((id) => id !== player.id) } : lineup.length < 14 ? { ...current, lineup: [...lineup, player.id] } : { ...current, lineup }; })} /><span>{player.name}</span></label>)}</div></fieldset><button className="primary-button" type="submit"><Check size={16} /> {match ? "Update match" : "Save match"}</button></form>}
        </section>
      </div>
      {isAdmin && <section className="panel announcement-panel">
        <div className="panel-heading"><div><h2><Megaphone size={17} /> Announcements</h2><p>Publish updates for the whole team.</p></div><span className="pill">{announcements.length} published</span></div>
        <form className="announcement-form" onSubmit={submitAnnouncement}><input required value={announcementForm.text} onChange={(event) => setAnnouncementForm({ ...announcementForm, text: event.target.value })} placeholder="Write a team announcement..." /><select value={announcementForm.cadence} onChange={(event) => setAnnouncementForm({ ...announcementForm, cadence: event.target.value })}><option>Daily</option><option>Weekly</option><option>Anytime</option></select><button className="primary-button" type="submit"><Megaphone size={16} /> Publish</button></form>
        {announcements.length === 0 ? <div className="empty-state compact-empty"><Megaphone size={22} /><b>No announcements yet</b><span>Publish an update above to show it here.</span></div> : <div className="announcement-list">{announcements.map((announcement) => <div className="announcement-item" key={announcement.id}><Megaphone size={17} /><div><b>{announcement.text}</b><span>{announcement.cadence} · {formatDate(String(announcement.createdAt || "").slice(0, 10))}</span></div><button className="delete-button" onClick={() => deleteAnnouncement(announcement.id)}><Trash2 size={14} /></button></div>)}</div>}
      </section>}
      {isAdmin && credentials && <div className="credential-notice"><b>Player credentials created</b><span>ID: {credentials.playerId} · Passcode: {credentials.passcode}</span><button onClick={() => setCredentials(null)}><X size={15} /></button></div>}
      {isAdmin && <section className="panel member-panel">
        <div className="panel-heading"><div><h2>Add new player / member</h2><p>Add a squad member to start tracking attendance and contributions.</p></div><span className="pill">{members.length} active</span></div>
        <form className="member-form" onSubmit={submitMember}>
          <label>Player name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Enter full name" /></label>
          <label>Position / detail<input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} placeholder="e.g. Midfielder" /></label>
          <button className="primary-button" type="submit"><Plus size={17} /> Add member</button>
        </form>
        {members.length === 0 ? <div className="empty-state compact-empty"><UserRound size={22} /><b>Your squad is empty</b><span>Add your first player above.</span></div> : <div className="member-chips">{members.map((member) => <div className="member-chip" key={member.id}><Avatar member={member} image={profileImages?.[member.id]} /><div><b>{member.name}</b><span>{member.position || "Squad member"}</span><small>{member.playerId} · {member.passcode}</small></div><button className="delete-button" onClick={() => deleteMember(member.id)}><Trash2 size={14} /></button></div>)}</div>}
      </section>}
      {isAdmin && <AdminBackgroundControl wallpaper={wallpaper} setWallpaper={setWallpaper} />}
    </>
  );
}

function AdminBackgroundControl({ wallpaper, setWallpaper }) {
  const [open, setOpen] = useState(false);
  const readWallpaper = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setWallpaper(reader.result);
    reader.readAsDataURL(file);
  };
  return <div className="admin-background-wrap"><button className="secondary-button admin-background-toggle" onClick={() => setOpen((current) => !current)}><Settings size={16} /> Admin background</button>{open && <section className="panel admin-background-panel"><div><h2>Admin controls</h2><p>Upload or change the team workspace wallpaper. Changes are saved on this device.</p></div><div className="admin-background-actions"><label className="secondary-button upload-wallpaper"> <Download size={15} /> {wallpaper ? "Change wallpaper" : "Upload wallpaper"}<input type="file" accept="image/*" onChange={readWallpaper} /></label>{wallpaper && <button className="delete-button reset-wallpaper" onClick={() => setWallpaper("")}><Trash2 size={15} /> Reset background</button>}</div></section>}</div>;
}

function StatCard({ icon: Icon, label, value, detail, accent }) {
  return <div className={`stat-card accent-${accent}`}><div className="stat-top"><div className="stat-icon"><Icon size={19} /></div><span className="stat-menu">•••</span></div><span className="stat-label">{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Avatar({ member, image, className = "" }) {
  return <div className={`avatar ${image ? "avatar-image" : "avatar-green"} ${className}`}>{image ? <img src={image} alt="" /> : member?.initials || member?.name?.slice(0, 2).toUpperCase() || "P"}</div>;
}

function OnlineMembers({ members, profileImages, adminImage }) {
  return <section className="panel online-panel"><div className="panel-heading"><div><h2><Wifi size={16} /> Team Members</h2><p>Active in the team workspace</p></div><span className="pill pill-green">{members.length + 1} online</span></div><div className="online-list"><div className="online-member"><div className="online-status" /><Avatar member={{ initials: "MJ" }} image={adminImage} /><div><b>{ADMIN_NAME}</b><span>Team admin</span></div></div>{members.map((member) => <div className="online-member" key={member.id}><div className="online-status" /><Avatar member={member} image={profileImages?.[member.id]} /><div><b>{member.name}</b><span>{member.position || "Squad member"}</span></div></div>)}</div></section>;
}

function Attendance({ isAdmin, currentMember, members, profileImages, attendance, selectedDate, setSelectedDate, toggleAttendance, onExport }) {
  const present = members.filter((player) => attendance[selectedDate]?.[player.id] === "present").length;
  const marked = members.filter((player) => attendance[selectedDate]?.[player.id]).length;
  return (
    <>
      <PageHeading eyebrow="ATTENDANCE TRACKER" title="Present" description={isAdmin ? "Review the squad and export today's record." : "Mark your own attendance for today."} action={isAdmin && <button className="secondary-button" onClick={onExport}><Download size={17} /> Export report</button>} />
      <div className="attendance-layout">
        <section className="panel attendance-summary">
          <div className="summary-date"><div className="date-icon"><CalendarDays size={19} /></div><div><span>{formatDate(selectedDate)}</span><b>Daily attendance</b></div></div>
          <div className="attendance-score"><div className="score-ring" style={{ "--progress": `${members.length ? (present / members.length) * 360 : 0}deg` }}><div><strong>{present}</strong><span>present</span></div></div><div><b>{members.length && marked === members.length ? "All players marked" : `${members.length - marked} players unmarked`}</b><span>out of {members.length} squad members</span></div></div>
          <div className="summary-bar"><span style={{ width: `${members.length ? (present / members.length) * 100 : 0}%` }}></span></div>
          <div className="summary-stats"><div><b>{present}</b><span>Present</span></div><div><b>{members.length - present}</b><span>Absent / pending</span></div><div><b>{marked}</b><span>Marked</span></div></div>
        </section>
      </div>
      {!isAdmin && currentMember && <section className="panel self-attendance"><div className="panel-heading"><div><h2>Your attendance</h2><p>{formatDate(today())} · {currentMember.name}</p></div><span className="pill">TODAY</span></div><div className="self-buttons"><button className={attendance[selectedDate]?.[currentMember.id] === "present" ? "status-present" : ""} onClick={() => toggleAttendance(currentMember.id, "present")}><Check size={18} /> Present</button><button className={attendance[selectedDate]?.[currentMember.id] === "absent" ? "status-absent" : ""} onClick={() => toggleAttendance(currentMember.id, "absent")}><X size={18} /> Absent</button></div></section>}
      {isAdmin && <section className="panel player-panel"><div className="panel-heading"><div><h2>Muqalam Squad Attendance</h2><p>{formatDate(selectedDate)} · Update each player&apos;s status below.</p></div><span className="pill">{marked} of {members.length} marked</span></div><div className="player-list">{members.length === 0 ? <div className="empty-state compact-empty"><Users size={22} /><b>No squad members yet</b><span>Add players from the Overview page first.</span></div> : members.map((player) => { const status = attendance[selectedDate]?.[player.id]; return <div className="player-row" key={player.id}><Avatar member={player} image={profileImages?.[player.id]} /><div className="player-name"><b>{player.name}</b><span>{player.position || "Squad member"}</span></div><div className="attendance-buttons"><button className={status === "present" ? "status-present" : ""} onClick={() => toggleAttendance(player.id, "present")}><Check size={16} /> Present</button><button className={status === "absent" ? "status-absent" : ""} onClick={() => toggleAttendance(player.id, "absent")}><X size={16} /> Absent</button></div></div>; })}</div></section>}
    </>
  );
}

function Chat({ isAdmin, profileImage, currentMember, members, profileImages, messages, setMessages }) {
  const [text, setText] = useState("");
  const safeMessages = Array.isArray(messages) ? messages.filter(Boolean) : [];
  const safeMembers = Array.isArray(members) ? members.filter(Boolean) : [];
  const sendMessage = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setMessages((current) => [...(Array.isArray(current) ? current : []), { id: crypto.randomUUID(), text: text.trim(), author: isAdmin ? ADMIN_NAME : currentMember?.name || "Unknown player", playerId: currentMember?.id, role: isAdmin ? "admin" : "player", createdAt: new Date().toISOString() }]);
    setText("");
  };
  const remove = (id) => setMessages((current) => current.filter((message) => message.id !== id));
  return <><PageHeading eyebrow="TEAM CHAT" title="Chat" description="Messages are shared with the whole team immediately. Admins can delete messages." /><section className="panel chat-panel"><div className="chat-list">{safeMessages.length === 0 && <div className="empty-state"><MessageCircle size={22} /><b>No messages yet</b><span>Start the team conversation.</span></div>}{safeMessages.map((message) => { const member = safeMembers.find((item) => item.id === message.playerId); return <div className={`chat-message ${message.role === "admin" ? "chat-admin" : ""}`} key={message.id}><Avatar member={member || { name: message.author, initials: "MJ" }} image={message.role === "admin" ? profileImage : profileImages?.[message.playerId]} /><div className="chat-bubble"><b>{message.author}{message.role === "admin" && " · Admin"}</b><span>{message.text}</span><small>{new Date(message.createdAt).toLocaleString()}</small></div>{isAdmin && <button className="delete-button" onClick={() => remove(message.id)}><Trash2 size={14} /></button>}</div>; })}</div><form className="chat-form" onSubmit={sendMessage}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a message..." /><button className="primary-button" type="submit"><Send size={16} /> Send</button></form></section></>;
}

function Funds({ isAdmin, currentMember, members, profileImages, funds, setFunds, totalCollected, requirement, setRequirement, easyPaisaNumber, setEasyPaisaNumber, requests, setRequests, approveRequest, onDeleteFund, onExport }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date");
  const [showForm, setShowForm] = useState(false);
  const safeMembers = Array.isArray(members) ? members.filter(Boolean) : [];
  const [form, setForm] = useState({ player: "", amount: "", date: today(), status: "Paid", note: "" });
  const [requestForm, setRequestForm] = useState({ amount: "", reference: "", evidence: "" });
  const [requestSuccess, setRequestSuccess] = useState("");
  const [requirementInput, setRequirementInput] = useState(requirement || "");
  const [easyPaisaInput, setEasyPaisaInput] = useState(easyPaisaNumber);
  const safeFunds = Array.isArray(funds) ? funds.filter(Boolean) : [];
  const approvedFunds = safeFunds.filter((fund) => String(fund.status || "Paid").toLowerCase() === "paid");
  const safeRequests = Array.isArray(requests) ? requests.filter(Boolean) : [];
  const filtered = useMemo(() => [...safeFunds].filter((fund) => `${fund.player || ""} ${fund.note || ""} ${fund.status || ""}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "amount" ? Number(b.amount || 0) - Number(a.amount || 0) : sort === "player" ? String(a.player || "").localeCompare(String(b.player || "")) : new Date(b.date || 0) - new Date(a.date || 0)), [safeFunds, search, sort]);
  const submit = (event) => { event.preventDefault(); if (!form.player || !form.amount) return; const player = safeMembers.find((item) => item.name === form.player); api("/funds", { method: "POST", body: JSON.stringify({ ...form, playerId: player?.id, amount: Number(form.amount) }) }).then((fund) => { if (!fund || typeof fund !== "object") return; setFunds((current) => [fund, ...(Array.isArray(current) ? current : [])]); setForm({ player: "", amount: "", date: today(), status: "Paid", note: "" }); setShowForm(false); }).catch(() => {}); };
  const submitRequest = (event) => {
    event.preventDefault();
    if (!requestForm.amount || !requestForm.evidence || !currentMember) return;
    api("/payment-requests", { method: "POST", body: JSON.stringify({ ...requestForm, player: currentMember?.name || "Unknown player", playerId: currentMember.id, amount: Number(requestForm.amount), date: today() }) })
      .then((request) => {
        setRequests((current) => [request, ...current]);
        setRequestForm({ amount: "", reference: "", evidence: "" });
        const message = `You have successfully submitted PKR ${Number(request.amount).toLocaleString("en-PK")} to the SDFC fund.`;
        setRequestSuccess(message);
      })
      .catch(() => {});
  };
  const readEvidence = (event) => { const file = event.target.files?.[0]; if (!file || !file.type.startsWith("image/")) return; const reader = new FileReader(); reader.onload = () => setRequestForm((current) => ({ ...current, evidence: reader.result })); reader.readAsDataURL(file); };
  return (
    <>
      <PageHeading eyebrow="FUND COLLECTION" title="Fund" description="A transparent, simple way to manage the team fund." action={<div className="heading-actions">{isAdmin && <><button className="secondary-button" onClick={onExport}><Download size={17} /> Export report</button><button className="primary-button" onClick={() => setShowForm(!showForm)}><Plus size={17} /> Add contribution</button></>}</div>} />
      <div className="fund-hero"><div className="fund-hero-copy"><div className="fund-icon"><CircleDollarSign size={25} /></div><div><span>Total collected</span><strong>{money(totalCollected)}</strong><small><TrendingUp size={13} /> Official verified contributions</small></div></div></div>
      {isAdmin ? <section className="panel fund-settings"><div className="panel-heading"><div><h2>Fund settings</h2><p>Set the team dues amount and official EasyPaisa payment number.</p></div><span className="pill">EasyPaisa</span></div><form className="requirement-form" onSubmit={(event) => { event.preventDefault(); setRequirement(Number(requirementInput) || 0); setEasyPaisaNumber(easyPaisaInput.replace(/\D/g, "").slice(0, 20) || "03169057203"); }}><label>Team requirement (PKR)<input type="number" min="0" value={requirementInput} onChange={(event) => setRequirementInput(event.target.value)} placeholder="e.g. 20000" /></label><label>EasyPaisa account number<input required inputMode="numeric" value={easyPaisaInput} onChange={(event) => setEasyPaisaInput(event.target.value)} placeholder="03169057203" /></label><div className="payment-instructions"><b>Players will send payments to</b><strong>{easyPaisaNumber}</strong></div><button className="primary-button" type="submit"><Check size={16} /> Save settings</button></form></section> : <section className="panel fund-settings"><div className="payment-instructions"><b>Send your payment via EasyPaisa</b><strong>{easyPaisaNumber}</strong><span>Team requirement: {money(requirement || 0)}</span></div><form className="request-form" onSubmit={submitRequest}><input required type="number" min="1" placeholder="Amount paid (PKR)" value={requestForm.amount} onChange={(event) => setRequestForm({ ...requestForm, amount: event.target.value })} /><input placeholder="EasyPaisa reference (optional)" value={requestForm.reference} onChange={(event) => setRequestForm({ ...requestForm, reference: event.target.value })} /><label className="upload-field">Screenshot evidence (required)<input required type="file" accept="image/*" onChange={readEvidence} /></label><button className="primary-button" type="submit"><Check size={16} /> Submit payment request</button>{requestSuccess && <div className="success-banner" role="status">{requestSuccess}</div>}</form></section>}
      {isAdmin && safeRequests.length > 0 && <section className="panel request-panel"><div className="panel-heading"><div><h2>Payment requests</h2><p>Verify EasyPaisa payments and evidence before adding them to the ledger.</p></div><span className="pill">{safeRequests.length} pending</span></div>{safeRequests.map((request) => <div className="request-row" key={request.id || `${request.player || "request"}-${request.date || "unknown"}`}><div><b>{request.player || "Unknown player"}</b><span>{money(request.amount || 0)} · {request.date ? formatDate(String(request.date).slice(0, 10)) : "Date unavailable"} · Ref: {request.reference || "—"}</span>{request.evidence && <img className="payment-evidence" src={request.evidence} alt="Payment evidence" />}</div>{request.id && <button className="primary-button" onClick={() => approveRequest(request)}><Check size={15} /> Approve / Verify</button>}</div>)}</section>}
      {showForm && <section className="panel form-panel"><div className="panel-heading"><div><h2>New contribution</h2><p>Record a payment in the team ledger.</p></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></div><form className="fund-form" onSubmit={submit}><label>Player name<select required value={form.player} onChange={(e) => setForm({ ...form, player: e.target.value })}><option value="">Select player</option>{safeMembers.map((player) => <option value={player.name} key={player.id}>{player.name}</option>)}</select></label><label>Amount (PKR)<input required type="number" min="1" placeholder="e.g. 1500" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label><label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Payment status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Paid</option><option>Pending</option></select></label><label className="wide-field">Note (optional)<input placeholder="Add a note..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label><button className="primary-button submit-fund" type="submit" disabled={!safeMembers.length}><Check size={17} /> Save contribution</button></form>{!safeMembers.length && <div className="form-hint">Add a squad member before recording a contribution.</div>}</section>}
      <section className="panel approved-payments-panel"><div className="panel-heading"><div><h2>Approved payments</h2><p>Verified contributions shared with the whole team.</p></div><span className="pill pill-green">{approvedFunds.length} recorded</span></div>{approvedFunds.length === 0 ? <div className="empty-state compact-empty"><CircleDollarSign size={22} /><b>No approved payments yet</b><span>Verified payments will appear here.</span></div> : <div className="approved-payment-list">{approvedFunds.map((fund) => <div className="approved-payment-row" key={fund.id || `${fund.player || "payment"}-${fund.date || "unknown"}`}><div><b>{fund.player || "Unknown player"}</b><span>{money(fund.amount || 0)} · {fund.date ? formatDate(String(fund.date).slice(0, 10)) : "Date unavailable"}</span></div>{isAdmin && fund.id && <button className="delete-button" onClick={() => onDeleteFund(fund.id)} aria-label={`Delete payment from ${fund.player || "unknown player"}`}><Trash2 size={14} /></button>}</div>)}</div>}</section>
      {isAdmin && <section className="panel ledger-panel"><div className="panel-heading ledger-heading"><div><h2>Contribution ledger</h2><p>Every deposit, clearly accounted for.</p></div><div className="ledger-controls"><label className="search-box"><Search size={16} /><input placeholder="Search ledger..." value={search} onChange={(e) => setSearch(e.target.value)} /></label><button className="sort-button" onClick={() => setSort(sort === "date" ? "amount" : sort === "amount" ? "player" : "date")}><ArrowDownUp size={16} /> Sort</button></div></div><div className="table-wrap"><table><thead><tr><th>PLAYER</th><th>AMOUNT</th><th>DATE</th><th>STATUS</th><th>NOTE</th><th></th></tr></thead><tbody>{filtered.map((fund) => { const fundMember = members.find((member) => member.name === fund.player); return <tr key={fund.id}><td><div className="table-player"><Avatar member={fundMember || { name: fund.player, initials: String(fund.player || "").split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2) }} image={fundMember && profileImages?.[fundMember.id]} /><b>{fund.player}</b></div></td><td><strong>{money(fund.amount)}</strong></td><td>{formatDate(fund.date)}</td><td><span className={`pill ${fund.status === "Paid" ? "pill-green" : "pill-yellow"}`}>{fund.status === "Paid" ? <Check size={12} /> : <Clock3 size={12} />} {fund.status}</span></td><td className="note-cell">{fund.note || "—"}</td><td><button className="delete-button" onClick={() => onDeleteFund(fund.id)}><Trash2 size={14} /></button></td></tr>; })}</tbody></table>{filtered.length === 0 && <div className="empty-state"><Search size={22} /><b>No contributions found</b><span>Try a different search term.</span></div>}</div><div className="ledger-footer"><span>Showing {filtered.length} of {funds.length} contributions</span><b>Paid total: {money(totalCollected)}</b></div></section>}
    </>
  );
}

export default App;
