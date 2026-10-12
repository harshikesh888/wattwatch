from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator
from uuid import uuid4


BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"
DB_PATH = Path(os.environ.get("WATTWATCH_DB_PATH", BASE_DIR / "data" / "wattwatch.sqlite3"))
SECRET_FILE = BASE_DIR / "data" / ".secret.key"

ProblemKind = Literal["maintenance", "energy_waste"]
ProblemStatus = Literal["open", "in-progress"]

TOKEN_TTL_HOURS = int(os.environ.get("WATTWATCH_TOKEN_TTL_HOURS", "168"))  # 7 days
DEMO_EMAIL = "demo@wattwatch.local"
DEMO_PASSWORD = "demo1234"


def load_secret_key() -> str:
    env_key = os.environ.get("WATTWATCH_SECRET_KEY", "").strip()
    if env_key and len(env_key) >= 16:
        return env_key
    try:
        if SECRET_FILE.exists():
            saved = SECRET_FILE.read_text().strip()
            if len(saved) >= 16:
                return saved
    except OSError:
        pass
    generated = secrets.token_hex(32)
    try:
        SECRET_FILE.parent.mkdir(parents=True, exist_ok=True)
        SECRET_FILE.write_text(generated)
    except OSError:
        pass
    return generated


SECRET_KEY = load_secret_key()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ProblemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: ProblemKind = "maintenance"
    room_id: str = Field(min_length=1, max_length=32)
    room_name: str = Field(min_length=1, max_length=80)
    category: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=2000)
    reporter_name: str = Field(default="Facility team", min_length=1, max_length=100)
    status: ProblemStatus = "open"
    power_kw: float = Field(default=0, ge=0, le=1000)
    wasted_kwh: float = Field(default=0, ge=0, le=1_000_000)


class ProblemUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["open", "in-progress", "resolved"] | None = None
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    power_kw: float | None = Field(default=None, ge=0, le=1000)
    wasted_kwh: float | None = Field(default=None, ge=0, le=1_000_000)


