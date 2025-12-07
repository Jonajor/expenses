export default function ExpenseList({
  expenses,
  loading,
  getAttachmentUrl,
  onDelete,
  onShare,
}) {
  if (loading) {
    return <div className="list muted">Loading expenses...</div>;
  }

  if (!expenses?.length) {
    return <div className="list muted">No expenses yet.</div>;
  }

  return (
    <div className="list">
      {expenses.map((expense) => (
        <article className="card" key={expense.id}>
          <div className="card-header">
            <div>
              <div className="card-title">
                {expense.description || "Untitled expense"}
              </div>
              <div className="muted">{expense.date}</div>
              {expense.is_recurring ? (
                <span className="pill">
                  Recurring · {expense.frequency || "unspecified"}
                </span>
              ) : null}
            </div>
            <div className="amount">${Number(expense.amount).toFixed(2)}</div>
          </div>
          {expense.attachment_filename ? (
            <a
              className="link"
              href={getAttachmentUrl(expense.id)}
              target="_blank"
              rel="noreferrer"
            >
              Download {expense.attachment_filename}
            </a>
          ) : (
            <span className="muted small">No attachment</span>
          )}
          <div className="card-actions">
            <button className="ghost small" onClick={() => onDelete?.(expense.id)}>
              Delete
            </button>
            <button className="ghost small" onClick={() => onShare?.(expense.id)}>
              Share
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
