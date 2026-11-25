# Adds a few sample fruits.  Run once:  python seed.py
from datetime import date, timedelta

from db import engine, base, session_local
from model import fruit, stock   # registers the tables
from service.fruit_service import FruitService
from utils.schema import FruitCreate

base.metadata.create_all(bind=engine)
today = date.today()

samples = [
    ("Apple",      "Pome",     "Kashmir",  "APL-001", 120, 4.50, 20, 14),
    ("Banana",     "Tropical", "Ecuador",  "BAN-001",  15, 1.20, 25, 5),
    ("Mango",      "Tropical", "Rajshahi", "MNG-001",  60, 3.80, 15, 2),
    ("Orange",     "Citrus",   "Sylhet",   "ORG-001",  80, 2.10, 20, 10),
    ("Strawberry", "Berry",    "Egypt",    "STR-001",   0, 9.00, 5, 4),
    ("Grapes",     "Berry",    "Chile",    "GRP-001",  40, 6.25, 10, -1),
]

db = session_local()
service = FruitService(db)
for name, cat, origin, sku, qty, price, reorder, days in samples:
    try:
        service.add_fruit(FruitCreate(
            name=name, category=cat, origin=origin, sku=sku, quantity_kg=qty,
            price_per_kg=price, reorder_level=reorder,
            expiry_date=today + timedelta(days=days)))
        print("Added", name)
    except Exception as e:
        db.rollback()
        print("Skipped", name, "->", getattr(e, "detail", e))
db.close()
