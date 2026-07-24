"""
MySQLRepository — real database backend for when the department's MySQL is available.

HOW TO ACTIVATE:
  1. Set USE_MOCK_DB=false in your .env file.
  2. Fill in MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE.
  3. Run the SQL schema in docs/schema.sql against the department's database.

This previously raised NotImplementedError on every single method, which is
why switching USE_MOCK_DB=false made every endpoint return a raw 500 with a
Python traceback instead of a clean response. It is now a full working
implementation matching docs/schema.sql exactly.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime

import mysql.connector
import mysql.connector.pooling as mysql_pooling

from app.database.base import BaseRepository, MessageRole
from app.models.schemas import Conversation, Destination, Message

logger = logging.getLogger(__name__)


def _row_to_destination(row: dict) -> Destination:
    highlights = row.get("highlights") or []
    tags = row.get("tags") or []
    if isinstance(highlights, str):
        highlights = json.loads(highlights)
    if isinstance(tags, str):
        tags = json.loads(tags)
    return Destination(
        id=row["id"],
        name=row["name"],
        slug=row["slug"],
        category=row["category"],
        description=row["description"],
        location=row["location"],
        district=row["district"],
        altitude=row.get("altitude"),
        best_time=row["best_time"],
        entry_fee=row.get("entry_fee"),
        permit_required=bool(row.get("permit_required")),
        permit_info=row.get("permit_info"),
        how_to_reach=row["how_to_reach"],
        highlights=highlights,
        tags=tags,
        image_placeholder=row.get("image_placeholder") or "",
        image_url=row.get("image_url"),
    )


def _row_to_conversation(row: dict) -> Conversation:
    return Conversation(id=row["id"], created_at=row["created_at"])


def _row_to_message(row: dict) -> Message:
    return Message(
        id=row["id"],
        conversation_id=row["conversation_id"],
        role=row["role"],
        content=row["content"],
        created_at=row["created_at"],
    )


class MySQLRepository(BaseRepository):
    """
    Concrete MySQL implementation using mysql-connector-python with a
    connection pool. mysql-connector-python has no native asyncio support,
    so every query is dispatched to a worker thread via `asyncio.to_thread`
    — this keeps FastAPI's event loop responsive instead of blocking it for
    the duration of each round-trip to MySQL.
    """

    def __init__(self, host: str, port: int, user: str, password: str, database: str) -> None:
        try:
            self._pool = mysql_pooling.MySQLConnectionPool(
                pool_name="sikkim_tourism_pool",
                pool_size=5,
                host=host,
                port=port,
                user=user,
                password=password,
                database=database,
                autocommit=True,
            )
            logger.info("MySQLRepository connected to %s:%s/%s", host, port, database)
        except mysql.connector.Error as exc:
            logger.error("Failed to initialise MySQL connection pool: %s", exc)
            raise

    # ── Low-level helpers ──────────────────────────────────────────────────────

    def _query(self, sql: str, params: tuple = ()) -> list[dict]:
        """FIXED: Proper cursor cleanup even on exception."""
        conn = self._pool.get_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                return rows
            finally:
                cursor.close()  # FIXED: Always close cursor
        finally:
            conn.close()

    def _execute(self, sql: str, params: tuple = ()) -> None:
        """
        Execute a write statement (INSERT / UPDATE / DELETE).
        Both the cursor and the connection are always returned to the pool,
        even if cursor.execute() raises — preventing connection leaks.
        FIXED: Proper nested try-finally for cursor closure.
        """
        conn = self._pool.get_connection()
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(sql, params)
            finally:
                # Close cursor inside its own try/finally so a failed
                # execute() cannot prevent the connection from being
                # returned to the pool by the outer finally block.
                cursor.close()
        finally:
            conn.close()

    # ── Destinations ────────────────────────────────────────────────────────

    async def list_destinations(
        self,
        search: str | None = None,
        category: str | None = None,
    ) -> list[Destination]:
        clauses = []
        params: list = []
        if category:
            clauses.append("category = %s")
            params.append(category)
        if search:
            clauses.append(
                "(name LIKE %s OR description LIKE %s OR district LIKE %s OR location LIKE %s)"
            )
            like = f"%{search}%"
            params.extend([like, like, like, like])
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = await asyncio.to_thread(
            self._query,
            f"SELECT * FROM destinations {where} ORDER BY name ASC",
            tuple(params),
        )
        return [_row_to_destination(r) for r in rows]

    async def get_destination(self, destination_id: int) -> Destination | None:
        rows = await asyncio.to_thread(
            self._query,
            "SELECT * FROM destinations WHERE id = %s",
            (destination_id,),
        )
        return _row_to_destination(rows[0]) if rows else None

    async def search_destinations_for_rag(self, query: str) -> list[Destination]:
        """FIXED: Escape LIKE wildcards to prevent injection."""
        rows = await asyncio.to_thread(
            self._query,
            "SELECT * FROM destinations "
            "WHERE MATCH(name, description) AGAINST (%s IN NATURAL LANGUAGE MODE) "
            "LIMIT 4",
            (query,),
        )
        if not rows:
            # FULLTEXT can return nothing for short/uncommon queries — fall back to LIKE.
            # FIXED: Properly escape LIKE wildcards
            escaped_query = (
                query.replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_")
            )
            like = f"%{escaped_query}%"
            rows = await asyncio.to_thread(
                self._query,
                "SELECT * FROM destinations WHERE name LIKE %s ESCAPE '\\' OR description LIKE %s ESCAPE '\\' LIMIT 4",
                (like, like),
            )
        return [_row_to_destination(r) for r in rows]

    # ── Conversations ────────────────────────────────────────────────────────

    async def create_conversation(self) -> Conversation:
        conv = Conversation()
        await asyncio.to_thread(
            self._execute,
            "INSERT INTO conversations (id, created_at) VALUES (%s, %s)",
            (conv.id, conv.created_at),
        )
        return conv

    async def get_conversation(self, conversation_id: str) -> Conversation | None:
        rows = await asyncio.to_thread(
            self._query,
            "SELECT * FROM conversations WHERE id = %s",
            (conversation_id,),
        )
        return _row_to_conversation(rows[0]) if rows else None

    # ── Messages ─────────────────────────────────────────────────────────

    async def add_message(
        self,
        conversation_id: str,
        role: "MessageRole",
        content: str,
    ) -> Message:
        msg = Message(conversation_id=conversation_id, role=role, content=content)
        await asyncio.to_thread(
            self._execute,
            "INSERT INTO messages (id, conversation_id, role, content, created_at) "
            "VALUES (%s, %s, %s, %s, %s)",
            (msg.id, msg.conversation_id, msg.role, msg.content, msg.created_at),
        )
        return msg

    async def list_messages(self, conversation_id: str) -> list[Message]:
        rows = await asyncio.to_thread(
            self._query,
            "SELECT * FROM messages WHERE conversation_id = %s ORDER BY created_at ASC",
            (conversation_id,),
        )
        return [_row_to_message(r) for r in rows]
