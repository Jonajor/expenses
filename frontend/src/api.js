const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function listExpenses(authToken) {
  const res = await fetch(`${API_BASE_URL}/list/`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch expenses");
  const data = await res.json();
  return Object.entries(data || {}).map(([id, value]) => ({
    id: Number(id),
    ...value,
  }));
}

export async function addExpense(payload, authToken) {
  const formData = new FormData();
  formData.append("date", payload.date);
  formData.append("amount", payload.amount);
  if (payload.description) formData.append("description", payload.description);
  if (payload.attachment) formData.append("attachment", payload.attachment);
  formData.append("is_recurring", payload.is_recurring ? "true" : "false");
  if (payload.frequency) formData.append("frequency", payload.frequency);

  const res = await fetch(`${API_BASE_URL}/add`, {
    method: "POST",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to add expense");
  }
  return res.json();
}

export function attachmentUrl(expenseId) {
  return `${API_BASE_URL}/attachment/${expenseId}`;
}

export async function getExpense(expenseId, authToken) {
  const res = await fetch(`${API_BASE_URL}/${expenseId}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch expense");
  return res.json();
}

export async function deleteExpense(expenseId, authToken) {
  const res = await fetch(`${API_BASE_URL}/delete/${expenseId}`, {
    method: "DELETE",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (!res.ok) throw new Error("Failed to delete expense");
  return res.text();
}

export async function summaryTotal(authToken) {
  const res = await fetch(`${API_BASE_URL}/summary/`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.text();
}

export async function summaryByMonth(monthNumber, authToken) {
  const res = await fetch(`${API_BASE_URL}/summary/${monthNumber}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch monthly summary");
  return res.text();
}

export async function createShare(expenseId, authToken) {
  const res = await fetch(`${API_BASE_URL}/share/${expenseId}`, {
    method: "POST",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to create share link");
  }
  return res.json();
}

export async function getSharedExpense(token) {
  const res = await fetch(`${API_BASE_URL}/shared/${token}`);
  if (!res.ok) throw new Error("Failed to fetch shared expense");
  return res.json();
}

export async function cloneSharedExpense(token, authToken) {
  const res = await fetch(`${API_BASE_URL}/shared/${token}/clone`, {
    method: "POST",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to import shared expense");
  }
  return res.json();
}

export async function listRecurring(authToken) {
  const res = await fetch(`${API_BASE_URL}/recurring/list`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch recurring expenses");
  const data = await res.json();
  return Object.entries(data || {}).map(([id, value]) => ({
    id: Number(id),
    ...value,
  }));
}

export async function addRecurring(payload, authToken) {
  const formData = new FormData();
  formData.append("start_date", payload.start_date);
  formData.append("amount", payload.amount);
  if (payload.description) formData.append("description", payload.description);
  formData.append("frequency", payload.frequency);

  const res = await fetch(`${API_BASE_URL}/recurring/add`, {
    method: "POST",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to add recurring expense");
  }
  return res.json();
}

export async function deleteRecurring(recurringId, authToken) {
  const res = await fetch(`${API_BASE_URL}/recurring/delete/${recurringId}`, {
    method: "DELETE",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (!res.ok) throw new Error("Failed to delete recurring expense");
  return res.text();
}
