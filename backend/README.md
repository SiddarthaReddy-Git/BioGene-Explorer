# BioGene Explorer — Python FastAPI + Pandas + NetworkX Backend

This directory implements the Python computational backend specified in the *Bioinformatics-Based Disease Gene Network Visualization* proposal.

## Stack
- **FastAPI**: REST API serving cleaned biological datasets, network subgraphs, and topological statistics.
- **Pandas**: CSV ingestion, whitespace normalization, score validation, and deduplication.
- **NetworkX**: Undirected graph construction separating `disease_gene` associations from `gene_gene` interactions, degree centrality, betweenness centrality, closeness centrality, clustering coefficients, graph density, and connected components.

## Run Locally
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

To point the Node/Express frontend proxy to this Python FastAPI instance:
```bash
PYTHON_API_URL=http://127.0.0.1:8000 npm run dev
```
