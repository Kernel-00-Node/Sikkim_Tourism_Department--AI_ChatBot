"""
Throwaway probe — NOT part of the app, don't deploy this.

Fetches all 6 district travel-agency JSON files directly (no browser
needed — these are plain static JSON, unlike the notices page) and
reports data-quality issues so we can design the schema/model with
eyes open instead of assuming clean data:

  - total record count per district
  - records missing a `name`, or with a placeholder-only name ("M/s")
  - records missing `district` (some entries in gangtok.json lack it —
    confirmed from a manual paste of the response)
  - duplicate `registration_number` values within a file
  - the full set of keys seen across all records (in case some files
    use different field names than the gangtok.json sample)

Usage:
    cd backend
    source v_env/bin/activate
    python test_fetch_agencies.py
"""
import httpx

BASE = "https://sikkimtourism.gov.in/assets/data/travel-agencies"
DISTRICTS = ["gangtok", "mangan", "namchi", "soreng", "gyalshing", "pakyong"]


def probe():
    all_keys: set[str] = set()
    grand_total = 0

    with httpx.Client(timeout=15.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
        for district in DISTRICTS:
            url = f"{BASE}/{district}.json"
            print(f"\n=== {district} ===")
            print(f"  {url}")
            try:
                resp = client.get(url)
                resp.raise_for_status()
                records = resp.json()
            except Exception as exc:
                print(f"  FAILED: {exc}")
                continue

            grand_total += len(records)
            print(f"  {len(records)} records")

            missing_name = [r for r in records if not r.get("name") or r["name"].strip() in ("", "M/s")]
            missing_district = [r for r in records if not r.get("district")]
            reg_numbers = [r.get("registration_number") for r in records if r.get("registration_number")]
            dupes = {r for r in reg_numbers if reg_numbers.count(r) > 1}

            print(f"  missing/placeholder name: {len(missing_name)}")
            print(f"  missing district field: {len(missing_district)}")
            print(f"  duplicate registration_number values: {len(dupes)}")
            if dupes:
                print(f"    e.g.: {list(dupes)[:5]}")

            for r in records:
                all_keys.update(r.keys())

    print(f"\n=== TOTAL across all districts: {grand_total} ===")
    print(f"All keys seen across every record: {sorted(all_keys)}")


if __name__ == "__main__":
    probe()