# 🚀 Rocket Engine Failure Monitor

Real-time intelligent monitoring and root cause analysis system for rocket engine component failures. Built with the [Prometheux Platform](https://prometheux.ai) reasoning engine.

**Repository**: [github.com/arjun-p/rocket-engine-monitor](https://github.com/arjun-p/rocket-engine-monitor)

---

## Overview

An end-to-end application that automatically detects, analyzes, and traces failure propagation across 30+ interconnected rocket engine components. When sensors fail, the system:

- **Identifies failure chains** - Traces how failures propagate through component dependencies
- **Pinpoints root causes** - Uses graph analytics to find convergence points where multiple failures originate
- **Alerts responsible teams** - Automatically notifies the right team leader
- **Visualizes impact** - Interactive network graphs showing the full failure cascade

**Key Innovation:** Combines declarative logic programming (Vadalog) with interactive graph visualization to turn raw sensor data into actionable intelligence.

---

## Features

### 🔍 Intelligent Failure Analysis
- **4-stage reasoning pipeline**: Sensor detection → failure chains → hotspot identification → automated alerting
- **Root cause detection**: Identifies convergence points where multiple failures originate
- **Multi-database integration**: Queries across PostgreSQL, MariaDB, Neo4j, and S3
- **Team-based alerts**: Routes notifications to responsible engineering teams

### 📊 Interactive Visualizations

#### Network View
- Dual layout modes (hierarchical/force-directed)
- Degree centrality analysis with component rankings
- Scrollable metrics table with live data
- Auto-select most critical component on load

#### Failure Analysis View
- Real-time animated failure propagation
- Interactive exploration (click sensors to trace impact)
- Hotspot panel with affected components
- Pulsing visual emphasis on root cause

#### Table View
- Searchable/sortable component relationships
- Clean tabular data exploration

---

## Tech Stack

**Frontend**: Next.js 14, TypeScript, Cytoscape.js, Tailwind CSS
**Backend**: FastAPI, Vadalog reasoning engine
**Deployment**: Vercel (frontend), Railway (backend)

---

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Add credentials
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local  # Set API_URL
npm run dev
```

Visit: http://localhost:3000

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/components` | All components with metadata |
| `/relationships` | Dependency graph (parent → child) |
| `/degree-centrality` | Network centrality analysis with rankings |
| `/failure-analysis` | Full 4-stage failure analysis with alerts |

**Docs**: http://localhost:8000/docs

---

## Configuration

Required environment variables:

**Backend** (`.env`):
```bash
PMTX_TOKEN=              # Prometheux API token
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

See `.env.example` for complete list.

---

## Key Technical Highlights

- **Vadalog reasoning**: Declarative logic rules for recursive failure propagation
- **Performance optimizations**: Parallel fetching, layout memoization, 6-minute timeout for complex queries
- **Interactive UX**: Live node highlighting, auto-selection, dual-layout toggle
- **Production-ready**: Error handling, responsive design, deployed on cloud

---

## Project Structure

```
rocket-engine-monitor/
├── backend/
│   ├── main.py                    # FastAPI routes
│   ├── vadalog/                   # Reasoning programs
│   │   ├── failure_analysis.vada
│   │   ├── get_components.vada
│   │   └── get_relationships.vada
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # Main dashboard
│   │   └── components/
│   │       ├── DependencyGraph.tsx      # Network View
│   │       ├── FailureAnalysisView.tsx  # Failure Analysis
│   │       ├── TableView.tsx            # Table View
│   │       └── NodeDetailCard.tsx       # Detail popup
│   └── package.json
└── README.md
```

---

## License

MIT
