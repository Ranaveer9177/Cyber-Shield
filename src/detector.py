import yaml
import pandas as pd
from datetime import timedelta
from src.database import get_conn, upsert_alert

def load_rules(path="config/rules.yaml"):
    with open(path) as f:
        return yaml.safe_load(f)

def load_events():
    with get_conn() as c:
        return pd.read_sql("SELECT * FROM events WHERE source_ip IS NOT NULL", c)

def run_rules(config_path="config/rules.yaml") -> int:
    rules = load_rules(config_path)
    df = load_events()
    if df.empty:
        return 0
    df["ts"] = pd.to_datetime(df["timestamp"], utc=True, format="ISO8601")
    created = 0
    for rule_name, rule_cfg in rules.items():
        subset = df.copy()
        for col, val in rule_cfg.get("where", {}).items():
            subset = subset[subset[col] == val]
        window = timedelta(minutes=rule_cfg["window_minutes"])
        threshold = rule_cfg["threshold"]
        for ip, group in subset.groupby("source_ip"):
            timestamps = group.sort_values("ts")["ts"].tolist()
            if len(timestamps) < threshold:
                continue
            for i in range(len(timestamps) - threshold + 1):
                if timestamps[i + threshold - 1] - timestamps[i] <= window:
                    host = group.iloc[-1].get("host") if "host" in group.columns else None
                    upsert_alert({
                        "rule": rule_name,
                        "description": rule_cfg.get("description", rule_name),
                        "severity": rule_cfg["severity"],
                        "source_ip": ip,
                        "host": host,
                        "first_seen": timestamps[0].isoformat(),
                        "last_seen": timestamps[-1].isoformat(),
                        "event_count": len(timestamps),
                        "recommended_action": rule_cfg.get("recommended_action", "Investigate activity from this source IP."),
                        "status": "open",
                    })
                    created += 1
                    break
    return created

if __name__ == "__main__":
    print(f"Alerts created: {run_rules()}")