"""
Tests for /api/health and the security headers that should be present on
every response (SecurityHeadersMiddleware in main.py).
"""

import pytest
from pydantic import ValidationError

from app.config import Settings


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
    assert "frame-ancestors 'none'" in resp.headers["content-security-policy"]
    # HSTS is intentionally only added in production (see SecurityHeadersMiddleware)
    assert "strict-transport-security" not in resp.headers


def test_conversation_responses_are_not_cacheable(client):
    created = client.post("/api/conversations/")
    assert "no-store" in created.headers["cache-control"]


def test_public_destinations_are_cacheable(client):
    response = client.get("/api/destinations/")
    assert "s-maxage=3600" in response.headers["cache-control"]


def test_docs_csp_allows_only_the_assets_fastapi_docs_need(client):
    resp = client.get("/api/docs")

    assert resp.status_code == 200
    csp = resp.headers["content-security-policy"]
    assert "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net" in csp
    assert "connect-src 'self'" in csp


def test_production_rejects_wildcard_cors():
    with pytest.raises(ValidationError, match="ALLOWED_ORIGINS"):
        Settings(environment="production", allowed_origins="*")


def test_production_rejects_whitespace_padded_wildcard_cors():
    with pytest.raises(ValidationError, match="ALLOWED_ORIGINS"):
        Settings(environment=" Production ", allowed_origins=" * ")


def test_environment_is_normalised_before_security_checks():
    settings = Settings(environment=" Production ", allowed_origins="https://example.com ")
    assert settings.environment == "production"
    assert settings.origins_list == ["https://example.com"]
