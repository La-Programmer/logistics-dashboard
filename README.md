# Cross-Team Logistics Dashboard MVP

A demo-ready logistics dashboard that pairs a FastAPI backend with a Next.js + Bootstrap frontend. The backend serves initial KPI snapshots over REST and streams live updates through WebSockets, while the frontend visualises logistics, transportation, warehouse, and safety metrics in real time.

## Project Structure

```
logistics-dashboard/
├── backend/      # FastAPI application (REST + WebSocket)
└── frontend/     # Next.js single-page dashboard (React + Bootstrap)
```

## Backend (FastAPI)

### Requirements

- Python 3.11+
- Recommended: virtual environment (e.g. `python -m venv .venv`)

### Install & Run

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API listens on `http://localhost:8000` by default with:

- `GET /api/metrics` – initial KPI snapshot
- `WS /ws/metrics` – streaming KPI updates every ~3 seconds

## Frontend (Next.js)

### Requirements

- Node.js 18+
- npm or compatible package manager

### Install & Run

```bash
cd frontend
npm install
npm run dev
```

The dashboard is served at `http://localhost:3000`. Configure environment variables if you host the backend elsewhere:

```bash
# .env.local (optional)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
```

> **Note:** The project loads Bootstrap 5 from a CDN for styling. Ensure outbound network access is available when running the frontend.

## Features

- Clean separation between domain models, services, and infrastructure in the backend (lightweight onion architecture).
- Connection manager with a shared broadcaster to fan-out WebSocket updates to multiple clients.
- Simulated logistics metrics with realistic drift across delivery, throughput, fleet, cost, and safety dimensions.
- Responsive React dashboard using Bootstrap cards, charts (Recharts), and a custom gauge.
- Alert banners and contextual highlights when KPI thresholds are breached.

## Development Tips

- The simulator emits a new data point roughly every 3 seconds. Adjust the cadence in `backend/app/main.py` if needed.
- Extend the domain model or thresholds by updating the simulator and card configuration (`frontend/src/app/page.tsx`).
- For production use, replace the simulator with real data sources and tighten the CORS policy.

## License

This MVP is provided as-is for demonstration purposes.
