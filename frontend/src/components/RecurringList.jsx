export default function RecurringList({ items, loading, onDelete }) {
  if (loading) {
    return <div className="list muted">Loading recurring...</div>;
  }

  if (!items?.length) {
    return <div className="list muted">No recurring expenses yet.</div>;
  }

  return (
    <div className="list">
      {items.map((recurring) => (
        <article className="card" key={recurring.id}>
          <div className="card-header">
            <div>
              <div className="card-title">
                {recurring.description || "Recurring expense"}
              </div>
              <div className="muted">
                Starts {recurring.start_date} · {recurring.frequency}
              </div>
            </div>
            <div className="amount">${Number(recurring.amount).toFixed(2)}</div>
          </div>
          <div className="card-actions">
            <button className="ghost small" onClick={() => onDelete?.(recurring.id)}>
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
