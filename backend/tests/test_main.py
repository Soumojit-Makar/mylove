"""Backend test suite — auth, leads, deals, analytics."""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock


# ─── Fixtures ─────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    """Mock MongoDB database."""
    db = MagicMock()
    db.users.find_one = AsyncMock(return_value=None)
    db.users.insert_one = AsyncMock(return_value=MagicMock(inserted_id='507f1f77bcf86cd799439011'))
    db.leads.find_one = AsyncMock(return_value=None)
    db.leads.insert_one = AsyncMock(return_value=MagicMock(inserted_id='507f1f77bcf86cd799439012'))
    db.leads.count_documents = AsyncMock(return_value=0)
    db.audit_logs.insert_one = AsyncMock(return_value=None)
    return db


@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    r = MagicMock()
    r.get = AsyncMock(return_value=None)
    r.set = AsyncMock(return_value=True)
    r.setex = AsyncMock(return_value=True)
    r.delete = AsyncMock(return_value=1)
    r.publish = AsyncMock(return_value=1)
    r.ping = AsyncMock(return_value=True)
    return r


# ─── Auth Tests ───────────────────────────────────────────────

class TestAuth:
    def test_hash_and_verify_password(self):
        from app.core.security import hash_password, verify_password
        hashed = hash_password("mysecretpassword")
        assert hashed != "mysecretpassword"
        assert verify_password("mysecretpassword", hashed)
        assert not verify_password("wrongpassword", hashed)

    def test_create_and_decode_access_token(self):
        from app.core.security import create_access_token, decode_token
        data = {"sub": "user123", "tenant_id": "tenant_001", "role": "sales_rep"}
        token = create_access_token(data)
        assert isinstance(token, str)
        decoded = decode_token(token)
        assert decoded["sub"] == "user123"
        assert decoded["tenant_id"] == "tenant_001"
        assert decoded["type"] == "access"

    def test_create_refresh_token(self):
        from app.core.security import create_refresh_token, decode_token
        token = create_refresh_token({"sub": "user123"})
        decoded = decode_token(token)
        assert decoded["type"] == "refresh"

    def test_invalid_token_raises(self):
        from app.core.security import decode_token
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            decode_token("not.a.valid.token")
        assert exc.value.status_code == 401

    def test_rbac_permissions(self):
        from app.core.security import has_permission
        admin = {"role": "super_admin"}
        rep = {"role": "sales_rep"}
        readonly = {"role": "read_only"}

        assert has_permission(admin, "leads.delete")
        assert has_permission(admin, "anything.at.all")
        assert has_permission(rep, "leads.read")
        assert has_permission(rep, "leads.create")
        assert not has_permission(rep, "leads.delete")
        assert has_permission(readonly, "leads.read")
        assert not has_permission(readonly, "leads.create")


# ─── Lead Tests ───────────────────────────────────────────────

class TestLeads:
    def test_lead_schema_validation(self):
        from app.models.schemas import LeadCreate, LeadContact
        lead = LeadCreate(
            contact=LeadContact(
                name="John Doe",
                email="john@example.com",
                company="Acme Corp",
                title="CTO"
            ),
            source="referral",
            value=50000.0,
        )
        assert lead.contact.name == "John Doe"
        assert lead.source == "referral"
        assert lead.value == 50000.0

    def test_lead_contact_email_validation(self):
        from app.models.schemas import LeadContact
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            LeadContact(name="Bad Email", email="not-an-email")

    def test_lead_update_schema(self):
        from app.models.schemas import LeadUpdate, LeadStatus
        update = LeadUpdate(status=LeadStatus.mql, score=75)
        assert update.status == LeadStatus.mql
        assert update.score == 75

    def test_score_validation_bounds(self):
        from app.models.schemas import LeadUpdate
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            LeadUpdate(score=150)  # score > 100
        with pytest.raises(ValidationError):
            LeadUpdate(score=-5)   # score < 0


# ─── AI Scorer Tests ──────────────────────────────────────────

class TestAIScorer:
    @pytest.mark.asyncio
    async def test_rule_based_scorer_referral_cto(self):
        from app.services.ai_scorer import _rule_based_score
        lead = {
            "source": "referral",
            "value": 120000,
            "contact": {"title": "CTO", "company": "MegaCorp"},
            "tags": ["enterprise", "demo"],
        }
        score, factors = _rule_based_score(lead)
        assert 0 <= score <= 100
        assert score > 60  # high value referral CTO should score well
        assert "source_quality" in factors
        assert "value_potential" in factors

    @pytest.mark.asyncio
    async def test_rule_based_scorer_cold_email_no_title(self):
        from app.services.ai_scorer import _rule_based_score
        lead = {
            "source": "cold_email",
            "value": 500,
            "contact": {"title": "", "company": ""},
            "tags": [],
        }
        score, factors = _rule_based_score(lead)
        assert score < 40  # low quality lead

    @pytest.mark.asyncio
    async def test_churn_predict_low_mrr(self):
        from app.services.ai_scorer import predict_churn
        from datetime import datetime, timezone, timedelta
        account = {
            "mrr": 100,
            "last_activity_at": datetime.now(timezone.utc) - timedelta(days=90),
            "open_p1_tickets": 2,
            "nps": 3,
        }
        score, reason = await predict_churn(account)
        assert score > 70
        assert len(reason) > 0

    @pytest.mark.asyncio
    async def test_ai_forecast_deal_stages(self):
        from app.services.ai_scorer import ai_forecast_deal
        for stage, expected_min in [("prospect", 0), ("won", 99), ("lost", 0)]:
            deal = {"stage": stage, "value": 100000, "probability": 50}
            result = await ai_forecast_deal(deal)
            assert "probability" in result
            assert "expected_value" in result
            assert "confidence" in result
            if stage == "won":
                assert result["probability"] >= 90


