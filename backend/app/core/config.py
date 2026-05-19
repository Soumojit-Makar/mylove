"""Application configuration — Vercel-compatible environment variables."""

from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "NexusCRM"
    APP_ENV: str = "development"
    APP_VERSION: str = "3.0.0"
    SECRET_KEY: str = "change-me-in-production"
    DEBUG: bool = False
    APP_URL: str = "http://localhost:8000"

    MONGO_URI: str = "mongodb://localhost:27017/nexuscrm"
    MONGO_DB: str = "nexuscrm"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = "jwt-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@nexuscrm.io"

    OPENAI_API_KEY: str = ""
    AI_LEAD_SCORING_MODEL: str = "gpt-4o-mini"

    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    STORAGE_BACKEND: str = "local"
    MEDIA_ROOT: str = "./media"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = "us-east-1"

    QSTASH_TOKEN: str = ""
    QSTASH_CURRENT_SIGNING_KEY: str = ""
    QSTASH_NEXT_SIGNING_KEY: str = ""
    CRON_SECRET: str = ""

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    RATE_LIMIT_PER_MINUTE: int = 100


settings = Settings()
