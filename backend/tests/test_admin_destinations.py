"""Regression coverage for the protected destination-management API."""


def _destination_payload() -> dict:
    return {
        "name": "Admin Test Valley",
        "slug": "admin-test-valley",
        "category": "nature",
        "description": "A temporary record used to verify admin CRUD.",
        "location": "Test location",
        "district": "East Sikkim",
        "altitude": None,
        "best_time": "March–May",
        "entry_fee": None,
        "permit_required": False,
        "permit_info": None,
        "how_to_reach": "By test route.",
        "highlights": ["Test highlight"],
        "tags": ["test"],
        "image_placeholder": "#888888",
        "image_url": None,
        "latitude": None,
        "longitude": None,
    }


def test_admin_can_manage_destination_records(client, admin_headers):
    created = client.post(
        "/api/admin/destinations", json=_destination_payload(), headers=admin_headers
    )
    assert created.status_code == 201
    destination_id = created.json()["id"]

    listed = client.get("/api/admin/destinations", headers=admin_headers)
    assert listed.status_code == 200
    assert any(row["id"] == destination_id for row in listed.json())

    updated_payload = _destination_payload() | {"name": "Updated Admin Test Valley"}
    updated = client.put(
        f"/api/admin/destinations/{destination_id}",
        json=updated_payload,
        headers=admin_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Updated Admin Test Valley"

    deleted = client.delete(
        f"/api/admin/destinations/{destination_id}", headers=admin_headers
    )
    assert deleted.status_code == 204


def test_admin_destination_rejects_unsafe_image_values(client, admin_headers):
    unsafe_url = _destination_payload() | {"image_url": "javascript:alert(1)"}
    unsafe_colour = _destination_payload() | {"image_placeholder": "url(https://example.com)"}

    assert client.post(
        "/api/admin/destinations", json=unsafe_url, headers=admin_headers
    ).status_code == 422
    assert client.post(
        "/api/admin/destinations", json=unsafe_colour, headers=admin_headers
    ).status_code == 422
