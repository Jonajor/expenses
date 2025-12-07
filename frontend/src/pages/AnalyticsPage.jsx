import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function parseDateSafe(dateStr) {
  const parts = dateStr?.split("-");
  if (!parts || parts.length < 3) return null;
  const [year, month, day] = parts.map((p) => Number(p));
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildMonthlyData(expenses) {
  const map = new Map();
  expenses.forEach((expense) => {
    const date = parseDateSafe(expense.date);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = map.get(key) || 0;
    map.set(key, current + Number(expense.amount || 0));
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([month, total]) => ({
      month,
      total: Number(total.toFixed(2)),
    }));
}

function buildTopExpenses(expenses, limit = 5) {
  return [...expenses]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, limit)
    .map((exp, index) => ({
      rank: index + 1,
      label: exp.description || exp.date || `Expense ${exp.id}`,
      amount: Number(exp.amount || 0),
    }));
}

function buildAttachmentSplit(expenses) {
  let withAttachment = 0;
  let withoutAttachment = 0;
  expenses.forEach((exp) => {
    if (exp.attachment_filename) withAttachment += 1;
    else withoutAttachment += 1;
  });
  return [
    { label: "With attachment", count: withAttachment },
    { label: "No attachment", count: withoutAttachment },
  ];
}

export default function AnalyticsPage({ expenses, loading, onRefresh }) {
  const [viewMode, setViewMode] = useState("all"); // all | recurring | one-time
  const captureRef = useRef(null);

  const filteredExpenses = useMemo(() => {
    if (viewMode === "recurring") return expenses.filter((e) => e.is_recurring);
    if (viewMode === "one-time") return expenses.filter((e) => !e.is_recurring);
    return expenses;
  }, [expenses, viewMode]);

  const monthly = buildMonthlyData(filteredExpenses);
  const topFive = buildTopExpenses(filteredExpenses, 5);
  const attachmentSplit = buildAttachmentSplit(filteredExpenses);
  const total = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const avg = filteredExpenses.length ? total / filteredExpenses.length : 0;
  const recurring = filteredExpenses.filter((e) => e.is_recurring);
  const oneTime = filteredExpenses.filter((e) => !e.is_recurring);
  const recurringTotal = recurring.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const oneTimeTotal = oneTime.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const attachmentCount = filteredExpenses.filter((e) => e.attachment_filename).length;

  async function handleDownloadPdf() {
    // Only allow download in "all" mode to satisfy request.
    if (viewMode !== "all") {
      setViewMode("all");
      // Wait a tick for the UI to re-render with all data.
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const node = captureRef.current;
    if (!node) return;
    const canvas = await html2canvas(node, { backgroundColor: "#0f172a", scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("analytics.pdf");
  }

  return (
    <>
      <header className="hero">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Visualize expense trends</h1>
          <p className="lede">
            See monthly totals, top spend entries, and attachment coverage at a glance.
          </p>
        </div>
        <div className="controls">
          <button className="ghost" onClick={onRefresh} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh data"}
          </button>
          <button className="ghost" onClick={handleDownloadPdf} disabled={loading}>
            Download PDF (All)
          </button>
        </div>
      </header>

      <div className="controls segmented">
        <span className="muted">View</span>
        <div className="segmented-buttons">
          {[
            { key: "all", label: "All" },
            { key: "recurring", label: "Recurring" },
            { key: "one-time", label: "One-time" },
          ].map((option) => (
            <button
              key={option.key}
              className={viewMode === option.key ? "segmented-btn active" : "segmented-btn"}
              onClick={() => setViewMode(option.key)}
              disabled={loading}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <section className="analytics-grid" ref={captureRef}>
        <div className="panel stats">
          <div>
            <p className="muted">Total spend</p>
            <h2>${total.toFixed(2)}</h2>
          </div>
          <div>
            <p className="muted">Average per expense</p>
            <h2>${avg.toFixed(2)}</h2>
          </div>
          <div>
            <p className="muted">Entries</p>
            <h2>{filteredExpenses.length}</h2>
          </div>
          <div>
            <p className="muted">Recurring / One-time</p>
            <h2>
              {recurring.length} / {oneTime.length}
            </h2>
            <p className="muted small">
              ${recurringTotal.toFixed(2)} recurring · ${oneTimeTotal.toFixed(2)} one-time
            </p>
          </div>
          <div>
            <p className="muted">Attachments</p>
            <h2>
              {attachmentCount}/{filteredExpenses.length || 0}
            </h2>
          </div>
        </div>

        <div className="panel wide">
          <div className="panel-header">
            <h2>Spending by month</h2>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#22d3ee"
                  fill="url(#colorSpend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Top expenses</h2>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topFive} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={120}
                  stroke="#94a3b8"
                />
                <Tooltip />
                <Bar dataKey="amount" fill="#22d3ee" radius={[4, 4, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Attachment coverage</h2>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attachmentSplit} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#818cf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Top 5 details</h2>
          </div>
          <ul className="detail-list">
            {topFive.map((item) => (
              <li key={item.rank}>
                <span className="muted">#{item.rank}</span>
                <span>{item.label}</span>
                <span className="amount">${item.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
