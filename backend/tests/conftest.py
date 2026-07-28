"""
Shared pytest fixtures.

IMPORTANT — env vars are set at MODULE level, before `main` (and therefore
`app.config.settings`) is ever imported. Settings() reads the environment
exactly once, at import time, so setting them inside a fixture would be too
late — the values below must exist before the first `import main` anywhere
in the test session.

These settings keep the whole suite fast and fully offline:
  - USE_MOCK_DB=true   -> no real MySQL connection needed
  - GEMINI_API_KEY=""  -> populate_vectorstore() short-circuits with just a
                          warning on startup instead of calling the real
                          Gemini embeddings API
  - GROQ_API_KEY=""    -> we simply don't exercise the code path that would
                          call the real Groq chat model (see test_chat.py)
"""
import os
import sys
from pathlib import Path

# `pytest` (unlike `python -m pytest`) does not add the current working
# directory to sys.path, so `from main import app` below would fail even
# though main.py sits right next to this tests/ folder. Add the backend/
# directory (this file's parent's parent) explicitly so it works no matter
# how pytest is invoked.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault("USE_MOCK_DB", "true")
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("GROQ_API_KEY", "")
os.environ.setdefault("ADMIN_API_KEY", "test-admin-key-for-pytest")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:5173")

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(scope="session")
def client():
    """
    TestClient used as a context manager so FastAPI's lifespan (startup /
    shutdown) actually runs, same as `python main.py` would — this is what
    triggers populate_vectorstore() once per test session.
    """
    with TestClient(app) as c:
        yield c


@pytest.fixture
def admin_headers():
    return {"X-Admin-Key": os.environ["ADMIN_API_KEY"]}