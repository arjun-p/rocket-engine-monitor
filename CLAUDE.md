# Claude Development Guidelines

This file contains essential development guidelines for working with Claude Code on this project.

## Project Context

**Project:** Rocket Engine Monitor
**Stack:** FastAPI + Next.js + Vadalog
**Deployment:** Vercel (frontend), Railway (backend)

## Security Essentials

### Never Commit
- `.env`, `.env.local`, `.env.production`
- Hardcoded API keys, tokens, passwords, or secrets
- Private credentials in configuration files

### Environment Variables
- Always use `os.getenv()` (Python) or `process.env` (JavaScript)
- Provide `.env.example` with dummy values
- Use descriptive names: `PMTX_TOKEN` not `TOKEN`

**Quick check:**
```bash
grep -r -E "(password|secret|key|token)\s*=\s*['\"]" --include="*.py" --include="*.ts" --include="*.tsx" backend/ frontend/
```

## Commit Format

```bash
git commit -m "Add feature: description

- Bullet point of change 1
- Bullet point of change 2

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Add PMTX_TOKEN
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local  # Set NEXT_PUBLIC_API_URL
npm run dev
```

**Test locally:**
- Backend: http://localhost:8000/docs
- Frontend: http://localhost:3000

---

**Last Updated:** 2026-02-12
