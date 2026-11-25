# Stock table -> how much of each fruit (by sku) we have, its price and expiry
from sqlalchemy import Column, Integer, String, Float, Date
from db import base


class Stock(base):
    __tablename__ = "stock"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fruit_sku = Column(String(20), unique=True)
    quantity_kg = Column(Float)
    price_per_kg = Column(Float)
    reorder_level = Column(Float)
    expiry_date = Column(Date)
