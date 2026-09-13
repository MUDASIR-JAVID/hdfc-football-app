import { useEffect, useMemo, useState } from "react";
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
import { api, API_ENABLED } from "./api";

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
};
const money = (value) => `Rs. ${Number(value).toLocaleString("en-PK")}`;
const formatDate = (date) =>
  new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${date}T00:00:00`),
  );
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Good night";
};
const ADMIN_NAME = "Mudasir Javid";
const ADMIN_PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || "SDFC-ADMIN";

function useStoredState(key, initial, persist = true) {
  const [value, setValue] = useState(() => {
    if (!persist) return initial;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => { if (persist) localStorage.setItem(key, JSON.stringify(value)); }, [key, value, persist]);
  return [value, setValue];
}

function App() {
  const [auth, setAuth] = useStoredState("sdfc-auth-v3", null, !API_ENABLED);
  const [active, setActive] = useState("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  // Versioned keys intentionally start empty so the former demo records cannot leak into the real squad.
  const [members, setMembers] = useStoredState("sdfc-members-v2", [], !API_ENABLED);
  const [attendance, setAttendance] = useStoredState("sdfc-attendance-v2", {}, !API_ENABLED);
  const [dataError, setDataError] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [funds, setFunds] = useStoredState("sdfc-funds-v2", []);
  const [match, setMatch] = useStoredState("sdfc-match-v2", null);
  const [announcements, setAnnouncements] = useStoredState("sdfc-announcements-v2", []);
  const [clubLogo, setClubLogo] = useStoredState("sdfc-club-logo-v2", "");
  const [profileImage, setProfileImage] = useStoredState("sdfc-profile-image-v2", "");
  const [profileImages, setProfileImages] = useStoredState("sdfc-player-images-v1", {});
  const [fundRequirement, setFundRequirement] = useStoredState("sdfc-fund-requirement-v1", 0);
  const [easyPaisaNumber, setEasyPaisaNumber] = useStoredState("sdfc-easypaisa-number-v1", "03169057203");
  const [paymentRequests, setPaymentRequests] = useStoredState("sdfc-payment-requests-v1", []);
  const [chatMessages, setChatMessages] = useStoredState("sdfc-chat-v1", []);
  const [wallpaper, setWallpaper] = useStoredState("sdfc-wallpaper-v1", "");
  const [selectedDate, setSelectedDate] = useState(today());

  useEffect(() => {
    if (!API_ENABLED || !auth?.access_token) return;
    let cancelled = false;
    setLoadingData(true);
    Promise.all([api.players(auth.access_token), api.attendance(auth.access_token)]).then(([players, records]) => {
      if (cancelled) return;
      setMembers(players.map((player) => ({ ...player, id: player.player_id, playerId: player.player_id, initials: player.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() })));
      setAttendance(records.reduce((all, record) => ({ ...all, [record.date]: { ...(all[record.date] || {}), [record.player_id]: record.status } }), {}));
    }).catch((error) => setDataError(error.message)).finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  }, [auth?.access_token]);

  const present = members.filter((player) => attendance[selectedDate]?.[player.id] === "present").length;
  const totalCollected = funds.filter((fund) => fund.status === "Paid").reduce((sum, fund) => sum + Number(fund.amount), 0);

  const toggleAttendance = async (playerId, status) => {
    if (API_ENABLED) {
      try { await api.recordAttendance({ player_id: playerId, date: selectedDate, status }, auth.access_token); }
      catch (error) { setDataError(error.message); return; }
    }
    setAttendance((current) => ({
      ...current,
      [selectedDate]: { ...(current[selectedDate] || {}), [playerId]: status },
    }));
  };

  const addMember = async (member) => {
    const name = member.name.trim();
    if (!name) return;
    const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    const playerId = `SDFC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const passcode = Math.random().toString(36).slice(2, 10).toUpperCase();
    if (API_ENABLED) {
      try {
        const created = await api.createPlayer({ player_id: playerId, passcode, name, position: member.position || null }, auth.access_token);
        setMembers((current) => [...current, { ...created, id: created.player_id, playerId: created.player_id, initials }]);
      } catch (error) { setDataError(error.message); return; }
    } else setMembers((current) => [...current, { ...member, id: crypto.randomUUID(), playerId, passcode, name, initials }]);
    return { playerId, passcode };
  };

  const addAnnouncement = (announcement) => {
    if (!announcement.text.trim()) return;
    setAnnouncements((current) => [{ id: crypto.randomUUID(), text: announcement.text.trim(), cadence: announcement.cadence, createdAt: new Date().toISOString() }, ...current]);
  };

  const deleteMember = async (id) => {
    const member = members.find((item) => item.id === id);
    if (API_ENABLED) {
      try { await api.deletePlayer(member.player_id || member.playerId, auth.access_token); }
      catch (error) { setDataError(error.message); return; }
    }
    setMembers((current) => current.filter((member) => member.id !== id));
  };
  const deleteAnnouncement = (id) => setAnnouncements((current) => current.filter((item) => item.id !== id));
  const deleteFund = (id) => setFunds((current) => current.filter((item) => item.id !== id));
  const approveRequest = (request) => {
    setFunds((current) => [{ id: crypto.randomUUID(), player: request.player, amount: Number(request.amount), date: request.date, status: "Paid", note: `EasyPaisa verified (${request.reference || "no reference"})` }, ...current]);
    setPaymentRequests((current) => current.filter((item) => item.id !== request.id));
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

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "attendance", label: "Present", icon: ClipboardCheck },
    { id: "funds", label: "Fund", icon: WalletCards },
    { id: "chat", label: "Chat", icon: MessageCircle },
  ];

  if (!auth) {
    return <LoginScreen members={members} onLogin={setAuth} />;
  }

  const isAdmin = auth.role === "admin";
  const currentPlayerId = auth.playerId || auth.player_id;
  const currentMember = members.find((member) => member.playerId === currentPlayerId);
  const logout = () => setAuth(null);

  return (
    <div className="app-shell" style={wallpaper ? { backgroundImage: `linear-gradient(#090b11cc,#090b11ee), url(${wallpaper})` } : undefined}>
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <label className={`brand-mark brand-image-control ${!isAdmin ? "brand-readonly" : ""}`} title={isAdmin ? "Upload team logo" : "SDFC logo"}>
            {clubLogo ? <img src={clubLogo} alt="SDFC logo" /> : <Shield size={22} fill="currentColor" />}
            {isAdmin && <input type="file" accept="image/*" onChange={(event) => readImage(event, setClubLogo)} />}
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
            <button key={id} className={`nav-link ${active === id ? "active" : ""}`} onClick={() => { setActive(id); setMobileMenu(false); }}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <label className="profile-mini profile-image-control" title="Upload profile picture">
            <div className={`avatar ${(isAdmin ? profileImage : profileImages[currentMember?.id]) ? "avatar-image" : "avatar-green"}`}>{(isAdmin ? profileImage : profileImages[currentMember?.id]) ? <img src={isAdmin ? profileImage : profileImages[currentMember.id]} alt="" /> : (isAdmin ? "MJ" : currentMember?.initials || "P")}</div>
            <input type="file" accept="image/*" onChange={(event) => readImage(event, (image) => isAdmin ? setProfileImage(image) : setProfileImages((current) => ({ ...current, [currentMember.id]: image })))} />
            <div><b>{isAdmin ? ADMIN_NAME : currentMember?.name}</b><span>{isAdmin ? "Team admin" : currentMember?.position || "Squad member"}</span></div>
            <input type="file" accept="image/*" onChange={(event) => readImage(event, (image) => isAdmin ? setProfileImage(image) : setProfileImages((current) => ({ ...current, [currentMember.id]: image })))} />
          </label>
          <div className="developer">Developer: <b>Mudasir Javid</b><button className="logout-button" onClick={logout}><LogOut size={13} /> Sign out</button></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Team workspace</span><ChevronRight size={14} /><b>{navItems.find((item) => item.id === active)?.label}</b></div>
          <div className="top-actions"><span className="live-dot"></span><span className="live-text">{API_ENABLED ? "Cloud data connected" : "Data saved locally"}</span><div className={`top-avatar ${(isAdmin ? profileImage : profileImages[currentMember?.id]) ? "avatar-image" : ""}`}>{(isAdmin ? profileImage : profileImages[currentMember?.id]) ? <img src={isAdmin ? profileImage : profileImages[currentMember.id]} alt="" /> : (isAdmin ? "MJ" : currentMember?.initials || "P")}</div></div>
        </header>

        <div className="page-wrap">{(loadingData || dataError) && <div className="auth-error">{loadingData ? "Loading players and attendance…" : dataError}</div>}
          {active === "overview" && <Overview isAdmin={isAdmin} currentMember={currentMember} members={members} profileImages={profileImages} profileImage={profileImage} present={present} totalCollected={totalCollected} setActive={setActive} addMember={addMember} deleteMember={deleteMember} match={match} setMatch={setMatch} announcements={announcements} addAnnouncement={addAnnouncement} deleteAnnouncement={deleteAnnouncement} wallpaper={wallpaper} setWallpaper={setWallpaper} />}
          {active === "attendance" && <Attendance isAdmin={isAdmin} currentMember={currentMember} members={members} profileImages={profileImages} attendance={attendance} selectedDate={selectedDate} setSelectedDate={setSelectedDate} toggleAttendance={toggleAttendance} onExport={() => exportCsv("sdfc-attendance.csv", [["Player", "Position", "Date", "Status"], ...members.map((member) => [member.name, member.position || "Squad member", selectedDate, attendance[selectedDate]?.[member.id] || "Unmarked"])])} />}
          {active === "funds" && <Funds isAdmin={isAdmin} currentMember={currentMember} members={members} profileImages={profileImages} funds={funds} setFunds={setFunds} totalCollected={totalCollected} requirement={fundRequirement} setRequirement={setFundRequirement} easyPaisaNumber={easyPaisaNumber} setEasyPaisaNumber={setEasyPaisaNumber} requests={paymentRequests} setRequests={setPaymentRequests} approveRequest={approveRequest} onDeleteFund={deleteFund} onExport={() => exportCsv("sdfc-funds.csv", [["Player", "Amount", "Date", "Status", "Note"], ...funds.map((fund) => [fund.player, fund.amount, fund.date, fund.status, fund.note])])} />}
          {active === "chat" && <Chat isAdmin={isAdmin} profileImage={profileImage} currentMember={currentMember} members={members} profileImages={profileImages} messages={chatMessages} setMessages={setChatMessages} />}
        </div>
      </main>
    </div>
  );
}

