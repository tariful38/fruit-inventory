
from sqlalchemy import or_
from  db import session_local
from model.fruit import Fruits


class FruitRepository:
    def __init__(self):
        self.db = session_local()

    def get_all_fruits(self, search: str = None, category: str = None):
        query = self.db.query(Fruits)
        if search:
            like = f"%{search}%"
            query = query.filter(or_(Fruits.name.ilike(like), Fruits.sku.ilike(like)))
        if category:
            query = query.filter(Fruits.category == category)
        return query.order_by(Fruits.name).all()

    def get_fruit_by_sku(self, sku: str):
        return self.db.query(Fruits).filter(Fruits.sku == sku).first()

    def create_fruit(self, fruit: Fruits):
        self.db.add(fruit)
        self.db.commit()

    def update_fruit(self, fruit: Fruits):
        self.db.merge(fruit)
        self.db.commit()

    def delete_fruit(self, fruit: Fruits):
        self.db.delete(fruit)
        self.db.commit()
