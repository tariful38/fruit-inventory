
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status

from service.fruit_service import FruitService
from utils.schema import FruitCreate, FruitUpdate, FruitResponse, InventorySummary, StockAdjust

router = APIRouter(prefix="/fruits", tags=["Fruit"])



@router.get("", response_model=List[FruitResponse])
def get_all_fruits(
    search: Optional[str] = None,
    category: Optional[str] = None,
    stock_status: Optional[str] = Query(default=None, alias="status"),
):
    return FruitService().get_fruits(search, category, stock_status)


@router.get("/summary", response_model=InventorySummary)
def get_summary():
    return FruitService().get_summary()


@router.get("/{sku}", response_model=FruitResponse)
def get_one_fruit(sku: str):
    return FruitService().get_fruit(sku)


@router.post("", response_model=FruitResponse, status_code=status.HTTP_201_CREATED)
def add_fruit(payload: FruitCreate):
    return FruitService().add_fruit(payload)


@router.patch("/{sku}", response_model=FruitResponse)
def update_fruit(sku: str, payload: FruitUpdate):
    return FruitService().update_fruit(sku, payload)


@router.delete("/{sku}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fruit(sku: str):
    FruitService().delete_fruit(sku)


@router.post("/{sku}/add-stock", response_model=FruitResponse)
def add_stock(sku: str, payload: StockAdjust):
    return FruitService().add_stock_quantity(sku, payload)


@router.post("/{sku}/remove-stock", response_model=FruitResponse)
def remove_stock(sku: str, payload: StockAdjust):
    return FruitService().remove_stock_quantity(sku, payload)
