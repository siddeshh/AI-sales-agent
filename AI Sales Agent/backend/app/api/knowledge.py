from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.core.database import get_db
from app.models.entities import KnowledgeDocument, KnowledgeChunk
from app.schemas.schemas import KnowledgeDocumentOut, KnowledgeChunkOut, RAGQueryRequest, RAGQueryResponse
from app.rag.engine import DocumentChunker, EmbeddingEngine, RAGEngine
from app.agents.rag_agent import KnowledgeRAGAgent

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
    industry: str = Form("real_estate"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    text_content = ""
    try:
        text_content = contents.decode("utf-8", errors="ignore")
    except Exception:
        text_content = f"Document content for {title}. Extracted text placeholder."

    if not text_content.strip():
        text_content = f"Official specification doc for {title}. Verified sales and product parameters."

    # Split into chunks
    raw_chunks = DocumentChunker.chunk_text(text_content, chunk_size=350, overlap=40)
    if not raw_chunks:
        raw_chunks = [text_content]

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
    db.commit()
    db.refresh(doc)

    # Ingest chunks & generate embeddings
    for idx, chunk_text in enumerate(raw_chunks):
        embedding_vec = EmbeddingEngine.generate_embedding(chunk_text)
        chunk = KnowledgeChunk(
            document_id=doc.id,
            chunk_index=idx,
            content=chunk_text,
            metadata_json=json.dumps({"length": len(chunk_text)}),
            embedding_json=json.dumps(embedding_vec)
        )
        db.add(chunk)

    db.commit()
    return doc

@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return {"message": f"Document {document_id} and associated vector chunks removed"}

@router.post("/query", response_model=RAGQueryResponse)
def test_rag_query(payload: RAGQueryRequest, db: Session = Depends(get_db)):
    res = KnowledgeRAGAgent.answer_question(payload.query, db, industry=payload.industry)
    return RAGQueryResponse(
        query=payload.query,
        grounded_answer=res["answer"],
        confidence=res["confidence"],
        sources=res["sources"],
        is_unavailable=res["is_unavailable"]
    )
