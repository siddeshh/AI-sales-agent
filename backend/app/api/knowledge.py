from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.entities import KnowledgeDocument, KnowledgeChunk
from app.schemas.schemas import KnowledgeDocumentOut, KnowledgeChunkOut, RAGQueryRequest, RAGQueryResponse
from app.core.config import settings
from app.rag.engine import DocumentChunker, index_chunks, vector_store
from app.agents.rag_agent import KnowledgeRAGAgent
from app.services.activity import agent_run

router = APIRouter(prefix="/knowledge", tags=["RAG Knowledge Base"])

@router.get("", response_model=List[KnowledgeDocumentOut])
def get_documents(industry: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(KnowledgeDocument)
    if industry:
        query = query.filter(KnowledgeDocument.industry == industry)
    return query.order_by(KnowledgeDocument.created_at.desc()).all()

@router.get("/documents/{document_id}/chunks", response_model=List[KnowledgeChunkOut])
def get_document_chunks(document_id: int, db: Session = Depends(get_db)):
    chunks = db.query(KnowledgeChunk).filter(KnowledgeChunk.document_id == document_id).all()
    return chunks

@router.post("/upload", response_model=KnowledgeDocumentOut)
async def upload_document(
    title: str = Form(...),
    category: str = Form("Brochure"),
    industry: str = Form("retail"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    # shortcut: plain-text decode only; PDF/DOCX need a text extractor (e.g. pypdf) before they index usefully
    text_content = contents.decode("utf-8", errors="ignore")
    raw_chunks = DocumentChunker.chunk_text(text_content)
    if not raw_chunks:
        raise HTTPException(status_code=400, detail="No readable text in this file. Upload a .txt or .md file.")

    doc = KnowledgeDocument(
        title=title,
        filename=file.filename or "uploaded_doc.txt",
        file_type=file.filename.split(".")[-1] if file.filename else "txt",
        category=category,
        industry=industry,
        total_chunks=len(raw_chunks),
        file_size_bytes=len(contents),
        is_processed=True
    )
    db.add(doc)
    db.flush()

    chunks = [KnowledgeChunk(document_id=doc.id, chunk_index=i, content=t) for i, t in enumerate(raw_chunks)]
    db.add_all(chunks)
    db.flush()
    with agent_run(db, "Knowledge Agent", "index_document") as run:
        index_chunks(db, chunks)
        run["description"] = f"Added '{title}' to the knowledge base ({len(chunks)} chunks)."
    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    vector_store().delete([c.id for c in doc.chunks])
    db.delete(doc)
    db.commit()
    return {"message": f"Document {document_id} and associated vector chunks removed"}

@router.post("/query", response_model=RAGQueryResponse)
def test_rag_query(payload: RAGQueryRequest, db: Session = Depends(get_db)):
    res = KnowledgeRAGAgent.answer_question(payload.query, db)
    return RAGQueryResponse(
        query=payload.query,
        grounded_answer=res["answer"],
        confidence=res["confidence"],
        sources=res["sources"],
        is_unavailable=res["is_unavailable"],
        provider=res["provider"],
        grounding_failed=res["grounding_failed"],
        threshold=settings.RAG_SIMILARITY_THRESHOLD,
    )
