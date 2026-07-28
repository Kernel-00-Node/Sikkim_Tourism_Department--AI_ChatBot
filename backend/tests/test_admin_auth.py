"""
Tests for the POST /api/admin/sync auth guard (app/dependencies.py).

Before this fix, this endpoint had NO authentication at all — anyone who
found the URL could trigger a full vector-store resync. These tests exist
specifically to prevent that regressing silently in the future.
"""
from fastapi.testclient import TestClient


def test_sync_rejected_with_no_key(client):
    resp = client.post("/api/admin/sync")
    assert resp.status_code == 401


def test_sync_rejected_with_wrong_key(client):
    resp = client.post("/api/admin/sync", headers={"X-Admin-Key": "definitely-wrong"})
    assert resp.status_code == 401


def test_sync_accepted_with_correct_key(client, admin_headers):
    resp = client.post("/api/admin/sync", headers=admin_headers)
    assert resp.status_code == 200

    body = resp.json()
    assert body["status"] == "ok"
    assert body["db_mode"] == "mock"
    # GEMINI_API_KEY is empty in the test env, so populate_vectorstore()
    # short-circuits before indexing anything — that's expected here.
    assert body["indexed"] == 0


def test_sync_fails_closed_when_no_admin_key_is_configured_server_side():
    """
    If an operator forgets to set ADMIN_API_KEY, the endpoint must refuse
    ALL requests (503) rather than silently behave as if no auth were
    required — even when the caller sends a header that looks plausible.
    """
    from app.config import settings
    from main import app

    original = settings.admin_api_key
    settings.admin_api_key = ""
    try:
        with TestClient(app) as c:
            resp = c.post("/api/admin/sync", headers={"X-Admin-Key": "anything-at-all"})
            assert resp.status_code == 503
    finally:
        settings.admin_api_key = original