import pandas as pd
from src.database import get_conn, upsert_incident

def load_events():
    with get_conn() as c:
        return pd.read_sql("SELECT * FROM events WHERE source_ip IS NOT NULL", c)

def run_correlation() -> int:
    df = load_events()
    if df.empty:
        return 0
    updated = 0
    for ip, group in df.groupby("source_ip"):
        sources = sorted(group["source"].unique())
        if len(sources) >= 2:
            upsert_incident({
                "source_ip": ip,
                "sources": ",".join(sources),
                "first_seen": group["timestamp"].min(),
                "last_seen": group["timestamp"].max(),
                "event_count": len(group),
            })
            updated += 1
    return updated

if __name__ == "__main__":
    print(f"Incidents updated: {run_correlation()}")