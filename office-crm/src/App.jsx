import React, { useState, useEffect, useMemo, useCallback } from "react";
import { fetchPublicAdvisors, loadDataWithCreds, saveDataWithCreds } from "./storageAdapter";

/* ---------------------------------- ثابت‌ها ---------------------------------- */

const PROPERTY_STATUSES = ["فعال", "در انتظار", "معامله شد", "منقضی", "بایگانی"];
const PROPERTY_TYPES = ["آپارتمان", "ویلا", "زمین", "مغازه", "اداری", "سایر"];
const REQUEST_TYPES = ["خرید", "فروش", "رهن و اجاره", "اجاره", "رهن"];
const FOLLOWUP_TYPES = ["تماس", "واتساپ", "پیامک", "جلسه", "بازدید"];
const VISIT_RESULTS = ["مناسب بود", "نیاز به پیگیری", "رد شد", "منجر به مذاکره شد"];
const DEAL_STATUSES = ["در حال مذاکره", "پیش‌نویس", "قرارداد امضا شد", "فسخ شد"];
const DEAL_TYPES = ["فروش", "رهن و اجاره", "اجاره", "رهن"];
const PIPELINE_STAGES = ["مشتری جدید", "فایل معرفی شد", "بازدید", "مذاکره", "قرارداد", "معامله"];
const STORAGE_KEY = "real-estate-office-v1";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n) => (n ? Number(n).toLocaleString("fa-IR") : "۰");
const isOverdue = (dateStr, done) => dateStr && !done && dateStr < todayStr();
const isToday = (dateStr) => dateStr === todayStr();

function startOfWeek(d) {
  const dt = new Date(d);
  const day = dt.getDay(); // 0=Sunday
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function inRange(dateStr, range) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  if (range === "today") return dateStr === todayStr();
  if (range === "week") {
    const sw = startOfWeek(now);
    return d >= sw;
  }
  if (range === "month") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  return true; // 'all'
}

const emptyData = () => ({
  managerPassword: "1234",
  advisors: [],
  properties: [],
  customers: [],
  followups: [],
  visits: [],
  deals: [],
  goals: [],
  dailyPlans: [],
  dailyReports: [],
  weeklyReviews: [],
  issues: [],
});

