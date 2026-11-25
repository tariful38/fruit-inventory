# ==========================================
# main.py  ->  The project starts from here
# Run:  uvicorn main:app --reload
# ==========================================
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from db import engine, base
from model import fruit, stock   # importing models registers the tables
from routers import fruit_controller

# Create the tables in the database if they don't exist yet
base.metadata.create_all(bind=engine)

app = FastAPI(title="Fruit Inventory Management")

# CORS: lets the API work even if the HTML is opened from elsewhere (e.g. VS Code Live Server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes: /fruits ...
app.include_router(fruit_controller.router)

# Frontend: opening http://127.0.0.1:8000 shows frontend/index.html
# (change to "frontend-bootstrap-advanced" to use the advanced UI)
FRONTEND_FOLDER = Path(__file__).parent / "frontend-bootstrap-advanced"
app.mount("/", StaticFiles(directory=FRONTEND_FOLDER, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
