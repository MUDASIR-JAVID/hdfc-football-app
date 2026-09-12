import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Download,
  LayoutDashboard,
  Menu,
  Megaphone,
  Plus,
  Search,
  Shield,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";

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

function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue];
}

function App() {
  const [active, setActive] = useState("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  // Versioned keys intentionally start empty so the former demo records cannot leak into the real squad.
  const [members, setMembers] = useStoredState("sdfc-members-v2", []);
  const [attendance, setAttendance] = useStoredState("sdfc-attendance-v2", {});
  const [funds, setFunds] = useStoredState("sdfc-funds-v2", []);
  const [match, setMatch] = useStoredState("sdfc-match-v2", null);
  const [announcements, setAnnouncements] = useStoredState("sdfc-announcements-v2", []);
  const [clubLogo, setClubLogo] = useStoredState("sdfc-club-logo-v2", "");
  const [profileImage, setProfileImage] = useStoredState("sdfc-profile-image-v2", "");
  const [selectedDate, setSelectedDate] = useState(today());

  const present = members.filter((player) => attendance[selectedDate]?.[player.id] === "present").length;
  const totalCollected = funds.filter((fund) => fund.status === "Paid").reduce((sum, fund) => sum + Number(fund.amount), 0);

  const toggleAttendance = (playerId, status) => {
    setAttendance((current) => ({
      ...current,
      [selectedDate]: { ...(current[selectedDate] || {}), [playerId]: status },
    }));
  };

  const addMember = (member) => {
    const name = member.name.trim();
    if (!name) return;
    const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    setMembers((current) => [...current, { ...member, id: crypto.randomUUID(), name, initials }]);
  };

  const addAnnouncement = (announcement) => {
    if (!announcement.text.trim()) return;
    setAnnouncements((current) => [{ id: crypto.randomUUID(), text: announcement.text.trim(), cadence: announcement.cadence, createdAt: new Date().toISOString() }, ...current]);
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
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <label className="brand-mark brand-image-control" title="Upload team logo">
            {clubLogo ? <img src={clubLogo} alt="SDFC logo" /> : <Shield size={22} fill="currentColor" />}
            <input type="file" accept="image/*" onChange={(event) => readImage(event, setClubLogo)} />
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
          <label className="profile-mini profile-image-control" title="Upload admin profile picture">
            <div className={`avatar ${profileImage ? "avatar-image" : "avatar-green"}`}>{profileImage ? <img src={profileImage} alt="Mudasir Javid" /> : "MJ"}</div>
            <input type="file" accept="image/*" onChange={(event) => readImage(event, setProfileImage)} />
            <div><b>Mudasir Javid</b><span>Team admin</span></div>
          </label>
          <div className="developer">Developer: <b>Mudasir Javid</b></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Team workspace</span><ChevronRight size={14} /><b>{navItems.find((item) => item.id === active)?.label}</b></div>
          <div className="top-actions"><span className="live-dot"></span><span className="live-text">Data saved locally</span><div className={`top-avatar ${profileImage ? "avatar-image" : ""}`}>{profileImage ? <img src={profileImage} alt="" /> : "MJ"}</div></div>
        </header>

        <div className="page-wrap">
          {active === "overview" && <Overview members={members} present={present} totalCollected={totalCollected} setActive={setActive} addMember={addMember} match={match} setMatch={setMatch} announcements={announcements} addAnnouncement={addAnnouncement} />}
          {active === "attendance" && <Attendance members={members} attendance={attendance} selectedDate={selectedDate} setSelectedDate={setSelectedDate} toggleAttendance={toggleAttendance} onExport={() => exportCsv("sdfc-attendance.csv", [["Player", "Position", "Date", "Status"], ...members.map((member) => [member.name, member.position || "Squad member", selectedDate, attendance[selectedDate]?.[member.id] || "Unmarked"])])} />}
          {active === "funds" && <Funds members={members} funds={funds} setFunds={setFunds} totalCollected={totalCollected} onExport={() => exportCsv("sdfc-funds.csv", [["Player", "Amount", "Date", "Status", "Note"], ...funds.map((fund) => [fund.player, fund.amount, fund.date, fund.status, fund.note])])} />}
        </div>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Overview({ members, present, totalCollected, setActive, addMember, match, setMatch, announcements, addAnnouncement }) {
  const [form, setForm] = useState({ name: "", position: "" });
  const [matchForm, setMatchForm] = useState({ opponent: match?.opponent || "", date: match?.date || "", time: match?.time || "" });
  const [announcementForm, setAnnouncementForm] = useState({ text: "", cadence: "Anytime" });
  const submitMember = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    addMember(form);
    setForm({ name: "", position: "" });
  };
  const submitMatch = (event) => {
    event.preventDefault();
    if (!matchForm.opponent.trim() || !matchForm.date || !matchForm.time) return;
    setMatch({ opponent: matchForm.opponent.trim(), date: matchForm.date, time: matchForm.time });
  };
  const submitAnnouncement = (event) => {
    event.preventDefault();
    if (!announcementForm.text.trim()) return;
    addAnnouncement(announcementForm);
    setAnnouncementForm({ text: "", cadence: "Anytime" });
  };
  return (
    <>
      <PageHeading eyebrow={new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toUpperCase()} title={`${getGreeting()}, SDFC 👋`} description="Here is what is happening with SDFC today." action={<button className="primary-button" onClick={() => setActive("attendance")}><Plus size={17} /> Mark attendance</button>} />
      <div className="stat-grid">
        <StatCard icon={ClipboardCheck} label="Today's attendance" value={`${present}/${members.length}`} detail={present ? `${Math.round((present / members.length) * 100)}% of team present` : "No attendance marked yet"} accent="green" />
        <StatCard icon={CircleDollarSign} label="Total fund collected" value={money(totalCollected)} detail="+12.5% from last month" accent="blue" />
        <StatCard icon={Users} label="Active players" value={members.length} detail="Add your squad members below" accent="purple" />
        <StatCard icon={TrendingUp} label="Team attendance" value={members.length ? `${Math.round((present / members.length) * 100)}%` : "0%"} detail="Today's attendance" accent="orange" />
      </div>
      <div className="content-grid overview-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>Quick actions</h2><p>Keep your team records up to date.</p></div></div>
          <div className="quick-actions">
            <button onClick={() => setActive("attendance")} className="quick-card quick-green"><div className="quick-icon"><ClipboardCheck size={22} /></div><b>Present</b><span>Mark today&apos;s attendance</span><ChevronRight size={17} /></button>
            <button onClick={() => setActive("funds")} className="quick-card quick-blue"><div className="quick-icon"><WalletCards size={22} /></div><b>Fund</b><span>Record a contribution</span><ChevronRight size={17} /></button>
          </div>
        </section>
        <section className="panel match-panel">
          <div className="panel-heading"><div><h2>Next match</h2><p>Set your next fixture manually.</p></div><span className={`pill ${match ? "pill-green" : ""}`}>{match ? "SCHEDULED" : "NOT SET"}</span></div>
          {match && <div className="match-preview"><div className="match-date">{formatDate(match.date)} · {match.time}</div><div className="match-teams"><div><div className="team-badge">S</div><b>SDFC</b></div><span>VS</span><div><div className="team-badge opponent">FC</div><b>{match.opponent}</b></div></div></div>}
          <form className="match-form" onSubmit={submitMatch}><label>Opponent team<input required value={matchForm.opponent} onChange={(event) => setMatchForm({ ...matchForm, opponent: event.target.value })} placeholder="Enter opponent name" /></label><label>Match date<input required type="date" value={matchForm.date} onChange={(event) => setMatchForm({ ...matchForm, date: event.target.value })} /></label><label>Match time<input required type="time" value={matchForm.time} onChange={(event) => setMatchForm({ ...matchForm, time: event.target.value })} /></label><button className="primary-button" type="submit"><Check size={16} /> {match ? "Update match" : "Save match"}</button></form>
        </section>
      </div>
      <section className="panel announcement-panel">
        <div className="panel-heading"><div><h2><Megaphone size={17} /> Announcements</h2><p>Publish updates for the whole team.</p></div><span className="pill">{announcements.length} published</span></div>
        <form className="announcement-form" onSubmit={submitAnnouncement}><input required value={announcementForm.text} onChange={(event) => setAnnouncementForm({ ...announcementForm, text: event.target.value })} placeholder="Write a team announcement..." /><select value={announcementForm.cadence} onChange={(event) => setAnnouncementForm({ ...announcementForm, cadence: event.target.value })}><option>Daily</option><option>Weekly</option><option>Anytime</option></select><button className="primary-button" type="submit"><Megaphone size={16} /> Publish</button></form>
        {announcements.length === 0 ? <div className="empty-state compact-empty"><Megaphone size={22} /><b>No announcements yet</b><span>Publish an update above to show it here.</span></div> : <div className="announcement-list">{announcements.map((announcement) => <div className="announcement-item" key={announcement.id}><Megaphone size={17} /><div><b>{announcement.text}</b><span>{announcement.cadence} · {formatDate(announcement.createdAt.slice(0, 10))}</span></div></div>)}</div>}
      </section>
      <section className="panel member-panel">
        <div className="panel-heading"><div><h2>Add new player / member</h2><p>Add a squad member to start tracking attendance and contributions.</p></div><span className="pill">{members.length} active</span></div>
        <form className="member-form" onSubmit={submitMember}>
          <label>Player name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Enter full name" /></label>
          <label>Position / detail<input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} placeholder="e.g. Midfielder" /></label>
          <button className="primary-button" type="submit"><Plus size={17} /> Add member</button>
        </form>
        {members.length === 0 ? <div className="empty-state compact-empty"><UserRound size={22} /><b>Your squad is empty</b><span>Add your first player above.</span></div> : <div className="member-chips">{members.map((member) => <div className="member-chip" key={member.id}><div className="avatar avatar-green">{member.initials}</div><div><b>{member.name}</b><span>{member.position || "Squad member"}</span></div></div>)}</div>}
      </section>
    </>
  );
}

function StatCard({ icon: Icon, label, value, detail, accent }) {
  return <div className={`stat-card accent-${accent}`}><div className="stat-top"><div className="stat-icon"><Icon size={19} /></div><span className="stat-menu">•••</span></div><span className="stat-label">{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Attendance({ members, attendance, selectedDate, setSelectedDate, toggleAttendance, onExport }) {
  const [month, setMonth] = useState(new Date(`${selectedDate}T00:00:00`));
  const calendar = useMemo(() => buildCalendar(month), [month]);
  const present = members.filter((player) => attendance[selectedDate]?.[player.id] === "present").length;
  const marked = members.filter((player) => attendance[selectedDate]?.[player.id]).length;
  return (
    <>
      <PageHeading eyebrow="ATTENDANCE TRACKER" title="Present" description="Keep your squad attendance organized, one matchday at a time." action={<button className="secondary-button" onClick={onExport}><Download size={17} /> Export report</button>} />
      <div className="attendance-layout">
        <section className="panel calendar-panel">
          <div className="panel-heading"><div><h2>Choose a date</h2><p>Tap a date to view or update attendance.</p></div><div className="calendar-nav"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={17} /></button><b>{month.toLocaleDateString("en", { month: "long", year: "numeric" })}</b><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={17} /></button></div></div>
          <div className="weekdays">{["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">{calendar.map((day, index) => <button key={`${day.date}-${index}`} disabled={!day.current} className={`calendar-day ${!day.current ? "muted-day" : ""} ${day.date === selectedDate ? "selected-day" : ""}`} onClick={() => day.current && setSelectedDate(day.date)}><span>{day.number}</span>{day.current && attendance[day.date] && <i className={Object.values(attendance[day.date]).includes("present") ? "has-present" : "has-marked"}></i>}</button>)}</div>
          <div className="calendar-legend"><span><i className="legend-dot present-dot"></i>Attendance marked</span><span><i className="legend-dot selected-dot"></i>Selected date</span></div>
        </section>
        <section className="panel attendance-summary">
          <div className="summary-date"><div className="date-icon"><CalendarDays size={19} /></div><div><span>{formatDate(selectedDate)}</span><b>Daily attendance</b></div></div>
          <div className="attendance-score"><div className="score-ring" style={{ "--progress": `${members.length ? (present / members.length) * 360 : 0}deg` }}><div><strong>{present}</strong><span>present</span></div></div><div><b>{members.length && marked === members.length ? "All players marked" : `${members.length - marked} players unmarked`}</b><span>out of {members.length} squad members</span></div></div>
          <div className="summary-bar"><span style={{ width: `${members.length ? (present / members.length) * 100 : 0}%` }}></span></div>
          <div className="summary-stats"><div><b>{present}</b><span>Present</span></div><div><b>{members.length - present}</b><span>Absent / pending</span></div><div><b>{marked}</b><span>Marked</span></div></div>
        </section>
      </div>
      <section className="panel player-panel"><div className="panel-heading"><div><h2>Mukammal Squad Attendance</h2><p>{formatDate(selectedDate)} · Update each player&apos;s status below.</p></div><span className="pill">{marked} of {members.length} marked</span></div><div className="player-list">{members.length === 0 ? <div className="empty-state compact-empty"><Users size={22} /><b>No squad members yet</b><span>Add players from the Overview page first.</span></div> : members.map((player) => { const status = attendance[selectedDate]?.[player.id]; return <div className="player-row" key={player.id}><div className={`avatar ${status === "present" ? "avatar-green" : "avatar-dark"}`}>{player.initials}</div><div className="player-name"><b>{player.name}</b><span>{player.position || "Squad member"}</span></div><div className="attendance-buttons"><button className={status === "present" ? "status-present" : ""} onClick={() => toggleAttendance(player.id, "present")}><Check size={16} /> Present</button><button className={status === "absent" ? "status-absent" : ""} onClick={() => toggleAttendance(player.id, "absent")}><X size={16} /> Absent</button></div></div>; })}</div></section>
    </>
  );
}

function buildCalendar(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const previousDays = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
  return Array.from({ length: 42 }, (_, index) => { const number = index - first.getDay() + 1; const current = number > 0 && number <= days; const dateObj = current ? new Date(month.getFullYear(), month.getMonth(), number) : new Date(month.getFullYear(), month.getMonth(), number <= 0 ? 0 + number : days + (number - days)); return { number: current ? number : number <= 0 ? previousDays + number : number - days, current, date: dateObj.toISOString().slice(0, 10) }; });
}

function Funds({ members, funds, setFunds, totalCollected, onExport }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ player: "", amount: "", date: today(), status: "Paid", note: "" });
  const filtered = useMemo(() => [...funds].filter((fund) => `${fund.player} ${fund.note} ${fund.status}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "amount" ? b.amount - a.amount : sort === "player" ? a.player.localeCompare(b.player) : new Date(b.date) - new Date(a.date)), [funds, search, sort]);
  const submit = (event) => { event.preventDefault(); if (!form.player || !form.amount) return; setFunds((current) => [{ ...form, id: Date.now(), amount: Number(form.amount) }, ...current]); setForm({ player: "", amount: "", date: today(), status: "Paid", note: "" }); setShowForm(false); };
  return (
    <>
      <PageHeading eyebrow="FUND COLLECTION" title="Fund" description="A transparent, simple way to manage the team fund." action={<div className="heading-actions"><button className="secondary-button" onClick={onExport}><Download size={17} /> Export report</button><button className="primary-button" onClick={() => setShowForm(!showForm)}><Plus size={17} /> Add contribution</button></div>} />
      <div className="fund-hero"><div className="fund-hero-copy"><div className="fund-icon"><CircleDollarSign size={25} /></div><div><span>Total collected</span><strong>{money(totalCollected)}</strong><small><TrendingUp size={13} /> Team fund is growing steadily</small></div></div><div className="fund-progress"><div className="progress-label"><span>Monthly target</span><b>{Math.min(100, Math.round((totalCollected / 20000) * 100))}%</b></div><div className="progress-track"><span style={{ width: `${Math.min(100, (totalCollected / 20000) * 100)}%` }}></span></div><small>{money(Math.max(0, 20000 - totalCollected))} remaining to reach target</small></div></div>
      {showForm && <section className="panel form-panel"><div className="panel-heading"><div><h2>New contribution</h2><p>Record a payment in the team ledger.</p></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></div><form className="fund-form" onSubmit={submit}><label>Player name<select required value={form.player} onChange={(e) => setForm({ ...form, player: e.target.value })}><option value="">Select player</option>{members.map((player) => <option value={player.name} key={player.id}>{player.name}</option>)}</select></label><label>Amount (PKR)<input required type="number" min="1" placeholder="e.g. 1500" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label><label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Payment status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Paid</option><option>Pending</option></select></label><label className="wide-field">Note (optional)<input placeholder="Add a note..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label><button className="primary-button submit-fund" type="submit" disabled={!members.length}><Check size={17} /> Save contribution</button></form>{!members.length && <div className="form-hint">Add a squad member before recording a contribution.</div>}</section>}
      <section className="panel ledger-panel"><div className="panel-heading ledger-heading"><div><h2>Contribution ledger</h2><p>Every deposit, clearly accounted for.</p></div><div className="ledger-controls"><label className="search-box"><Search size={16} /><input placeholder="Search ledger..." value={search} onChange={(e) => setSearch(e.target.value)} /></label><button className="sort-button" onClick={() => setSort(sort === "date" ? "amount" : sort === "amount" ? "player" : "date")}><ArrowDownUp size={16} /> Sort</button></div></div><div className="table-wrap"><table><thead><tr><th>PLAYER</th><th>AMOUNT</th><th>DATE</th><th>STATUS</th><th>NOTE</th></tr></thead><tbody>{filtered.map((fund) => <tr key={fund.id}><td><div className="table-player"><div className="avatar avatar-dark">{fund.player.split(" ").map((word) => word[0]).join("").slice(0, 2)}</div><b>{fund.player}</b></div></td><td><strong>{money(fund.amount)}</strong></td><td>{formatDate(fund.date)}</td><td><span className={`pill ${fund.status === "Paid" ? "pill-green" : "pill-yellow"}`}>{fund.status === "Paid" ? <Check size={12} /> : <Clock3 size={12} />} {fund.status}</span></td><td className="note-cell">{fund.note || "—"}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><Search size={22} /><b>No contributions found</b><span>Try a different search term.</span></div>}</div><div className="ledger-footer"><span>Showing {filtered.length} of {funds.length} contributions</span><b>Paid total: {money(totalCollected)}</b></div></section>
    </>
  );
}

export default App;
