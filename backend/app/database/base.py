"""
|| Abstract_Repository || — defines the interface every Data-Backend must implement.

Add a new backend by subclassing BaseRepository and implementing every abstract
method.  The rest of the app imports only this interface and get_repo() from
factory.py, so the concrete implementation can be swapped without touching any
other file.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Literal

from app.models.schemas import Conversation, Destination, Message

MessageRole = Literal["user", "assistant"]

class BaseRepository(ABC):
    """Common interface for all data storage backends (mock in-memory, MySQL, …)."""

    @abstractmethod
    async def list_destinations(
        self,
        search: str | None = None,
        category: str | None = None,
    ) -> list[Destination]:
        """Return all destinations, optionally filtered by free-text and/or category."""
        ...

    @abstractmethod
    async def get_destination(self, destination_id: int) -> Destination | None:
        """Return a single destination by Primary-Key-ID, or None if not found."""
        ...

    @abstractmethod
    async def search_destinations_for_rag(self, query: str) -> list[Destination]:
        """
        Keyword_Search or Semantic_Match used by the RAG service to ground AI responses.
        Returns up to 4 most-relevant Destination objects.
        """
        ...
    @abstractmethod
    async def create_conversation(self) -> Conversation:
        """Create and persist a new empty conversation, then return it."""
        ...

    @abstractmethod
    async def get_conversation(self, conversation_id: str) -> Conversation | None:
        """Return the conversation with the given UUID, or None if not found."""
        ...
    @abstractmethod
    async def add_message(
        self,
        conversation_id: str,
        role: MessageRole,
        content: str,
    ) -> Message:
        """Persist and return a new message belonging to `conversation_id`."""
        ...

    @abstractmethod
    async def list_messages(self, conversation_id: str) -> list[Message]:
        """Return all messages for `conversation_id`, ordered oldest → newest."""
        ...
