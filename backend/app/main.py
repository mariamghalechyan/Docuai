from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer

from app.api.routes import auth, documents
from app.db.session import Base, engine

Base.metadata.create_all(bind=engine)

security = HTTPBearer()

app = FastAPI(
    title="DocuAI",
    description="AI-Powered Document Intelligence Platform",
    version="0.1.0",
    swagger_ui_parameters={"persistAuthorization": True},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://docuai-topaz.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)

@app.get("/health")
def health():
    return {"status": "ok"}