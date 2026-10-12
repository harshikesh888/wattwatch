# WattWatch

WattWatch is a campus energy-waste monitor built with plain HTML, CSS and JavaScript, served by a FastAPI backend.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
./run.sh
```

Open `http://localhost:8000`. Interactive API documentation is available at `/docs`.

## Problem storage

The backend stores maintenance reports and active energy-waste alerts in SQLite at `data/wattwatch.sqlite3`. Set `WATTWATCH_DB_PATH` to use a different file.

- `GET /api/problems` lists unresolved problems; `kind=maintenance` or `kind=energy_waste` filters the list.
- `POST /api/problems` creates a problem.
- `PATCH /api/problems/{id}` updates an open report's status or an active alert's readings. Setting `status` to `resolved` deletes it.
- `DELETE /api/problems/{id}` removes a fixed problem.

The UI's **Mark Fixed** action deletes the record. Energy alerts are removed automatically when the room is no longer wasting power. Resolved problems are not retained in the database.

## Notes

Room simulation settings and daily energy totals are saved in the browser. Problem records are stored by the FastAPI service and shared across browser sessions. The previous sign-in was a client-only demo, so this version uses a reporter-name field instead of pretending to provide secure authentication. The problem API is unauthenticated; add real authentication and authorization before exposing a deployment to untrusted users.
