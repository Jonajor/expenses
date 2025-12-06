from datetime import datetime

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict

app = FastAPI()

class Expenses(BaseModel):
    id: int | None = None
    date: str
    description: str | None = None
    amount: float

expenses_db: Dict[int, Expenses] = {}
next_expense_id = 1

@app.post("/add")
async def add_expenses(expenses: Expenses):
    global next_expense_id

    try:
        datetime.strptime(expenses.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD format.")
    
    if expenses.amount < 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    
    expense_id = next_expense_id
    expenses.id = expense_id
    expenses_db[expense_id] = expenses
    next_expense_id += 1
    return f"Expense added sucessfully (ID: {expense_id})"

@app.get("/list/", response_model=Dict[int, Expenses])
async def list_all():
    return expenses_db

@app.get("/{expense_id}")
async def get_expense(expense_id: int):
    return expenses_db.get(expense_id)

@app.get("/summary/")
async def summary():
    total = 0
    for expense in expenses_db.values():
        total += expense.amount

    return f"Total expenses: ${total}"

@app.get("/summary/{month}")
async def month_summary(month: int):
    total = 0
    month_full_name = ""
    for expense in expenses_db.values():
        date_object = datetime.strptime(expense.date, "%Y-%m-%d")
        month_number = date_object.month
        if month == month_number:
            total += expense.amount
            month_full_name = date_object.strftime("%B")
    
    return f"Total expenses for {month_full_name}: ${total}"

@app.delete("/delete/{expense_id}")
async def delete(expense_id: int):
    if expense_id not in expenses_db:
        raise HTTPException(status_code=404, detail="Expense not found")
    del expenses_db[expense_id]
    return "Expense deleted sucessfully"