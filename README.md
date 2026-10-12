# WattWatch

WattWatch is a campus energy-waste monitor built with plain HTML, CSS and JavaScript, served by a FastAPI backend. The UI uses a neon blue / cyan dark theme.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
./run.sh
```

Open `http://localhost:8000`. Interactive API documentation is available at `/docs`.

## Authentication

All `/api/problems` endpoints require a `Authorization: Bearer <token>` header.

- `POST /api/auth/register` — `{name, email, password>=6}` → `{token, user}`
- `POST /api/auth/login` — `{email, password}` → `{token, user}`
- `GET /api/auth/me` — returns the current user for a valid token
- `POST /api/auth/logout` — stateless acknowledgement (client discards the token)

Security details:

- Passwords are hashed with PBKDF2-HMAC-SHA256 (200k iterations, 16-byte salt, stdlib only).
- Sessions are HS256 JWTs signed with `WATTWATCH_SECRET_KEY` (or `data/.secret.key`, auto-generated). Default TTL is 7 days (`WATTWATCH_TOKEN_TTL_HOURS`).
- A demo account is seeded on first boot: `demo@wattwatch.local` / `demo1234` (disable with `WATTWATCH_SEED_DEMO=0`).
- The frontend shows a login gate first, stores the token in `localStorage`, attaches it to every API call, and returns to login on `401`.

## Problem storage

The backend stores users plus maintenance reports and active energy-waste alerts in SQLite at `data/wattwatch.sqlite3`. Set `WATTWATCH_DB_PATH` to use a different file.

- `GET /api/problems` lists unresolved problems; `kind=maintenance` or `kind=energy_waste` filters the list.
- `POST /api/problems` creates a problem.
- `PATCH /api/problems/{id}` updates an open report's status or an active alert's readings. Setting `status` to `resolved` deletes it.
- `DELETE /api/problems/{id}` removes a fixed problem.

The UI's **Mark Fixed** action deletes the record. Energy alerts are removed automatically when the room is no longer wasting power. Resolved problems are not retained in the database.

## Notes

Room simulation settings and daily energy totals are saved in the browser. Problem records are stored by the FastAPI service and shared across browser sessions.
