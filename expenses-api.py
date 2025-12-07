from datetime import datetime
from uuid import uuid4
import base64
import json

from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, Tuple

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Expenses(BaseModel):
    id: int | None = None
    date: str
    description: str | None = None
    amount: float
    attachment_filename: Optional[str] = None
    attachment_content_type: Optional[str] = None
    is_recurring: bool = False
    frequency: Optional[str] = None

class RecurringExpense(BaseModel):
    id: int | None = None
    start_date: str
    description: str | None = None
    amount: float
    frequency: str  # daily, weekly, monthly, yearly

expenses_db: Dict[str, Dict[int, Dict[str, object]]] = {}
next_expense_id: Dict[str, int] = {}
recurring_db: Dict[str, Dict[int, RecurringExpense]] = {}
next_recurring_id: Dict[str, int] = {}
shared_links: Dict[str, Tuple[str, int]] = {}  # token -> (owner_key, expense_id)

def _decode_bearer_sub(auth_header: str) -> str | None:
    if not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    parts = token.split(".")
    if len(parts) < 2:
        return None
    payload_b64 = parts[1]
    # Pad base64 if needed
    padding = "=" * (-len(payload_b64) % 4)
    try:
        payload_json = base64.urlsafe_b64decode(payload_b64 + padding).decode()
        payload = json.loads(payload_json)
        return payload.get("sub") or payload.get("email")
    except Exception:
        return None

def _get_user_key(request: Request) -> str:
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization required")
    decoded = _decode_bearer_sub(auth_header)
    return decoded or auth_header

def _user_store(user_key: str):
    if user_key not in expenses_db:
        expenses_db[user_key] = {}
        next_expense_id[user_key] = 1
    if user_key not in recurring_db:
        recurring_db[user_key] = {}
        next_recurring_id[user_key] = 1
    return expenses_db[user_key], recurring_db[user_key]

def _serialize_expense(expense_entry: Dict[str, object]) -> Expenses:
    expense: Expenses = expense_entry["expense"]  # type: ignore[assignment]
    expense.attachment_filename = expense_entry.get("attachment_filename")  # type: ignore[assignment]
    expense.attachment_content_type = expense_entry.get("attachment_content_type")  # type: ignore[assignment]
    return expense

def _clone_expense(expense_entry: Dict[str, object]) -> Expenses:
    exp: Expenses = expense_entry["expense"]  # type: ignore[assignment]
    return Expenses(
        id=exp.id,
        date=exp.date,
        description=exp.description,
        amount=exp.amount,
        attachment_filename=expense_entry.get("attachment_filename"),  # type: ignore[arg-type]
        attachment_content_type=expense_entry.get("attachment_content_type"),  # type: ignore[arg-type]
        is_recurring=exp.is_recurring,
        frequency=exp.frequency,
    )

def _get_shared_entry(token: str) -> Tuple[Dict[str, object], bytes | None, str | None, str | None]:
    if token not in shared_links:
        raise HTTPException(status_code=404, detail="Shared link not found")
    owner_key, expense_id = shared_links[token]
    store, _ = _user_store(owner_key)
    if expense_id not in store:
        raise HTTPException(status_code=404, detail="Expense not found")
    expense_entry = store[expense_id]
    return (
        expense_entry,
        expense_entry.get("attachment_bytes"),  # type: ignore[assignment]
        expense_entry.get("attachment_filename"),  # type: ignore[assignment]
        expense_entry.get("attachment_content_type"),  # type: ignore[assignment]
    )

