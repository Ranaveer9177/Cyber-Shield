import os
import json
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

from src.database import get_conn, init_db
from src.detector import run_rules
from src.correlator import run_correlation
from src.pipeline import ingest_payload, detect_source

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

# Initialize database on startup
with app.app_context():
    init_db()

API_KEY = os.environ.get('CYBERGUARD_API_KEY', 'change-me-secret')

def require_api_key(f):
    def decorated(*args, **kwargs):
        if request.headers.get('X-API-Key') != API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401
        return f(*args, **kwargs)
    decorated.__name__ = f.__name__
    return decorated

# ============================================================
# HEALTH & SYSTEM
# ============================================================
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/api/system/info', methods=['GET'])
def system_info():
    with get_conn() as c:
        events_count = c.execute('SELECT COUNT(*) FROM events').fetchone()[0]
        alerts_count = c.execute('SELECT COUNT(*) FROM alerts').fetchone()[0]
        incidents_count = c.execute('SELECT COUNT(*) FROM incidents').fetchone()[0]
        sources = c.execute('SELECT DISTINCT source FROM events').fetchall()
    return jsonify({
        'events_count': events_count,
        'alerts_count': alerts_count,
        'incidents_count': incidents_count,
        'sources': [s[0] for s in sources],
        'version': '1.0.0'
    })

# ============================================================
# EVENTS API
# ============================================================
@app.route('/api/events', methods=['GET'])
def get_events():
    limit = min(int(request.args.get('limit', 2000)), 5000)
    offset = int(request.args.get('offset', 0))
    source = request.args.get('source')
    severity = request.args.get('severity')
    search = request.args.get('search')
    
    where_clauses = ["1=1"]
    filter_params = []
    
    if source:
        where_clauses.append("source = ?")
        filter_params.append(source)
    if severity:
        where_clauses.append("severity = ?")
        filter_params.append(severity)
    if search:
        where_clauses.append("(source_ip LIKE ? OR username LIKE ? OR raw LIKE ?)")
        search_term = f"%{search}%"
        filter_params.extend([search_term, search_term, search_term])
    
    where_sql = " AND ".join(where_clauses)
    events_query = f"SELECT * FROM events WHERE {where_sql} ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    count_query = f"SELECT COUNT(*) FROM events WHERE {where_sql}"
    
    with get_conn() as c:
        c.row_factory = sqlite3.Row
        events = c.execute(events_query, filter_params + [limit, offset]).fetchall()
        total = c.execute(count_query, filter_params).fetchone()[0]
    
    return jsonify({
        'events': [dict(e) for e in events],
        'total': total,
        'limit': limit,
        'offset': offset
    })

@app.route('/api/events/stats', methods=['GET'])
def events_stats():
    with get_conn() as c:
        c.row_factory = sqlite3.Row
        total = c.execute('SELECT COUNT(*) FROM events').fetchone()[0]
        by_source = c.execute('SELECT source, COUNT(*) as count FROM events GROUP BY source').fetchall()
        by_severity = c.execute('SELECT severity, COUNT(*) as count FROM events GROUP BY severity').fetchall()
        by_action = c.execute('SELECT action, COUNT(*) as count FROM events GROUP BY action').fetchall()
        top_ips = c.execute('SELECT source_ip, COUNT(*) as count FROM events WHERE source_ip IS NOT NULL GROUP BY source_ip ORDER BY count DESC LIMIT 10').fetchall()
        timeline = c.execute("SELECT timestamp, source, COUNT(*) as count FROM events GROUP BY timestamp, source ORDER BY timestamp DESC LIMIT 1440").fetchall()
    
    return jsonify({
        'total_events': total,
        'by_source': [dict(r) for r in by_source],
        'by_severity': [dict(r) for r in by_severity],
        'by_action': [dict(r) for r in by_action],
        'top_ips': [dict(r) for r in top_ips],
        'timeline': [dict(r) for r in timeline]
    })

@app.route('/api/events/sources', methods=['GET'])
def event_sources():
    with get_conn() as c:
        sources = c.execute('SELECT DISTINCT source FROM events').fetchall()
    return jsonify({'sources': [s[0] for s in sources]})

