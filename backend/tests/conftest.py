"""Pytest configuration — async support and shared env vars for CI."""
import os
import pytest

# Set test environment variables before any app imports
os.environ.setdefault("MONGO_URI",      "mongodb://localhost:27017/nexuscrm_test")
os.environ.setdefault("REDIS_URL",      "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-32-chars-minimum!!")
os.environ.setdefault("SECRET_KEY",     "test-secret-key-32-chars-minimum!!!")
os.environ.setdefault("APP_ENV",        "test")
os.environ.setdefault("DEBUG",          "false")
os.environ.setdefault("QSTASH_TOKEN",   "")           # inline fallback in tests
os.environ.setdefault("CRON_SECRET",    "test-cron")
os.environ.setdefault("APP_URL",        "http://localhost:8000")
os.environ.setdefault("STORAGE_BACKEND","local")


def pytest_configure(config):
    config.addinivalue_line("markers", "asyncio: mark test as async")