function LoginScreen({ members, onLogin }) {
  const [mode, setMode] = useState("player");
  const [credential, setCredential] = useState("");
  const [playerPasscode, setPlayerPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    const value = credential.trim();
    if (API_ENABLED) {
      setLoading(true);
      try {
        const result = await api.login(mode === "admin" ? "admin" : value, mode === "admin" ? value : playerPasscode.trim());
        onLogin({ ...result, name: result.role === "admin" ? ADMIN_NAME : result.player_id });
      } catch (loginError) {
        setError(loginError.message || "Invalid credentials.");
      } finally {
        setLoading(false);
      }
      return;
    }
    if (mode === "admin" && value === ADMIN_PASSCODE) {
      onLogin({ role: "admin", name: ADMIN_NAME });
      return;
    }
    const member = members.find((item) => item.playerId === value || item.passcode === value);
    if (mode === "player" && member) {
      onLogin({ role: "player", playerId: member.playerId, name: member.name });
      return;
    }
    setError(mode === "admin" ? "Invalid admin passcode." : "Invalid Player ID or passcode.");
  };
  return <div className="auth-shell"><div className="auth-card"><div className="auth-logo"><Shield size={30} fill="currentColor" /></div><div className="eyebrow">SDFC FOOTBALL CLUB</div><h1>Team workspace</h1><p>Sign in to view the squad dashboard.</p><div className="auth-tabs"><button className={mode === "player" ? "active" : ""} onClick={() => { setMode("player"); setError(""); }}>Player</button><button className={mode === "admin" ? "active" : ""} onClick={() => { setMode("admin"); setError(""); }}>Admin</button></div><form onSubmit={submit}><label>{mode === "admin" ? "Admin passcode" : "Player ID"}<input autoFocus required type={mode === "admin" ? "password" : "text"} value={credential} onChange={(event) => setCredential(event.target.value)} placeholder={mode === "admin" ? "Enter admin passcode" : "e.g. SDFC-ABC123"} /></label>{API_ENABLED && mode === "player" && <label>Player passcode<input required type="password" value={playerPasscode} onChange={(event) => setPlayerPasscode(event.target.value)} /></label>}<button className="primary-button auth-submit" type="submit" disabled={loading}><LogIn size={17} /> {loading ? "Signing in…" : "Sign in"}</button></form>{error && <div className="auth-error"><LockKeyhole size={14} /> {error}</div>}<small className="auth-help">{API_ENABLED ? "Connected to the team backend." : mode === "admin" ? "Local fallback: admin credentials use VITE_ADMIN_PASSCODE." : "Local fallback: sign in with a locally stored player."}</small></div></div>;
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
  const [matchForm, setMatchForm] = useState({ opponent: match?.opponent || "", date: match?.date || "", time: match?.time || "", lineup: match?.lineup || [] });
  const [announcementForm, setAnnouncementForm] = useState({ text: "", cadence: "Anytime" });
  const [credentials, setCredentials] = useState(null);
  const submitMember = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setCredentials(addMember(form));
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
    addAnnouncement(announcementForm);
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
      <div className="content-grid overview-grid">
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
          {match && <div className="match-preview"><div className="match-date">{formatDate(match.date)} · {match.time} {isAdmin && <button className="delete-button" onClick={() => setMatch(null)}><Trash2 size={13} /></button>}</div><div className="match-teams"><div><div className="team-badge">S</div><b>SDFC</b></div><span>VS</span><div><div className="team-badge opponent">FC</div><b>{match.opponent}</b></div></div><div className="lineup-preview"><b>Selected lineup ({match.lineup?.length || 0})</b><div>{(match.lineup || []).map((id) => { const player = members.find((item) => item.id === id); return player && <span className="lineup-chip" key={id}><Avatar member={player} image={profileImages[player.id]} />{player.name}</span>; })}</div></div></div>}
          {isAdmin && <form className="match-form" onSubmit={submitMatch}><label>Opponent team<input required value={matchForm.opponent} onChange={(event) => setMatchForm({ ...matchForm, opponent: event.target.value })} placeholder="Enter opponent name" /></label><label>Match date<input required type="date" value={matchForm.date} onChange={(event) => setMatchForm({ ...matchForm, date: event.target.value })} /></label><label>Match time<input required type="time" value={matchForm.time} onChange={(event) => setMatchForm({ ...matchForm, time: event.target.value })} /></label><fieldset className="lineup-select"><legend>Manual lineup ({matchForm.lineup.length}/14)</legend><div className="lineup-checkboxes">{members.length === 0 ? <span className="form-hint">Add registered players first.</span> : members.map((player) => <label key={player.id}><input type="checkbox" checked={matchForm.lineup.includes(player.id)} onChange={() => setMatchForm((current) => current.lineup.includes(player.id) ? { ...current, lineup: current.lineup.filter((id) => id !== player.id) } : current.lineup.length < 14 ? { ...current, lineup: [...current.lineup, player.id] } : current)} /><span>{player.name}</span></label>)}</div></fieldset><button className="primary-button" type="submit"><Check size={16} /> {match ? "Update match" : "Save match"}</button></form>}
        </section>
      </div>
      {isAdmin && <section className="panel announcement-panel">
        <div className="panel-heading"><div><h2><Megaphone size={17} /> Announcements</h2><p>Publish updates for the whole team.</p></div><span className="pill">{announcements.length} published</span></div>
        <form className="announcement-form" onSubmit={submitAnnouncement}><input required value={announcementForm.text} onChange={(event) => setAnnouncementForm({ ...announcementForm, text: event.target.value })} placeholder="Write a team announcement..." /><select value={announcementForm.cadence} onChange={(event) => setAnnouncementForm({ ...announcementForm, cadence: event.target.value })}><option>Daily</option><option>Weekly</option><option>Anytime</option></select><button className="primary-button" type="submit"><Megaphone size={16} /> Publish</button></form>
        {announcements.length === 0 ? <div className="empty-state compact-empty"><Megaphone size={22} /><b>No announcements yet</b><span>Publish an update above to show it here.</span></div> : <div className="announcement-list">{announcements.map((announcement) => <div className="announcement-item" key={announcement.id}><Megaphone size={17} /><div><b>{announcement.text}</b><span>{announcement.cadence} · {formatDate(announcement.createdAt.slice(0, 10))}</span></div><button className="delete-button" onClick={() => deleteAnnouncement(announcement.id)}><Trash2 size={14} /></button></div>)}</div>}
      </section>}
      {isAdmin && credentials && <div className="credential-notice"><b>Player credentials created</b><span>ID: {credentials.playerId} · Passcode: {credentials.passcode}</span><button onClick={() => setCredentials(null)}><X size={15} /></button></div>}
      {isAdmin && <section className="panel member-panel">
        <div className="panel-heading"><div><h2>Add new player / member</h2><p>Add a squad member to start tracking attendance and contributions.</p></div><span className="pill">{members.length} active</span></div>
        <form className="member-form" onSubmit={submitMember}>
          <label>Player name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Enter full name" /></label>
          <label>Position / detail<input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} placeholder="e.g. Midfielder" /></label>
          <button className="primary-button" type="submit"><Plus size={17} /> Add member</button>
        </form>
        {members.length === 0 ? <div className="empty-state compact-empty"><UserRound size={22} /><b>Your squad is empty</b><span>Add your first player above.</span></div> : <div className="member-chips">{members.map((member) => <div className="member-chip" key={member.id}><Avatar member={member} image={profileImages[member.id]} /><div><b>{member.name}</b><span>{member.position || "Squad member"}</span><small>{member.playerId} · {member.passcode}</small></div><button className="delete-button" onClick={() => deleteMember(member.id)}><Trash2 size={14} /></button></div>)}</div>}
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
  return <section className="panel online-panel"><div className="panel-heading"><div><h2><Wifi size={16} /> Online members</h2><p>Active in the team workspace</p></div><span className="pill pill-green">{members.length + 1} online</span></div><div className="online-list"><div className="online-member"><div className="online-status" /><Avatar member={{ initials: "MJ" }} image={adminImage} /><div><b>{ADMIN_NAME}</b><span>Team admin</span></div></div>{members.map((member) => <div className="online-member" key={member.id}><div className="online-status" /><Avatar member={member} image={profileImages[member.id]} /><div><b>{member.name}</b><span>{member.position || "Squad member"}</span></div></div>)}</div></section>;
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
      {isAdmin && <section className="panel player-panel"><div className="panel-heading"><div><h2>Muqalam Squad Attendance</h2><p>{formatDate(selectedDate)} · Update each player&apos;s status below.</p></div><span className="pill">{marked} of {members.length} marked</span></div><div className="player-list">{members.length === 0 ? <div className="empty-state compact-empty"><Users size={22} /><b>No squad members yet</b><span>Add players from the Overview page first.</span></div> : members.map((player) => { const status = attendance[selectedDate]?.[player.id]; return <div className="player-row" key={player.id}><Avatar member={player} image={profileImages[player.id]} /><div className="player-name"><b>{player.name}</b><span>{player.position || "Squad member"}</span></div><div className="attendance-buttons"><button className={status === "present" ? "status-present" : ""} onClick={() => toggleAttendance(player.id, "present")}><Check size={16} /> Present</button><button className={status === "absent" ? "status-absent" : ""} onClick={() => toggleAttendance(player.id, "absent")}><X size={16} /> Absent</button></div></div>; })}</div></section>}
    </>
  );
}

