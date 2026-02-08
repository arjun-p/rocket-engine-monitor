# Rocket Engine Failure Monitor

Real-time monitoring and analysis system for rocket engine component failures, powered by the [Prometheux Platform](https://prometheux.ai).

## Features

- **RESTful API** for component data and failure analysis
- **Vadalog Reasoning Engine** integration for failure propagation

## Quick Start

### Prerequisites

- Python 3.10+
- Prometheux API token

### Setup

1. **Clone and navigate:**
   ```bash
   git clone <your-repo-url>
   cd rocket-engine-monitor
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your PMTX_TOKEN
   ```

3. **Install dependencies:**
   ```bash
   make install
   ```

4. **Start server:**
   ```bash
   make dev
   ```

5. **Open API docs:**
   ```
   http://localhost:8000/docs
   ```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API information |
| `/health` | GET | Health check with Prometheux status |
| `/components` | GET | Rocket engine components |

**Interactive Docs:** Visit `/docs` for Swagger UI

## Development Commands

```bash
make install    # Install dependencies
make dev        # Start with auto-reload
make start      # Start production server
make test       # Run tests
make clean      # Clean cache files
```

## Project Structure

```
rocket-engine-monitor/
├── backend/
│   ├── main.py           # FastAPI application
│   ├── models.py         # Pydantic models
│   └── requirements.txt  # Dependencies
├── data/
│   ├── components.csv
│   └── component_linked_to_component.csv
├── Makefile
└── .env.example
```

## Configuration

Environment variables (see `.env.example`):

- `ENV` - Environment mode (development/production)
- `PMTX_TOKEN` - Prometheux API authentication token
- `PROMETHEUX_BASE_URL` - Prometheux API base URL
- `CORS_ORIGINS` - Allowed CORS origins (optional)


## License

MIT
