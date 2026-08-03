"""Seed an empty MySQL destinations table from the development mock catalog.

Run from the backend directory:
    python seed_destinations.py

The command deliberately refuses to modify a non-empty table. It is intended
only for the one-time move from mock mode to a fresh MySQL/Aiven database.
"""
from __future__ import annotations

import json

import mysql.connector

from app.config import settings
from app.database.mock_data import DESTINATIONS


_INSERT_DESTINATION = """
    INSERT INTO destinations (
        id, name, slug, category, description, location, district, altitude,
        best_time, entry_fee, permit_required, permit_info, how_to_reach,
        highlights, tags, image_placeholder, image_url, latitude, longitude
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s
    )
"""


def _destination_row(destination):
    return (
        destination.id,
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


def main() -> None:
    if settings.use_mock_db:
        raise SystemExit("USE_MOCK_DB must be false to seed MySQL.")

    connection = mysql.connector.connect(
        host=settings.mysql_host,
        port=settings.mysql_port,
        user=settings.mysql_user,
        password=settings.mysql_password,
        database=settings.mysql_database,
    )
    try:
        cursor = connection.cursor()
        try:
            cursor.execute("SELECT COUNT(*) FROM destinations")
            existing_rows = cursor.fetchone()[0]
            if existing_rows:
                raise SystemExit(
                    f"Refusing to seed: destinations already contains {existing_rows} row(s)."
                )

            cursor.executemany(
                _INSERT_DESTINATION, [_destination_row(destination) for destination in DESTINATIONS]
            )
            connection.commit()
            print(f"Seeded {cursor.rowcount} destination(s) into {settings.mysql_database}.")
        except BaseException:
            connection.rollback()
            raise
        finally:
            cursor.close()
    finally:
        connection.close()


if __name__ == "__main__":
    main()
