from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.api import auth, life, social, usage, profile, ai


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Social Life API",
    version="0.1.1",
    description="API do MVP da plataforma Minha Vida.",
    lifespan=lifespan,
)

# The browser sends a CORS preflight (OPTIONS) before POST /auth/register.
# Explicitly allow the Next.js development origin and the credentials used by
# the browser. Authorization headers are also allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(life.router)
app.include_router(social.router)
app.include_router(usage.router)
app.include_router(profile.router)
app.include_router(ai.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
