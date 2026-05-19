"""Email Celery tasks."""
import asyncio, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.celery_app import celery_app
from app.core.config import settings


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _send_smtp(to: str, subject: str, body: str, html: str = None):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg.attach(MIMEText(body, "plain"))
    if html:
        msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"SMTP error: {e}")


@celery_app.task(name="app.tasks.email_tasks.send_transactional_email", queue="emails")
def send_transactional_email(to: str, subject: str, body: str, tenant_id: str = None, html: str = None):
    _send_smtp(to, subject, body, html)


@celery_app.task(name="app.tasks.email_tasks.send_campaign_task", queue="emails", bind=True)
def send_campaign_task(self, campaign_id: str, tenant_id: str):
    async def _run():
        from app.core.database import connect_db, get_db
        from bson import ObjectId
        from datetime import datetime, timezone
        await connect_db()
        db = get_db()
        campaign = await db.campaigns.find_one({"_id": ObjectId(campaign_id)})
        if not campaign:
            return
        segment_ids = campaign.get("segment_ids", [])
        contacts_query: dict = {"tenant_id": tenant_id}
        sent = 0
        async for contact in db.contacts.find(contacts_query).limit(10000):
            _send_smtp(
                to=contact["email"],
                subject=campaign.get("subject", ""),
                body=campaign.get("body", ""),
            )
            sent += 1
        await db.campaigns.update_one(
            {"_id": ObjectId(campaign_id)},
            {"$set": {"status": "ended", "sent_count": sent,
                      "completed_at": datetime.now(timezone.utc)}}
        )
    run_async(_run())
