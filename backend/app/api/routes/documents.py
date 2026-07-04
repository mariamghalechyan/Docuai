import os
import shutil
from uuid import UUID
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User, Document, ExtractedField, ChatMessage, RiskFlag
from app.schemas.schemas import (
    DocumentOut, DocumentDetail,
    ExtractedFieldOut, ChatMessageIn, ChatMessageOut, RiskFlagOut,
)
from app.core.security import get_current_user
from app.core.config import settings
from app.services import parser, ai_service

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_TYPES = {"pdf", "docx", "png", "jpg", "jpeg", "webp"}


def _process_document(doc_id: UUID, db: Session):
    """
    Background task: parse file → run AI extraction → store results.
    Runs after the upload endpoint returns so the user isn't waiting.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return

    try:
        doc.status = "processing"
        db.commit()

        # 1. Extract raw text
        raw_text = parser.extract_text(doc.storage_path, doc.file_type)
        doc.raw_text = raw_text

        # 2. Generate summary
        doc.ai_summary = ai_service.summarise_document(raw_text)

        # 3. Extract structured fields
        fields = ai_service.extract_fields(raw_text)
        for f in fields:
            db.add(ExtractedField(
                document_id=doc.id,
                field_name=f["field_name"],
                field_value=f["field_value"],
                confidence=f.get("confidence", 1.0),
            ))

        # 4. Detect risk flags
        flags = ai_service.detect_risk_flags(raw_text)
        for fl in flags:
            db.add(RiskFlag(
                document_id=doc.id,
                flag_type=fl["flag_type"],
                severity=fl["severity"],
                description=fl["description"],
            ))

        doc.status = "done"
        db.commit()

    except Exception as e:
        doc.status = "error"
        doc.error_message = str(e)
        db.commit()
        print(f"[ERROR] Processing doc {doc_id}: {e}")


@router.delete("/{doc_id}", status_code=204)
def delete_document(
    doc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()

    
@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate file type
    suffix = Path(file.filename).suffix.lstrip(".").lower()
    if suffix not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type '{suffix}' not supported")

    # Save file to disk
    upload_dir = Path(settings.UPLOAD_DIR) / str(current_user.id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / file.filename

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Create DB record
    doc = Document(
        user_id=current_user.id,
        filename=file.filename,
        file_type=suffix,
        storage_path=str(dest),
        status="pending",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Kick off processing in the background
    background_tasks.add_task(_process_document, doc.id, db)

    return doc


@router.get("/", response_model=list[DocumentOut])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Document).filter(Document.user_id == current_user.id).all()


@router.get("/{doc_id}", response_model=DocumentDetail)
def get_document(
    doc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{doc_id}/fields", response_model=list[ExtractedFieldOut])
def get_fields(
    doc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc.extracted_fields


@router.get("/{doc_id}/flags", response_model=list[RiskFlagOut])
def get_flags(
    doc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc.risk_flags


@router.post("/{doc_id}/chat", response_model=ChatMessageOut)
def chat(
    doc_id: UUID,
    payload: ChatMessageIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.raw_text:
        raise HTTPException(status_code=400, detail="Document still processing")

    # Build history for Claude
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in doc.chat_messages
    ]

    # Save user message
    user_msg = ChatMessage(document_id=doc.id, role="user", content=payload.content)
    db.add(user_msg)
    db.commit()

    # Get AI answer
    answer = ai_service.answer_question(doc.raw_text, history, payload.content)

    # Save assistant message
    ai_msg = ChatMessage(document_id=doc.id, role="assistant", content=answer)
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return ai_msg


@router.get("/{doc_id}/chat", response_model=list[ChatMessageOut])
def get_chat_history(
    doc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc.chat_messages
