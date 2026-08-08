"""Canonical Sikkim district names used by directory data and queries."""
from __future__ import annotations

_DISTRICT_ALIASES: dict[str, str] = {
    "gangtok": "Gangtok",
    "gangtok district": "Gangtok",
    "east": "Gangtok",
    "east sikkim": "Gangtok",
    "east district": "Gangtok",
    "mangan": "Mangan",
    "mangan district": "Mangan",
    "north": "Mangan",
    "north sikkim": "Mangan",
    "north district": "Mangan",
    "namchi": "Namchi",
    "namchi district": "Namchi",
    "south": "Namchi",
    "south sikkim": "Namchi",
    "south district": "Namchi",
    "soreng": "Soreng",
    "soreng district": "Soreng",
    "gyalshing": "Gyalshing",
    "gyalshing district": "Gyalshing",
    "west": "Gyalshing",
    "west sikkim": "Gyalshing",
    "west district": "Gyalshing",
    "pakyong": "Pakyong",
    "pakyong district": "Pakyong",
}


def normalize_district(value: str | None) -> str | None:
    """Return a canonical district name while preserving unknown valid values."""
    if not value or not isinstance(value, str):
        return None
    cleaned = " ".join(value.split())
    return _DISTRICT_ALIASES.get(cleaned.casefold(), cleaned)


def district_filter_values(value: str) -> tuple[str, ...]:
    """Return legacy and canonical spellings that represent one district."""
    canonical = normalize_district(value)
    if canonical is None:
        return ()
    values = {canonical.casefold()}
    values.update(alias for alias, mapped in _DISTRICT_ALIASES.items() if mapped == canonical)
    return tuple(sorted(values))
