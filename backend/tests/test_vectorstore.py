"""Offline regression tests for Qdrant collection maintenance."""

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

from app.config import settings
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
