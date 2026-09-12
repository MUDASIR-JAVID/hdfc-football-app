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
  Plus,
  Search,
  Shield,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";

const PLAYERS = [
  { id: "p1", name: "Mudasir Javid", initials: "MJ", position: "Captain" },
  { id: "p2", name: "Ahsan Khan", initials: "AK", position: "Forward" },
  { id: "p3", name: "Hamza Ali", initials: "HA", position: "Midfielder" },
  { id: "p4", name: "Usman Tariq", initials: "UT", position: "Defender" },
  { id: "p5", name: "Bilal Ahmed", initials: "BA", position: "Goalkeeper" },
  { id: "p6", name: "Saad Raza", initials: "SR", position: "Midfielder" },
  { id: "p7", name: "Zain Shah", initials: "ZS", position: "Forward" },
  { id: "p8", name: "Haris Iqbal", initials: "HI", position: "Defender" },
];

const seedFunds = [
  { id: 1, player: "Mudasir Javid", amount: 2500, date: "2025-01-08", status: "Paid", note: "January fund" },
  { id: 2, player: "Ahsan Khan", amount: 1500, date: "2025-01-07", status: "Paid", note: "Monthly contribution" },
  { id: 3, player: "Hamza Ali", amount: 1500, date: "2025-01-06", status: "Paid", note: "Monthly contribution" },
  { id: 4, player: "Usman Tariq", amount: 1000, date: "2025-01-05", status: "Pending", note: "Will pay this week" },
];