# ─── Workflow Engine Tests ────────────────────────────────────

class TestWorkflowEngine:
    @pytest.mark.asyncio
    async def test_evaluate_trigger_match(self):
        from app.services.workflow_engine import evaluate_workflow_trigger
        workflow = {
            "trigger": {
                "type": "lead.score_changed",
                "conditions": [{"field": "score", "operator": "gt", "value": 79}]
            }
        }
        assert await evaluate_workflow_trigger(workflow, "lead.score_changed", {"score": 85})
        assert not await evaluate_workflow_trigger(workflow, "lead.score_changed", {"score": 50})
        assert not await evaluate_workflow_trigger(workflow, "deal.won", {"score": 85})

    @pytest.mark.asyncio
    async def test_evaluate_trigger_no_conditions(self):
        from app.services.workflow_engine import evaluate_workflow_trigger
        workflow = {"trigger": {"type": "ticket.created", "conditions": []}}
        assert await evaluate_workflow_trigger(workflow, "ticket.created", {})
        assert not await evaluate_workflow_trigger(workflow, "deal.won", {})


# ─── Schema Tests ─────────────────────────────────────────────

class TestSchemas:
    def test_deal_create_schema(self):
        from app.models.schemas import DealCreate, DealStage
        deal = DealCreate(
            name="Acme Enterprise Deal",
            value=250000.0,
            stage=DealStage.proposal,
            contact_id="507f1f77bcf86cd799439011",
            probability=65,
        )
        assert deal.value == 250000.0
        assert deal.stage == DealStage.proposal

    def test_deal_value_must_be_positive(self):
        from app.models.schemas import DealCreate
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            DealCreate(name="Bad Deal", value=-100, contact_id="abc123")

    def test_ticket_create_schema(self):
        from app.models.schemas import TicketCreate, TicketPriority
        ticket = TicketCreate(
            subject="Login broken",
            description="Users cannot log in",
            priority=TicketPriority.p1,
            channel="email",
        )
        assert ticket.priority == TicketPriority.p1

    def test_campaign_create_schema(self):
        from app.models.schemas import CampaignCreate, CampaignType
        campaign = CampaignCreate(
            name="Q4 Push",
            type=CampaignType.email,
            subject="Unlock Q4 growth",
            body="Hi {{name}}, ...",
        )
        assert campaign.type == CampaignType.email
        assert campaign.ab_test is False

    def test_user_role_enum(self):
        from app.models.schemas import UserRole
        assert UserRole.super_admin == "super_admin"
        assert UserRole.sales_rep == "sales_rep"
        valid_roles = [r.value for r in UserRole]
        assert "marketing" in valid_roles


# ─── Audit Service Tests ──────────────────────────────────────

class TestAuditService:
    @pytest.mark.asyncio
    async def test_log_audit_inserts_document(self, mock_db):
        with patch('app.services.audit.get_db', return_value=mock_db):
            from app.services.audit import log_audit
            await log_audit(
                tenant_id="tenant_001",
                user_id="user_001",
                action="lead.created",
                resource="leads",
                resource_id="lead_001",
            )
            mock_db.audit_logs.insert_one.assert_called_once()
            call_args = mock_db.audit_logs.insert_one.call_args[0][0]
            assert call_args["action"] == "lead.created"
            assert call_args["tenant_id"] == "tenant_001"


# ─── Background Queue Tests ───────────────────────────────────

class TestBackgroundQueue:
    @pytest.mark.asyncio
    async def test_inline_fallback_when_no_qstash_token(self):
        """With QSTASH_TOKEN unset, enqueue() runs the task inline."""
        from unittest.mock import AsyncMock, patch
        import app.core.background as bg

        called_with = {}

        async def fake_handler(payload):
            called_with.update(payload)

        with patch.object(bg, '_run_inline', new=fake_handler), \
             patch('app.core.config.settings.QSTASH_TOKEN', ''):
            await bg.enqueue('score_lead', {'lead_id': 'abc', 'tenant_id': 't1'})

        assert called_with.get('lead_id') == 'abc'

    @pytest.mark.asyncio
    async def test_enqueue_posts_to_qstash_when_token_set(self):
        """With QSTASH_TOKEN set, enqueue() should POST to QStash."""
        import app.core.background as bg
        import httpx

        posted = {}

        class FakeResponse:
            status_code = 202
            text = 'ok'

        class FakeClient:
            async def __aenter__(self): return self
            async def __aexit__(self, *a): pass
            async def post(self, url, **kwargs):
                posted['url'] = url
                posted['payload'] = kwargs
                return FakeResponse()

        with patch('app.core.background.httpx.AsyncClient', return_value=FakeClient()), \
             patch('app.core.config.settings.QSTASH_TOKEN', 'test-token'), \
             patch('app.core.config.settings.APP_URL', 'https://nexuscrm.vercel.app'):
            await bg.enqueue('send_email', {'to': 'test@example.com', 'subject': 'Hi'})

        assert 'send_email' in posted.get('url', '')


