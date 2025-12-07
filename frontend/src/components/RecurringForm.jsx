import { useMemo, useState } from "react";

export default function RecurringForm({ onCreate, disabled }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [startDate, setStartDate] = useState(today);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");

  function handleSubmit(event) {
    event.preventDefault();
    if (disabled) return;
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount)) return;

    onCreate({
      start_date: startDate,
      description,
      amount: numericAmount,
      frequency,
    });

    setDescription("");
    setAmount("");
    setFrequency("monthly");
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Start date</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
          disabled={disabled}
        />
      </label>

      <label className="field">
        <span>Description</span>
        <input
          type="text"
          placeholder="Subscription, rent, etc."
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

      <div className="form-actions">
        <button type="submit" disabled={disabled}>
          Add recurring
        </button>
      </div>
    </form>
  );
}