const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => `Rs. ${Number(value).toLocaleString("en-PK")}`;
const formatDate = (date) =>
  new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${date}T00:00:00`),
  );

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
  const [attendance, setAttendance] = useStoredState("sdfc-attendance", {});
  const [funds, setFunds] = useStoredState("sdfc-funds", seedFunds);
  const [selectedDate, setSelectedDate] = useState(today());

  const present = PLAYERS.filter((player) => attendance[selectedDate]?.[player.id] === "present").length;
  const totalCollected = funds.filter((fund) => fund.status === "Paid").reduce((sum, fund) => sum + Number(fund.amount), 0);

  const toggleAttendance = (playerId, status) => {
    setAttendance((current) => ({
      ...current,
      [selectedDate]: { ...(current[selectedDate] || {}), [playerId]: status },
    }));
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "attendance", label: "Present Laga Sakein", icon: ClipboardCheck },
    { id: "funds", label: "Fund Jama Karaye", icon: WalletCards },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Shield size={22} fill="currentColor" /></div>
          <div><strong>SDFC</strong><span>Football Club</span></div>
        </div>
        <div className="club-card">
          <div className="club-ball"><Trophy size={18} /></div>
          <div><b>Season 2025</b><span>United by the game</span></div>
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
          <div className="profile-mini"><div className="avatar avatar-green">MJ</div><div><b>Mudasir Javid</b><span>Team admin</span></div></div>
          <div className="developer">Crafted with <span>♥</span> by <b>Mudasir</b></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Team workspace</span><ChevronRight size={14} /><b>{navItems.find((item) => item.id === active)?.label}</b></div>
          <div className="top-actions"><span className="live-dot"></span><span className="live-text">Data saved locally</span><div className="top-avatar">MJ</div></div>
        </header>

        <div className="page-wrap">
          {active === "overview" && <Overview present={present} totalCollected={totalCollected} setActive={setActive} />}
          {active === "attendance" && <Attendance attendance={attendance} selectedDate={selectedDate} setSelectedDate={setSelectedDate} toggleAttendance={toggleAttendance} />}
          {active === "funds" && <Funds funds={funds} setFunds={setFunds} totalCollected={totalCollected} />}
        </div>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Overview({ present, totalCollected, setActive }) {
  return (
    <>
      <PageHeading eyebrow="SATURDAY, 11 JANUARY 2025" title="Good evening, Mudasir 👋" description="Here is what is happening with SDFC today." action={<button className="primary-button" onClick={() => setActive("attendance")}><Plus size={17} /> Mark attendance</button>} />
      <div className="stat-grid">
        <StatCard icon={ClipboardCheck} label="Today's attendance" value={`${present}/${PLAYERS.length}`} detail={present ? `${Math.round((present / PLAYERS.length) * 100)}% of team present` : "No attendance marked yet"} accent="green" />
        <StatCard icon={CircleDollarSign} label="Total fund collected" value={money(totalCollected)} detail="+12.5% from last month" accent="blue" />
        <StatCard icon={Users} label="Active players" value={PLAYERS.length} detail="All squad members" accent="purple" />
        <StatCard icon={TrendingUp} label="Team attendance" value="87%" detail="Last 30 days average" accent="orange" />
      </div>
      <div className="content-grid overview-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>Quick actions</h2><p>Keep your team records up to date.</p></div></div>
          <div className="quick-actions">
            <button onClick={() => setActive("attendance")} className="quick-card quick-green"><div className="quick-icon"><ClipboardCheck size={22} /></div><b>Present Laga Sakein</b><span>Mark today&apos;s attendance</span><ChevronRight size={17} /></button>
            <button onClick={() => setActive("funds")} className="quick-card quick-blue"><div className="quick-icon"><WalletCards size={22} /></div><b>Fund Jama Karaye</b><span>Record a contribution</span><ChevronRight size={17} /></button>
          </div>
        </section>
        <section className="panel match-panel">
          <div className="panel-heading"><div><h2>Next match</h2><p>Friendly fixture</p></div><span className="pill pill-green">UPCOMING</span></div>
          <div className="match-date">SUN <strong>19</strong> JAN</div>
          <div className="match-teams"><div><div className="team-badge">S</div><b>SDFC</b></div><span>VS</span><div><div className="team-badge opponent">FC</div><b>Falcons FC</b></div></div>
          <div className="match-location"><CalendarDays size={15} /> Model Town Ground <span>•</span> 5:00 PM</div>
        </section>
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, detail, accent }) {
  return <div className={`stat-card accent-${accent}`}><div className="stat-top"><div className="stat-icon"><Icon size={19} /></div><span className="stat-menu">•••</span></div><span className="stat-label">{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Attendance({ attendance, selectedDate, setSelectedDate, toggleAttendance }) {
  const [month, setMonth] = useState(new Date(`${selectedDate}T00:00:00`));
  const calendar = useMemo(() => buildCalendar(month), [month]);
  const present = PLAYERS.filter((player) => attendance[selectedDate]?.[player.id] === "present").length;
  const marked = PLAYERS.filter((player) => attendance[selectedDate]?.[player.id]).length;
  return (
    <>
      <PageHeading eyebrow="ATTENDANCE TRACKER" title="Present Laga Sakein" description="Keep your squad attendance organized, one matchday at a time." action={<button className="secondary-button"><Download size={17} /> Export report</button>} />
      <div className="attendance-layout">
        <section className="panel calendar-panel">
          <div className="panel-heading"><div><h2>Choose a date</h2><p>Tap a date to view or update attendance.</p></div><div className="calendar-nav"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={17} /></button><b>{month.toLocaleDateString("en", { month: "long", year: "numeric" })}</b><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={17} /></button></div></div>
          <div className="weekdays">{["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">{calendar.map((day, index) => <button key={`${day.date}-${index}`} disabled={!day.current} className={`calendar-day ${!day.current ? "muted-day" : ""} ${day.date === selectedDate ? "selected-day" : ""}`} onClick={() => day.current && setSelectedDate(day.date)}><span>{day.number}</span>{day.current && attendance[day.date] && <i className={Object.values(attendance[day.date]).includes("present") ? "has-present" : "has-marked"}></i>}</button>)}</div>
          <div className="calendar-legend"><span><i className="legend-dot present-dot"></i>Attendance marked</span><span><i className="legend-dot selected-dot"></i>Selected date</span></div>
        </section>
        <section className="panel attendance-summary">
          <div className="summary-date"><div className="date-icon"><CalendarDays size={19} /></div><div><span>{formatDate(selectedDate)}</span><b>Daily attendance</b></div></div>
          <div className="attendance-score"><div className="score-ring" style={{ "--progress": `${(present / PLAYERS.length) * 360}deg` }}><div><strong>{present}</strong><span>present</span></div></div><div><b>{marked === PLAYERS.length ? "All players marked" : `${PLAYERS.length - marked} players unmarked`}</b><span>out of {PLAYERS.length} squad members</span></div></div>
          <div className="summary-bar"><span style={{ width: `${(present / PLAYERS.length) * 100}%` }}></span></div>
          <div className="summary-stats"><div><b>{present}</b><span>Present</span></div><div><b>{PLAYERS.length - present}</b><span>Absent / pending</span></div><div><b>{marked}</b><span>Marked</span></div></div>
        </section>
      </div>
      <section className="panel player-panel"><div className="panel-heading"><div><h2>Squad attendance</h2><p>{formatDate(selectedDate)} · Update each player&apos;s status below.</p></div><span className="pill">{marked} of {PLAYERS.length} marked</span></div><div className="player-list">{PLAYERS.map((player) => { const status = attendance[selectedDate]?.[player.id]; return <div className="player-row" key={player.id}><div className={`avatar ${status === "present" ? "avatar-green" : "avatar-dark"}`}>{player.initials}</div><div className="player-name"><b>{player.name}</b><span>{player.position}</span></div><div className="attendance-buttons"><button className={status === "present" ? "status-present" : ""} onClick={() => toggleAttendance(player.id, "present")}><Check size={16} /> Present</button><button className={status === "absent" ? "status-absent" : ""} onClick={() => toggleAttendance(player.id, "absent")}><X size={16} /> Absent</button></div></div>; })}</div></section>
    </>
  );
}

function buildCalendar(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const previousDays = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
  return Array.from({ length: 42 }, (_, index) => { const number = index - first.getDay() + 1; const current = number > 0 && number <= days; const dateObj = current ? new Date(month.getFullYear(), month.getMonth(), number) : new Date(month.getFullYear(), month.getMonth(), number <= 0 ? 0 + number : days + (number - days)); return { number: current ? number : number <= 0 ? previousDays + number : number - days, current, date: dateObj.toISOString().slice(0, 10) }; });
}

function Funds({ funds, setFunds, totalCollected }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ player: "", amount: "", date: today(), status: "Paid", note: "" });
  const filtered = useMemo(() => [...funds].filter((fund) => `${fund.player} ${fund.note} ${fund.status}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "amount" ? b.amount - a.amount : sort === "player" ? a.player.localeCompare(b.player) : new Date(b.date) - new Date(a.date)), [funds, search, sort]);
  const submit = (event) => { event.preventDefault(); if (!form.player || !form.amount) return; setFunds((current) => [{ ...form, id: Date.now(), amount: Number(form.amount) }, ...current]); setForm({ player: "", amount: "", date: today(), status: "Paid", note: "" }); setShowForm(false); };
  return (
    <>
      <PageHeading eyebrow="FUND COLLECTION" title="Fund Jama Karaye" description="A transparent, simple way to manage the team fund." action={<button className="primary-button" onClick={() => setShowForm(!showForm)}><Plus size={17} /> Add contribution</button>} />
      <div className="fund-hero"><div className="fund-hero-copy"><div className="fund-icon"><CircleDollarSign size={25} /></div><div><span>Total collected</span><strong>{money(totalCollected)}</strong><small><TrendingUp size={13} /> Team fund is growing steadily</small></div></div><div className="fund-progress"><div className="progress-label"><span>Monthly target</span><b>{Math.min(100, Math.round((totalCollected / 20000) * 100))}%</b></div><div className="progress-track"><span style={{ width: `${Math.min(100, (totalCollected / 20000) * 100)}%` }}></span></div><small>{money(Math.max(0, 20000 - totalCollected))} remaining to reach target</small></div></div>
      {showForm && <section className="panel form-panel"><div className="panel-heading"><div><h2>New contribution</h2><p>Record a payment in the team ledger.</p></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></div><form className="fund-form" onSubmit={submit}><label>Player name<select value={form.player} onChange={(e) => setForm({ ...form, player: e.target.value })}><option value="">Select player</option>{PLAYERS.map((player) => <option value={player.name} key={player.id}>{player.name}</option>)}</select></label><label>Amount (PKR)<input type="number" min="1" placeholder="e.g. 1500" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label><label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Payment status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Paid</option><option>Pending</option></select></label><label className="wide-field">Note (optional)<input placeholder="Add a note..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label><button className="primary-button submit-fund" type="submit"><Check size={17} /> Save contribution</button></form></section>}
      <section className="panel ledger-panel"><div className="panel-heading ledger-heading"><div><h2>Contribution ledger</h2><p>Every deposit, clearly accounted for.</p></div><div className="ledger-controls"><label className="search-box"><Search size={16} /><input placeholder="Search ledger..." value={search} onChange={(e) => setSearch(e.target.value)} /></label><button className="sort-button" onClick={() => setSort(sort === "date" ? "amount" : sort === "amount" ? "player" : "date")}><ArrowDownUp size={16} /> Sort</button></div></div><div className="table-wrap"><table><thead><tr><th>PLAYER</th><th>AMOUNT</th><th>DATE</th><th>STATUS</th><th>NOTE</th></tr></thead><tbody>{filtered.map((fund) => <tr key={fund.id}><td><div className="table-player"><div className="avatar avatar-dark">{fund.player.split(" ").map((word) => word[0]).join("").slice(0, 2)}</div><b>{fund.player}</b></div></td><td><strong>{money(fund.amount)}</strong></td><td>{formatDate(fund.date)}</td><td><span className={`pill ${fund.status === "Paid" ? "pill-green" : "pill-yellow"}`}>{fund.status === "Paid" ? <Check size={12} /> : <Clock3 size={12} />} {fund.status}</span></td><td className="note-cell">{fund.note || "—"}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><Search size={22} /><b>No contributions found</b><span>Try a different search term.</span></div>}</div><div className="ledger-footer"><span>Showing {filtered.length} of {funds.length} contributions</span><b>Paid total: {money(totalCollected)}</b></div></section>
    </>
  );
}

export default App;
