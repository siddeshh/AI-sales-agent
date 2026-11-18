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
  const [uploadCategory, setUploadCategory] = useState('Brochure');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // RAG Query Tester
  const [ragQuery, setRagQuery] = useState('What are the 2 BHK prices and MahaRERA possession date?');
  const [ragResult, setRagResult] = useState<any>(null);
  const [isQuerying, setIsQuerying] = useState(false);

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
      console.error(err);
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
    try {
      const res = await api.queryRAG(ragQuery);
      setRagResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Knowledge Base</h2>
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
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
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
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{doc.title}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB • {doc.filename}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#475569' }}>{doc.category}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#0f172a' }}>{doc.total_chunks}</span>
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
                        <Eye size={13} color="#64748b" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px' }}
                        title="Delete"
                      >
                        <Trash2 size={13} color="#dc2626" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Query Tester */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
              Semantic Search Tester
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Test questions against the vector index to verify citations and anti-hallucination guardrails.
            </div>
          </div>

          <textarea
            rows={3}
            value={ragQuery}
            onChange={(e) => setRagQuery(e.target.value)}
            placeholder="Ask a property or pricing question..."
            className="form-textarea"
            style={{ fontSize: '13px' }}
          />

          <button
            onClick={handleTestRAG}
            disabled={isQuerying}
            className="btn btn-secondary btn-sm"
            style={{ alignSelf: 'flex-start' }}
          >
            <Search size={13} />
            <span>{isQuerying ? 'Querying index...' : 'Test Question'}</span>
          </button>

          {ragResult && (
            <div style={{
              padding: '14px',
              borderRadius: '6px',
              background: ragResult.is_unavailable ? '#fffbeb' : '#f8fafc',
              border: `1px solid ${ragResult.is_unavailable ? '#fef3c7' : '#e2e8f0'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: ragResult.is_unavailable ? '#b45309' : '#166534' }}>
                  {ragResult.is_unavailable ? 'Information Unavailable' : 'Grounded Answer'}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Confidence: {Math.round(ragResult.confidence * 100)}%
                </span>
              </div>

              <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#0f172a', marginBottom: '10px' }}>
                {ragResult.grounded_answer}
              </p>

              {ragResult.sources && ragResult.sources.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Sources:
                  </div>
                  {ragResult.sources.map((src: any, i: number) => (
                    <div key={i} style={{ fontSize: '11px', color: '#475569', padding: '3px 0' }}>
                      • {src.title} (Score: {src.score})
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
            <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '14px' }}>Upload Document</h3>
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Skyline Greens Brochure 2026"
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="form-select"
                >
                  <option value="Brochure">Brochure</option>
                  <option value="Pricing">Pricing</option>
                  <option value="FAQ">FAQ</option>
                  <option value="Policy">Legal &amp; Approvals</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  File (PDF, TXT, MD) *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.txt,.md,.json"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="form-input"
                />
              </div>

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
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                Chunks: {activeChunkDocTitle}
              </div>
              <button onClick={() => setIsChunkModalOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {selectedDocChunks.map((ch) => (
                <div key={ch.id} style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '3px' }}>
                    Chunk #{ch.chunk_index}
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.5, color: '#0f172a' }}>
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
