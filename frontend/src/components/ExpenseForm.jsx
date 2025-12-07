import { useMemo, useState } from "react";

export default function ExpenseForm({ onCreate, disabled }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState("monthly");

  function handleSubmit(event) {
    event.preventDefault();
    if (disabled) return;
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount)) return;

    onCreate({
      date,
      description,
      amount: numericAmount,
      attachment: file,
      is_recurring: isRecurring,
      frequency: isRecurring ? frequency : null,
    });

    setDescription("");
    setAmount("");
    setFile(null);
    setIsRecurring(false);
    setFrequency("monthly");
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          disabled={disabled}
        />
      </label>

      <label className="field">
        <span>Description</span>
        <input
          type="text"
          placeholder="Client dinner, laptop bag..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={disabled}
        />
      </label>

      <label className="field">
        <span>Amount</span>
        <input
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          disabled={disabled}
        />
      </label>

      <label className="field checkbox-row">
        <div className="checkbox-label">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            disabled={disabled}
          />
          <span>Mark as recurring</span>
        </div>
      </label>

      {isRecurring ? (
        <label className="field">
          <span>Frequency</span>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            disabled={disabled}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
      ) : null}

      <label className="field file">
        <div>
          <span>Attachment</span>
          <p className="muted">Image or PDF receipt (optional)</p>
        </div>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={disabled}
        />
        {file ? <p className="muted">Selected: {file.name}</p> : null}
      </label>

      <div className="form-actions">
        <button type="submit" disabled={disabled}>
          Add expense
        </button>
      </div>
    </form>
  );
}
