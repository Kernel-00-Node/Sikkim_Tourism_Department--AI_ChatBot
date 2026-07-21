"""
Repository factory — returns the right implementation based on config.

Import `get_repo` wherever you need data access.  The rest of the app never
imports MockRepository or MySQLRepository directly, so swapping is seamless.
"""
from __future__ import annotations

from functools import lru_cache

from app.config import settings
from app.database.base import BaseRepository


@lru_cache(maxsize=1)
def get_repo() -> BaseRepository:
    if settings.use_mock_db:
        from app.database.mock_repo import MockRepository
        return MockRepository()
    else:
        from app.database.mysql_repo import MySQLRepository
        return MySQLRepository(
            host=settings.mysql_host,
            port=settings.mysql_port,
            user=settings.mysql_user,
            password=settings.mysql_password,
            database=settings.mysql_database,
        )
