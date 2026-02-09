# Claude Development Guidelines

This file contains development guidelines and best practices for working with Claude Code on this project.

## Security & Privacy

### Pre-Commit Security Checklist
Before every commit, verify:
- [ ] No `.env` or `.env.local` files are staged
- [ ] No hardcoded API keys, tokens, passwords, or secrets in code
- [ ] No private credentials in configuration files
- [ ] No sensitive data in comments or debug statements
- [ ] `.gitignore` includes all environment files
- [ ] Database credentials use environment variables only
- [ ] All API keys loaded from `os.getenv()` or `process.env`

**Command to check for secrets:**
```bash
# Check for hardcoded secrets
grep -r -E "(password|secret|key|token)\s*=\s*['\"]" --include="*.py" --include="*.ts" --include="*.tsx" --include="*.js" backend/ frontend/

# Verify .gitignore excludes sensitive files
git status --ignored | grep -E "(\.env|secret|key|password)"
```

### Environment Variables
- **Never commit** `.env`, `.env.local`, `.env.production`
- Always provide `.env.example` with dummy values
- Use descriptive names: `PROMETHEUX_API_TOKEN` not `TOKEN`
- Document all required env vars in README.md

## Code Quality

### Before Committing
- [ ] Code compiles/runs without errors
- [ ] All imports are used (no unused imports)
- [ ] Remove console.log() and debug statements
- [ ] Type errors resolved (TypeScript)
- [ ] Linter warnings addressed
- [ ] No commented-out code blocks
- [ ] Functions have clear names and purpose

### Testing
- [ ] Test locally before pushing
- [ ] Verify API endpoints work (use `/docs` for FastAPI)
- [ ] Check frontend in browser (localhost:3000)
- [ ] Test on mobile viewport if UI changes
- [ ] Verify backend at localhost:8000

## Git Workflow

### Commit Messages
Use descriptive commit messages with co-authorship:

```bash
git commit -m "Add feature: description

- Bullet point of change 1
- Bullet point of change 2

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Branch Strategy
- `main` - production-ready code (auto-deploys)
- Feature branches: `feature/graph-visualization`
- Bug fixes: `fix/cors-issue`
- Merge to `main` only when tested

## Deployment

### Pre-Deployment Checklist
- [ ] All tests pass locally
- [ ] Environment variables set in Railway/Vercel
- [ ] CORS origins updated for production URLs
- [ ] Database migrations completed (if applicable)
- [ ] Secrets rotated if exposed
- [ ] Deployment tested in staging (if available)

### Post-Deployment
- [ ] Test production URLs immediately
- [ ] Check Railway/Vercel logs for errors
- [ ] Verify API endpoints work
- [ ] Monitor for 5-10 minutes after deploy

## Architecture Decisions

### When to Use Local vs. Production Backend
**Local Development (Recommended):**
- `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Fast iteration, no API costs
- Easy debugging

**Production Testing:**
- `.env.local`: `NEXT_PUBLIC_API_URL=https://rocket-engine-monitor-production.up.railway.app`
- Test full deployment flow
- Verify CORS and production config

### Adding New Features
1. **Plan First** - Document the approach
2. **Implement Locally** - Test thoroughly
3. **Commit Small** - Incremental commits
4. **Deploy & Verify** - Check production
5. **Document** - Update README/NOTES.md

## Performance

### Frontend Optimization
- Use `useMemo` for expensive calculations
- Lazy load heavy components
- Optimize images (use Next.js Image component)
- Minimize bundle size (check with `npm run build`)

### Backend Optimization
- Cache Vadalog query results
- Use async/await for I/O operations
- Add database indexes for frequent queries
- Monitor Railway logs for slow endpoints

## Troubleshooting

### Common Issues
**CORS Error:**
- Check `CORS_ORIGINS_PROD` in Railway
- Verify Vercel URL is allowlisted
- Use browser DevTools → Network tab

**Build Fails on Vercel:**
- Check build logs in Vercel dashboard
- Ensure all dependencies in `package.json`
- Verify TypeScript types are correct

**Backend 500 Error:**
- Check Railway logs
- Verify environment variables set
- Test endpoint locally first

### Debug Commands
```bash
# Check what will be committed
git status

# View recent commits
git log --oneline -5

# Test backend locally
curl http://localhost:8000/health

# Check backend logs
tail -f /path/to/backend.log

# Check frontend build
npm run build
```

## Documentation

### Keep Updated
- `README.md` - User-facing documentation
- `NOTES.md` - Development journal (gitignored)
- `CLAUDE.md` - This file (guidelines)
- API documentation - Use FastAPI `/docs`

### Code Comments
- Explain **why**, not **what**
- Use comments for complex logic only
- Remove commented-out code before committing
- Add TODO comments for future work

## Non-Technical Stakeholder Considerations

### Executive Dashboard Requirements
- **Clear Metrics:** Display key numbers prominently
- **Status Indicators:** Use colors (red/yellow/green) for quick understanding
- **Trends:** Show change over time (↑↓ indicators)
- **Actions:** Provide clear next steps or recommendations
- **Export:** Enable PDF/CSV export for reports
- **Mobile-Friendly:** Responsive design for on-the-go access

### Simplification Guidelines
- Avoid technical jargon in UI
- Use plain language for labels
- Provide tooltips for complex terms
- Add "What does this mean?" help text
- Use visual indicators over text
- Progressive disclosure (show details on demand)

### Example Stakeholder Views
**Executive View:**
- System health: 85% (↓ 2% from last week)
- Critical alerts: 3 active
- Components at risk: 5
- Recommended action: "Review fuel system sensors"

**Technical View:**
- Full component graph
- Detailed error logs
- API response times
- System architecture

---

**Last Updated:** 2026-02-09
**Project:** Rocket Engine Monitor
**Stack:** FastAPI + Next.js + Vadalog