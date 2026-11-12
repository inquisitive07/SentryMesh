"""Tiny SQLite layer for events (audit log)."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).with_name("sentrymesh.db")


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
    conn.commit()


def insert_event(conn, node_id, timestamp, cls, confidence, verified) -> int:
    cur = conn.execute(
        "INSERT INTO events (node_id, timestamp, class, confidence, verified) VALUES (?,?,?,?,?)",
        (node_id, timestamp, cls, confidence, int(verified)),
    )
    conn.commit()
    return cur.lastrowid


def list_events(conn, limit=50, node_id=None, cls=None):
    sql, args = "SELECT * FROM events", []
    where = []
    if node_id:
        where.append("node_id = ?"); args.append(node_id)
    if cls:
        where.append("class = ?"); args.append(cls)
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY id DESC LIMIT ?"; args.append(limit)
    return [dict(r) for r in conn.execute(sql, args).fetchall()]
