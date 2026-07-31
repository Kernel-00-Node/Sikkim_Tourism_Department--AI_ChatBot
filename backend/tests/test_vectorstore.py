"""Offline regression tests for Qdrant collection maintenance."""

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
import pytest

from app.config import settings
from app import startup
from app.services import vectorstore


def test_clear_collection_removes_stale_points_without_recreating(monkeypatch):
    """A re-sync must not leave deleted source records retrievable."""
    client = QdrantClient(":memory:")
    original_collection = settings.qdrant_collection
    monkeypatch.setattr(settings, "qdrant_collection", "sync-regression-test")
    monkeypatch.setattr(vectorstore, "get_embedding_dimension", lambda: 2)

    try:
        vectorstore.ensure_collection(client)
        client.upsert(
            collection_name=settings.qdrant_collection,
            points=[PointStruct(id=1, vector=[1.0, 0.0], payload={"name": "Old place"})],
        )
        assert client.count(settings.qdrant_collection).count == 1

        vectorstore.clear_collection(client)
        assert client.count(settings.qdrant_collection).count == 0
    finally:
        settings.qdrant_collection = original_collection


@pytest.mark.asyncio
async def test_remote_startup_reuses_nonempty_persisted_collection(monkeypatch):
    """A healthy remote collection must avoid a full re-embedding pass."""
    original_url = settings.qdrant_url
    monkeypatch.setattr(settings, "qdrant_url", "https://qdrant.example.test")
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(startup, "get_qdrant_client", lambda: object())
    monkeypatch.setattr(startup, "existing_point_count", lambda _client: 12)

    class Repo:
        async def list_destinations(self):
            raise AssertionError("source DB should not be read for a warm collection")

    try:
        assert await startup.populate_vectorstore(Repo()) == 12
    finally:
        settings.qdrant_url = original_url
