"""
|| Mock_Repository || — purely `in-memory`, zero External Dependencies.

Used when USE_MOCK_DB=true (the default).  
Conversations and messages are held in plain Python dicts; they reset on every server restart, which is fine for testing.
"""

from __future__ import annotations

from app.database.base import BaseRepository, MessageRole
from app.database.mock_data import CIRCULARS, DESTINATIONS
from app.models.schemas import Circular, Conversation, Destination, DestinationWrite, Message


class MockRepository(BaseRepository):
    def __init__(self) -> None:
        # In-memory stores — keyed by id
        self._conversations: dict[str, Conversation] = {}
        self._messages: dict[str, list[Message]] = {}  # conversation_id → [Message]

    # ── Circulars ──────────────────────────────────────────────────────────────

    async def list_circulars(
            self,
            category: str | None = None,
            limit: int = 10,
    ) -> list[Circular]:
        results = CIRCULARS
        if category:
            results = [c for c in results if c.category == category]
        # Newest first — issue_date is an ISO string (YYYY-MM-DD), so plain
        # string sort is already chronological.
        results = sorted(results, key=lambda c: c.issue_date, reverse=True)
        return results[:limit]

    async def circular_exists(self, pdf_hash: str) -> bool:
        return any(c.pdf_hash == pdf_hash for c in CIRCULARS)

    async def save_circular(self, circular: Circular) -> Circular:
        circular = circular.model_copy(update={"id": len(CIRCULARS) + 1})
        CIRCULARS.append(circular)
        return circular

    async def delete_circular(self, circular_id: int) -> bool:
        for index, circular in enumerate(CIRCULARS):
            if circular.id == circular_id:
                del CIRCULARS[index]
                return True
        return False

    # ── Destinations ───────────────────────────────────────────────────────────

    async def list_destinations(
            self,
            search: str | None = None,
            category: str | None = None,
    ) -> list[Destination]:
        results = DESTINATIONS
        if category:
            results = [d for d in results if d.category == category]
        if search:
            q = search.lower()
            results = [
                d for d in results
                if q in d.name.lower()
                   or q in d.description.lower()
                   or q in d.location.lower()
                   or q in d.district.lower()
                   or any(q in t for t in d.tags)
                   or any(q in h.lower() for h in d.highlights)
            ]
        return results

    async def get_destination(self, destination_id: int) -> Destination | None:
        return next((d for d in DESTINATIONS if d.id == destination_id), None)

    async def create_destination(self, destination: DestinationWrite) -> Destination:
        next_id = max((item.id for item in DESTINATIONS), default=0) + 1
        created = Destination(id=next_id, **destination.model_dump())
        DESTINATIONS.append(created)
        return created

    async def update_destination(
            self, destination_id: int, destination: DestinationWrite
    ) -> Destination | None:
        for index, current in enumerate(DESTINATIONS):
            if current.id == destination_id:
                updated = Destination(id=destination_id, **destination.model_dump())
                DESTINATIONS[index] = updated
                return updated
        return None

    async def delete_destination(self, destination_id: int) -> bool:
        for index, destination in enumerate(DESTINATIONS):
            if destination.id == destination_id:
                del DESTINATIONS[index]
                return True
        return False

    async def search_destinations_for_rag(self, query: str) -> list[Destination]:
        """
        Simple keyword match for RAG context injection.
        Returns up to 4 most relevant destinations.
        """
        q = query.lower()
        scored: list[tuple[int, Destination]] = []

        for dest in DESTINATIONS:
            score = 0
            score += 3 if q in dest.name.lower() else 0
            score += sum(2 for t in dest.tags if t in q or q in t)
            score += 1 if q in dest.description.lower() else 0
            score += 1 if q in dest.location.lower() else 0
            score += sum(1 for h in dest.highlights if q in h.lower())
            # keyword overlap
            words = set(q.split())
            score += sum(1 for w in words if len(w) > 3 and (
                    w in dest.name.lower()
                    or w in dest.description.lower()
                    or any(w in t for t in dest.tags)
            ))
            if score > 0:
                scored.append((score, dest))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [d for _, d in scored[:4]]

    # ── Conversations ──────────────────────────────────────────────────────────

    async def create_conversation(self) -> Conversation:
        conv = Conversation()
        self._conversations[conv.id] = conv
        self._messages[conv.id] = []
        return conv

    async def get_conversation(self, conversation_id: str) -> Conversation | None:
        return self._conversations.get(conversation_id)

    # ── Messages ───────────────────────────────────────────────────────────────

    async def add_message(
            self,
            conversation_id: str,
            role: MessageRole,
            content: str,
            client_message_id: str | None = None,
    ) -> Message:
        msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            client_message_id=client_message_id,
        )
        self._messages.setdefault(conversation_id, []).append(msg)
        return msg

    async def get_message_by_client_id(
            self, conversation_id: str, client_message_id: str
    ) -> Message | None:
        return next(
            (
                message
                for message in self._messages.get(conversation_id, [])
                if message.client_message_id == client_message_id
            ),
            None,
        )

    async def list_messages(self, conversation_id: str) -> list[Message]:
        return self._messages.get(conversation_id, [])
