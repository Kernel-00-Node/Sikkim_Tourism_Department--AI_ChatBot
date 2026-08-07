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
from app.models.schemas import AdminUser, Circular, Conversation, Destination, DestinationWrite, Message, SitePage

logger = logging.getLogger(__name__)


def _row_to_circular(row: dict) -> Circular:
    issue_date = row["issue_date"]
    return Circular(
        id=row["id"],
        title=row["title"],
        category=row["category"],
        district=row.get("district"),
        issue_date=issue_date.isoformat() if hasattr(issue_date, "isoformat") else str(issue_date),
        source_url=row["source_url"],
        pdf_hash=row["pdf_hash"],
        extracted_text=row["extracted_text"],
        ingested_at=row["ingested_at"],
    )


def _row_to_site_page(row: dict) -> SitePage:
    return SitePage(
        id=row["id"],
        url=row["url"],
        title=row["title"],
        text_hash=row["text_hash"],
        extracted_text=row["extracted_text"],
        depth=row["depth"],
        chunk_count=row["chunk_count"],
        last_crawled_at=row["last_crawled_at"],
    )


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
        latitude=row.get("latitude"),
        longitude=row.get("longitude"),
    )


def _destination_params(destination: DestinationWrite) -> tuple:
    """Convert a validated admin payload into MySQL's column order."""
    return (
        destination.name,
        destination.slug,
        destination.category,
        destination.description,
        destination.location,
        destination.district,
        destination.altitude,
        destination.best_time,
        destination.entry_fee,
        destination.permit_required,
        destination.permit_info,
        destination.how_to_reach,
        json.dumps(destination.highlights),
        json.dumps(destination.tags),
        destination.image_placeholder,
        destination.image_url,
        destination.latitude,
        destination.longitude,
    )


def _row_to_conversation(row: dict) -> Conversation:
    return Conversation(id=row["id"], created_at=row["created_at"])


