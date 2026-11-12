"""SQLite layer: events (audit log), nodes (fleet status) and analytics queries.

Existing databases are upgraded in place: tables are created only if missing, and nodes already
present in the events table are backfilled into the nodes table (as offline).
"""
import math
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

DB_PATH = Path(os.getenv("SENTRYMESH_DB", str(Path(__file__).with_name("sentrymesh.db"))))

TS_FMT = "%Y-%m-%dT%H:%M:%SZ"        # node last_seen / first_seen (server clock, UTC)
SQL_TS_FMT = "%Y-%m-%d %H:%M:%S"      # matches SQLite CURRENT_TIMESTAMP used for events.received_at
BUCKET_SQL = {"minute": "%Y-%m-%dT%H:%M:00Z", "hour": "%Y-%m-%dT%H:00:00Z", "day": "%Y-%m-%dT00:00:00Z"}
BUCKET_STEP = {"minute": timedelta(minutes=1), "hour": timedelta(hours=1), "day": timedelta(days=1)}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_str() -> str:
    return utc_now().strftime(TS_FMT)


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS events (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               node_id TEXT NOT NULL,
               timestamp TEXT NOT NULL,
               class TEXT NOT NULL,
               confidence REAL NOT NULL,
               verified INTEGER NOT NULL,
               received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
           )"""
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_events_node_time ON events(node_id, timestamp)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_events_received ON events(received_at)")
    conn.execute(
        """CREATE TABLE IF NOT EXISTS nodes (
               node_id TEXT PRIMARY KEY,
               status TEXT NOT NULL DEFAULT 'offline',
               last_seen TEXT,
               first_seen TEXT NOT NULL,
               firmware_version TEXT,
               ip TEXT
           )"""
    )
    # Backfill nodes that already have events (idempotent), so upgraded databases show their old nodes.
    conn.execute(
        """INSERT OR IGNORE INTO nodes (node_id, status, last_seen, first_seen)
           SELECT node_id, 'offline',
                  replace(MAX(received_at), ' ', 'T') || 'Z',
                  replace(MIN(received_at), ' ', 'T') || 'Z'
           FROM events GROUP BY node_id"""
    )
    conn.commit()


# ---------------------------------------------------------------- events
def insert_event(conn, node_id, timestamp, cls, confidence, verified) -> int:
    cur = conn.execute(
        "INSERT INTO events (node_id, timestamp, class, confidence, verified) VALUES (?,?,?,?,?)",
        (node_id, timestamp, cls, confidence, int(verified)),
    )
    conn.commit()
    return cur.lastrowid


def get_event(conn, event_id: int):
    row = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    return dict(row) if row else None


def _event_filters(node_id=None, cls=None):
    where, args = [], []
    if node_id:
        where.append("node_id = ?"); args.append(node_id)
    if cls:
        where.append("class = ?"); args.append(cls)
    return where, args


def list_events(conn, limit=50, node_id=None, cls=None, offset=0):
    where, args = _event_filters(node_id, cls)
    sql = "SELECT * FROM events"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY id DESC LIMIT ? OFFSET ?"
    args += [limit, offset]
    return [dict(r) for r in conn.execute(sql, args).fetchall()]


def count_events(conn, node_id=None, cls=None) -> int:
    where, args = _event_filters(node_id, cls)
    sql = "SELECT COUNT(*) FROM events"
    if where:
        sql += " WHERE " + " AND ".join(where)
    return conn.execute(sql, args).fetchone()[0]


# ---------------------------------------------------------------- nodes
def get_node(conn, node_id: str):
    row = conn.execute("SELECT * FROM nodes WHERE node_id = ?", (node_id,)).fetchone()
    return dict(row) if row else None


def ensure_node(conn, node_id: str, now: str) -> bool:
    """Create the node as offline if unknown. Returns True if it was created."""
    cur = conn.execute(
        "INSERT OR IGNORE INTO nodes (node_id, status, last_seen, first_seen) VALUES (?, 'offline', NULL, ?)",
        (node_id, now),
    )
    conn.commit()
    return cur.rowcount > 0


def set_node(conn, node_id, now, status, firmware_version=None, ip=None, touch=True):
    """Create or update a node. Returns (node_dict, changed) where changed means new node or status flip."""
    existing = get_node(conn, node_id)
    if existing is None:
        conn.execute(
            "INSERT INTO nodes (node_id, status, last_seen, first_seen, firmware_version, ip) VALUES (?,?,?,?,?,?)",
            (node_id, status, now if touch else None, now, firmware_version, ip),
        )
        conn.commit()
        return get_node(conn, node_id), True
    conn.execute(
        """UPDATE nodes SET status = ?,
                  last_seen = CASE WHEN ? THEN ? ELSE last_seen END,
                  firmware_version = COALESCE(?, firmware_version),
                  ip = COALESCE(?, ip)
           WHERE node_id = ?""",
        (status, int(touch), now, firmware_version, ip, node_id),
    )
    conn.commit()
    return get_node(conn, node_id), existing["status"] != status


def mark_stale_offline(conn, cutoff: str):
    """Mark online nodes with no contact since `cutoff` (TS_FMT string) as offline. Returns the changed nodes."""
    rows = conn.execute(
        "SELECT node_id FROM nodes WHERE status = 'online' AND (last_seen IS NULL OR last_seen < ?)", (cutoff,)
    ).fetchall()
    changed = []
    for r in rows:
        conn.execute("UPDATE nodes SET status = 'offline' WHERE node_id = ?", (r["node_id"],))
        changed.append(get_node(conn, r["node_id"]))
    conn.commit()
    return changed


def mark_all_offline(conn) -> int:
    """Startup reset: nothing has been heard yet, so no node can be trusted to be online."""
    cur = conn.execute("UPDATE nodes SET status = 'offline' WHERE status != 'offline'")
    conn.commit()
    return cur.rowcount


def list_nodes(conn):
    rows = conn.execute(
        """SELECT n.*, COALESCE(e.alert_count, 0) AS alert_count, e.last_alert_at
           FROM nodes n
           LEFT JOIN (SELECT node_id, COUNT(*) AS alert_count,
                             replace(MAX(received_at), ' ', 'T') || 'Z' AS last_alert_at
                      FROM events GROUP BY node_id) e ON e.node_id = n.node_id
           ORDER BY n.node_id"""
    ).fetchall()
    return [dict(r) for r in rows]


def count_nodes(conn):
    r = conn.execute("SELECT COUNT(*) AS total, COALESCE(SUM(status = 'online'), 0) AS online FROM nodes").fetchone()
    return {"total": r["total"], "online": r["online"]}


# ---------------------------------------------------------------- analytics
def _window(hours, node_id=None, cls=None):
    where, args = [], []
    if hours is not None:
        where.append("received_at >= ?")
        args.append((utc_now() - timedelta(hours=hours)).strftime(SQL_TS_FMT))
    w2, a2 = _event_filters(node_id, cls)
    return where + w2, args + a2


def _where_sql(where):
    return (" WHERE " + " AND ".join(where)) if where else ""


def summary(conn, hours=None, node_id=None):
    where, args = _window(hours, node_id)
    ws = _where_sql(where)
    tot = conn.execute(f"SELECT COUNT(*) AS n, COALESCE(SUM(verified), 0) AS v FROM events{ws}", args).fetchone()
    by_class = {r["class"]: r["n"] for r in conn.execute(
        f"SELECT class, COUNT(*) AS n FROM events{ws} GROUP BY class", args)}
    by_node = {r["node_id"]: r["n"] for r in conn.execute(
        f"SELECT node_id, COUNT(*) AS n FROM events{ws} GROUP BY node_id ORDER BY n DESC", args)}
    total, verified = tot["n"], tot["v"]
    return {
        "window_hours": hours,
        "total": total,
        "by_class": by_class,
        "by_node": by_node,
        "verified": verified,
        "unverified": total - verified,
        "verified_ratio": round(verified / total, 4) if total else None,
    }


def bucket_count(hours: int, bucket: str) -> int:
    step_hours = BUCKET_STEP[bucket].total_seconds() / 3600
    return math.ceil(hours / step_hours) + 1


def _floor(dt: datetime, bucket: str) -> datetime:
    if bucket == "minute":
        return dt.replace(second=0, microsecond=0)
    if bucket == "hour":
        return dt.replace(minute=0, second=0, microsecond=0)
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def timeseries(conn, hours=24, bucket="hour", node_id=None, cls=None):
    """Zero-filled event counts per time bucket, by received_at (server clock, UTC)."""
    where, args = _window(hours, node_id, cls)
    fmt = BUCKET_SQL[bucket]
    rows = conn.execute(
        f"""SELECT strftime('{fmt}', received_at) AS b, class,
                   COUNT(*) AS n, COALESCE(SUM(verified), 0) AS v
            FROM events{_where_sql(where)} GROUP BY b, class""",
        args,
    ).fetchall()
    points = {}
    t, end = _floor(utc_now() - timedelta(hours=hours), bucket), _floor(utc_now(), bucket)
    while t <= end:
        points[t.strftime(fmt)] = {"bucket": t.strftime(fmt), "total": 0, "verified": 0, "unverified": 0, "by_class": {}}
        t += BUCKET_STEP[bucket]
    for r in rows:
        p = points.get(r["b"])
        if p is None:
            continue
        p["total"] += r["n"]
        p["verified"] += r["v"]
        p["unverified"] += r["n"] - r["v"]
        p["by_class"][r["class"]] = p["by_class"].get(r["class"], 0) + r["n"]
    return list(points.values())
