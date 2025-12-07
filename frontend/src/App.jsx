import { useEffect, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import ExpenseForm from "./components/ExpenseForm.jsx";
import ExpenseList from "./components/ExpenseList.jsx";
import LoginGate from "./components/LoginGate.jsx";
import SharedPage from "./pages/SharedPage.jsx";
import {
  addExpense,
  attachmentUrl,
  createShare,
  deleteExpense,
  listExpenses,
  summaryByMonth,
  summaryTotal,
} from "./api.js";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";

const SESSION_KEY = "expenses_user_session";
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

function AppShell() {
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryMode, setSummaryMode] = useState("total"); // total | month | none
  const [summaryMonth, setSummaryMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterRecurring, setFilterRecurring] = useState("all"); // all | recurring | one-time
  const [status, setStatus] = useState("");
  const [lastActive, setLastActive] = useState(null);

  // Load session on mount
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const { user: savedUser, lastActive: savedTs } = parsed;
      if (!savedUser || !savedTs) return;
      if (Date.now() - savedTs > SESSION_TIMEOUT_MS) {
        localStorage.removeItem(SESSION_KEY);
        return;
      }
      setUser(savedUser);
      setLastActive(savedTs);
    } catch (_) {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      setSummary("");
      setStatus("");
      return;
    }
    refreshExpenses();
    refreshSummary();
  }, [user]);

  // Activity listeners to keep session alive
  useEffect(() => {
    if (!user) return;
    const touch = () => {
      const now = Date.now();
      setLastActive(now);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user, lastActive: now }));
    };
    const events = ["click", "keydown", "mousemove", "touchstart", "scroll"];
    events.forEach((evt) => window.addEventListener(evt, touch));
    return () => events.forEach((evt) => window.removeEventListener(evt, touch));
  }, [user]);

  // Auto logout after inactivity
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      if (!lastActive) return;
      if (Date.now() - lastActive > SESSION_TIMEOUT_MS) {
        setStatus("Session expired after inactivity.");
        handleLogout();
      }
    }, 30000);
    return () => clearInterval(id);
  }, [user, lastActive]);

  async function refreshExpenses() {
    setLoading(true);
    setStatus("");
    try {
      const items = await listExpenses(user?.token);
      setExpenses(items);
    } catch (err) {
      setStatus(err.message || "Unable to load expenses.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(formValues) {
    setStatus("Saving expense...");
    try {
      await addExpense(formValues, user?.token);
      setStatus("Expense saved.");
      await refreshExpenses();
      await refreshSummary();
    } catch (err) {
      setStatus(err.message || "Unable to save expense.");
    }
  }

  async function handleDelete(expenseId) {
    setStatus("Deleting...");
    try {
      await deleteExpense(expenseId, user?.token);
      setStatus("Deleted.");
      await refreshExpenses();
      await refreshSummary();
    } catch (err) {
      setStatus(err.message || "Unable to delete.");
    }
  }

  async function refreshSummary() {
    try {
      if (summaryMode === "none") {
        setSummary("");
        return;
      }
      if (summaryMode === "total") {
        const total = await summaryTotal(user?.token);
        setSummary(total);
        return;
      }
      const monthTotal = await summaryByMonth(Number(summaryMonth), user?.token);
      setSummary(monthTotal);
    } catch (err) {
      setSummary("");
    }
  }

  async function handleResetFilters() {
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
    setSummaryMode("total");
    setSummaryMonth(currentMonth);
    setFilterMonth("all");
    setFilterRecurring("all");
    setStatus("");
    try {
      const total = await summaryTotal(user?.token);
      setSummary(total);
      await refreshExpenses();
    } catch (err) {
      setSummary("");
    }
  }

  function handleLogout() {
    setUser(null);
    setExpenses([]);
    setSummary("");
    setStatus("");
    setLastActive(null);
    localStorage.removeItem(SESSION_KEY);
  }

  function handleLogin(nextUser) {
    const now = Date.now();
    setUser(nextUser);
    setLastActive(now);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: nextUser, lastActive: now }));
    setStatus("");
  }

  const months = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
  ];

  const filteredExpenses = expenses.filter((item) => {
    const monthNumber = Number(item.date?.split("-")[1]);
    const matchesMonth = filterMonth === "all" || monthNumber === Number(filterMonth);
    const matchesRecurring =
      filterRecurring === "all" ||
      (filterRecurring === "recurring" && item.is_recurring) ||
      (filterRecurring === "one-time" && !item.is_recurring);
    return matchesMonth && matchesRecurring;
  });

  const dashboardElement = (
    <>
      <header className="hero">
        <div>
          <p className="eyebrow">Expenses + receipts</p>
          <h1>Track spending with upload-ready entries</h1>
          <p className="lede">
            Attach images or PDFs to every expense and keep a clean audit trail. Secure
            sign-in via Google keeps your data tied to you.
          </p>
        </div>
      </header>

      <main className="grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Sign in</h2>
            {user ? (
              <button className="ghost" onClick={handleLogout}>
                Sign out
              </button>
            ) : null}
          </div>
          {user ? (
            <div className="user-bar">
              <div className="avatar">{(user.name || "U")[0]}</div>
              <div>
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email || "Google user"}</div>
              </div>
            </div>
          ) : null}
          {!user ? <LoginGate onLogin={handleLogin} /> : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>New expense</h2>
            <div className="hint">Uploads: image or PDF</div>
          </div>
          <ExpenseForm onCreate={handleCreate} disabled={!user} />
          {!user ? (
            <p className="muted">Sign in to enable uploads and save expenses.</p>
          ) : null}
          {status ? <p className="status">{status}</p> : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Expenses</h2>
            <button className="ghost" onClick={refreshExpenses} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="controls">
            <div className="control">
              <label>Summary</label>
              <select
                value={summaryMode}
                onChange={(e) => {
                  setSummaryMode(e.target.value);
                }}
              >
                <option value="total">Total</option>
                <option value="month">By month</option>
                <option value="none">None</option>
              </select>
            </div>
            {summaryMode === "month" ? (
              <div className="control">
                <label>Month</label>
                <select value={summaryMonth} onChange={(e) => setSummaryMonth(e.target.value)}>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <button className="ghost" onClick={refreshSummary}>
              Update summary
            </button>
            <button className="ghost" onClick={handleResetFilters}>
              Reset
            </button>
          </div>
          {summary ? <p className="status">{summary}</p> : null}
          <div className="controls">
            <div className="control">
              <label>Filter by month</label>
              <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                <option value="all">All</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="control">
              <label>Filter by recurrence</label>
              <select value={filterRecurring} onChange={(e) => setFilterRecurring(e.target.value)}>
                <option value="all">All</option>
                <option value="recurring">Recurring only</option>
                <option value="one-time">One-time only</option>
              </select>
            </div>
          </div>
          <ExpenseList
            expenses={filteredExpenses}
            loading={loading}
            getAttachmentUrl={(id) => attachmentUrl(id)}
            onDelete={handleDelete}
            onShare={async (expenseId) => {
              try {
                setStatus("Creating share link...");
                const res = await createShare(expenseId, user?.token);
                const origin = window.location.origin;
                const link = `${origin}/shared/${res.token}`;
                setStatus(`Share link ready: ${link}`);
                if (navigator?.clipboard?.writeText) {
                  await navigator.clipboard.writeText(link);
                  setStatus(`Share link copied to clipboard: ${link}`);
                }
              } catch (err) {
                setStatus(err.message || "Unable to create share link.");
              }
            }}
          />
        </section>
      </main>
    </>
  );

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">Expenses + receipts</div>
        <nav className="nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
        </nav>
        <div className="badge">{user ? "Signed in" : "Guest mode"}</div>
      </header>

      <Routes>
        <Route path="/" element={dashboardElement} />
        <Route
          path="/shared/:token"
          element={
            <SharedPage user={user} onLogin={setUser} refreshExpenses={refreshExpenses} />
          }
        />
        <Route
          path="/analytics"
          element={<AnalyticsPage expenses={expenses} loading={loading} onRefresh={refreshExpenses} />}
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
