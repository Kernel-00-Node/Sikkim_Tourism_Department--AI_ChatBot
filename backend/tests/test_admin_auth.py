"""
Tests for the POST /api/admin/sync auth guard (app/dependencies.py).

Before this fix, this endpoint had NO authentication at all — anyone who
found the URL could trigger a full vector-store resync. These tests exist
specifically to prevent that regressing silently in the future.
"""
def test_sync_rejected_with_no_credentials(client):
    resp = client.post("/api/admin/sync")
    assert resp.status_code == 401


def test_sync_rejected_with_wrong_credentials(client):
    resp = client.post("/api/admin/sync", headers={"Authorization": "Basic definitely-wrong"})
    assert resp.status_code == 401


def test_sync_accepted_with_valid_password_credentials(client, admin_headers):
    resp = client.post("/api/admin/sync", headers=admin_headers)
    assert resp.status_code == 200

    body = resp.json()
    assert body["status"] == "ok"
    assert body["db_mode"] == "mock"
    # GEMINI_API_KEY is empty in the test env, so populate_vectorstore()
    # short-circuits before indexing anything — that's expected here.
    assert body["indexed"] == 0