@app.route('/api/events/source-status', methods=['GET'])
def source_status():
    with get_conn() as c:
        sources = c.execute("""
            SELECT 
                source,
                COUNT(*) as count_24h,
                MAX(timestamp) as last_seen
            FROM events 
            WHERE timestamp >= datetime('now', '-24 hours')
            GROUP BY source
        """).fetchall()
    return jsonify({
        'sources': [
            {
                'source': s[0],
                'count_24h': s[1],
                'last_seen': s[2],
                'state': 'ONLINE' if s[2] else 'OFFLINE'
            } for s in sources
        ]
    })

# ============================================================
# ALERTS API
# ============================================================
@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    severity = request.args.get('severity')
    status = request.args.get('status', 'all')
    search = request.args.get('search')
    
    query = "SELECT * FROM alerts WHERE 1=1"
    params = []
    
    if severity:
        query += " AND severity = ?"
        params.append(severity)
    if status != 'all':
        query += " AND status = ?"
        params.append(status)
    if search:
        query += " AND (rule LIKE ? OR source_ip LIKE ? OR host LIKE ? OR description LIKE ?)"
        search_term = f"%{search}%"
        params.extend([f"%{search}%"] * 4)
    
    query += " ORDER BY id DESC"
    
    with get_conn() as c:
        c.row_factory = sqlite3.Row
        alerts = c.execute(query, params).fetchall()
    
    return jsonify({'alerts': [dict(a) for a in alerts]})

@app.route('/api/alerts/stats', methods=['GET'])
def alerts_stats():
    with get_conn() as c:
        by_severity = c.execute('SELECT severity, COUNT(*) as count FROM alerts GROUP BY severity').fetchall()
        by_status = c.execute('SELECT status, COUNT(*) as count FROM alerts GROUP BY status').fetchall()
        total = c.execute('SELECT COUNT(*) FROM alerts').fetchone()[0]
    return jsonify({
        'total': total,
        'by_severity': {r[0]: r[1] for r in by_severity},
        'by_status': {r[0]: r[1] for r in by_status}
    })

@app.route('/api/alerts/<int:alert_id>/acknowledge', methods=['PATCH'])
def acknowledge_alert(alert_id):
    with get_conn() as c:
        c.execute("UPDATE alerts SET status = 'acknowledged' WHERE id = ?", (alert_id,))
    return jsonify({'success': True})

@app.route('/api/alerts/<int:alert_id>/reopen', methods=['PATCH'])
def reopen_alert(alert_id):
    with get_conn() as c:
        c.execute("UPDATE alerts SET status = 'open' WHERE id = ?", (alert_id,))
    return jsonify({'success': True})

# ============================================================
# INCIDENTS API
# ============================================================
@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    with get_conn() as c:
        c.row_factory = sqlite3.Row
        incidents = c.execute('SELECT * FROM incidents ORDER BY event_count DESC').fetchall()
    return jsonify({'incidents': [dict(i) for i in incidents]})

@app.route('/api/incidents/<source_ip>/events', methods=['GET'])
def incident_events(source_ip):
    with get_conn() as c:
        c.row_factory = sqlite3.Row
        events = c.execute(
            'SELECT * FROM events WHERE source_ip = ? ORDER BY timestamp', 
            (source_ip,)
        ).fetchall()
    return jsonify({'events': [dict(e) for e in events]})

@app.route('/api/incidents/stats', methods=['GET'])
def incidents_stats():
    with get_conn() as c:
        total = c.execute('SELECT COUNT(*) FROM incidents').fetchone()[0]
        rows = c.execute('SELECT sources FROM incidents').fetchall()
        multi_source = sum(1 for (s,) in rows if s and ',' in s)
    return jsonify({'total': total, 'multi_source': multi_source})

# ============================================================
# DETECTION & CORRELATION ENGINE
# ============================================================
@app.route('/api/detect', methods=['POST'])
def api_detect():
    created = run_rules()
    return jsonify({'alerts_created': created})

@app.route('/api/correlate', methods=['POST'])
def api_correlate():
    updated = run_correlation()
    return jsonify({'incidents_updated': updated})

@app.route('/api/detect-and-correlate', methods=['POST'])
def api_detect_and_correlate():
    alerts = run_rules()
    incidents = run_correlation()
    return jsonify({'alerts_created': alerts, 'incidents_updated': incidents})

