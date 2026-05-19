# Vercel serverless entry point — imports the FastAPI app
# Vercel looks for `app` in api/index.py
from app.main import app  # noqa: F401
