from model.stock import Stock
from  db import session_local


class StockRepository:
    def __init__(self):
        self.db = session_local()

    def get_stock_by_sku(self, sku: str):
        return self.db.query(Stock).filter(Stock.fruit_sku == sku).first()

    def add_stock(self, stock: Stock):
        self.db.add(stock)
        self.db.commit()

    def update_stock(self, stock: Stock):
        self.db.merge(stock)
        self.db.commit()

    def delete_stock(self, stock: Stock):
        self.db.delete(stock)
        self.db.commit()