@app.route('/api/simulate/traffic', methods=['POST'])
def simulate_traffic():
    sample_logs = [
        ("apache", '192.168.1.105 - - [08/Nov/2026:21:04:12 +0000] "GET /admin/config.php HTTP/1.1" 404 432'),
        ("linux", 'Nov 08 21:04:15 auth-server sshd[2841]: Failed password for root from 192.168.1.105 port 44210 ssh2'),
        ("paloalto", '1,2026/11/08 21:04:18,001801000001,TRAFFIC,drop,1,2026/11/08 21:04:18,192.168.1.105,10.0.0.15,0.0.0.0,0.0.0.0,Rule-Deny,,,ping,vsys1,untrust,trust,ethernet1/1,ethernet1/2,default,2026/11/08 21:04:18,0,1,0,0,0,0,0,0,,icmp,deny,0,0,0,0,0,0,0,0,0,0,0')
    ]
    total_ingested = 0
    for source, line in sample_logs:
        ok, _, _ = ingest_payload(source, line)
        total_ingested += ok
    run_rules()
    run_correlation()
    return jsonify({'status': 'simulated', 'events_ingested': total_ingested})

# ============================================================
# INGESTION API
# ============================================================
@app.route('/ingest/<source>', methods=['POST'])
@require_api_key
def ingest(source):
    if source not in ('apache', 'linux', 'windows', 'paloalto', 'aws'):
        return jsonify({'error': 'Unknown source'}), 400
    
    host_header = request.headers.get('X-Host-Name', 'unknown')
    content = request.get_data(as_text=True)
    
    ok, fail, events = ingest_payload(source, content)
    
    # Add host from header if not in parsed events
    for event in events:
        if not event.get('host'):
            event['host'] = host_header
    
    return jsonify({
        'ok': ok,
        'failed': fail,
        'host': host_header,
        'events_count': len(events)
    })

@app.route('/api/detect-source', methods=['POST'])
def api_detect_source():
    data = request.get_json()
    if not data or 'sample' not in data:
        return jsonify({'error': 'Missing sample'}), 400
    
    source = detect_source(data['sample'])
    return jsonify({'source': source})

# ============================================================
# CONFIG API
# ============================================================
@app.route('/api/config/rules', methods=['GET'])
def get_rules():
    import yaml
    with open('config/rules.yaml') as f:
        rules = yaml.safe_load(f)
    return jsonify(rules)

@app.route('/api/config/rules', methods=['PUT'])
def update_rules():
    import yaml
    rules = request.get_json()
    with open('config/rules.yaml', 'w') as f:
        yaml.dump(rules, f)
    return jsonify({'success': True})

@app.route('/api/config/api-key', methods=['GET'])
def get_api_key():
    return jsonify({'configured': API_KEY != 'change-me-secret'})

@app.route('/api/config/api-key', methods=['PUT'])
def update_api_key():
    global API_KEY
    data = request.get_json()
    if not data or 'key' not in data:
        return jsonify({'error': 'Missing key'}), 400
    API_KEY = data['key']
    return jsonify({'success': True})

# ============================================================
# PARSE ERRORS
# ============================================================
@app.route('/api/parse-errors', methods=['GET'])
def get_parse_errors():
    with get_conn() as c:
        c.row_factory = sqlite3.Row
        errors = c.execute('SELECT * FROM parse_errors ORDER BY id DESC LIMIT 500').fetchall()
    return jsonify({'errors': [dict(e) for e in errors]})

@app.route('/api/parse-errors', methods=['DELETE'])
def clear_parse_errors():
    with get_conn() as c:
        c.execute('DELETE FROM parse_errors')
    return jsonify({'success': True})

# ============================================================
# FILE UPLOAD (for manual testing)
# ============================================================
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    source = request.form.get('source', 'auto')
    content = file.read().decode('utf-8', errors='ignore')
    
    if source == 'auto':
        source = detect_source(content.split('\n')[0]) or 'apache'
    
    ok, fail, events = ingest_payload(source, content)
    
    return jsonify({
        'source': source,
        'ok': ok,
        'failed': fail,
        'events_count': len(events)
    })

# ============================================================
# STATIC FILE SERVING (for React build)
# ============================================================
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path and os.path.exists(os.path.join('frontend/dist', path)):
        return send_from_directory('frontend/dist', path)
    return send_from_directory('frontend/dist', 'index.html')

if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1')
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)