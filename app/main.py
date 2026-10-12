from __future__ import annotations

import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field


BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"
DB_PATH = Path(os.environ.get("WATTWATCH_DB_PATH", BASE_DIR / "data" / "wattwatch.sqlite3"))

ProblemKind = Literal["maintenance", "energy_waste"]
ProblemStatus = Literal["open", "in-progress"]


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


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="WattWatch API", version="1.0.0", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/problems")
def list_problems(
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
def create_problem(problem: ProblemCreate) -> dict[str, object]:
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
def update_problem(problem_id: str, update: ProblemUpdate) -> dict[str, object]:
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
def delete_problem(problem_id: str) -> Response:
    with connect_db() as db:
        cursor = db.execute("DELETE FROM problems WHERE id = ?", (problem_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Problem not found.")
    return Response(status_code=204)


@app.get("/", include_in_schema=False)
def frontend_index() -> FileResponse:
    return FileResponse(BASE_DIR / "index.html")


app.mount("/", StaticFiles(directory=PUBLIC_DIR, html=True), name="frontend")
