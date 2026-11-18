import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ModelRow {
  name: string;
  roc_auc_mean: number;
  roc_auc_std?: number;
}

interface ExperimentResponse {
  available: boolean;
  results: {
    dataset?: { name?: string; rows?: number };
    cv?: { folds?: number };
    models?: ModelRow[];
    figures?: Record<string, string>;
  } | null;
  figures: string[];
}

// Shown only while results.json is missing; these are the paper's own figures, labelled as such.
const PAPER_REPORTED: ModelRow[] = [
  { name: 'Rule-based scorer', roc_auc_mean: 0.828 },
  { name: 'Random Forest', roc_auc_mean: 0.902 },
];

export const ScoringModelPanel: React.FC = () => {
  const [data, setData] = useState<ExperimentResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getLeadScoringExperiment()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load experiment results'));
  }, []);

  const available = !!data?.available && !!data.results?.models?.length;
  const rows = available ? data!.results!.models! : PAPER_REPORTED;
  const tierFigure = available
    ? data!.results!.figures?.tier_conversion || data!.figures.find((f) => f.includes('tier'))
    : undefined;

  return (
    <div className="card">
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
        About the scoring model
      </div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
        Research experiment on the public X Education dataset
        {available && data!.results!.dataset?.rows ? ` (${data!.results!.dataset!.rows.toLocaleString('en-IN')} leads` : ' (9,240 leads'}
        , {available && data!.results!.cv?.folds ? data!.results!.cv!.folds : 5}-fold cross-validation, leakage columns removed).
        The app's own score mirrors its structure in an explainable form:{' '}
        <code>final = round(0.7 × profile base) + BANT bonus</code>.
      </div>

      {error && <div style={{ fontSize: '12px', color: '#b91c1c', marginBottom: '10px' }}>{error}</div>}

      {!available && (
        <div className="badge badge-amber" style={{ marginBottom: '10px', display: 'inline-block' }}>
          Reported in the paper. Not reproduced in this repo yet: run ml/lead_scoring/experiment.py
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(260px, 1.4fr)', gap: '20px', alignItems: 'start' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Model</th>
              <th style={{ textAlign: 'right' }}>ROC-AUC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.name}>
                <td>{m.name}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {m.roc_auc_mean.toFixed(3)}
                  {m.roc_auc_std ? ` ± ${m.roc_auc_std.toFixed(3)}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div>
          {tierFigure ? (
            <img
              src={`/api/ml/lead-scoring/figures/${encodeURIComponent(tierFigure)}`}
              alt="Observed conversion rate per lead-score tier on the X Education dataset"
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          ) : (
            <div style={{ fontSize: '12px', color: '#64748b', padding: '16px', border: '1px dashed #cbd5e1', borderRadius: '6px' }}>
              The tier conversion chart appears here after the experiment writes tier_conversion.png to
              ml/lead_scoring/output.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
