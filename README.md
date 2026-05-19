# NexusCRM — Enterprise SaaS CRM

> **Fully deployed on Vercel** — frontend + backend in a single project, zero servers to manage.

[![CI/CD](https://github.com/your-org/nexuscrm/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/nexuscrm/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel  (one project)                     │
│                                                              │
│  ┌───────────────────────┐   ┌──────────────────────────┐   │
│  │  Static Frontend      │   │  Python Serverless       │   │
│  │  React + Vite (dist/) │   │  FastAPI (backend/api/)  │   │
│  │  CDN edge — global    │   │  /api/* routes           │   │
│  └───────────────────────┘   └────────────┬─────────────┘   │
│                                           │                  │
│  ┌────────────────────────────────────────▼──────────────┐  │
│  │  Vercel Cron Jobs  (vercel.json `crons`)               │  │
│  │  /api/v1/cron/rescore-leads      02:00 UTC daily       │  │
│  │  /api/v1/cron/scheduled-reports  every hour            │  │
│  │  /api/v1/cron/sla-check          every 5 min           │  │
│  │  /api/v1/cron/churn-scores       every 6 hours         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
            │                           │
   ┌────────▼────────┐       ┌──────────▼──────────┐
   │  MongoDB Atlas  │       │  Upstash             │
   │  (database)     │       │  Redis  (cache/SSE)  │
   └─────────────────┘       │  QStash (task queue) │
                             └─────────────────────┘
```

### Why no Celery, WebSockets, or Docker?

Vercel runs **serverless functions** — no persistent processes, no long-lived connections.

| Old (Docker/Railway)    | New (Vercel serverless)           |
|-------------------------|-----------------------------------|
| Celery worker           | QStash webhook tasks              |
| Celery beat scheduler   | Vercel Cron Jobs                  |
| WebSocket server        | Server-Sent Events (SSE)          |
| Local disk storage      | AWS S3                            |
| nginx                   | Vercel CDN (built-in)             |
| docker-compose          | `vercel dev` / `vercel --prod`    |

---

## Tech Stack

| Layer              | Technology                                                    |
|--------------------|---------------------------------------------------------------|
| Frontend           | React 18, TypeScript, Tailwind CSS, TanStack Query, Recharts |
| Backend            | FastAPI, Python 3.11, Pydantic v2, Motor (async MongoDB)      |
| Auth               | JWT (HS256) + bcrypt, RBAC with 8 roles                       |
| Database           | MongoDB Atlas (multi-tenant via `tenant_id`)                  |
| Cache / pub-sub    | Upstash Redis                                                 |
| Task queue         | Upstash QStash (HTTP-based, no broker process)                |
| Real-time          | Server-Sent Events → `/api/v1/stream/{tenant_id}`             |
| File storage       | AWS S3 (pre-signed URLs)                                      |
| Hosting            | Vercel (frontend CDN + Python serverless functions)           |
| Scheduled jobs     | Vercel Cron Jobs                                              |
| AI                 | OpenAI GPT-4o-mini (scoring, churn, forecasting)              |

---

## Quick Start (Local Dev)

### Prerequisites

- Python 3.11+  ·  Node.js 20+
- [MongoDB Atlas](https://cloud.mongodb.com) free cluster
- [Upstash](https://upstash.com) free Redis database

```bash
# 1. Clone and configure
git clone https://github.com/your-org/nexuscrm.git
cd nexuscrm
make env        # copies .env.example → .env
# Edit .env — fill in MONGO_URI and REDIS_URL at minimum

# 2. Install
make install

# 3. Seed demo user
make seed

# 4. Start
make dev-backend    # terminal 1 → FastAPI on :8000
make dev-frontend   # terminal 2 → Vite on :5173
```

`QSTASH_TOKEN` is optional locally — background tasks run **inline** (synchronously) when it's unset.

---

## Deploy to Vercel

### 1. One-time setup

```bash
npm i -g vercel
vercel login
vercel link          # creates .vercel/project.json
```

### 2. Set environment variables

In the Vercel dashboard → Project → Settings → Environment Variables, add everything from `.env.example`. The critical ones:

| Variable                       | Where to get it                                               |
|--------------------------------|---------------------------------------------------------------|
| `MONGO_URI`                    | MongoDB Atlas → Connect → Drivers                            |
| `REDIS_URL`                    | Upstash console → Redis → Connect → .env                     |
| `JWT_SECRET_KEY`               | Any random 32+ char string                                    |
| `SECRET_KEY`                   | Any random 32+ char string                                    |
| `APP_URL`                      | Your Vercel production URL, e.g. `https://nexuscrm.vercel.app` |
| `CORS_ORIGINS`                 | Comma-separated: `https://nexuscrm.vercel.app,https://nexuscrm.io` |
| `QSTASH_TOKEN`                 | Upstash console → QStash → Copy token                        |
| `QSTASH_CURRENT_SIGNING_KEY`   | Upstash console → QStash → Signing keys                      |
| `QSTASH_NEXT_SIGNING_KEY`      | Upstash console → QStash → Signing keys                      |
| `CRON_SECRET`                  | Any random string — also set in Vercel → Cron jobs → Secret  |
| `STORAGE_BACKEND`              | `s3`                                                          |
| `AWS_ACCESS_KEY_ID`            | AWS IAM user with S3 put/get/delete on your bucket           |
| `AWS_SECRET_ACCESS_KEY`        | Same IAM user                                                 |
| `AWS_S3_BUCKET`                | Your S3 bucket name                                           |

### 3. Deploy

```bash
make deploy-preview   # preview deployment (safe to test)
make deploy-prod      # production deployment
```

Or just push to `main` — CI runs tests then deploys automatically.

### 4. Secure the cron jobs

In Vercel dashboard → Project → Settings → Cron Jobs, enable "Cron Job Secret" and enter the same value as `CRON_SECRET`. Vercel will send `Authorization: Bearer <CRON_SECRET>` with every cron request.

---

## GitHub Actions Secrets

| Secret                | Where to get it                                    |
|-----------------------|----------------------------------------------------|
| `VERCEL_TOKEN`        | vercel.com → Account Settings → Tokens            |
| `VERCEL_ORG_ID`       | `.vercel/project.json` after `vercel link`        |
| `VERCEL_PROJECT_ID`   | `.vercel/project.json` after `vercel link`        |

---

## Background Tasks (QStash)

Tasks are dispatched via `app.core.background.enqueue(task_name, payload)`.
QStash delivers a signed POST to `/api/v1/tasks/{task_name}`.

| Task name                | Triggered by                      |
|--------------------------|-----------------------------------|
| `score_lead`             | Lead created or manually triggered |
| `send_email`             | Workflow nodes, campaign sends     |
| `send_campaign`          | Campaign launch endpoint           |
| `import_leads_csv`       | CSV upload endpoint                |
| `process_workflow_event` | Every `trigger_event()` call       |
| `generate_report`        | Report generation endpoint         |

**Local dev**: set `QSTASH_TOKEN=""` → tasks run inline (no HTTP round-trip).

---

## Scheduled Jobs (Vercel Cron)

| Endpoint                          | Schedule            | What it does                      |
|-----------------------------------|---------------------|-----------------------------------|
| `GET /api/v1/cron/rescore-leads`  | `0 2 * * *`         | Re-score all active leads nightly |
| `GET /api/v1/cron/scheduled-reports` | `0 * * * *`      | Email queued reports hourly       |
| `GET /api/v1/cron/sla-check`      | `*/5 * * * *`       | Fire SLA breach alerts            |
| `GET /api/v1/cron/churn-scores`   | `0 */6 * * *`       | Update churn predictions          |

All cron endpoints require `Authorization: Bearer <CRON_SECRET>`.

---

## Real-time Events (SSE)

The frontend connects to `GET /api/v1/stream/{tenant_id}` with the `useEventSource` hook. The backend publishes events to Redis pub/sub (`events:{tenant_id}`) via `trigger_event()`; the SSE endpoint subscribes and forwards them.

Events automatically invalidate the relevant TanStack Query caches client-side.

---

## Modules

| Module               | Features                                                          |
|----------------------|-------------------------------------------------------------------|
| Lead Management      | AI scoring (0–100), auto-assign, dedup, CSV import               |
| Sales Pipeline       | Kanban board, stage transitions, AI revenue forecasting          |
| Marketing Automation | Email/SMS/push campaigns, A/B testing, UTM attribution           |
| Workflow Engine      | DAG-based automation, 10+ trigger types, SLA escalation          |
| Service Desk         | Omnichannel tickets, SLA timers, CSAT/NPS                        |
| Analytics & AI       | Live dashboards, cohort retention, multi-touch attribution       |
| Reports              | KPI scorecards, CSV exports, scheduled email delivery            |
| HR & Teams           | RBAC (8 roles), org chart, quota tracking                        |

---

## Development Commands

```bash
make dev-backend     # FastAPI hot-reload on :8000
make dev-frontend    # Vite dev server on :5173
make install         # install all dependencies
make test            # run all tests
make coverage        # coverage report (backend)
make seed            # create admin@nexuscrm.io / password123
make deploy-preview  # Vercel preview deploy
make deploy-prod     # Vercel production deploy
make env             # create .env from .env.example
make clean           # remove build artefacts
```
