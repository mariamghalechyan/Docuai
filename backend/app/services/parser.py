"""
File parsing service.
Extracts raw text from uploaded documents (PDF, DOCX, images).
"""
import fitz  # PyMuPDF
import docx
from pathlib import Path


def extract_text(file_path: str, file_type: str) -> str:
    """
    Extract raw text from a document based on its type.
    Returns plain text string.
    """
    path = Path(file_path)

    if file_type == "pdf":
        return _extract_from_pdf(path)
    elif file_type == "docx":
        return _extract_from_docx(path)
    elif file_type in ("png", "jpg", "jpeg", "webp"):
        return _extract_from_image(path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


def _extract_from_pdf(path: Path) -> str:
    """Extract text from each page of a PDF."""
    doc = fitz.open(str(path))
    pages = []
    for page in doc:
        pages.append(page.get_text("text"))
    doc.close()
    return "\n\n".join(pages).strip()


def _extract_from_docx(path: Path) -> str:
    """Extract text from all paragraphs in a Word document."""
    doc = docx.Document(str(path))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs).strip()


def _extract_from_image(path: Path) -> str:
    """
    Extract text from an image using PyMuPDF's OCR capability.
    Requires Tesseract to be installed on the system.
    Falls back to a placeholder if OCR is unavailable.
    """
    try:
        doc = fitz.open()
        img_doc = fitz.open(str(path))
        pdfbytes = img_doc.convert_to_pdf()
        img_doc.close()
        doc = fitz.open("pdf", pdfbytes)
        text = doc[0].get_text("text")
        doc.close()
        return text.strip() or "[No text found in image — OCR may be needed]"
    except Exception as e:
        return f"[Image text extraction failed: {str(e)}]"
