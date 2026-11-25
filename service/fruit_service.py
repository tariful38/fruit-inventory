
from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from model.fruit import Fruits
from model.stock import Stock
from repository.fruit_repository import FruitRepository
from repository.stock_repository import StockRepository
from utils.schema import FruitCreate, FruitUpdate, FruitResponse, InventorySummary, StockAdjust

EXPIRING_SOON_DAYS = 3   # fruit that expires within 3 days is "Expiring Soon"


def get_status(quantity_kg: float, reorder_level: float, expiry_date) -> str:
    today = date.today()
    if expiry_date is not None and expiry_date < today:
        return "Expired"
    if quantity_kg <= 0:
        return "Out of Stock"
    if quantity_kg <= reorder_level:
        return "Low Stock"
    if expiry_date is not None and expiry_date <= today + timedelta(days=EXPIRING_SOON_DAYS):
        return "Expiring Soon"
    return "In Stock"


class FruitService:
    def __init__(self):
        self.fruit_repository = FruitRepository()
        self.stock_repository = StockRepository()

    def make_response(self, fruit: Fruits) -> FruitResponse:
        stock = self.stock_repository.get_stock_by_sku(fruit.sku)
        quantity = stock.quantity_kg if stock else 0
        price = stock.price_per_kg if stock else 0
        reorder = stock.reorder_level if stock else 0
        expiry = stock.expiry_date if stock else None

        return FruitResponse(
            id=fruit.id,
            name=fruit.name,
            category=fruit.category,
            origin=fruit.origin,
            sku=fruit.sku,
            quantity_kg=quantity,
            price_per_kg=price,
            reorder_level=reorder,
            expiry_date=expiry,
            total_value=round(quantity * price, 2),
            status=get_status(quantity, reorder, expiry),
        )

    def find_fruit_or_404(self, sku: str) -> Fruits:
        fruit = self.fruit_repository.get_fruit_by_sku(sku)
        if fruit is None:
            raise HTTPException(status_code=404, detail=f"No fruit found with SKU {sku}")
        return fruit

    def get_fruits(self, search: str = None, category: str = None, status: str = None):
        fruits = self.fruit_repository.get_all_fruits(search, category)
        items = [self.make_response(fruit) for fruit in fruits]
        if status:
            items = [i for i in items if i.status.lower() == status.lower()]
        return items

    def get_fruit(self, sku: str):
        return self.make_response(self.find_fruit_or_404(sku))

    def get_summary(self) -> InventorySummary:
        items = self.get_fruits()
        return InventorySummary(
            total_fruits=len(items),
            total_value=round(sum(i.total_value for i in items), 2),
            low_stock=sum(1 for i in items if i.status in ("Low Stock", "Out of Stock")),
            expiring_or_expired=sum(1 for i in items if i.status in ("Expiring Soon", "Expired")),
        )

    def add_fruit(self, payload: FruitCreate):
        if self.fruit_repository.get_fruit_by_sku(payload.sku):
            raise HTTPException(status_code=409, detail=f"SKU {payload.sku} already exists")

        fruit = Fruits(
            name=payload.name,
            category=payload.category,
            origin=payload.origin,
            sku=payload.sku,
        )
        stock = Stock(
            fruit_sku=payload.sku,
            quantity_kg=payload.quantity_kg,
            price_per_kg=payload.price_per_kg,
            reorder_level=payload.reorder_level,
            expiry_date=payload.expiry_date,
        )
        self.fruit_repository.create_fruit(fruit)
        self.stock_repository.add_stock(stock)
        return self.make_response(fruit)

    def update_fruit(self, sku: str, payload: FruitUpdate):
        fruit = self.find_fruit_or_404(sku)

        if payload.name is not None:
            fruit.name = payload.name
        if payload.category is not None:
            fruit.category = payload.category
        if payload.origin is not None:
            fruit.origin = payload.origin

        stock = self.stock_repository.get_stock_by_sku(sku)
        if stock is None:  # create a stock row if none exists
            stock = Stock(fruit_sku=sku, quantity_kg=0, price_per_kg=0.01, reorder_level=10)
            self.stock_repository.add_stock(stock)

        if payload.quantity_kg is not None:
            stock.quantity_kg = payload.quantity_kg
        if payload.price_per_kg is not None:
            stock.price_per_kg = payload.price_per_kg
        if payload.reorder_level is not None:
            stock.reorder_level = payload.reorder_level
        if payload.expiry_date is not None:
            stock.expiry_date = payload.expiry_date

        self.fruit_repository.update_fruit(fruit)
        self.stock_repository.update_stock(stock)
        return self.make_response(fruit)

    def get_or_create_stock(self, sku: str) -> Stock:
        stock = self.stock_repository.get_stock_by_sku(sku)
        if stock is None:
            stock = Stock(fruit_sku=sku, quantity_kg=0, price_per_kg=0.01, reorder_level=10)
            self.stock_repository.add_stock(stock)
        return stock

    def add_stock_quantity(self, sku: str, payload: StockAdjust):
        fruit = self.find_fruit_or_404(sku)
        stock = self.get_or_create_stock(sku)
        stock.quantity_kg = round((stock.quantity_kg or 0) + payload.quantity_kg, 2)
        self.stock_repository.update_stock(stock)
        return self.make_response(fruit)

    def remove_stock_quantity(self, sku: str, payload: StockAdjust):
        fruit = self.find_fruit_or_404(sku)
        stock = self.get_or_create_stock(sku)
        available = stock.quantity_kg or 0
        if payload.quantity_kg > available:
            raise HTTPException(status_code=400, detail=f"Not enough stock: only {available} kg available")
        stock.quantity_kg = round(available - payload.quantity_kg, 2)
        self.stock_repository.update_stock(stock)
        return self.make_response(fruit)

    def delete_fruit(self, sku: str):
        fruit = self.find_fruit_or_404(sku)
        stock = self.stock_repository.get_stock_by_sku(sku)
        if stock:
            self.stock_repository.delete_stock(stock)
        self.fruit_repository.delete_fruit(fruit)
