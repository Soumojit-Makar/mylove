"""Celery application — background task worker."""

from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "nexuscrm",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.email_tasks",
        "app.tasks.report_tasks",
        "app.tasks.workflow_tasks",
        "app.tasks.ai_tasks",
        "app.tasks.notification_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.tasks.email_tasks.*": {"queue": "emails"},
        "app.tasks.report_tasks.*": {"queue": "reports"},
        "app.tasks.workflow_tasks.*": {"queue": "workflows"},
        "app.tasks.ai_tasks.*": {"queue": "default"},
    },
    beat_schedule={
        # Re-score all active leads nightly
        "lead-rescore-nightly": {
            "task": "app.tasks.ai_tasks.rescore_all_leads",
            "schedule": crontab(hour=2, minute=0),
        },
        # Generate scheduled reports
        "scheduled-reports": {
            "task": "app.tasks.report_tasks.send_scheduled_reports",
            "schedule": crontab(minute=0),
        },
        # Check SLA breaches every 5 minutes
        "sla-breach-check": {
            "task": "app.tasks.workflow_tasks.check_sla_breaches",
            "schedule": crontab(minute="*/5"),
        },
        # Churn score update every 6 hours
        "churn-score-update": {
            "task": "app.tasks.ai_tasks.update_churn_scores",
            "schedule": crontab(hour="*/6"),
        },
    },
)
