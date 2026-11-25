# Fruits table -> what the fruit is
from sqlalchemy import Column, Integer, String
from db import base


class Fruits(base):
    __tablename__ = "fruits"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100))
    category = Column(String(50))
    origin = Column(String(100))
    sku = Column(String(20), unique=True, index=True)   # e.g. "APL-001"
