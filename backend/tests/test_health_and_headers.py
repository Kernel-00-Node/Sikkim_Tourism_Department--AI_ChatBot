"""
Tests for /api/health and the security headers that should be present on
every response (SecurityHeadersMiddleware in main.py).
"""


def test_health_reports_mock_db_mode(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200

    body = resp.json()
    assert body["status"] == "ok"
    assert body["db_mode"] == "mock"
    assert "qdrant_mode" in body
    # No real keys are set in the test environment (see conftest.py) —
    # the health check should honestly reflect that.
    assert body["embeddings_configured"] is False
    assert body["chat_llm_configured"] is False


def test_security_headers_present_on_every_response(client):
    resp = client.get("/api/health")

    assert resp.headers["x-content-type-options"] == "nosniff"
    assert resp.headers["x-frame-options"] == "DENY"
    assert resp.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    # HSTS is intentionally only added in production (see SecurityHeadersMiddleware)
    assert "strict-transport-security" not in resp.headers