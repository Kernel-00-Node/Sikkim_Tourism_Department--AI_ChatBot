"""
Tests for conversation lifecycle + chat input validation.

Deliberately does NOT send a chat message through to the RAG chain — that
would call the real Groq/Gemini APIs, which need live credentials and
network access we don't want the test suite to depend on. Instead we cover
everything that happens *before* the LLM is reached: UUID validation,
conversation existence checks, and the ChatRequest sanitization logic
itself (tested directly against the Pydantic model).
"""
import pytest
from pydantic import ValidationError

from app.models.schemas import ChatRequest


# ── ChatRequest schema (unit-level, no HTTP involved) ──────────────────────

def test_message_is_stripped_of_surrounding_whitespace():
    req = ChatRequest(message="  What's the best time to visit Yumthang?  ")
    assert req.message == "What's the best time to visit Yumthang?"


def test_empty_message_is_rejected():
    with pytest.raises(ValidationError):
        ChatRequest(message="")


def test_message_over_max_length_is_rejected():
    with pytest.raises(ValidationError):
        ChatRequest(message="a" * 2001)


def test_unicode_is_nfkc_normalized():
    # Full-width Latin letters (U+FF21 etc.) NFKC-normalize to plain ASCII —
    # this is what stops homograph-style obfuscation of injection patterns.
    req = ChatRequest(message="\uff21\uff22\uff23")
    assert req.message == "ABC"


def test_whitespace_only_message_is_rejected():
    """
    Regression test: a message of pure whitespace has length > 0 before
    stripping, so it must not slip past validation as "non-empty" and only
    become empty afterward.
    """
    with pytest.raises(ValidationError):
        ChatRequest(message="     ")


# ── /api/conversations endpoints (HTTP-level) ──────────────────────────────

def test_create_then_fetch_conversation(client):
    created = client.post("/api/conversations/")
    assert created.status_code == 200
    conv_id = created.json()["conversation"]["id"]

    fetched = client.get(f"/api/conversations/{conv_id}")
    assert fetched.status_code == 200
    assert fetched.json()["conversation"]["id"] == conv_id
    assert fetched.json()["messages"] == []


def test_fetch_conversation_rejects_malformed_id(client):
    resp = client.get("/api/conversations/not-a-real-uuid")
    assert resp.status_code == 400


def test_fetch_conversation_404s_when_unknown(client):
    resp = client.get("/api/conversations/11111111-1111-1111-1111-111111111111")
    assert resp.status_code == 404


def test_chat_rejects_malformed_conversation_id(client):
    resp = client.post(
        "/api/conversations/not-a-real-uuid/chat",
        json={"message": "Tell me about Gangtok"},
    )
    assert resp.status_code == 400


def test_chat_404s_on_unknown_conversation(client):
    resp = client.post(
        "/api/conversations/11111111-1111-1111-1111-111111111111/chat",
        json={"message": "Tell me about Gangtok"},
    )
    assert resp.status_code == 404


def test_chat_rejects_empty_message_body(client):
    created = client.post("/api/conversations/")
    conv_id = created.json()["conversation"]["id"]

    resp = client.post(f"/api/conversations/{conv_id}/chat", json={"message": ""})
    assert resp.status_code == 422