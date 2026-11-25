# Fruit Inventory Management

FastAPI + SQLAlchemy backend with a Bootstrap UI. Same layered structure as the student project:

    routers/  ->  service/  ->  repository/  ->  model/      (+ utils/schema.py, db.py, main.py)

## Run

    python -m venv .venv
    source .venv/bin/activate          # Windows: .venv\Scripts\activate
    pip install -r requirements.txt
    python seed.py                     # optional: sample fruits
    uvicorn main:app --reload

Open http://127.0.0.1:8000 (UI) and http://127.0.0.1:8000/docs (API docs).
Uses a local SQLite file by default. To use PostgreSQL/MySQL set `DATABASE_URL`.

## API

| Method | URL              | What it does                |
|--------|------------------|-----------------------------|
| GET    | /fruits                      | all fruits. Optional filters: `?search=` (name/SKU), `?category=`, `?status=` |
| GET    | /fruits/summary              | dashboard numbers           |
| GET    | /fruits/{sku}                | one fruit                   |
| POST   | /fruits                      | add a fruit (+ its stock)   |
| PATCH  | /fruits/{sku}                | update only the sent fields |
| DELETE | /fruits/{sku}                | delete fruit and its stock  |
| POST   | /fruits/{sku}/add-stock      | body `{"quantity_kg": 25}`, stock goes up |
| POST   | /fruits/{sku}/remove-stock   | body `{"quantity_kg": 5}`, stock goes down (400 if not enough) |

## Status rules (service/fruit_service.py)

Expired -> Out of Stock -> Low Stock (qty <= reorder level) -> Expiring Soon (within 3 days) -> In Stock

## Two UIs

`frontend/` is the simple one, `frontend-bootstrap-advanced/` adds summary cards, search and colored badges.
`main.py` serves the advanced one; change `FRONTEND_FOLDER` to switch.

## Frontend script structure

Both `script.js` files have two parts: **API functions** (`getFruits`, `getFruit`, `createFruit`,
`updateFruit`, `deleteFruit`, `addStock`, `removeStock`) and **page functions** (`loadFruits`,
`handleSubmit`, `startEdit`, `handleDelete`, `handleStock`) that call them.

## Tests

    pip install pytest httpx
    python -m pytest
