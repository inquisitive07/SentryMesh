"""Message schemas for SentryMesh.

Alert fields are SETTLED; names/values are PROPOSED (see README_TEAM.md section 5).
Heartbeat and status messages are new in Phase 1.
"""
import json
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class IntrusionClass(str, Enum):
    normal_noise = "normal_noise"
    walk_run = "walk_run"
    vehicle = "vehicle"
    digging = "digging"
    climbing_cutting = "climbing_cutting"


class Alert(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    node_id: str
    timestamp: datetime
    # "class" is a reserved word in Python, so the JSON key "class" maps to cls
    cls: IntrusionClass = Field(alias="class")
    confidence: float = Field(ge=0.0, le=1.0)
    verified: bool


class Heartbeat(BaseModel):
    """Optional metadata sent on sentrymesh/<node_id>/heartbeat. An empty payload is also a valid heartbeat."""

    model_config = ConfigDict(extra="ignore")

    timestamp: datetime | None = None
    firmware_version: str | None = Field(default=None, max_length=64)
    ip: str | None = Field(default=None, max_length=64)
    uptime_s: int | None = Field(default=None, ge=0)


def parse_status(payload: bytes) -> str | None:
    """Parse a status payload. Accepts plain text 'online'/'offline' or JSON {"status": "online"}.

    Returns 'online', 'offline', or None if the payload is not a valid status.
    """
    text = payload.decode("utf-8", errors="replace").strip()
    if text.startswith("{"):
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            return None
        text = str(data.get("status", "")) if isinstance(data, dict) else ""
    text = text.strip().lower()
    return text if text in ("online", "offline") else None