function Chat({ isAdmin, profileImage, currentMember, members, profileImages, messages, setMessages }) {
  const [text, setText] = useState("");
  const sendMessage = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), text: text.trim(), author: isAdmin ? ADMIN_NAME : currentMember.name, playerId: currentMember?.id, role: isAdmin ? "admin" : "player", createdAt: new Date().toISOString() }]);
    setText("");
  };
  const remove = (id) => setMessages((current) => current.filter((message) => message.id !== id));
  return <><PageHeading eyebrow="TEAM CHAT" title="Chat" description="Messages are shared with the whole team immediately. Admins can delete messages." /><section className="panel chat-panel"><div className="chat-list">{messages.length === 0 && <div className="empty-state"><MessageCircle size={22} /><b>No messages yet</b><span>Start the team conversation.</span></div>}{messages.map((message) => { const member = members.find((item) => item.id === message.playerId); return <div className={`chat-message ${message.role === "admin" ? "chat-admin" : ""}`} key={message.id}><Avatar member={member || { name: message.author, initials: "MJ" }} image={message.role === "admin" ? profileImage : profileImages[message.playerId]} /><div className="chat-bubble"><b>{message.author}{message.role === "admin" && " · Admin"}</b><span>{message.text}</span><small>{new Date(message.createdAt).toLocaleString()}</small></div>{isAdmin && <button className="delete-button" onClick={() => remove(message.id)}><Trash2 size={14} /></button>}</div>; })}</div><form className="chat-form" onSubmit={sendMessage}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a message..." /><button className="primary-button" type="submit"><Send size={16} /> Send</button></form></section></>;
}

