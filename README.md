# WattWatch

WattWatch is a campus sustainability monitor (energy + water + materials) built with plain HTML, CSS and JavaScript, served by a FastAPI backend. The UI uses a neon blue / cyan dark theme.

Built for KAUSHAL 8.0 PS-04 `Sustainable Tech Without Limits`: see, understand and reduce campus footprint in a measurable way — even on simulated data.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
./run.sh
```

Open `http://localhost:8000`. Interactive API documentation is available at `/docs`.

## Features

- **Energy:** empty room + >0.2 kW for 2 readings → `energy_waste` alert. Live chart, urgency leaderboard, ₹/CO₂ impact.
- **Weather (Open-Meteo, no key):** `GET /api/weather` proxies Indore temp/humidity with 10-min cache + offline fallback. Hot days (≥32°C) relax the energy threshold to 0.30 kW and show cooling-demand context. Configure with `WATTWATCH_LAT`, `WATTWATCH_LON`, `WATTWATCH_CAMPUS`.
- **Water + reuse:** taps + leaks simulated per room. Empty + >0.5 L/min ×2 or any leak → `water_waste` alert. Resolve via **Fix leak** (stop flow) or **Reuse** (count wasted litres as greywater for gardening/flushing). Totals: used today, wasted, reused.
- **Materials (plastic/paper/e-waste/glass/organic):** `POST /api/materials {room, material, quantity, unit, action: disposed|recycled|reused}`. Stats: diversion rate = (recycled+reused)/total, plastic pcs + CO₂ avoided (0.082 kg/pc). Demo: log 10 disposed then 30 recycled and watch the rate climb.

Demo shortcuts on the dashboard: `Create energy waste`, `Create water leak`, `Log plastic recycled`, plus Turbo 1s mode for judging.

## Authentication

All `/api/problems`, `/api/materials` and `/api/weather` endpoints require a `Authorization: Bearer <token>` header.

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

The backend stores users, problem reports, water/energy alerts and material reuse logs in SQLite at `data/wattwatch.sqlite3`. Set `WATTWATCH_DB_PATH` to use a different file. No new dependencies — weather uses stdlib `urllib`.

- `GET /api/problems` lists unresolved problems; `kind=maintenance|energy_waste|water_waste|material_waste` filters the list.
- `POST /api/problems` creates a problem. `energy_waste` and `water_waste` are unique per room (`INSERT OR IGNORE`); `maintenance`/`material_waste` allow multiples. Extra fields: `flow_lpm, wasted_litres, reused_litres, material, quantity, action`.
- `PATCH /api/problems/{id}` updates an open report's status or an active alert's readings (`power_kw, wasted_kwh, flow_lpm, wasted_litres, reused_litres, quantity, action`). Setting `status` to `resolved` deletes it.
- `DELETE /api/problems/{id}` removes a fixed problem.
- `GET /api/materials?limit=100` + `POST /api/materials` + `DELETE /api/materials/{id}` — reuse/recycle logs.
- `GET /api/materials/stats` — `{by_material, totals, diversion_rate_pct, plastic_diverted_pcs, plastic_co2_avoided_kg}`.
- `GET /api/weather` — `{temperature_c, humidity_pct, condition, cooling_demand: low|moderate|high, live, source}`.

The UI's **Mark Fixed / Fix leak** deletes the record; **Reuse** adds wasted litres to the reused counter first. Energy/water alerts auto-delete when the room stops wasting. Resolved problems are not retained.

## Notes

Room simulation (power, flow, taps, leaks) and daily totals are saved in the browser (`wattwatch-simulator-v2`). Problems + material logs are stored by FastAPI and shared across sessions. Old DBs auto-migrate (new columns + `material_logs` table) on boot.
