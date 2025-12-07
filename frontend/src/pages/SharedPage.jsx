import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LoginGate from "../components/LoginGate.jsx";
import { cloneSharedExpense, getSharedExpense } from "../api.js";

export default function SharedPage({ user, onLogin, refreshExpenses }) {
  const { token } = useParams();
  const [shared, setShared] = useState(null);
  const [status, setStatus] = useState("Loading shared expense...");

  useEffect(() => {
    async function load() {
      try {
        const data = await getSharedExpense(token);
        setShared(data);
        setStatus("");
      } catch (err) {
        setStatus(err.message || "Unable to load shared expense.");
      }
    }
    load();
  }, [token]);

  async function handleImport() {
    if (!user) {
      setStatus("Sign in to import this expense.");
      return;
    }
    try {
      setStatus("Importing...");
      await cloneSharedExpense(token, user.token);
      setStatus("Imported to your expenses.");
      refreshExpenses?.();
    } catch (err) {
      setStatus(err.message || "Unable to import expense.");
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Shared expense</p>
          <h1>View and import this entry</h1>
          <p className="lede">
            Anyone with this link can view the expense. Sign in to save a copy to your account.
          </p>
        </div>
      </header>

      <main className="grid">
        <section className="panel">
          {!user ? <LoginGate onLogin={onLogin} /> : null}
          {shared ? (
            <article className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">{shared.description || "Untitled expense"}</div>
                  <div className="muted">{shared.date}</div>
                  {shared.is_recurring ? (
                    <span className="pill">Recurring · {shared.frequency || "unspecified"}</span>
                  ) : null}
                </div>
                <div className="amount">${Number(shared.amount).toFixed(2)}</div>
              </div>
              {shared.attachment_filename ? (
                <a className="link" href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/shared/${token}/attachment`}>
                  Download {shared.attachment_filename}
                </a>
              ) : (
                <span className="muted small">No attachment</span>
              )}
            </article>
          ) : null}
          {status ? <p className="status">{status}</p> : null}
          <div className="form-actions">
            <button onClick={handleImport} disabled={!user || !shared}>
              Add to my expenses
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
