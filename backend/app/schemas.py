"""Pydantic request models for the two POST endpoints (validation only —
responses are returned as plain dicts shaped exactly per
15_Backend_Full_Specification.md, so FastAPI serializes them as-is)."""
from pydantic import BaseModel


class CandidateAction(BaseModel):
    action: str
    cost: float = 0.0
    downtime_hours: float = 0.0


class WhatIfRequest(BaseModel):
    asset_id: str
    candidate_actions: list[CandidateAction]


class ImplementActionRequest(BaseModel):
    implemented_by: str
    notes: str = ""


class SignupRequest(BaseModel):
    email: str
    password: str
    role: str = "viewer"  # admin | operator | viewer


class LoginRequest(BaseModel):
    email: str
    password: str
