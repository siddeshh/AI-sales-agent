import React, { useState, useEffect } from 'react';
import { 
  FileText, Upload, Search, Trash2, Eye, 
  CheckCircle2, X 
} from 'lucide-react';
import { KnowledgeDocument, KnowledgeChunk } from '../types';
import { api } from '../services/api';

export const KnowledgeBaseView: React.FC = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedDocChunks, setSelectedDocChunks] = useState<KnowledgeChunk[]>([]);
  const [activeChunkDocTitle, setActiveChunkDocTitle] = useState('');
  const [isChunkModalOpen, setIsChunkModalOpen] = useState(false);

  // Upload Form
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Catalogue');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // RAG Query Tester
  const [ragQuery, setRagQuery] = useState('What is the bulk price for 250 French Terry Hoodies?');
  const [ragResult, setRagResult] = useState<any>(null);
  const [ragError, setRagError] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const loadDocuments = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle) return;

    setIsUploading(true);
    setUploadError('');
    const fd = new FormData();
    fd.append('title', uploadTitle);
    fd.append('category', uploadCategory);
    fd.append('file', uploadFile);

    try {
      await api.uploadDocument(fd);
      setIsUploadModalOpen(false);
      setUploadTitle('');
      setUploadFile(null);
      await loadDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (id: number) => {
    if (!window.confirm('Delete this knowledge document?')) return;
    try {
      await api.deleteDocument(id);
      await loadDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewChunks = async (doc: KnowledgeDocument) => {
    setActiveChunkDocTitle(doc.title);
    try {
      const chunks = await api.getDocumentChunks(doc.id);
      setSelectedDocChunks(chunks);
      setIsChunkModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestRAG = async () => {
    if (!ragQuery.trim()) return;
    setIsQuerying(true);
    setRagError('');
    try {
      const res = await api.queryRAG(ragQuery);
      setRagResult(res);
    } catch (err) {
      setRagResult(null);
      setRagError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Knowledge base</h2>
          <p>Manage the documents and specifications your AI sales agents use for grounded answers.</p>
        </div>

        <button onClick={() => setIsUploadModalOpen(true)} className="btn btn-primary btn-sm">
          <Upload size={13} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Main Grid: Documents Table & Query Tester */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Left: Documents Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>
            Indexed Documents ({documents.length})
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Chunks</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{doc.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                      {(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB • {doc.filename}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>{doc.category}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: 'var(--foreground)' }}>{doc.total_chunks}</span>
                  </td>
                  <td>
                    <span className="badge badge-green">Indexed</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      <button
                        onClick={() => handleViewChunks(doc)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px' }}
                        title="View Chunks"
                      >
                        <Eye size={13} color="var(--muted-foreground)" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px' }}
                        title="Delete"
                      >
                        <Trash2 size={13} color="var(--danger)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Test a question */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>
              Test a question
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
              Runs the same retrieval and answer step the Knowledge agent uses in chat. Answers come only from the matched chunks.
            </div>
          </div>

          <textarea
            rows={3}
            value={ragQuery}
            onChange={(e) => setRagQuery(e.target.value)}
            placeholder="Ask a product or pricing question..."
            className="form-textarea"
            style={{ fontSize: '14px' }}
          />

          <button
            onClick={handleTestRAG}
            disabled={isQuerying}
            className="btn btn-secondary btn-sm"
            style={{ alignSelf: 'flex-start' }}
          >
            <Search size={13} />
            <span>{isQuerying ? 'Searching...' : 'Ask'}</span>
          </button>

          {ragError && (
            <div style={{ fontSize: '13px', color: 'var(--danger)' }}>{ragError}</div>
          )}

          {ragResult && (
            <div style={{
              padding: '14px',
              borderRadius: '6px',
              background: ragResult.is_unavailable || ragResult.grounding_failed ? 'var(--warning-soft)' : 'var(--muted)',
              border: `1px solid ${ragResult.is_unavailable || ragResult.grounding_failed ? 'var(--warning-border)' : 'var(--border)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: ragResult.is_unavailable || ragResult.grounding_failed ? 'var(--warning)' : 'var(--success)' }}>
                  {ragResult.is_unavailable
                    ? `No chunk above similarity ${ragResult.threshold}`
                    : ragResult.grounding_failed
                      ? 'Answer failed grounding check'
                      : 'Answer from sources'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                  {ragResult.provider === 'rules'
                    ? 'Demo mode: no LLM configured, best chunk quoted'
                    : `Model: ${ragResult.provider}`}
                </span>
              </div>

              <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--foreground)', marginBottom: '10px' }}>
                {ragResult.grounded_answer}
              </p>

              {ragResult.sources && ragResult.sources.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                    Matched sources (cosine similarity)
                  </div>
                  {ragResult.sources.map((src: any) => (
                    <div key={src.chunk_id} style={{ fontSize: '12px', color: 'var(--muted-foreground)', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <strong style={{ color: 'var(--foreground)' }}>
                          {src.title} · chunk {src.chunk_number}
                        </strong>
                        <span>{src.score.toFixed(3)}</span>
                      </div>
                      <div style={{ color: 'var(--muted-foreground)', marginTop: '2px' }}>{src.excerpt}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--foreground)', marginBottom: '14px' }}>Upload Document</h3>
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Bulk Order Price List 2026"
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="form-select"
                >
                  <option value="Catalogue">Catalogue</option>
                  <option value="Pricing">Pricing</option>
                  <option value="Policy">Policy</option>
                  <option value="FAQ">FAQ</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  File (TXT, MD) *
                </label>
                <input
                  type="file"
                  required
                  accept=".txt,.md"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="form-input"
                />
              </div>

              {uploadError && (
                <div style={{ fontSize: '13px', color: 'var(--danger)' }}>{uploadError}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="btn btn-primary btn-sm"
                >
                  {isUploading ? 'Indexing...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chunk Viewer Modal */}
      {isChunkModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '640px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--foreground)' }}>
                Chunks: {activeChunkDocTitle}
              </div>
              <button onClick={() => setIsChunkModalOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {selectedDocChunks.map((ch) => (
                <div key={ch.id} style={{ padding: '10px 12px', background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '3px' }}>
                    Chunk #{ch.chunk_index}
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--foreground)' }}>
                    {ch.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