@app.post("/add", response_model=Expenses)
async def add_expenses(
    request: Request,
    date: str = Form(...),
    amount: float = Form(...),
    description: str | None = Form(None),
    attachment: UploadFile | None = File(None),
    is_recurring: bool = Form(False),
    frequency: str | None = Form(None),
):
    user_key = _get_user_key(request)
    store, _ = _user_store(user_key)

    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD format.")
    
    if amount < 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    if is_recurring:
        valid_frequencies = {"daily", "weekly", "monthly", "yearly"}
        if frequency not in valid_frequencies:
            raise HTTPException(
                status_code=400,
                detail="Invalid frequency. Use daily, weekly, monthly, or yearly.",
            )
    else:
        frequency = None
    
    attachment_bytes: Optional[bytes] = None
    attachment_filename: Optional[str] = None
    attachment_content_type: Optional[str] = None

    if attachment:
        incoming_type = attachment.content_type or ""
        if not (incoming_type.startswith("image/") or incoming_type == "application/pdf"):
            raise HTTPException(status_code=400, detail="Only image or PDF attachments are supported")
        attachment_bytes = await attachment.read()
        attachment_filename = attachment.filename
        attachment_content_type = incoming_type or "application/octet-stream"
    
    expense_id = next_expense_id[user_key]
    expense = Expenses(
        id=expense_id,
        date=date,
        description=description,
        amount=amount,
        is_recurring=is_recurring,
        frequency=frequency,
    )
    store[expense_id] = {
        "expense": expense,
        "attachment_bytes": attachment_bytes,
        "attachment_filename": attachment_filename,
        "attachment_content_type": attachment_content_type,
    }
    next_expense_id[user_key] += 1
    return _serialize_expense(store[expense_id])

@app.get("/list/", response_model=Dict[int, Expenses])
async def list_all(request: Request):
    user_key = _get_user_key(request)
    store, _ = _user_store(user_key)
    return {expense_id: _serialize_expense(entry) for expense_id, entry in store.items()}

@app.get("/{expense_id}", response_model=Expenses)
async def get_expense(expense_id: int, request: Request):
    user_key = _get_user_key(request)
    store, _ = _user_store(user_key)
    if expense_id not in store:
        raise HTTPException(status_code=404, detail="Expense not found")
    return _serialize_expense(store[expense_id])

@app.get("/summary/")
async def summary(request: Request):
    user_key = _get_user_key(request)
    store, _ = _user_store(user_key)
    total = 0
    for expense_entry in store.values():
        expense: Expenses = expense_entry["expense"]  # type: ignore[assignment]
        total += expense.amount

    return f"Total expenses: ${total}"

@app.get("/summary/{month}")
async def month_summary(month: int, request: Request):
    user_key = _get_user_key(request)
    store, _ = _user_store(user_key)
    total = 0
    month_full_name = ""
    for expense_entry in store.values():
        expense: Expenses = expense_entry["expense"]  # type: ignore[assignment]
        date_object = datetime.strptime(expense.date, "%Y-%m-%d")
        month_number = date_object.month
        if month == month_number:
            total += expense.amount
            month_full_name = date_object.strftime("%B")
    
    return f"Total expenses for {month_full_name}: ${total}"

@app.delete("/delete/{expense_id}")
async def delete(expense_id: int, request: Request):
    user_key = _get_user_key(request)
    store, _ = _user_store(user_key)
    if expense_id not in store:
        raise HTTPException(status_code=404, detail="Expense not found")
    del store[expense_id]
    return "Expense deleted sucessfully"

@app.get("/attachment/{expense_id}")
async def get_attachment(expense_id: int, request: Request):
    user_key = _get_user_key(request)
    store, _ = _user_store(user_key)
    if expense_id not in store:
        raise HTTPException(status_code=404, detail="Expense not found")
    expense_entry = store[expense_id]
    attachment_bytes: Optional[bytes] = expense_entry.get("attachment_bytes")  # type: ignore[assignment]
    attachment_filename: Optional[str] = expense_entry.get("attachment_filename")  # type: ignore[assignment]
    attachment_content_type: Optional[str] = expense_entry.get("attachment_content_type")  # type: ignore[assignment]

    if attachment_bytes is None:
        raise HTTPException(status_code=404, detail="No attachment for this expense")

    headers = {}
    if attachment_filename:
        headers["Content-Disposition"] = f'attachment; filename="{attachment_filename}"'
    return Response(content=attachment_bytes, media_type=attachment_content_type, headers=headers)