function Funds({ isAdmin, currentMember, members, profileImages, funds, setFunds, totalCollected, requirement, setRequirement, easyPaisaNumber, setEasyPaisaNumber, requests, setRequests, approveRequest, onDeleteFund, onExport }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ player: "", amount: "", date: today(), status: "Paid", note: "" });
  const [requestForm, setRequestForm] = useState({ amount: "", reference: "", evidence: "" });
  const [requirementInput, setRequirementInput] = useState(requirement || "");
  const [easyPaisaInput, setEasyPaisaInput] = useState(easyPaisaNumber);
  const filtered = useMemo(() => [...funds].filter((fund) => `${fund.player} ${fund.note} ${fund.status}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "amount" ? b.amount - a.amount : sort === "player" ? a.player.localeCompare(b.player) : new Date(b.date) - new Date(a.date)), [funds, search, sort]);
  const submit = (event) => { event.preventDefault(); if (!form.player || !form.amount) return; setFunds((current) => [{ ...form, id: Date.now(), amount: Number(form.amount) }, ...current]); setForm({ player: "", amount: "", date: today(), status: "Paid", note: "" }); setShowForm(false); };
  const submitRequest = (event) => { event.preventDefault(); if (!requestForm.amount || !currentMember) return; setRequests((current) => [{ ...requestForm, id: crypto.randomUUID(), player: currentMember.name, playerId: currentMember.id, amount: Number(requestForm.amount), date: today() }, ...current]); setRequestForm({ amount: "", reference: "", evidence: "" }); };
  const readEvidence = (event) => { const file = event.target.files?.[0]; if (!file || !file.type.startsWith("image/")) return; const reader = new FileReader(); reader.onload = () => setRequestForm((current) => ({ ...current, evidence: reader.result })); reader.readAsDataURL(file); };
  return (
    <>
      <PageHeading eyebrow="FUND COLLECTION" title="Fund" description="A transparent, simple way to manage the team fund." action={<div className="heading-actions">{isAdmin && <><button className="secondary-button" onClick={onExport}><Download size={17} /> Export report</button><button className="primary-button" onClick={() => setShowForm(!showForm)}><Plus size={17} /> Add contribution</button></>}</div>} />
      <div className="fund-hero"><div className="fund-hero-copy"><div className="fund-icon"><CircleDollarSign size={25} /></div><div><span>Total collected</span><strong>{money(totalCollected)}</strong><small><TrendingUp size={13} /> Official verified contributions</small></div></div></div>
      {isAdmin ? <section className="panel fund-settings"><div className="panel-heading"><div><h2>Fund settings</h2><p>Set the team dues amount and official EasyPaisa payment number.</p></div><span className="pill">EasyPaisa</span></div><form className="requirement-form" onSubmit={(event) => { event.preventDefault(); setRequirement(Number(requirementInput) || 0); setEasyPaisaNumber(easyPaisaInput.replace(/\D/g, "").slice(0, 20) || "03169057203"); }}><label>Team requirement (PKR)<input type="number" min="0" value={requirementInput} onChange={(event) => setRequirementInput(event.target.value)} placeholder="e.g. 20000" /></label><label>EasyPaisa account number<input required inputMode="numeric" value={easyPaisaInput} onChange={(event) => setEasyPaisaInput(event.target.value)} placeholder="03169057203" /></label><div className="payment-instructions"><b>Players will send payments to</b><strong>{easyPaisaNumber}</strong></div><button className="primary-button" type="submit"><Check size={16} /> Save settings</button></form></section> : <section className="panel fund-settings"><div className="payment-instructions"><b>Send your payment via EasyPaisa</b><strong>{easyPaisaNumber}</strong><span>Team requirement: {money(requirement || 0)}</span></div><form className="request-form" onSubmit={submitRequest}><input required type="number" min="1" placeholder="Amount paid (PKR)" value={requestForm.amount} onChange={(event) => setRequestForm({ ...requestForm, amount: event.target.value })} /><input required placeholder="EasyPaisa reference" value={requestForm.reference} onChange={(event) => setRequestForm({ ...requestForm, reference: event.target.value })} /><label className="upload-field">Screenshot evidence<input required type="file" accept="image/*" onChange={readEvidence} /></label><button className="primary-button" type="submit"><Check size={16} /> Submit payment request</button></form></section>}
      {isAdmin && requests.length > 0 && <section className="panel request-panel"><div className="panel-heading"><div><h2>Payment requests</h2><p>Verify EasyPaisa payments and evidence before adding them to the ledger.</p></div><span className="pill">{requests.length} pending</span></div>{requests.map((request) => <div className="request-row" key={request.id}><div><b>{request.player}</b><span>{money(request.amount)} · {formatDate(request.date)} · Ref: {request.reference || "—"}</span>{request.evidence && <img className="payment-evidence" src={request.evidence} alt="Payment evidence" />}</div><button className="primary-button" onClick={() => approveRequest(request)}><Check size={15} /> Approve / Verify</button></div>)}</section>}
      {showForm && <section className="panel form-panel"><div className="panel-heading"><div><h2>New contribution</h2><p>Record a payment in the team ledger.</p></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></div><form className="fund-form" onSubmit={submit}><label>Player name<select required value={form.player} onChange={(e) => setForm({ ...form, player: e.target.value })}><option value="">Select player</option>{members.map((player) => <option value={player.name} key={player.id}>{player.name}</option>)}</select></label><label>Amount (PKR)<input required type="number" min="1" placeholder="e.g. 1500" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label><label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Payment status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Paid</option><option>Pending</option></select></label><label className="wide-field">Note (optional)<input placeholder="Add a note..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label><button className="primary-button submit-fund" type="submit" disabled={!members.length}><Check size={17} /> Save contribution</button></form>{!members.length && <div className="form-hint">Add a squad member before recording a contribution.</div>}</section>}
      {isAdmin && <section className="panel ledger-panel"><div className="panel-heading ledger-heading"><div><h2>Contribution ledger</h2><p>Every deposit, clearly accounted for.</p></div><div className="ledger-controls"><label className="search-box"><Search size={16} /><input placeholder="Search ledger..." value={search} onChange={(e) => setSearch(e.target.value)} /></label><button className="sort-button" onClick={() => setSort(sort === "date" ? "amount" : sort === "amount" ? "player" : "date")}><ArrowDownUp size={16} /> Sort</button></div></div><div className="table-wrap"><table><thead><tr><th>PLAYER</th><th>AMOUNT</th><th>DATE</th><th>STATUS</th><th>NOTE</th><th></th></tr></thead><tbody>{filtered.map((fund) => { const fundMember = members.find((member) => member.name === fund.player); return <tr key={fund.id}><td><div className="table-player"><Avatar member={fundMember || { name: fund.player, initials: fund.player.split(" ").map((word) => word[0]).join("").slice(0, 2) }} image={fundMember && profileImages?.[fundMember.id]} /><b>{fund.player}</b></div></td><td><strong>{money(fund.amount)}</strong></td><td>{formatDate(fund.date)}</td><td><span className={`pill ${fund.status === "Paid" ? "pill-green" : "pill-yellow"}`}>{fund.status === "Paid" ? <Check size={12} /> : <Clock3 size={12} />} {fund.status}</span></td><td className="note-cell">{fund.note || "—"}</td><td><button className="delete-button" onClick={() => onDeleteFund(fund.id)}><Trash2 size={14} /></button></td></tr>; })}</tbody></table>{filtered.length === 0 && <div className="empty-state"><Search size={22} /><b>No contributions found</b><span>Try a different search term.</span></div>}</div><div className="ledger-footer"><span>Showing {filtered.length} of {funds.length} contributions</span><b>Paid total: {money(totalCollected)}</b></div></section>}
    </>
  );
}

export default App;
