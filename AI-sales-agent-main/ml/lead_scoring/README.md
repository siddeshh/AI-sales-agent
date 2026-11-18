# Lead scoring experiment: rule-based vs Random Forest

Offline experiment for the research paper. It compares a transparent rule-based lead scorer with a Random Forest on the public **X Education** lead dataset. The app's Analytics page ("About the scoring model") shows the `results.json` and figures this script writes.

> Status: `experiment.py` still has to be added (the authors' script). The leakage list and results below are what the paper reports. Confirm them against the script and update this file once `results.json` has been reproduced.

## Dataset

- **X Education leads**: 9,240 leads of an online-course company, each with source, website activity, profile fields and a binary target `Converted` (1 = became a paying customer).
- Public on Kaggle (search "X Education Leads.csv" / "Lead Scoring X Education"). Download `Leads.csv` yourself.
- **Not committed to this repo.** Put it anywhere, e.g. `ml/lead_scoring/data/Leads.csv` (that folder is gitignored), and pass the path to the script.

## Leakage columns removed

Some columns are filled in by the sales team *after* talking to the lead, so they encode the outcome and would inflate ROC-AUC. These are removed before training:

| Column(s) | Why it leaks |
|---|---|
| `Tags` | Sales-team status notes (e.g. "Will revert after reading the email", "Closed by Horizzon") written after contact |
| `Lead Quality` | Salesperson's judgement of the lead after interaction |
| `Lead Profile` | Assigned by the sales team after qualification |
| `Asymmetrique Activity/Profile Index`, `Asymmetrique Activity/Profile Score` | Scores computed after engagement |
| `Last Notable Activity` (and `Last Activity`, if dropped) | Can record events that happen at or after conversion |

> To confirm: this table must match the `LEAKAGE_COLUMNS` list in `experiment.py`.

## Protocol

- Stratified **5-fold cross-validation** on all 9,240 leads, with a fixed random seed.
- Preprocessing (imputation, one-hot encoding) is fitted **inside each training fold only**, through a scikit-learn `Pipeline`, so no information leaks from the validation fold.
- Metric: ROC-AUC per fold, reported as mean ± std. The **rule-based** baseline is a fixed points table (source, activity, profile), so it is not trained, only evaluated on the same folds.
- **Tier analysis:** leads are bucketed into score tiers and the observed conversion rate per tier is plotted (`tier_conversion.png`).

## Results (as reported in the paper)

| Model | ROC-AUC (5-fold CV) |
|---|---|
| Rule-based scorer | 0.828 |
| Random Forest | 0.902 |

Replace with the reproduced numbers from `output/results.json`, including ± std.

## Run

```powershell
cd ml\lead_scoring
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python experiment.py data\Leads.csv output
```

Writes to `output/`:

- `results.json`: the app reads this file (format below)
- `tier_conversion.png`: conversion rate per score tier (shown on the Analytics page)
- `roc_curves.png`: ROC curves of both models

### `results.json` format the app expects

```json
{
  "dataset": {"name": "X Education", "rows": 9240, "positive_rate": 0.385},
  "cv": {"folds": 5, "seed": 42},
  "leakage_columns": ["Tags", "Lead Quality", "..."],
  "models": [
    {"name": "Rule-based", "roc_auc_mean": 0.828, "roc_auc_std": 0.0},
    {"name": "Random Forest", "roc_auc_mean": 0.902, "roc_auc_std": 0.0}
  ],
  "figures": {"tier_conversion": "tier_conversion.png", "roc_curves": "roc_curves.png"}
}
```

The backend serves it at `GET /api/ml/lead-scoring` (folder set by `ML_RESULTS_DIR`, default `../ml/lead_scoring/output` relative to `backend/`).

## How this relates to the app's score

The app sells apparel, not courses, so this model is **not** loaded into the app. The experiment shows that profile and behaviour features predict conversion (Random Forest AUC 0.902 vs rules 0.828). The app mirrors that structure in an explainable form: `final = round(0.7 × base) + BANT bonus`, where the base comes from profile factors and the bonus grows with each BANT slot the lead has confirmed (on the form or in the conversation). See `backend/app/agents/qualification_agent.py`.
