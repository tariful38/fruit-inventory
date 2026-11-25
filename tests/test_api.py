# Run from the project folder:  pip install pytest httpx   then   python -m pytest
import os
import tempfile

# Use a throw-away database so tests never touch your real data
os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"

from datetime import date, timedelta
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
FUTURE = str(date.today() + timedelta(days=30))


def fruit(sku="T-001", **extra):
    data = {"name": "Test Mango", "category": "Tropical", "origin": "BD", "sku": sku,
            "quantity_kg": 50, "price_per_kg": 2.0, "reorder_level": 10, "expiry_date": FUTURE}
    data.update(extra)
    return data


def test_create_get_update_delete():
    r = client.post("/fruits", json=fruit("CRUD-1"))
    assert r.status_code == 201
    assert r.json()["total_value"] == 100.0 and r.json()["status"] == "In Stock"

    assert client.get("/fruits/CRUD-1").json()["name"] == "Test Mango"
    assert any(f["sku"] == "CRUD-1" for f in client.get("/fruits").json())

    r = client.patch("/fruits/CRUD-1", json={"quantity_kg": 5})
    assert r.json()["status"] == "Low Stock"

    assert client.delete("/fruits/CRUD-1").status_code == 204
    assert client.get("/fruits/CRUD-1").status_code == 404


def test_duplicate_and_validation():
    client.post("/fruits", json=fruit("DUP-1"))
    assert client.post("/fruits", json=fruit("DUP-1")).status_code == 409
    assert client.post("/fruits", json=fruit("BAD-1", price_per_kg=0)).status_code == 422
    assert client.post("/fruits", json=fruit("BAD-2", quantity_kg=-1)).status_code == 422


def test_stock_in_out():
    client.post("/fruits", json=fruit("STK-1", quantity_kg=10))
    r = client.post("/fruits/STK-1/add-stock", json={"quantity_kg": 15})
    assert r.json()["quantity_kg"] == 25
    r = client.post("/fruits/STK-1/remove-stock", json={"quantity_kg": 5})
    assert r.json()["quantity_kg"] == 20
    assert client.post("/fruits/STK-1/remove-stock", json={"quantity_kg": 999}).status_code == 400
    assert client.post("/fruits/STK-1/add-stock", json={"quantity_kg": 0}).status_code == 422
    assert client.post("/fruits/NOPE/add-stock", json={"quantity_kg": 1}).status_code == 404


def test_filters_and_summary():
    client.post("/fruits", json=fruit("FIL-1", name="Zebra Berry", category="Berry", quantity_kg=0))
    assert [f["sku"] for f in client.get("/fruits?search=zebra").json()] == ["FIL-1"]
    assert all(f["category"] == "Berry" for f in client.get("/fruits?category=Berry").json())
    assert any(f["sku"] == "FIL-1" for f in client.get("/fruits?status=Out of Stock").json())
    s = client.get("/fruits/summary").json()
    assert s["total_fruits"] >= 1 and s["low_stock"] >= 1
