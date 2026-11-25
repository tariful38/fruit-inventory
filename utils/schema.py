
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class FruitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str
    origin: str
    sku: str = Field(min_length=1, max_length=20)
    quantity_kg: float = Field(default=0, ge=0)        # can't be negative
    price_per_kg: float = Field(gt=0)                  # must be more than 0
    reorder_level: float = Field(default=10, ge=0)
    expiry_date: date


class FruitUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    category: Optional[str] = None
    origin: Optional[str] = None
    quantity_kg: Optional[float] = Field(default=None, ge=0)
    price_per_kg: Optional[float] = Field(default=None, gt=0)
    reorder_level: Optional[float] = Field(default=None, ge=0)
    expiry_date: Optional[date] = None


class FruitResponse(BaseModel):
    id: int
    name: str
    category: str
    origin: str
    sku: str
    quantity_kg: float
    price_per_kg: float
    reorder_level: float
    expiry_date: Optional[date]
    total_value: float
    status: str


class InventorySummary(BaseModel):
    total_fruits: int
    total_value: float
    low_stock: int
    expiring_or_expired: int


class StockAdjust(BaseModel):
    quantity_kg: float = Field(gt=0)