class UserRegister(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=6, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if "@" not in cleaned or "." not in cleaned.split("@")[-1]:
            raise ValueError("Enter a valid email address.")
        return cleaned

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Enter your name.")
        return cleaned


class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return value.strip().lower()


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def connect_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with connect_db() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS problems (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL CHECK (kind IN ('maintenance', 'energy_waste')),
                room_id TEXT NOT NULL,
                room_name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                reporter_name TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('open', 'in-progress')),
                power_kw REAL NOT NULL DEFAULT 0,
                wasted_kwh REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS one_active_energy_problem_per_room
            ON problems(room_id) WHERE kind = 'energy_waste'
            """
        )
        db.execute(
            "CREATE INDEX IF NOT EXISTS problems_created_at ON problems(created_at DESC)"
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        db.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email)"
        )
    seed_demo_user()


def problem_dict(row: sqlite3.Row) -> dict[str, object]:
    return {
        "id": row["id"],
        "kind": row["kind"],
        "room_id": row["room_id"],
        "room_name": row["room_name"],
        "category": row["category"],
        "description": row["description"],
        "reporter_name": row["reporter_name"],
        "status": row["status"],
        "power_kw": row["power_kw"],
        "wasted_kwh": row["wasted_kwh"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def user_public(row: sqlite3.Row) -> dict[str, str]:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "created_at": row["created_at"],
    }


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# Password hashing (stdlib PBKDF2, no extra dependencies)
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    iterations = 200_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iterations_s, salt_hex, hash_hex = stored.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        iterations = int(iterations_s)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
        candidate = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, iterations
        )
        return hmac.compare_digest(candidate, expected)
    except (ValueError, TypeError):
        return False


# ---------------------------------------------------------------------------
# Tokens — minimal HS256 JWT implemented with hashlib/hmac (no new deps)
# ---------------------------------------------------------------------------

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(segment: str) -> bytes:
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment + padding)


def create_token(user_id: str, email: str) -> str:
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    now = datetime.now(timezone.utc)
    payload = _b64url_encode(
        json.dumps(
            {
                "sub": user_id,
                "email": email,
                "iat": int(now.timestamp()),
                "exp": int((now + timedelta(hours=TOKEN_TTL_HOURS)).timestamp()),
            }
        ).encode()
    )
    signing_input = f"{header}.{payload}".encode("ascii")
    signature = _b64url_encode(
        hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    )
    return f"{header}.{payload}.{signature}"


def decode_token(token: str) -> dict[str, object]:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid session. Please log in again.")
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    try:
        provided = _b64url_decode(signature_b64)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session. Please log in again.")
    if not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Invalid session. Please log in again.")
    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session. Please log in again.")
    exp = int(payload.get("exp", 0))
    if exp < int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    return payload


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in.")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in.")
    payload = decode_token(token)
    user_id = str(payload.get("sub", ""))
    with connect_db() as db:
        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    return user_public(row)


CurrentUser = Annotated[dict[str, str], Depends(get_current_user)]


def seed_demo_user() -> None:
    if os.environ.get("WATTWATCH_SEED_DEMO", "1") == "0":
        return
    with connect_db() as db:
        existing = db.execute("SELECT COUNT(*) AS n FROM users").fetchone()
        if existing and int(existing["n"]) > 0:
            return
        demo = db.execute("SELECT * FROM users WHERE email = ?", (DEMO_EMAIL,)).fetchone()
        if demo is None:
            db.execute(
                "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                (str(uuid4()), "Demo Student", DEMO_EMAIL, hash_password(DEMO_PASSWORD), utc_now()),
            )


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="WattWatch API", version="2.0.0", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Auth API
# ---------------------------------------------------------------------------

@app.post("/api/auth/register", status_code=201)
def register(payload: UserRegister) -> dict[str, object]:
    email = payload.email.strip().lower()
    name = payload.name.strip()
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    user_id = str(uuid4())
    now = utc_now()
    with connect_db() as db:
        existing = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing is not None:
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
        db.execute(
            "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, name, email, hash_password(payload.password), now),
        )
        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=500, detail="Account could not be created.")
    user = user_public(row)
    return {"token": create_token(user["id"], user["email"]), "user": user}


@app.post("/api/auth/login")
def login(payload: UserLogin) -> dict[str, object]:
    email = payload.email.strip().lower()
    with connect_db() as db:
        row = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    user = user_public(row)
    return {"token": create_token(user["id"], user["email"]), "user": user}


@app.get("/api/auth/me")
def auth_me(user: CurrentUser) -> dict[str, object]:
    return {"user": user}


@app.post("/api/auth/logout")
def auth_logout(user: CurrentUser) -> dict[str, object]:
    # Stateless JWT: the client discards the token. Endpoint exists so the UI
    # can ping logout for analytics / future block-list support.
    return {"ok": True}


# ---------------------------------------------------------------------------
# Problems API (authenticated)
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/problems")
def list_problems(
    _user: CurrentUser,
    kind: Annotated[ProblemKind | None, Query()] = None,
    status: Annotated[Literal["all", "open", "in-progress"], Query()] = "all",
) -> dict[str, object]:
    clauses: list[str] = []
    values: list[str] = []
    if kind is not None:
        clauses.append("kind = ?")
        values.append(kind)
    if status != "all":
        clauses.append("status = ?")
        values.append(status)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with connect_db() as db:
        rows = db.execute(
            f"SELECT * FROM problems {where} ORDER BY created_at DESC, id DESC", values
        ).fetchall()
    items = [problem_dict(row) for row in rows]
    return {"items": items, "count": len(items)}


@app.post("/api/problems", status_code=201)
def create_problem(_user: CurrentUser, problem: ProblemCreate) -> dict[str, object]:
    now = utc_now()
    problem_id = str(uuid4())
    with connect_db() as db:
        if problem.kind == "energy_waste":
            db.execute(
                """
                INSERT OR IGNORE INTO problems
                    (id, kind, room_id, room_name, category, description, reporter_name,
                     status, power_kw, wasted_kwh, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    problem_id,
                    problem.kind,
                    problem.room_id,
                    problem.room_name,
                    problem.category,
                    problem.description,
                    problem.reporter_name,
                    problem.status,
                    problem.power_kw,
                    problem.wasted_kwh,
                    now,
                    now,
                ),
            )
            row = db.execute(
                "SELECT * FROM problems WHERE kind = ? AND room_id = ?",
                (problem.kind, problem.room_id),
            ).fetchone()
        else:
            db.execute(
                """
                INSERT INTO problems
                    (id, kind, room_id, room_name, category, description, reporter_name,
                     status, power_kw, wasted_kwh, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    problem_id,
                    problem.kind,
                    problem.room_id,
                    problem.room_name,
                    problem.category,
                    problem.description,
                    problem.reporter_name,
                    problem.status,
                    problem.power_kw,
                    problem.wasted_kwh,
                    now,
                    now,
                ),
            )
            row = db.execute("SELECT * FROM problems WHERE id = ?", (problem_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=500, detail="Problem could not be stored.")
    return problem_dict(row)


@app.patch("/api/problems/{problem_id}")
def update_problem(
    problem_id: str, update: ProblemUpdate, _user: CurrentUser
) -> dict[str, object]:
    changes = {
        key: value
        for key, value in update.model_dump(exclude_unset=True).items()
        if value is not None
    }
    with connect_db() as db:
        row = db.execute("SELECT * FROM problems WHERE id = ?", (problem_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Problem not found.")

        if changes.get("status") == "resolved":
            db.execute("DELETE FROM problems WHERE id = ?", (problem_id,))
            return {"id": problem_id, "deleted": True}

        allowed = {"status", "description", "power_kw", "wasted_kwh"}
        values = {key: value for key, value in changes.items() if key in allowed}
        if values:
            values["updated_at"] = utc_now()
            assignments = ", ".join(f"{key} = ?" for key in values)
            db.execute(
                f"UPDATE problems SET {assignments} WHERE id = ?",
                [*values.values(), problem_id],
            )
        updated = db.execute("SELECT * FROM problems WHERE id = ?", (problem_id,)).fetchone()
    if updated is None:
        raise HTTPException(status_code=404, detail="Problem not found.")
    return problem_dict(updated)


@app.delete("/api/problems/{problem_id}", status_code=204)
def delete_problem(problem_id: str, _user: CurrentUser) -> Response:
    with connect_db() as db:
        cursor = db.execute("DELETE FROM problems WHERE id = ?", (problem_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Problem not found.")
    return Response(status_code=204)


@app.get("/", include_in_schema=False)
def frontend_index() -> FileResponse:
    return FileResponse(BASE_DIR / "index.html")


app.mount("/", StaticFiles(directory=PUBLIC_DIR, html=True), name="frontend")
