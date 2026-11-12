"""Alert packet schema (fields are SETTLED; names/values are PROPOSED, see README_TEAM.md section 5)."""
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