/* ---------------------------------- استایل ---------------------------------- */

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap');
    :root{
      --ink:#1B2A45; --ink-2:#33455F;
      --paper:#F6F2E9; --paper-2:#FFFFFF;
      --line:#D9D0BC;
      --copper:#AD6A38; --copper-dark:#8C5329;
      --sage:#5E7A63; --sage-bg:#E7EEE5;
      --danger:#A8402F; --danger-bg:#F6E3DE;
      --gold:#C69A45;
      --radius:10px;
    }
    * { box-sizing: border-box; }
    .office-root{
      font-family:'Vazirmatn', sans-serif; direction:rtl; background:var(--paper);
      color:var(--ink); min-height:600px; width:100%; position:relative;
      line-height:1.7; font-size:14px;
    }
    .office-root h1,.office-root h2,.office-root h3{ font-weight:800; margin:0; }
    .office-shell{ display:flex; flex-direction:column; min-height:600px; }
    .topbar{
      display:flex; align-items:center; justify-content:space-between;
      padding:14px 18px; background:var(--ink); color:var(--paper-2);
      border-bottom:3px solid var(--copper);
    }
    .topbar .brand{ display:flex; align-items:center; gap:10px; }
    .topbar .brand .mark{ width:30px; height:30px; border:2px solid var(--gold); border-radius:6px;
      display:flex; align-items:center; justify-content:center; font-weight:800; color:var(--gold); }
    .topbar .who{ font-size:12.5px; opacity:.85; }
    .topbar button{ background:transparent; border:1px solid rgba(255,255,255,.35); color:var(--paper-2);
      padding:6px 12px; border-radius:8px; cursor:pointer; font-family:inherit; font-size:12.5px; }
    .topbar button:hover{ background:rgba(255,255,255,.1); }

    .body-area{ display:flex; flex:1; min-height:0; }
    .sidebar{ display:none; }
    .content{ flex:1; padding:16px; padding-bottom:78px; overflow-y:auto; }

    @media (min-width: 860px){
      .content{ padding:24px; padding-bottom:24px; }
      .sidebar{
        display:flex; flex-direction:column; width:210px; background:var(--paper-2);
        border-left:1px solid var(--line); padding:14px 10px; gap:2px;
      }
      .bottomnav{ display:none !important; }
    }

    .navbtn{
      display:flex; align-items:center; gap:9px; padding:10px 12px; border-radius:8px;
      cursor:pointer; color:var(--ink-2); font-size:13.5px; font-weight:600; border:none; background:none;
      font-family:inherit; text-align:right; width:100%;
    }
    .navbtn.active{ background:var(--ink); color:#fff; }
    .navbtn:not(.active):hover{ background:var(--sage-bg); }

    .bottomnav{
      position:fixed; bottom:0; right:0; left:0; display:flex; background:var(--paper-2);
      border-top:1px solid var(--line); z-index:20; overflow-x:auto;
    }
    .bottomnav .navbtn{ flex-direction:column; font-size:10.5px; gap:3px; padding:8px 6px; border-radius:0; flex:1; min-width:64px; }
    .bottomnav .navbtn.active{ background:var(--sage-bg); color:var(--ink); border-top:3px solid var(--copper); }

    .grid-cards{ display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
    @media (min-width:700px){ .grid-cards{ grid-template-columns:repeat(4,1fr); } }
    .kpi{ background:var(--paper-2); border:1px solid var(--line); border-radius:var(--radius); padding:14px; }
    .kpi .num{ font-size:24px; font-weight:800; color:var(--ink); }
    .kpi .lbl{ font-size:12px; color:var(--ink-2); margin-top:4px; }

    .card{ background:var(--paper-2); border:1px solid var(--line); border-radius:var(--radius); padding:16px; margin-bottom:14px; }
    .card h2{ font-size:16px; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--line); }
    .card h3{ font-size:14px; margin-bottom:8px; }

    table{ width:100%; border-collapse:collapse; font-size:12.5px; }
    th,td{ padding:8px 6px; text-align:right; border-bottom:1px solid var(--line); }
    th{ color:var(--ink-2); font-weight:700; font-size:11.5px; }
    tr:hover td{ background:#FBF9F3; }

    .badge{ display:inline-block; padding:2px 9px; border-radius:20px; font-size:11px; font-weight:700; }
    .badge.active{ background:var(--sage-bg); color:var(--sage); }
    .badge.warn{ background:#FBEEDB; color:var(--copper-dark); }
    .badge.danger{ background:var(--danger-bg); color:var(--danger); }
    .badge.neutral{ background:#EDEAE0; color:var(--ink-2); }

    input,select,textarea{
      font-family:inherit; padding:8px 10px; border:1px solid var(--line); border-radius:7px;
      background:#fff; font-size:13px; width:100%; color:var(--ink);
    }
    label{ font-size:12px; color:var(--ink-2); display:block; margin-bottom:3px; font-weight:600; }
    .field{ margin-bottom:10px; }
    .form-grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    @media (max-width:520px){ .form-grid{ grid-template-columns:1fr; } }

    .btn{ padding:9px 16px; border-radius:8px; border:none; cursor:pointer; font-family:inherit; font-weight:700; font-size:13px; }
    .btn-primary{ background:var(--copper); color:#fff; }
    .btn-primary:hover{ background:var(--copper-dark); }
    .btn-ghost{ background:transparent; border:1px solid var(--line); color:var(--ink); }
    .btn-ghost:hover{ background:#F0ECE0; }
    .btn-sm{ padding:5px 10px; font-size:12px; }
    .btn-danger{ background:var(--danger-bg); color:var(--danger); border:none; }

    .row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .between{ display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; }
    .muted{ color:var(--ink-2); font-size:12px; }
    .progress-bar{ height:8px; background:#EDEAE0; border-radius:6px; overflow:hidden; }
    .progress-bar > div{ height:100%; background:var(--copper); }
    .login-wrap{ display:flex; align-items:center; justify-content:center; min-height:520px; padding:20px; }
    .login-card{ background:var(--paper-2); border:1px solid var(--line); border-radius:14px; padding:28px; max-width:360px; width:100%; text-align:center; }
    .login-card .mark{ width:56px; height:56px; margin:0 auto 14px; border:2px solid var(--gold); border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:800; color:var(--copper); font-size:22px; }
    .user-choice{ display:block; width:100%; text-align:right; padding:12px 14px; margin-bottom:8px; border-radius:9px; border:1px solid var(--line); background:#fff; cursor:pointer; font-family:inherit; font-size:13.5px; font-weight:600; color:var(--ink); }
    .user-choice:hover{ border-color:var(--copper); background:#FBF6EE; }
    .empty-hint{ text-align:center; padding:26px 10px; color:var(--ink-2); font-size:13px; }
    .link-tag{ background:var(--sage-bg); color:var(--sage); padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; }
  `}</style>
);

/* ---------------------------------- کمکی‌ها ---------------------------------- */

function StatusBadge({ status }) {
  const map = {
    فعال: "active", "در انتظار": "warn", "معامله شد": "active",
    منقضی: "danger", بایگانی: "neutral",
    "در حال مذاکره": "warn", "پیش‌نویس": "neutral", "قرارداد امضا شد": "active", "فسخ شد": "danger",
  };
  return <span className={`badge ${map[status] || "neutral"}`}>{status}</span>;
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(27,42,69,.55)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px", overflowY: "auto" }}>
      <div className="card" style={{ maxWidth: wide ? 640 : 480, width: "100%", marginTop: 20, marginBottom: 20 }}>
        <div className="between" style={{ marginBottom: 10 }}>
          <h2 style={{ border: "none", padding: 0, margin: 0 }}>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>بستن ✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------- اپ اصلی ---------------------------------- */

export default function App() {
  const [advisorsList, setAdvisorsList] = useState(null); // for login screen buttons
  const [advisorsLoadErr, setAdvisorsLoadErr] = useState(null);
  const [creds, setCreds] = useState(null); // {role, id?, password}
  const [currentUser, setCurrentUser] = useState(null); // {id, name, role}
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("today");
  const [saveErr, setSaveErr] = useState(false);

  useEffect(() => {
    fetchPublicAdvisors()
      .then(setAdvisorsList)
      .catch((e) => setAdvisorsLoadErr(e?.message || String(e)));
  }, []);

  const handleLogin = useCallback(async (loginCreds, userInfo) => {
    const d = await loadDataWithCreds(loginCreds); // throws on wrong password / server error
    setData(d);
    setCreds(loginCreds);
    setCurrentUser(userInfo);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setData(null);
    setCreds(null);
  }, []);

  const persist = useCallback(async (next) => {
    setData(next);
    try {
      await saveDataWithCreds(creds, next);
      setSaveErr(false);
    } catch {
      setSaveErr(true);
    }
  }, [creds]);

  // وقتی مدیر رمز خودش را عوض می‌کند، باید نشست فعلی هم به‌روزرسانی شود
  // وگرنه درخواست‌های بعدی با رمز قدیمی رد می‌شوند.
  const updateOwnPassword = useCallback((newPassword) => {
    setCreds((c) => (c ? { ...c, password: newPassword } : c));
  }, []);

  if (!currentUser) {
    return (
      <div className="office-root">
        <GlobalStyle />
        <LoginScreen advisorsList={advisorsList} advisorsLoadErr={advisorsLoadErr} onLogin={handleLogin} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="office-root">
        <GlobalStyle />
        <div className="empty-hint">در حال بارگذاری…</div>
      </div>
    );
  }

  return (
    <MainShell
      data={data}
      persist={persist}
      currentUser={currentUser}
      setCurrentUser={logout}
      tab={tab}
      setTab={setTab}
      saveErr={saveErr}
      updateOwnPassword={updateOwnPassword}
    />
  );
}

function LoginScreen({ advisorsList, advisorsLoadErr, onLogin }) {
  const [selected, setSelected] = useState(null); // {id, name, role}
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const choose = (u) => { setSelected(u); setPass(""); setErr(""); };

  const submit = async () => {
    setBusy(true);
    setErr("");
    const creds = selected.role === "manager"
      ? { role: "manager", password: pass }
      : { role: "advisor", id: selected.id, password: pass };
    try {
      await onLogin(creds, selected);
    } catch (e) {
      setErr(e?.message || "خطا در ورود.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="mark">ملک</div>
        <h1 style={{ fontSize: 18, marginBottom: 4 }}>دفتر املاک</h1>

        {!selected && (
          <>
            <p className="muted" style={{ marginBottom: 18 }}>شما چه کسی هستید؟</p>
            <button className="user-choice" onClick={() => choose({ id: "manager", name: "مدیر دفتر", role: "manager" })}>👤 مدیر دفتر</button>
            {advisorsList === null && !advisorsLoadErr && <p className="muted" style={{ marginTop: 8, fontSize: 11.5 }}>در حال بارگذاری لیست مشاوران…</p>}
            {advisorsLoadErr && <p className="muted" style={{ marginTop: 8, fontSize: 11.5, color: "var(--danger)" }}>{advisorsLoadErr}</p>}
            {advisorsList && advisorsList.map((a) => (
              <button key={a.id} className="user-choice" onClick={() => choose({ id: a.id, name: a.name, role: "advisor" })}>🧑‍💼 {a.name}</button>
            ))}
            {advisorsList && advisorsList.length === 0 && (
              <p className="muted" style={{ marginTop: 8, fontSize: 11.5 }}>
                هنوز مشاوری تعریف نشده. مدیر باید ابتدا وارد شود و از بخش «مشاوران» آن‌ها را با نام و رمز عبور اضافه کند.
              </p>
            )}
          </>
        )}

        {selected && (
          <>
            <p className="muted" style={{ marginBottom: 12 }}>رمز عبور {selected.name} را وارد کنید</p>
            <div className="field" style={{ textAlign: "right" }}>
              <input
                type="password"
                autoFocus
                value={pass}
                onChange={(e) => { setPass(e.target.value); setErr(""); }}
                onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
                placeholder="رمز عبور"
              />
            </div>
            {err && <div className="muted" style={{ color: "var(--danger)", marginBottom: 8 }}>{err}</div>}
            <div className="row" style={{ justifyContent: "center", marginTop: 6 }}>
              <button className="btn btn-ghost" onClick={() => setSelected(null)} disabled={busy}>بازگشت</button>
              <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "..." : "ورود"}</button>
            </div>
          </>
        )}

        <p className="muted" style={{ marginTop: 14, fontSize: 11 }}>
          رمزهای عبور توسط مدیر تعریف و مدیریت می‌شوند.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------- پوسته اصلی ---------------------------------- */

function MainShell({ data, persist, currentUser, setCurrentUser, tab, setTab, saveErr, updateOwnPassword }) {
  const isManager = currentUser.role === "manager";

  const advisorTabs = [
    { id: "today", label: "امروز من", icon: "🌅" },
    { id: "properties", label: "فایل‌ها", icon: "🏠" },
    { id: "customers", label: "مشتری‌ها", icon: "👥" },
    { id: "followups", label: "پیگیری‌ها", icon: "📞" },
    { id: "visits", label: "بازدیدها", icon: "🚪" },
    { id: "deals", label: "معاملات", icon: "🤝" },
    { id: "report", label: "گزارش روزانه", icon: "📝" },
  ];
  const managerTabs = [
    { id: "today", label: "امروز دفتر", icon: "🌅" },
    { id: "dashboard", label: "داشبورد", icon: "📊" },
    { id: "properties", label: "فایل‌ها", icon: "🏠" },
    { id: "customers", label: "مشتری‌ها", icon: "👥" },
    { id: "followups", label: "پیگیری‌ها", icon: "📞" },
    { id: "visits", label: "بازدیدها", icon: "🚪" },
    { id: "deals", label: "معاملات", icon: "🤝" },
    { id: "goals", label: "اهداف", icon: "🎯" },
    { id: "reviews", label: "ارزیابی هفتگی", icon: "⭐" },
    { id: "issues", label: "مشکلات", icon: "📓" },
    { id: "advisors", label: "مشاوران", icon: "🧑‍💼" },
  ];
  const tabs = isManager ? managerTabs : advisorTabs;

  const helpers = useDataHelpers(data);

  return (
    <div className="office-root">
      <GlobalStyle />
      <div className="office-shell">
        <div className="topbar">
          <div className="brand">
            <div className="mark">ملک</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>دفتر املاک</div>
              <div className="who">{currentUser.name} {isManager ? "" : "· مشاور"}{saveErr ? " · ⚠️ ذخیره‌سازی ناموفق" : ""}</div>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)}>خروج</button>
        </div>

        <div className="body-area">
          <div className="sidebar">
            {tabs.map((t) => (
              <button key={t.id} className={`navbtn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="content">
            {tab === "today" && !isManager && <AdvisorToday data={data} persist={persist} user={currentUser} helpers={helpers} />}
            {tab === "today" && isManager && <ManagerToday data={data} helpers={helpers} />}
            {tab === "dashboard" && isManager && <ManagerDashboard data={data} helpers={helpers} />}
            {tab === "properties" && <PropertiesTab data={data} persist={persist} user={currentUser} isManager={isManager} />}
            {tab === "customers" && <CustomersTab data={data} persist={persist} user={currentUser} isManager={isManager} />}
            {tab === "followups" && <FollowupsTab data={data} persist={persist} user={currentUser} isManager={isManager} />}
            {tab === "visits" && <VisitsTab data={data} persist={persist} user={currentUser} isManager={isManager} />}
            {tab === "deals" && <DealsTab data={data} persist={persist} user={currentUser} isManager={isManager} />}
            {tab === "report" && !isManager && <DailyReportTab data={data} persist={persist} user={currentUser} />}
            {tab === "goals" && isManager && <GoalsTab data={data} persist={persist} helpers={helpers} />}
            {tab === "reviews" && isManager && <ReviewsTab data={data} persist={persist} helpers={helpers} />}
            {tab === "issues" && isManager && <IssuesTab data={data} persist={persist} />}
            {tab === "advisors" && isManager && <AdvisorsTab data={data} persist={persist} updateOwnPassword={updateOwnPassword} />}
          </div>
        </div>

        <div className="bottomnav">
          {tabs.map((t) => (
            <button key={t.id} className={`navbtn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              <span style={{ fontSize: 16 }}>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- محاسبات مشترک ---------------------------------- */

function useDataHelpers(data) {
  return useMemo(() => {
    const advisorName = (id) => data.advisors.find((a) => a.id === id)?.name || "—";
    const propertyLabel = (id) => {
      const p = data.properties.find((x) => x.id === id);
      return p ? `${p.code || p.id.slice(0, 4)} · ${p.neighborhood || ""}` : "—";
    };
    const customerLabel = (id) => {
      const c = data.customers.find((x) => x.id === id);
      return c ? c.name : "—";
    };

    function statsFor(advisorId, range) {
      const inR = (d) => inRange(d, range);
      const properties = data.properties.filter((p) => p.advisorId === advisorId && inR(p.createdAt)).length;
      const customers = data.customers.filter((c) => c.advisorId === advisorId && inR(c.createdAt)).length;
      const followups = data.followups.filter((f) => f.advisorId === advisorId && inR(f.date)).length;
      const visits = data.visits.filter((v) => v.advisorId === advisorId && inR(v.date)).length;
      const negotiations = data.visits.filter((v) => v.advisorId === advisorId && inR(v.date) && v.result === "منجر به مذاکره شد").length
        + data.deals.filter((d) => d.advisorId === advisorId && inR(d.date) && d.status === "در حال مذاکره").length;
      const deals = data.deals.filter((d) => d.advisorId === advisorId && inR(d.date) && d.status !== "فسخ شد").length;
      const commission = data.deals.filter((d) => d.advisorId === advisorId && inR(d.date) && d.status !== "فسخ شد")
        .reduce((s, d) => s + (Number(d.officeCommission) || 0), 0);
      return { properties, customers, followups, visits, negotiations, deals, commission };
    }

    function conversionFor(advisorId, range) {
      const inR = (d) => inRange(d, range);
      const properties = data.properties.filter((p) => p.advisorId === advisorId && inR(p.createdAt)).length;
      const customers = data.customers.filter((c) => c.advisorId === advisorId && inR(c.createdAt)).length;
      const visits = data.visits.filter((v) => v.advisorId === advisorId && inR(v.date)).length;
      const negotiations = data.visits.filter((v) => v.advisorId === advisorId && inR(v.date) && v.result === "منجر به مذاکره شد").length;
      const deals = data.deals.filter((d) => d.advisorId === advisorId && inR(d.date) && d.status !== "فسخ شد").length;
      const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
      return {
        propertyToVisit: pct(visits, properties),
        customerToVisit: pct(visits, customers),
        visitToNegotiation: pct(negotiations, visits),
        negotiationToDeal: pct(deals, negotiations),
      };
    }

    const overdueFollowups = data.followups.filter((f) => isOverdue(f.nextDate, f.doneNext));
    const todayFollowups = data.followups.filter((f) => isToday(f.date));
    const todayVisits = data.visits.filter((v) => isToday((v.datetime || "").slice(0, 10)));

    return { advisorName, propertyLabel, customerLabel, statsFor, conversionFor, overdueFollowups, todayFollowups, todayVisits };
  }, [data]);
}

/* ---------------------------------- امروز من (مشاور) ---------------------------------- */

function AdvisorToday({ data, persist, user, helpers }) {
  const today = todayStr();
  const myFollowupsToday = data.followups.filter((f) => f.advisorId === user.id && f.date === today);
  const myOverdue = data.followups.filter((f) => f.advisorId === user.id && isOverdue(f.nextDate, f.doneNext));
  const myVisitsToday = data.visits.filter((v) => v.advisorId === user.id && (v.datetime || "").slice(0, 10) === today);
  const plan = data.dailyPlans.find((p) => p.advisorId === user.id && p.date === today) || { id: null, advisorId: user.id, date: today, tasks: [{ text: "", done: false }, { text: "", done: false }, { text: "", done: false }] };
  const [tasks, setTasks] = useState(plan.tasks);

  useEffect(() => { setTasks(plan.tasks); }, [plan.id]); // eslint-disable-line

  const savePlan = (newTasks) => {
    setTasks(newTasks);
    const others = data.dailyPlans.filter((p) => !(p.advisorId === user.id && p.date === today));
    persist({ ...data, dailyPlans: [...others, { id: plan.id || uid(), advisorId: user.id, date: today, tasks: newTasks }] });
  };

  const myCustomersNeedingAction = data.customers.filter((c) => c.advisorId === user.id && (isOverdue(c.nextFollowupDate, false) || c.stage === "بازدید" || c.stage === "مذاکره"));
  const newProperties = data.properties.filter((p) => isToday(p.createdAt)).slice(0, 8);

  return (
    <div>
      <h1 style={{ fontSize: 19, marginBottom: 14 }}>امروز من</h1>

      <div className="card">
        <h2>پیگیری‌های امروز ({myFollowupsToday.length}) {myOverdue.length > 0 && <span className="badge danger" style={{ marginRight: 8 }}>{myOverdue.length} عقب‌افتاده</span>}</h2>
        {myFollowupsToday.length === 0 && myOverdue.length === 0 && <div className="empty-hint">پیگیری‌ای برای امروز ثبت نشده.</div>}
        {[...myOverdue, ...myFollowupsToday].map((f) => (
          <div key={f.id} className="between" style={{ padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
            <div>
              <span className="link-tag">{f.type}</span> {f.relatedType === "property" ? helpers.propertyLabel(f.relatedId) : helpers.customerLabel(f.relatedId)}
              {isOverdue(f.nextDate, f.doneNext) && f.date !== today && <span className="badge danger" style={{ marginRight: 6 }}>عقب‌افتاده از {f.date}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>بازدیدهای امروز ({myVisitsToday.length})</h2>
        {myVisitsToday.length === 0 && <div className="empty-hint">بازدیدی برای امروز ثبت نشده.</div>}
        {myVisitsToday.map((v) => (
          <div key={v.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
            🕒 {(v.datetime || "").slice(11, 16) || "-"} — {helpers.propertyLabel(v.propertyId)} با {helpers.customerLabel(v.customerId)}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>کارهای امروز (حداکثر ۳)</h2>
        {tasks.map((t, i) => (
          <div key={i} className="row" style={{ marginBottom: 8 }}>
            <input type="checkbox" checked={t.done} style={{ width: 18 }} onChange={(e) => {
              const nt = [...tasks]; nt[i] = { ...nt[i], done: e.target.checked }; savePlan(nt);
            }} />
            <input placeholder={`کار ${i + 1}`} value={t.text} onChange={(e) => {
              const nt = [...tasks]; nt[i] = { ...nt[i], text: e.target.value }; setTasks(nt);
            }} onBlur={() => savePlan(tasks)} style={{ textDecoration: t.done ? "line-through" : "none" }} />
          </div>
        ))}
      </div>

      <div className="card">
        <h2>مشتری‌های مهم (نیازمند اقدام)</h2>
        {myCustomersNeedingAction.length === 0 && <div className="empty-hint">مورد فوری‌ای نیست.</div>}
        {myCustomersNeedingAction.map((c) => (
          <div key={c.id} className="between" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
            <span>{c.name} <span className="muted">({c.requestType})</span></span>
            <span className="badge warn">{c.stage}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>فایل‌های جدید امروز</h2>
        {newProperties.length === 0 && <div className="empty-hint">فایل جدیدی ثبت نشده.</div>}
        {newProperties.map((p) => (
          <div key={p.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>{p.code} · {p.neighborhood} · {fmtMoney(p.salePrice)}</div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- امروز دفتر (مدیر) ---------------------------------- */

function ManagerToday({ data, helpers }) {
  const today = todayStr();
  const activeAdvisors = data.advisors.filter((a) => a.active);
  return (
    <div>
      <h1 style={{ fontSize: 19, marginBottom: 14 }}>امروز دفتر</h1>

      <div className="card">
        <h2>عملکرد امروز مشاوران</h2>
        <table>
          <thead><tr><th>مشاور</th><th>فایل</th><th>مشتری</th><th>پیگیری</th><th>بازدید</th><th>مذاکره</th><th>معامله</th></tr></thead>
          <tbody>
            {activeAdvisors.map((a) => {
              const s = helpers.statsFor(a.id, "today");
              return (<tr key={a.id}><td>{a.name}</td><td>{s.properties}</td><td>{s.customers}</td><td>{s.followups}</td><td>{s.visits}</td><td>{s.negotiations}</td><td>{s.deals}</td></tr>);
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>پیگیری‌های عقب‌افتاده ({helpers.overdueFollowups.length})</h2>
        {helpers.overdueFollowups.length === 0 && <div className="empty-hint">پیگیری عقب‌افتاده‌ای وجود ندارد. 👍</div>}
        {helpers.overdueFollowups.slice(0, 15).map((f) => (
          <div key={f.id} className="between" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
            <span>{helpers.advisorName(f.advisorId)} — {f.relatedType === "property" ? helpers.propertyLabel(f.relatedId) : helpers.customerLabel(f.relatedId)}</span>
            <span className="badge danger">از {f.nextDate}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>بازدیدهای امروز ({helpers.todayVisits.length})</h2>
        {helpers.todayVisits.length === 0 && <div className="empty-hint">بازدیدی برای امروز ثبت نشده.</div>}
        {helpers.todayVisits.map((v) => (
          <div key={v.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>{helpers.advisorName(v.advisorId)} — {helpers.propertyLabel(v.propertyId)} با {helpers.customerLabel(v.customerId)}</div>
        ))}
      </div>

      <div className="card">
        <h2>معاملات در حال مذاکره</h2>
        {data.deals.filter((d) => d.status === "در حال مذاکره").length === 0 && <div className="empty-hint">موردی نیست.</div>}
        {data.deals.filter((d) => d.status === "در حال مذاکره").map((d) => (
          <div key={d.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>{helpers.advisorName(d.advisorId)} — {helpers.propertyLabel(d.propertyId)} · {fmtMoney(d.amount)}</div>
        ))}
      </div>

      <div className="card">
        <h2>مشکلات ثبت‌شده اخیر</h2>
        {data.issues.slice(-5).reverse().map((i) => (
          <div key={i.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>{i.date} — {i.problem}</div>
        ))}
        {data.issues.length === 0 && <div className="empty-hint">مشکلی ثبت نشده.</div>}
      </div>
    </div>
  );
}

/* ---------------------------------- داشبورد مدیر ---------------------------------- */

function ManagerDashboard({ data, helpers }) {
  const [range, setRange] = useState("month");
  const activeAdvisors = data.advisors.filter((a) => a.active);
  const [drill, setDrill] = useState(null);

  const kpis = {
    activeAdvisors: activeAdvisors.length,
    activeProperties: data.properties.filter((p) => p.status !== "بایگانی").length,
    activeCustomers: data.customers.filter((c) => c.stage !== "معامله").length,
    todayFollowups: data.followups.filter((f) => isToday(f.date)).length,
    todayVisits: helpers.todayVisits.length,
    monthDeals: data.deals.filter((d) => inRange(d.date, "month") && d.status !== "فسخ شد").length,
    monthCommission: data.deals.filter((d) => inRange(d.date, "month") && d.status !== "فسخ شد").reduce((s, d) => s + (Number(d.officeCommission) || 0), 0),
  };

  return (
    <div>
      <div className="between" style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 19 }}>داشبورد مدیر</h1>
        <select value={range} onChange={(e) => setRange(e.target.value)} style={{ width: 150 }}>
          <option value="today">امروز</option>
          <option value="week">این هفته</option>
          <option value="month">این ماه</option>
          <option value="all">همه بازه‌ها</option>
        </select>
      </div>

      <div className="grid-cards" style={{ marginBottom: 16 }}>
        <div className="kpi"><div className="num">{kpis.activeAdvisors}</div><div className="lbl">مشاور فعال</div></div>
        <div className="kpi"><div className="num">{kpis.activeProperties}</div><div className="lbl">فایل فعال</div></div>
        <div className="kpi"><div className="num">{kpis.activeCustomers}</div><div className="lbl">مشتری فعال</div></div>
        <div className="kpi"><div className="num">{kpis.todayFollowups}</div><div className="lbl">پیگیری امروز</div></div>
        <div className="kpi"><div className="num">{kpis.todayVisits}</div><div className="lbl">بازدید امروز</div></div>
        <div className="kpi"><div className="num">{kpis.monthDeals}</div><div className="lbl">معاملات این ماه</div></div>
        <div className="kpi"><div className="num">{fmtMoney(kpis.monthCommission)}</div><div className="lbl">کمیسیون این ماه (تومان)</div></div>
      </div>

      <div className="card">
        <h2>عملکرد مشاوران — {({ today: "امروز", week: "این هفته", month: "این ماه", all: "همه بازه‌ها" })[range]}</h2>
        <table>
          <thead><tr><th>مشاور</th><th>فایل</th><th>مشتری</th><th>پیگیری</th><th>بازدید</th><th>مذاکره</th><th>معامله</th><th></th></tr></thead>
          <tbody>
            {activeAdvisors.map((a) => {
              const s = helpers.statsFor(a.id, range);
              return (
                <tr key={a.id}>
                  <td>{a.name}</td><td>{s.properties}</td><td>{s.customers}</td><td>{s.followups}</td><td>{s.visits}</td><td>{s.negotiations}</td><td>{s.deals}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => setDrill(a.id)}>جزئیات</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>نرخ تبدیل — {({ today: "امروز", week: "این هفته", month: "این ماه", all: "همه بازه‌ها" })[range]}</h2>
        <table>
          <thead><tr><th>مشاور</th><th>فایل ← بازدید</th><th>مشتری ← بازدید</th><th>بازدید ← مذاکره</th><th>مذاکره ← معامله</th></tr></thead>
          <tbody>
            {activeAdvisors.map((a) => {
              const c = helpers.conversionFor(a.id, range);
              return (<tr key={a.id}><td>{a.name}</td><td>{c.propertyToVisit}%</td><td>{c.customerToVisit}%</td><td>{c.visitToNegotiation}%</td><td>{c.negotiationToDeal}%</td></tr>);
            })}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 8 }}>نرخ تبدیل پایین در یک مرحله خاص، نشان می‌دهد مشکل مشاور دقیقاً کجاست — نه صرفاً تعداد فعالیت‌ها.</p>
      </div>

      {drill && (
        <Modal title={`جزئیات عملکرد — ${helpers.advisorName(drill)}`} onClose={() => setDrill(null)}>
          {["today", "week", "month"].map((r) => {
            const s = helpers.statsFor(drill, r);
            return (
              <div key={r} style={{ marginBottom: 10 }}>
                <h3>{({ today: "امروز", week: "این هفته", month: "این ماه" })[r]}</h3>
                <div className="muted">فایل: {s.properties} · مشتری: {s.customers} · پیگیری: {s.followups} · بازدید: {s.visits} · مذاکره: {s.negotiations} · معامله: {s.deals} · کمیسیون: {fmtMoney(s.commission)}</div>
              </div>
            );
          })}
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------- فایل‌ها ---------------------------------- */

function PropertiesTab({ data, persist, user, isManager }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [filters, setFilters] = useState({ neighborhood: "", type: "", status: "", advisorId: "" });

  const scoped = isManager ? data.properties : data.properties.filter((p) => p.advisorId === user.id);
  const filtered = scoped.filter((p) => {
    if (!showArchived && p.status === "بایگانی") return false;
    if (filters.neighborhood && !(p.neighborhood || "").includes(filters.neighborhood)) return false;
    if (filters.type && p.type !== filters.type) return false;
    if (filters.status && p.status !== filters.status) return false;
    if (filters.advisorId && p.advisorId !== filters.advisorId) return false;
    return true;
  });

  const save = (form) => {
    const list = data.properties.filter((p) => p.id !== form.id);
    persist({ ...data, properties: [...list, form] });
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => persist({ ...data, properties: data.properties.filter((p) => p.id !== id) });

  return (
    <div>
      <div className="between" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 19 }}>فایل‌ها ({filtered.length})</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>+ فایل جدید</button>
      </div>

      <div className="card">
        <div className="form-grid">
          <Field label="محله"><input value={filters.neighborhood} onChange={(e) => setFilters({ ...filters, neighborhood: e.target.value })} /></Field>
          <Field label="نوع ملک"><select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}><option value="">همه</option>{PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="وضعیت"><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">همه</option>{PROPERTY_STATUSES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          {isManager && <Field label="مشاور"><select value={filters.advisorId} onChange={(e) => setFilters({ ...filters, advisorId: e.target.value })}><option value="">همه</option>{data.advisors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
        </div>
        <label className="row" style={{ marginTop: 6, cursor: "pointer" }}><input type="checkbox" style={{ width: 16 }} checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> نمایش فایل‌های بایگانی‌شده</label>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>کد</th><th>نوع</th><th>محله</th><th>متراژ</th><th>خواب</th><th>قیمت</th><th>وضعیت</th>{isManager && <th>مشاور</th>}<th></th></tr></thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>{p.code}</td><td>{p.type}</td><td>{p.neighborhood}</td><td>{p.area}</td><td>{p.bedrooms}</td>
                <td>{fmtMoney(p.salePrice)}</td><td><StatusBadge status={p.status} /></td>
                {isManager && <td>{data.advisors.find((a) => a.id === p.advisorId)?.name}</td>}
                <td><button className="btn btn-ghost btn-sm" onClick={() => { setEditing(p); setShowForm(true); }}>ویرایش</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-hint">فایلی یافت نشد.</div>}
      </div>

      {showForm && <PropertyForm data={data} user={user} isManager={isManager} initial={editing} onSave={save} onDelete={editing ? () => remove(editing.id) : null} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function PropertyForm({ data, user, isManager, initial, onSave, onDelete, onClose }) {
  const [f, setF] = useState(initial || {
    id: uid(), code: `F-${Math.floor(1000 + Math.random() * 9000)}`, advisorId: isManager ? (data.advisors[0]?.id || "") : user.id,
    type: PROPERTY_TYPES[0], neighborhood: "", address: "", area: "", bedrooms: "", floor: "", buildingFloors: "",
    yearBuilt: "", parking: false, elevator: false, storage: false, salePrice: "", mortgageAmount: "", rentAmount: "",
    ownerName: "", ownerPhone: "", createdAt: todayStr(), lastFollowup: "", nextFollowup: "", status: "فعال", notes: "",
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <Modal title={initial ? "ویرایش فایل" : "فایل جدید"} onClose={onClose} wide>
      <div className="form-grid">
        <Field label="کد فایل"><input value={f.code} onChange={(e) => set("code", e.target.value)} /></Field>
        {isManager && <Field label="مشاور مسئول"><select value={f.advisorId} onChange={(e) => set("advisorId", e.target.value)}>{data.advisors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
        <Field label="نوع ملک"><select value={f.type} onChange={(e) => set("type", e.target.value)}>{PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="محله"><input value={f.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} /></Field>
        <Field label="آدرس تقریبی"><input value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
        <Field label="متراژ"><input type="number" value={f.area} onChange={(e) => set("area", e.target.value)} /></Field>
        <Field label="تعداد خواب"><input type="number" value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} /></Field>
        <Field label="طبقه"><input value={f.floor} onChange={(e) => set("floor", e.target.value)} /></Field>
        <Field label="تعداد طبقات ساختمان"><input value={f.buildingFloors} onChange={(e) => set("buildingFloors", e.target.value)} /></Field>
        <Field label="سال ساخت"><input value={f.yearBuilt} onChange={(e) => set("yearBuilt", e.target.value)} /></Field>
        <Field label="قیمت فروش (تومان)"><input type="number" value={f.salePrice} onChange={(e) => set("salePrice", e.target.value)} /></Field>
        <Field label="مبلغ رهن"><input type="number" value={f.mortgageAmount} onChange={(e) => set("mortgageAmount", e.target.value)} /></Field>
        <Field label="مبلغ اجاره"><input type="number" value={f.rentAmount} onChange={(e) => set("rentAmount", e.target.value)} /></Field>
        <Field label="نام مالک"><input value={f.ownerName} onChange={(e) => set("ownerName", e.target.value)} /></Field>
        <Field label="شماره مالک"><input value={f.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value)} /></Field>
        <Field label="تاریخ پیگیری بعدی"><input type="date" value={f.nextFollowup} onChange={(e) => set("nextFollowup", e.target.value)} /></Field>
        <Field label="وضعیت"><select value={f.status} onChange={(e) => set("status", e.target.value)}>{PROPERTY_STATUSES.map((t) => <option key={t}>{t}</option>)}</select></Field>
      </div>
      <div className="row" style={{ margin: "8px 0 12px" }}>
        <label className="row" style={{ cursor: "pointer" }}><input type="checkbox" style={{ width: 16 }} checked={f.parking} onChange={(e) => set("parking", e.target.checked)} /> پارکینگ</label>
        <label className="row" style={{ cursor: "pointer" }}><input type="checkbox" style={{ width: 16 }} checked={f.elevator} onChange={(e) => set("elevator", e.target.checked)} /> آسانسور</label>
        <label className="row" style={{ cursor: "pointer" }}><input type="checkbox" style={{ width: 16 }} checked={f.storage} onChange={(e) => set("storage", e.target.checked)} /> انباری</label>
      </div>
      <Field label="توضیحات"><textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      <div className="between">
        <div>{onDelete && <button className="btn btn-danger" onClick={() => { onDelete(); onClose(); }}>حذف</button>}</div>
        <button className="btn btn-primary" onClick={() => onSave(f)}>ذخیره</button>
      </div>
    </Modal>
  );
}

/* ---------------------------------- مشتری‌ها ---------------------------------- */

function CustomersTab({ data, persist, user, isManager }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ neighborhood: "", requestType: "", advisorId: "" });

  const scoped = isManager ? data.customers : data.customers.filter((c) => c.advisorId === user.id);
  const filtered = scoped.filter((c) => {
    if (filters.neighborhood && !(c.neighborhood || "").includes(filters.neighborhood)) return false;
    if (filters.requestType && c.requestType !== filters.requestType) return false;
    if (filters.advisorId && c.advisorId !== filters.advisorId) return false;
    return true;
  });

  const save = (form) => { persist({ ...data, customers: [...data.customers.filter((c) => c.id !== form.id), form] }); setShowForm(false); setEditing(null); };
  const remove = (id) => persist({ ...data, customers: data.customers.filter((c) => c.id !== id) });

  return (
    <div>
      <div className="between" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 19 }}>مشتری‌ها ({filtered.length})</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>+ مشتری جدید</button>
      </div>

      <div className="card">
        <div className="form-grid">
          <Field label="محله"><input value={filters.neighborhood} onChange={(e) => setFilters({ ...filters, neighborhood: e.target.value })} /></Field>
          <Field label="نوع درخواست"><select value={filters.requestType} onChange={(e) => setFilters({ ...filters, requestType: e.target.value })}><option value="">همه</option>{REQUEST_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          {isManager && <Field label="مشاور"><select value={filters.advisorId} onChange={(e) => setFilters({ ...filters, advisorId: e.target.value })}><option value="">همه</option>{data.advisors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
        </div>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>نام</th><th>تماس</th><th>نوع</th><th>محله</th><th>مرحله</th>{isManager && <th>مشاور</th>}<th></th></tr></thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td><td>{c.phone}</td><td>{c.requestType}</td><td>{c.neighborhood}</td>
                <td><span className="badge warn">{c.stage}</span></td>
                {isManager && <td>{data.advisors.find((a) => a.id === c.advisorId)?.name}</td>}
                <td><button className="btn btn-ghost btn-sm" onClick={() => { setEditing(c); setShowForm(true); }}>ویرایش</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-hint">مشتری‌ای یافت نشد.</div>}
      </div>

      {showForm && <CustomerForm data={data} user={user} isManager={isManager} initial={editing} onSave={save} onDelete={editing ? () => remove(editing.id) : null} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function CustomerForm({ data, user, isManager, initial, onSave, onDelete, onClose }) {
  const [f, setF] = useState(initial || {
    id: uid(), advisorId: isManager ? (data.advisors[0]?.id || "") : user.id, name: "", phone: "",
    requestType: REQUEST_TYPES[0], neighborhood: "", minArea: "", maxArea: "", bedrooms: "",
    mortgageBudget: "", rentBudget: "", buyBudget: "", urgency: "متوسط", createdAt: todayStr(),
    lastFollowup: "", nextFollowupDate: "", stage: PIPELINE_STAGES[0], notes: "",
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <Modal title={initial ? "ویرایش مشتری" : "مشتری جدید"} onClose={onClose} wide>
      <div className="form-grid">
        <Field label="نام"><input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="شماره تماس"><input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        {isManager && <Field label="مشاور مسئول"><select value={f.advisorId} onChange={(e) => set("advisorId", e.target.value)}>{data.advisors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
        <Field label="نوع درخواست"><select value={f.requestType} onChange={(e) => set("requestType", e.target.value)}>{REQUEST_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="محله موردنظر"><input value={f.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} /></Field>
        <Field label="حداقل متراژ"><input type="number" value={f.minArea} onChange={(e) => set("minArea", e.target.value)} /></Field>
        <Field label="حداکثر متراژ"><input type="number" value={f.maxArea} onChange={(e) => set("maxArea", e.target.value)} /></Field>
        <Field label="تعداد خواب"><input type="number" value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} /></Field>
        <Field label="بودجه رهن"><input type="number" value={f.mortgageBudget} onChange={(e) => set("mortgageBudget", e.target.value)} /></Field>
        <Field label="بودجه اجاره"><input type="number" value={f.rentBudget} onChange={(e) => set("rentBudget", e.target.value)} /></Field>
        <Field label="بودجه خرید"><input type="number" value={f.buyBudget} onChange={(e) => set("buyBudget", e.target.value)} /></Field>
        <Field label="فوریت"><select value={f.urgency} onChange={(e) => set("urgency", e.target.value)}><option>کم</option><option>متوسط</option><option>زیاد</option></select></Field>
        <Field label="مرحله در قیف فروش"><select value={f.stage} onChange={(e) => set("stage", e.target.value)}>{PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="تاریخ پیگیری بعدی"><input type="date" value={f.nextFollowupDate} onChange={(e) => set("nextFollowupDate", e.target.value)} /></Field>
      </div>
      <Field label="توضیحات"><textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      <div className="between">
        <div>{onDelete && <button className="btn btn-danger" onClick={() => { onDelete(); onClose(); }}>حذف</button>}</div>
        <button className="btn btn-primary" onClick={() => onSave(f)}>ذخیره</button>
      </div>
    </Modal>
  );
}

/* ---------------------------------- پیگیری‌ها ---------------------------------- */

function FollowupsTab({ data, persist, user, isManager }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all"); // all, today, overdue
  const scoped = isManager ? data.followups : data.followups.filter((f) => f.advisorId === user.id);
  const filtered = scoped.filter((f) => {
    if (filter === "today") return isToday(f.date);
    if (filter === "overdue") return isOverdue(f.nextDate, f.doneNext);
    return true;
  }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const save = (form) => { persist({ ...data, followups: [...data.followups.filter((f) => f.id !== form.id), form] }); setShowForm(false); };
  const toggleDone = (f) => persist({ ...data, followups: data.followups.map((x) => x.id === f.id ? { ...x, doneNext: !x.doneNext } : x) });

  return (
    <div>
      <div className="between" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 19 }}>پیگیری‌ها ({filtered.length})</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ پیگیری جدید</button>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter("all")}>همه</button>
        <button className={`btn btn-sm ${filter === "today" ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter("today")}>امروز</button>
        <button className={`btn btn-sm ${filter === "overdue" ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter("overdue")}>عقب‌افتاده</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>تاریخ</th><th>نوع</th><th>مربوط به</th>{isManager && <th>مشاور</th>}<th>نتیجه</th><th>پیگیری بعدی</th><th></th></tr></thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id}>
                <td>{f.date}</td><td>{f.type}</td>
                <td>{f.relatedType === "property" ? (data.properties.find((p) => p.id === f.relatedId)?.code || "—") : (data.customers.find((c) => c.id === f.relatedId)?.name || "—")}</td>
                {isManager && <td>{data.advisors.find((a) => a.id === f.advisorId)?.name}</td>}
                <td>{f.result}</td>
                <td>{f.nextDate ? <span className={isOverdue(f.nextDate, f.doneNext) ? "badge danger" : "badge neutral"}>{f.nextDate}</span> : "—"}</td>
                <td>{f.nextDate && <button className="btn btn-ghost btn-sm" onClick={() => toggleDone(f)}>{f.doneNext ? "↺ بازفعال" : "✓ انجام شد"}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-hint">پیگیری‌ای یافت نشد.</div>}
      </div>
      {showForm && <FollowupForm data={data} user={user} isManager={isManager} onSave={save} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function FollowupForm({ data, user, isManager, onSave, onClose }) {
  const [f, setF] = useState({
    id: uid(), advisorId: isManager ? (data.advisors[0]?.id || "") : user.id, relatedType: "customer", relatedId: "",
    date: todayStr(), type: FOLLOWUP_TYPES[0], result: "", notes: "", nextDate: "", doneNext: false,
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const options = f.relatedType === "property" ? data.properties : data.customers;
  return (
    <Modal title="پیگیری جدید" onClose={onClose}>
      <div className="form-grid">
        {isManager && <Field label="مشاور"><select value={f.advisorId} onChange={(e) => set("advisorId", e.target.value)}>{data.advisors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
        <Field label="مربوط به"><select value={f.relatedType} onChange={(e) => set("relatedType", e.target.value)}><option value="customer">مشتری</option><option value="property">فایل</option></select></Field>
        <Field label={f.relatedType === "property" ? "انتخاب فایل" : "انتخاب مشتری"}>
          <select value={f.relatedId} onChange={(e) => set("relatedId", e.target.value)}>
            <option value="">— انتخاب —</option>
            {options.map((o) => <option key={o.id} value={o.id}>{f.relatedType === "property" ? o.code : o.name}</option>)}
          </select>
        </Field>
        <Field label="تاریخ"><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label="نوع پیگیری"><select value={f.type} onChange={(e) => set("type", e.target.value)}>{FOLLOWUP_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="تاریخ پیگیری بعدی"><input type="date" value={f.nextDate} onChange={(e) => set("nextDate", e.target.value)} /></Field>
      </div>
      <Field label="نتیجه"><input value={f.result} onChange={(e) => set("result", e.target.value)} /></Field>
      <Field label="توضیحات"><textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      <div className="between"><div /><button className="btn btn-primary" disabled={!f.relatedId} onClick={() => onSave(f)}>ذخیره</button></div>
    </Modal>
  );
}

/* ---------------------------------- بازدیدها ---------------------------------- */

function VisitsTab({ data, persist, user, isManager }) {
  const [showForm, setShowForm] = useState(false);
  const scoped = (isManager ? data.visits : data.visits.filter((v) => v.advisorId === user.id)).sort((a, b) => (b.datetime || "").localeCompare(a.datetime || ""));
  const save = (form) => {
    let customers = data.customers;
    if (form.result === "منجر به مذاکره شد") {
      customers = customers.map((c) => c.id === form.customerId ? { ...c, stage: "مذاکره" } : c);
    } else if (form.result && form.customerId) {
      customers = customers.map((c) => c.id === form.customerId && c.stage === "مشتری جدید" ? { ...c, stage: "بازدید" } : c);
    }
    persist({ ...data, visits: [...data.visits.filter((v) => v.id !== form.id), form], customers });
    setShowForm(false);
  };
  return (
    <div>
      <div className="between" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 19 }}>بازدیدها ({scoped.length})</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ بازدید جدید</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>تاریخ و ساعت</th><th>فایل</th><th>مشتری</th>{isManager && <th>مشاور</th>}<th>نتیجه</th><th>اقدام بعدی</th></tr></thead>
          <tbody>
            {scoped.map((v) => (
              <tr key={v.id}>
                <td>{v.datetime}</td>
                <td>{data.properties.find((p) => p.id === v.propertyId)?.code || "—"}</td>
                <td>{data.customers.find((c) => c.id === v.customerId)?.name || "—"}</td>
                {isManager && <td>{data.advisors.find((a) => a.id === v.advisorId)?.name}</td>}
                <td>{v.result}</td><td>{v.nextAction || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {scoped.length === 0 && <div className="empty-hint">بازدیدی ثبت نشده.</div>}
      </div>
      {showForm && <VisitForm data={data} user={user} isManager={isManager} onSave={save} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function VisitForm({ data, user, isManager, onSave, onClose }) {
  const [f, setF] = useState({
    id: uid(), advisorId: isManager ? (data.advisors[0]?.id || "") : user.id, propertyId: "", customerId: "",
    datetime: `${todayStr()}T10:00`, result: "", notes: "", rejectReason: "", nextAction: "", nextDate: "",
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <Modal title="بازدید جدید" onClose={onClose}>
      <div className="form-grid">
        {isManager && <Field label="مشاور"><select value={f.advisorId} onChange={(e) => set("advisorId", e.target.value)}>{data.advisors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
        <Field label="فایل"><select value={f.propertyId} onChange={(e) => set("propertyId", e.target.value)}><option value="">— انتخاب —</option>{data.properties.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.neighborhood}</option>)}</select></Field>
        <Field label="مشتری"><select value={f.customerId} onChange={(e) => set("customerId", e.target.value)}><option value="">— انتخاب —</option>{data.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="تاریخ و ساعت"><input type="datetime-local" value={f.datetime} onChange={(e) => set("datetime", e.target.value)} /></Field>
        <Field label="نتیجه بازدید"><select value={f.result} onChange={(e) => set("result", e.target.value)}><option value="">— انتخاب —</option>{VISIT_RESULTS.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="تاریخ پیگیری بعدی"><input type="date" value={f.nextDate} onChange={(e) => set("nextDate", e.target.value)} /></Field>
      </div>
      {f.result === "رد شد" && <Field label="دلیل عدم توافق"><input value={f.rejectReason} onChange={(e) => set("rejectReason", e.target.value)} /></Field>}
      <Field label="اقدام بعدی"><input value={f.nextAction} onChange={(e) => set("nextAction", e.target.value)} /></Field>
      <Field label="توضیحات"><textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      <div className="between"><div /><button className="btn btn-primary" disabled={!f.propertyId || !f.customerId} onClick={() => onSave(f)}>ذخیره</button></div>
    </Modal>
  );
}

/* ---------------------------------- معاملات ---------------------------------- */

function DealsTab({ data, persist, user, isManager }) {
  const [showForm, setShowForm] = useState(false);
  const scoped = (isManager ? data.deals : data.deals.filter((d) => d.advisorId === user.id)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const save = (form) => {
    let properties = data.properties;
    let customers = data.customers;
    if (form.status === "قرارداد امضا شد") {
      properties = properties.map((p) => p.id === form.propertyId ? { ...p, status: "معامله شد" } : p);
      customers = customers.map((c) => c.id === form.customerId ? { ...c, stage: "معامله" } : c);
    }
    persist({ ...data, deals: [...data.deals.filter((d) => d.id !== form.id), form], properties, customers });
    setShowForm(false);
  };
  return (
    <div>
      <div className="between" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 19 }}>معاملات ({scoped.length})</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ معامله جدید</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>تاریخ</th><th>فایل</th><th>مشتری</th>{isManager && <th>مشاور</th>}<th>مبلغ</th><th>کمیسیون کل</th><th>سهم مشاور</th><th>وضعیت</th></tr></thead>
          <tbody>
            {scoped.map((d) => (
              <tr key={d.id}>
                <td>{d.date}</td>
                <td>{data.properties.find((p) => p.id === d.propertyId)?.code || "—"}</td>
                <td>{data.customers.find((c) => c.id === d.customerId)?.name || "—"}</td>
                {isManager && <td>{data.advisors.find((a) => a.id === d.advisorId)?.name}</td>}
                <td>{fmtMoney(d.amount)}</td><td>{fmtMoney(d.totalCommission)}</td><td>{fmtMoney(d.advisorShare)}</td>
                <td><StatusBadge status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {scoped.length === 0 && <div className="empty-hint">معامله‌ای ثبت نشده.</div>}
      </div>
      {showForm && <DealForm data={data} user={user} isManager={isManager} onSave={save} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function DealForm({ data, user, isManager, onSave, onClose }) {
  const [f, setF] = useState({
    id: uid(), advisorId: isManager ? (data.advisors[0]?.id || "") : user.id, propertyId: "", customerId: "",
    date: todayStr(), dealType: DEAL_TYPES[0], amount: "", mortgageAmount: "", rentAmount: "",
    totalCommission: "", advisorShare: "", officeCommission: "", status: DEAL_STATUSES[0], notes: "",
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <Modal title="معامله جدید" onClose={onClose} wide>
      <div className="form-grid">
        {isManager && <Field label="مشاور"><select value={f.advisorId} onChange={(e) => set("advisorId", e.target.value)}>{data.advisors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
        <Field label="فایل"><select value={f.propertyId} onChange={(e) => set("propertyId", e.target.value)}><option value="">— انتخاب —</option>{data.properties.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}</select></Field>
        <Field label="مشتری"><select value={f.customerId} onChange={(e) => set("customerId", e.target.value)}><option value="">— انتخاب —</option>{data.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="تاریخ"><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label="نوع معامله"><select value={f.dealType} onChange={(e) => set("dealType", e.target.value)}>{DEAL_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="مبلغ معامله"><input type="number" value={f.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
        <Field label="مبلغ رهن"><input type="number" value={f.mortgageAmount} onChange={(e) => set("mortgageAmount", e.target.value)} /></Field>
        <Field label="مبلغ اجاره"><input type="number" value={f.rentAmount} onChange={(e) => set("rentAmount", e.target.value)} /></Field>
        <Field label="کمیسیون کل"><input type="number" value={f.totalCommission} onChange={(e) => set("totalCommission", e.target.value)} /></Field>
        <Field label="سهم مشاور"><input type="number" value={f.advisorShare} onChange={(e) => set("advisorShare", e.target.value)} /></Field>
        <Field label="سهم دفتر"><input type="number" value={f.officeCommission} onChange={(e) => set("officeCommission", e.target.value)} /></Field>
        <Field label="وضعیت قرارداد"><select value={f.status} onChange={(e) => set("status", e.target.value)}>{DEAL_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
      <Field label="توضیحات"><textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      <div className="between"><div /><button className="btn btn-primary" disabled={!f.propertyId || !f.customerId} onClick={() => onSave(f)}>ذخیره</button></div>
    </Modal>
  );
}

/* ---------------------------------- گزارش روزانه ---------------------------------- */

function DailyReportTab({ data, persist, user }) {
  const today = todayStr();
  const existing = data.dailyReports.find((r) => r.advisorId === user.id && r.date === today);
  const [f, setF] = useState(existing || {
    id: uid(), advisorId: user.id, date: today, newProperties: "", newCustomers: "", followups: "",
    visits: "", negotiations: "", deals: "", bestResult: "", biggestProblem: "", tomorrowPlan: "",
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const save = () => persist({ ...data, dailyReports: [...data.dailyReports.filter((r) => r.id !== f.id), f] });

  const myReports = data.dailyReports.filter((r) => r.advisorId === user.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  return (
    <div>
      <h1 style={{ fontSize: 19, marginBottom: 14 }}>گزارش روزانه — {today}</h1>
      <div className="card">
        <div className="form-grid">
          <Field label="فایل جدید"><input type="number" value={f.newProperties} onChange={(e) => set("newProperties", e.target.value)} /></Field>
          <Field label="مشتری جدید"><input type="number" value={f.newCustomers} onChange={(e) => set("newCustomers", e.target.value)} /></Field>
          <Field label="پیگیری"><input type="number" value={f.followups} onChange={(e) => set("followups", e.target.value)} /></Field>
          <Field label="بازدید"><input type="number" value={f.visits} onChange={(e) => set("visits", e.target.value)} /></Field>
          <Field label="مذاکره"><input type="number" value={f.negotiations} onChange={(e) => set("negotiations", e.target.value)} /></Field>
          <Field label="معامله"><input type="number" value={f.deals} onChange={(e) => set("deals", e.target.value)} /></Field>
        </div>
        <Field label="مهم‌ترین نتیجه امروز"><input value={f.bestResult} onChange={(e) => set("bestResult", e.target.value)} /></Field>
        <Field label="بزرگ‌ترین مشکل امروز"><input value={f.biggestProblem} onChange={(e) => set("biggestProblem", e.target.value)} /></Field>
        <Field label="برنامه فردا"><input value={f.tomorrowPlan} onChange={(e) => set("tomorrowPlan", e.target.value)} /></Field>
        <button className="btn btn-primary" onClick={save}>{existing ? "بروزرسانی گزارش" : "ثبت گزارش"}</button>
      </div>

      <div className="card">
        <h2>گزارش‌های اخیر من</h2>
        {myReports.length === 0 && <div className="empty-hint">گزارشی ثبت نشده.</div>}
        {myReports.map((r) => (
          <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
            <div className="between"><b>{r.date}</b><span className="muted">فایل {r.newProperties || 0} · مشتری {r.newCustomers || 0} · پیگیری {r.followups || 0} · بازدید {r.visits || 0} · معامله {r.deals || 0}</span></div>
            {r.bestResult && <div className="muted">✅ {r.bestResult}</div>}
            {r.biggestProblem && <div className="muted">⚠️ {r.biggestProblem}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- اهداف ---------------------------------- */

function GoalsTab({ data, persist, helpers }) {
  const [advisorId, setAdvisorId] = useState(data.advisors[0]?.id || "");
  const [period, setPeriod] = useState("monthly");
  const existing = data.goals.find((g) => g.advisorId === advisorId && g.period === period) || {
    id: uid(), advisorId, period, targets: { properties: "", customers: "", followups: "", visits: "", negotiations: "", deals: "" },
  };
  const [targets, setTargets] = useState(existing.targets);
  useEffect(() => { const g = data.goals.find((g) => g.advisorId === advisorId && g.period === period); setTargets(g ? g.targets : { properties: "", customers: "", followups: "", visits: "", negotiations: "", deals: "" }); }, [advisorId, period]); // eslint-disable-line

  const save = () => {
    const id = existing.id;
    persist({ ...data, goals: [...data.goals.filter((g) => g.id !== id), { id, advisorId, period, targets }] });
  };

  const actual = helpers.statsFor(advisorId, period === "monthly" ? "month" : "week");
  const rows = [
    { key: "properties", label: "فایل" }, { key: "customers", label: "مشتری" }, { key: "followups", label: "پیگیری" },
    { key: "visits", label: "بازدید" }, { key: "negotiations", label: "مذاکره" }, { key: "deals", label: "معامله" },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 19, marginBottom: 14 }}>هدف‌گذاری</h1>
      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <select value={advisorId} onChange={(e) => setAdvisorId(e.target.value)} style={{ width: 160 }}>{data.advisors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 120 }}><option value="monthly">ماهانه</option><option value="weekly">هفتگی</option></select>
        </div>
        <div className="form-grid">
          {rows.map((r) => (
            <Field key={r.key} label={`هدف ${r.label}`}><input type="number" value={targets[r.key]} onChange={(e) => setTargets({ ...targets, [r.key]: e.target.value })} /></Field>
          ))}
        </div>
        <button className="btn btn-primary" onClick={save}>ذخیره اهداف</button>
      </div>

      <div className="card">
        <h2>پیشرفت — {period === "monthly" ? "این ماه" : "این هفته"}</h2>
        {rows.map((r) => {
          const target = Number(targets[r.key]) || 0;
          const done = actual[r.key] || 0;
          const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
          return (
            <div key={r.key} style={{ marginBottom: 10 }}>
              <div className="between" style={{ fontSize: 12.5, marginBottom: 4 }}><span>{r.label}</span><span>{done} / {target || "—"} ({pct}%)</span></div>
              <div className="progress-bar"><div style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------- ارزیابی هفتگی ---------------------------------- */

function ReviewsTab({ data, persist, helpers }) {
  const [showForm, setShowForm] = useState(false);
  const [advisorId, setAdvisorId] = useState(data.advisors[0]?.id || "");
  const reviews = data.weeklyReviews.filter((r) => r.advisorId === advisorId).sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  const save = (form) => { persist({ ...data, weeklyReviews: [...data.weeklyReviews, form] }); setShowForm(false); };
  const stats = helpers.statsFor(advisorId, "week");

  return (
    <div>
      <div className="between" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 19 }}>ارزیابی هفتگی</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ ثبت ارزیابی این هفته</button>
      </div>
      <div className="card">
        <select value={advisorId} onChange={(e) => setAdvisorId(e.target.value)} style={{ width: 160, marginBottom: 12 }}>{data.advisors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <div className="muted">این هفته: فایل {stats.properties} · مشتری {stats.customers} · پیگیری {stats.followups} · بازدید {stats.visits} · مذاکره {stats.negotiations} · معامله {stats.deals}</div>
      </div>
      <div className="card">
        <h2>سوابق ارزیابی</h2>
        {reviews.length === 0 && <div className="empty-hint">ارزیابی‌ای ثبت نشده.</div>}
        {reviews.map((r) => (
          <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
            <div className="between"><b>هفته {r.weekKey}</b><span className="badge warn">امتیاز: {r.score}/100</span></div>
            <div className="muted">💪 نقطه قوت: {r.strength}</div>
            <div className="muted">⚠️ مشکل اصلی: {r.mainIssue}</div>
            <div className="muted">🔧 اقدام اصلاحی: {r.correctiveAction}</div>
          </div>
        ))}
      </div>
      {showForm && (
        <Modal title="ثبت ارزیابی هفتگی" onClose={() => setShowForm(false)}>
          <ReviewForm advisorId={advisorId} onSave={save} onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  );
}
function ReviewForm({ advisorId, onSave, onClose }) {
  const [f, setF] = useState({ id: uid(), advisorId, weekKey: `${todayStr()}`, strength: "", mainIssue: "", correctiveAction: "", score: "" });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <>
      <Field label="نقطه قوت"><input value={f.strength} onChange={(e) => set("strength", e.target.value)} /></Field>
      <Field label="مشکل اصلی"><input value={f.mainIssue} onChange={(e) => set("mainIssue", e.target.value)} /></Field>
      <Field label="اقدام اصلاحی هفته بعد"><input value={f.correctiveAction} onChange={(e) => set("correctiveAction", e.target.value)} /></Field>
      <Field label="امتیاز کلی (از ۱۰۰)"><input type="number" max={100} value={f.score} onChange={(e) => set("score", e.target.value)} /></Field>
      <div className="between"><div /><button className="btn btn-primary" onClick={() => onSave(f)}>ذخیره</button></div>
    </>
  );
}

/* ---------------------------------- دفتر مشکلات ---------------------------------- */

function IssuesTab({ data, persist }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const save = (form) => { persist({ ...data, issues: [...data.issues.filter((i) => i.id !== form.id), form] }); setShowForm(false); setEditing(null); };
  const remove = (id) => persist({ ...data, issues: data.issues.filter((i) => i.id !== id) });
  const list = [...data.issues].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="between" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 19 }}>دفتر مشکلات و تصمیمات</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>+ مشکل جدید</button>
      </div>
      {list.length === 0 && <div className="card"><div className="empty-hint">مشکلی ثبت نشده.</div></div>}
      {list.map((i) => (
        <div key={i.id} className="card">
          <div className="between"><h3>{i.problem}</h3><span className="muted">{i.date}</span></div>
          <div className="muted">علت احتمالی: {i.cause}</div>
          <div className="muted">راه‌حل آزمایشی: {i.trialSolution}</div>
          <div className="muted">مسئول: {i.owner} · مهلت: {i.deadline}</div>
          <div className="muted">نتیجه: {i.result || "—"}</div>
          <div className="muted">تصمیم نهایی: {i.finalDecision || "—"}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(i); setShowForm(true); }}>ویرایش</button>
            <button className="btn btn-danger btn-sm" onClick={() => remove(i.id)}>حذف</button>
          </div>
        </div>
      ))}
      {showForm && <IssueForm initial={editing} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
function IssueForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || { id: uid(), date: todayStr(), problem: "", cause: "", trialSolution: "", owner: "", deadline: "", result: "", finalDecision: "" });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <Modal title={initial ? "ویرایش مشکل" : "مشکل جدید"} onClose={onClose}>
      <Field label="تاریخ"><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
      <Field label="مشکل"><input value={f.problem} onChange={(e) => set("problem", e.target.value)} /></Field>
      <Field label="علت احتمالی"><input value={f.cause} onChange={(e) => set("cause", e.target.value)} /></Field>
      <Field label="راه‌حل آزمایشی"><input value={f.trialSolution} onChange={(e) => set("trialSolution", e.target.value)} /></Field>
      <div className="form-grid">
        <Field label="مسئول"><input value={f.owner} onChange={(e) => set("owner", e.target.value)} /></Field>
        <Field label="مهلت"><input type="date" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
      </div>
      <Field label="نتیجه"><input value={f.result} onChange={(e) => set("result", e.target.value)} /></Field>
      <Field label="تصمیم نهایی"><input value={f.finalDecision} onChange={(e) => set("finalDecision", e.target.value)} /></Field>
      <div className="between"><div /><button className="btn btn-primary" onClick={() => onSave(f)}>ذخیره</button></div>
    </Modal>
  );
}

/* ---------------------------------- مدیریت مشاوران ---------------------------------- */

function AdvisorsTab({ data, persist, updateOwnPassword }) {
  const [name, setName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [mgrPass, setMgrPass] = useState(data.managerPassword || "");
  const [showPass, setShowPass] = useState({});

  const add = () => {
    if (!name.trim() || !newPass.trim()) return;
    persist({ ...data, advisors: [...data.advisors, { id: uid(), name: name.trim(), password: newPass.trim(), active: true }] });
    setName(""); setNewPass("");
  };
  const toggle = (id) => persist({ ...data, advisors: data.advisors.map((a) => a.id === id ? { ...a, active: !a.active } : a) });
  const rename = (id, val) => persist({ ...data, advisors: data.advisors.map((a) => a.id === id ? { ...a, name: val } : a) });
  const changePass = (id, val) => persist({ ...data, advisors: data.advisors.map((a) => a.id === id ? { ...a, password: val } : a) });
  const remove = (id) => persist({ ...data, advisors: data.advisors.filter((a) => a.id !== id) });
  const saveMgrPass = () => {
    if (!mgrPass.trim()) return;
    persist({ ...data, managerPassword: mgrPass.trim() });
    updateOwnPassword(mgrPass.trim());
  };

  return (
    <div>
      <h1 style={{ fontSize: 19, marginBottom: 14 }}>مدیریت مشاوران و رمزهای عبور</h1>

      <div className="card">
        <h2>رمز عبور مدیر</h2>
        <div className="row">
          <input type="text" value={mgrPass} onChange={(e) => setMgrPass(e.target.value)} style={{ maxWidth: 200 }} />
          <button className="btn btn-primary btn-sm" onClick={saveMgrPass}>ذخیره رمز مدیر</button>
        </div>
      </div>

      <div className="card">
        <h2>افزودن مشاور جدید</h2>
        <div className="row">
          <input placeholder="نام مشاور" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="رمز عبور" value={newPass} onChange={(e) => setNewPass(e.target.value)} style={{ maxWidth: 160 }} />
          <button className="btn btn-primary" onClick={add} disabled={!name.trim() || !newPass.trim()}>+ افزودن</button>
        </div>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>نام</th><th>رمز عبور</th><th>وضعیت</th><th></th></tr></thead>
          <tbody>
            {data.advisors.map((a) => (
              <tr key={a.id}>
                <td><input value={a.name} onChange={(e) => rename(a.id, e.target.value)} style={{ maxWidth: 160 }} /></td>
                <td>
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <input
                      type={showPass[a.id] ? "text" : "password"}
                      value={a.password || ""}
                      onChange={(e) => changePass(a.id, e.target.value)}
                      style={{ maxWidth: 140 }}
                    />
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowPass({ ...showPass, [a.id]: !showPass[a.id] })}>
                      {showPass[a.id] ? "🙈" : "👁"}
                    </button>
                  </div>
                </td>
                <td><span className={`badge ${a.active ? "active" : "danger"}`}>{a.active ? "فعال" : "غیرفعال"}</span></td>
                <td className="row">
                  <button className="btn btn-ghost btn-sm" onClick={() => toggle(a.id)}>{a.active ? "غیرفعال کن" : "فعال کن"}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(a.id)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 8 }}>مشاور غیرفعال از لیست ورود حذف می‌شود ولی سوابق او باقی می‌ماند.</p>
      </div>
    </div>
  );
}