@app.post("/share/{expense_id}")
async def create_share(expense_id: int, request: Request):
    user_key = _get_user_key(request)
    store, _ = _user_store(user_key)
    if expense_id not in store:
        raise HTTPException(status_code=404, detail="Expense not found")
    token = uuid4().hex
    shared_links[token] = (user_key, expense_id)
    return {"token": token, "path": f"/shared/{token}"}

@app.get("/shared/{token}", response_model=Expenses)
async def get_shared_expense(token: str):
    expense_entry, _, _, _ = _get_shared_entry(token)
    return _clone_expense(expense_entry)

@app.get("/shared/{token}/attachment")
async def get_shared_attachment(token: str):
    expense_entry, attachment_bytes, attachment_filename, attachment_content_type = _get_shared_entry(token)
    if attachment_bytes is None:
        raise HTTPException(status_code=404, detail="No attachment for this expense")

    headers = {}
    if attachment_filename:
        headers["Content-Disposition"] = f'attachment; filename="{attachment_filename}"'
    return Response(content=attachment_bytes, media_type=attachment_content_type, headers=headers)

@app.post("/shared/{token}/clone", response_model=Expenses)
async def clone_shared_expense(token: str, request: Request):
    user_key = _get_user_key(request)
    store, _ = _user_store(user_key)
    (
        expense_entry,
        attachment_bytes,
        attachment_filename,
        attachment_content_type,
    ) = _get_shared_entry(token)

    expense_id = next_expense_id[user_key]
    exp_copy = _clone_expense(expense_entry)
    exp_copy.id = expense_id
    store[expense_id] = {
        "expense": exp_copy,
        "attachment_bytes": attachment_bytes,
        "attachment_filename": attachment_filename,
        "attachment_content_type": attachment_content_type,
    }
    next_expense_id[user_key] += 1
    return _serialize_expense(store[expense_id])

@app.post("/recurring/add", response_model=RecurringExpense)
async def add_recurring_expense(
    request: Request,
    start_date: str = Form(...),
    amount: float = Form(...),
    description: str | None = Form(None),
    frequency: str = Form(...),
):
    user_key = _get_user_key(request)
    _, recurring_store = _user_store(user_key)

    try:
        datetime.strptime(start_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD.")

    if amount < 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    valid_frequencies = {"daily", "weekly", "monthly", "yearly"}
    if frequency not in valid_frequencies:
        raise HTTPException(status_code=400, detail="Invalid frequency. Use daily, weekly, monthly, or yearly.")

    recurring_id = next_recurring_id[user_key]
    entry = RecurringExpense(
        id=recurring_id,
        start_date=start_date,
        description=description,
        amount=amount,
        frequency=frequency,
    )
    recurring_store[recurring_id] = entry
    next_recurring_id[user_key] += 1
    return entry

@app.get("/recurring/list", response_model=Dict[int, RecurringExpense])
async def list_recurring(request: Request):
    user_key = _get_user_key(request)
    _, recurring_store = _user_store(user_key)
    return recurring_store

@app.get("/recurring/{recurring_id}", response_model=RecurringExpense)
async def get_recurring(recurring_id: int, request: Request):
    user_key = _get_user_key(request)
    _, recurring_store = _user_store(user_key)
    if recurring_id not in recurring_store:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return recurring_store[recurring_id]

@app.delete("/recurring/delete/{recurring_id}")
async def delete_recurring(recurring_id: int, request: Request):
    user_key = _get_user_key(request)
    _, recurring_store = _user_store(user_key)
    if recurring_id not in recurring_store:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    del recurring_store[recurring_id]
    return "Recurring expense deleted successfully"