def _row_to_message(row: dict) -> Message:
    return Message(
        id=row["id"],
        conversation_id=row["conversation_id"],
        role=row["role"],
        content=row["content"],
        client_message_id=row.get("client_message_id"),
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
        """Run a read query and always return the connection to the pool."""
        conn = self._pool.get_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                return rows
            finally:
                cursor.close()
        finally:
            conn.close()

    def _execute(self, sql: str, params: tuple = ()) -> int:
        """
        Execute a write statement (INSERT / UPDATE / DELETE).
        Both the cursor and the connection are always returned to the pool,
        even if cursor.execute() raises — preventing connection leaks.
        The nested cleanup keeps a failed query from leaking a pooled
        connection.
        """
        conn = self._pool.get_connection()
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(sql, params)
                return cursor.rowcount
            finally:
                # Close cursor inside its own try/finally so a failed
                # execute() cannot prevent the connection from being
                # returned to the pool by the outer finally block.
                cursor.close()
        finally:
            conn.close()

    # ── Admin accounts ─────────────────────────────────────────────────────

    async def admin_user_exists(self) -> bool:
        rows = await asyncio.to_thread(
            self._query, "SELECT 1 FROM admin_users LIMIT 1"
        )
        return bool(rows)

    async def get_admin_user(self, username: str) -> AdminUser | None:
        rows = await asyncio.to_thread(
            self._query,
            "SELECT username, password_hash FROM admin_users WHERE username = %s LIMIT 1",
            (username.lower(),),
        )
        return AdminUser(**rows[0]) if rows else None

    async def create_admin_user(self, user: AdminUser) -> None:
        await asyncio.to_thread(
            self._execute,
            "INSERT INTO admin_users (username, password_hash) VALUES (%s, %s)",
            (user.username.lower(), user.password_hash),
        )

    async def update_admin_password(self, username: str, password_hash: str) -> bool:
        updated = await asyncio.to_thread(
            self._execute,
            "UPDATE admin_users SET password_hash = %s WHERE username = %s",
            (password_hash, username.lower()),
        )
        return updated > 0

    async def update_admin_credentials(self, username: str, new_username: str, password_hash: str) -> bool:
        updated = await asyncio.to_thread(
            self._execute,
            "UPDATE admin_users SET username = %s, password_hash = %s WHERE username = %s",
            (new_username.lower(), password_hash, username.lower()),
        )
        return updated > 0

    # ── Circulars ──────────────────────────────────────────────────────────

    async def list_circulars(
            self,
            category: str | None = None,
            limit: int = 10,
    ) -> list[Circular]:
        clauses, params = [], []
        if category:
            clauses.append("category = %s")
            params.append(category)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = await asyncio.to_thread(
            self._query,
            f"SELECT * FROM circulars {where} ORDER BY issue_date DESC LIMIT %s",
            (*params, limit),
        )
        return [_row_to_circular(r) for r in rows]

    async def circular_exists(self, pdf_hash: str) -> bool:
        rows = await asyncio.to_thread(
            self._query,
            "SELECT id FROM circulars WHERE pdf_hash = %s LIMIT 1",
            (pdf_hash,),
        )
        return bool(rows)

    async def save_circular(self, circular: Circular) -> Circular:
        def _insert() -> int:
            conn = self._pool.get_connection()
            try:
                cursor = conn.cursor()
                try:
                    cursor.execute(
                        "INSERT INTO circulars "
                        "(title, category, district, issue_date, source_url, pdf_hash, extracted_text, ingested_at) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                        (
                            circular.title,
                            circular.category,
                            circular.district,
                            circular.issue_date,
                            circular.source_url,
                            circular.pdf_hash,
                            circular.extracted_text,
                            circular.ingested_at,
                        ),
                    )
                    return cursor.lastrowid
                finally:
                    cursor.close()
            finally:
                conn.close()

        new_id = await asyncio.to_thread(_insert)
        return circular.model_copy(update={"id": new_id})

    async def delete_circular(self, circular_id: int) -> bool:
        deleted = await asyncio.to_thread(
            self._execute, "DELETE FROM circulars WHERE id = %s", (circular_id,)
        )
        return deleted > 0

    # ── Site pages ─────────────────────────────────────────────────────────

    async def list_site_pages(self, limit: int = 100) -> list[SitePage]:
        rows = await asyncio.to_thread(
            self._query,
            "SELECT * FROM site_pages ORDER BY last_crawled_at DESC LIMIT %s",
            (limit,),
        )
        return [_row_to_site_page(r) for r in rows]

    async def get_site_page_by_url(self, url: str) -> SitePage | None:
        rows = await asyncio.to_thread(
            self._query,
            "SELECT * FROM site_pages WHERE url = %s LIMIT 1",
            (url,),
        )
        return _row_to_site_page(rows[0]) if rows else None

    async def save_site_page(self, page: SitePage) -> SitePage:
        # Upsert by URL: a re-crawl of the same page updates its existing row
        # in place instead of accumulating a duplicate on every sync.
        def _upsert() -> int:
            conn = self._pool.get_connection()
            try:
                cursor = conn.cursor()
                try:
                    cursor.execute(
                        "INSERT INTO site_pages "
                        "(url, title, text_hash, extracted_text, depth, chunk_count, last_crawled_at) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s) "
                        "ON DUPLICATE KEY UPDATE "
                        "title = VALUES(title), text_hash = VALUES(text_hash), "
                        "extracted_text = VALUES(extracted_text), depth = VALUES(depth), "
                        "chunk_count = VALUES(chunk_count), last_crawled_at = VALUES(last_crawled_at), "
                        "id = LAST_INSERT_ID(id)",
                        (
                            page.url,
                            page.title,
                            page.text_hash,
                            page.extracted_text,
                            page.depth,
                            page.chunk_count,
                            page.last_crawled_at,
                        ),
                    )
                    return cursor.lastrowid
                finally:
                    cursor.close()
            finally:
                conn.close()

        new_id = await asyncio.to_thread(_upsert)
        return page.model_copy(update={"id": new_id})

    async def delete_site_page(self, page_id: int) -> bool:
        deleted = await asyncio.to_thread(
            self._execute, "DELETE FROM site_pages WHERE id = %s", (page_id,)
        )
        return deleted > 0

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

    async def create_destination(self, destination: DestinationWrite) -> Destination:
        def _insert() -> int:
            conn = self._pool.get_connection()
            try:
                cursor = conn.cursor()
                try:
                    cursor.execute(
                        "INSERT INTO destinations "
                        "(name, slug, category, description, location, district, altitude, best_time, "
                        "entry_fee, permit_required, permit_info, how_to_reach, highlights, tags, "
                        "image_placeholder, image_url, latitude, longitude) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        _destination_params(destination),
                    )
                    return cursor.lastrowid
                finally:
                    cursor.close()
            finally:
                conn.close()

        return Destination(id=await asyncio.to_thread(_insert), **destination.model_dump())

    async def update_destination(
            self, destination_id: int, destination: DestinationWrite
    ) -> Destination | None:
        updated = await asyncio.to_thread(
            self._execute,
            "UPDATE destinations SET "
            "name = %s, slug = %s, category = %s, description = %s, location = %s, district = %s, "
            "altitude = %s, best_time = %s, entry_fee = %s, permit_required = %s, permit_info = %s, "
            "how_to_reach = %s, highlights = %s, tags = %s, image_placeholder = %s, image_url = %s, "
            "latitude = %s, longitude = %s WHERE id = %s",
            (*_destination_params(destination), destination_id),
        )
        return Destination(id=destination_id, **destination.model_dump()) if updated else None

    async def delete_destination(self, destination_id: int) -> bool:
        deleted = await asyncio.to_thread(
            self._execute, "DELETE FROM destinations WHERE id = %s", (destination_id,)
        )
        return deleted > 0

    async def search_destinations_for_rag(self, query: str) -> list[Destination]:
        """Search the full-text index, then fall back to a literal LIKE query."""
        rows = await asyncio.to_thread(
            self._query,
            "SELECT * FROM destinations "
            "WHERE MATCH(name, description) AGAINST (%s IN NATURAL LANGUAGE MODE) "
            "LIMIT 4",
            (query,),
        )
        if not rows:
            # FULLTEXT can miss short or uncommon queries; escape wildcard
            # characters before using the literal fallback.
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
            client_message_id: str | None = None,
    ) -> Message:
        msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            client_message_id=client_message_id,
        )
        await asyncio.to_thread(
            self._execute,
            "INSERT INTO messages (id, conversation_id, role, content, client_message_id, created_at) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (msg.id, msg.conversation_id, msg.role, msg.content, client_message_id, msg.created_at),
        )
        return msg

    async def get_message_by_client_id(
            self, conversation_id: str, client_message_id: str
    ) -> Message | None:
        rows = await asyncio.to_thread(
            self._query,
            "SELECT * FROM messages WHERE conversation_id = %s AND client_message_id = %s LIMIT 1",
            (conversation_id, client_message_id),
        )
        return _row_to_message(rows[0]) if rows else None

    async def list_messages(self, conversation_id: str) -> list[Message]:
        rows = await asyncio.to_thread(
            self._query,
            "SELECT * FROM messages WHERE conversation_id = %s ORDER BY created_at ASC",
            (conversation_id,),
        )
        return [_row_to_message(r) for r in rows]