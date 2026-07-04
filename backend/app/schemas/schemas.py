from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    created_at: datetime
    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── Documents ─────────────────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: UUID
    filename: str
    file_type: str
    ai_summary: str | None
    status: str
    uploaded_at: datetime
    model_config = {"from_attributes": True}
    error_message: str | None = None

class DocumentDetail(DocumentOut):
    raw_text: str | None


# ── Extracted Fields ──────────────────────────────────────────────────────────

class ExtractedFieldOut(BaseModel):
    id: UUID
    field_name: str
    field_value: str
    confidence: float
    extracted_at: datetime
    model_config = {"from_attributes": True}


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatMessageIn(BaseModel):
    content: str

class ChatMessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    sent_at: datetime
    model_config = {"from_attributes": True}


# ── Risk Flags ────────────────────────────────────────────────────────────────

class RiskFlagOut(BaseModel):
    id: UUID
    flag_type: str
    severity: str
    description: str
    flagged_at: datetime
    model_config = {"from_attributes": True}
