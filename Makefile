.PHONY: dev dev-backend dev-frontend install install-backend install-frontend \
        test test-backend test-frontend coverage seed env \
        deploy-preview deploy-prod clean

# ─── Development ──────────────────────────────────────────────
dev-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

dev:
	@echo "Run each in its own terminal:"
	@echo ""
	@echo "  make dev-backend    → FastAPI on :8000  (set DEBUG=true in .env for /api/docs)"
	@echo "  make dev-frontend   → Vite on :5173"
	@echo ""
	@echo "Background tasks run inline when QSTASH_TOKEN is empty (default for local dev)."
	@echo "MongoDB + Redis must be reachable — set MONGO_URI / REDIS_URL in .env"

# ─── Install ──────────────────────────────────────────────────
install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	cd frontend && npm ci

install: install-backend install-frontend

# ─── Tests ────────────────────────────────────────────────────
test-backend:
	cd backend && pytest tests/ -v --tb=short

test-frontend:
	cd frontend && npm test -- --run

test: test-backend test-frontend

coverage:
	cd backend && pytest tests/ --cov=app --cov-report=html
	@echo "Open: backend/htmlcov/index.html"

# ─── Seed ─────────────────────────────────────────────────────
seed:
	cd backend && python -c "\
import asyncio; \
from app.core.database import connect_db, get_db; \
from app.core.security import hash_password; \
from datetime import datetime, timezone; \
async def run(): \
    await connect_db(); \
    db = get_db(); \
    r = await db.users.update_one( \
        {'email': 'admin@nexuscrm.io'}, \
        {'\$$setOnInsert': { \
            'name': 'Sarah Adams', \
            'email': 'admin@nexuscrm.io', \
            'password_hash': hash_password('password123'), \
            'role': 'super_admin', \
            'tenant_id': 'tenant_demo_001', \
            'is_active': True, \
            'created_at': datetime.now(timezone.utc), \
        }}, upsert=True); \
    print('✅  admin@nexuscrm.io / password123 ready'); \
asyncio.run(run())"

# ─── Vercel deploys ───────────────────────────────────────────
deploy-preview:
	vercel

deploy-prod:
	vercel --prod

# ─── Setup ────────────────────────────────────────────────────
env:
	cp .env.example .env
	@echo "📝  .env created — fill in MONGO_URI and REDIS_URL at minimum"
	@echo "    See README.md for the full list of required variables"

# ─── Clean ────────────────────────────────────────────────────
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf backend/htmlcov frontend/dist .vercel
	@echo "🧹  Cleaned"