# ─── Cron Endpoint Tests ──────────────────────────────────────

class TestCronEndpoints:
    @pytest.mark.asyncio
    async def test_cron_rejects_missing_secret(self):
        from app.api.v1.cron import _auth
        from fastapi import HTTPException
        import app.core.config as cfg

        with patch.object(cfg.settings, 'CRON_SECRET', 'real-secret'):
            with pytest.raises(HTTPException) as exc:
                _auth(None)
            assert exc.value.status_code == 401

            with pytest.raises(HTTPException):
                _auth('Bearer wrong-secret')

    @pytest.mark.asyncio
    async def test_cron_accepts_correct_secret(self):
        from app.api.v1.cron import _auth
        import app.core.config as cfg

        with patch.object(cfg.settings, 'CRON_SECRET', 'my-secret'):
            # Should not raise
            _auth('Bearer my-secret')


# ─── QStash Signature Verification Tests ─────────────────────

class TestQStashSignature:
    def test_allows_all_when_no_signing_key_in_debug(self):
        from app.api.v1.tasks import _verify_qstash_signature
        import app.core.config as cfg

        with patch.object(cfg.settings, 'QSTASH_CURRENT_SIGNING_KEY', ''), \
             patch.object(cfg.settings, 'DEBUG', True):
            assert _verify_qstash_signature(b'body', 'any-sig') is True

    def test_rejects_bad_signature_with_key_set(self):
        from app.api.v1.tasks import _verify_qstash_signature
        import app.core.config as cfg

        with patch.object(cfg.settings, 'QSTASH_CURRENT_SIGNING_KEY', 'real-key'), \
             patch.object(cfg.settings, 'QSTASH_NEXT_SIGNING_KEY', ''):
            assert _verify_qstash_signature(b'body', 'sha256=bad-sig') is False

    def test_accepts_valid_hmac_signature(self):
        import hmac, hashlib
        from app.api.v1.tasks import _verify_qstash_signature
        import app.core.config as cfg

        key = 'test-signing-key'
        body = b'{"lead_id":"abc"}'
        sig = 'sha256=' + hmac.new(key.encode(), body, hashlib.sha256).hexdigest()

        with patch.object(cfg.settings, 'QSTASH_CURRENT_SIGNING_KEY', key), \
             patch.object(cfg.settings, 'QSTASH_NEXT_SIGNING_KEY', ''):
            assert _verify_qstash_signature(body, sig) is True


# ─── SSE Stream Tests ─────────────────────────────────────────

class TestSSEStream:
    @pytest.mark.asyncio
    async def test_stream_rejects_wrong_tenant(self):
        """User with tenant A cannot subscribe to tenant B's stream."""
        from app.api.v1.stream import event_stream
        from fastapi import HTTPException
        from unittest.mock import MagicMock

        user = {'_id': 'u1', 'tenant_id': 'tenant-A', 'role': 'sales_rep'}
        request = MagicMock()
        request.is_disconnected = AsyncMock(return_value=True)

        with pytest.raises(HTTPException) as exc:
            await event_stream('tenant-B', request, user)
        assert exc.value.status_code == 403


# ─── File Upload Tests ────────────────────────────────────────

class TestFileUpload:
    @pytest.mark.asyncio
    async def test_rejects_disallowed_content_type(self):
        from app.api.v1.files import upload_file
        from fastapi import HTTPException, UploadFile
        from io import BytesIO

        user = {'_id': 'u1', 'tenant_id': 't1', 'role': 'super_admin'}
        fake_file = MagicMock(spec=UploadFile)
        fake_file.content_type = 'application/x-executable'
        fake_file.filename = 'malware.exe'
        fake_file.read = AsyncMock(return_value=b'\x00\x01\x02')

        with pytest.raises(HTTPException) as exc:
            await upload_file(file=fake_file, user=user)
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_rejects_oversized_file(self):
        from app.api.v1.files import upload_file
        from fastapi import HTTPException, UploadFile

        user = {'_id': 'u1', 'tenant_id': 't1', 'role': 'super_admin'}
        fake_file = MagicMock(spec=UploadFile)
        fake_file.content_type = 'image/jpeg'
        fake_file.filename = 'large.jpg'
        fake_file.read = AsyncMock(return_value=b'x' * (11 * 1024 * 1024))  # 11 MB

        with pytest.raises(HTTPException) as exc:
            await upload_file(file=fake_file, user=user)
        assert exc.value.status_code == 413
