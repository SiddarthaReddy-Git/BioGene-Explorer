"""
Biological Dataset Ingestion and Cleaning Pipeline using Pandas.
Loads curated NCBI Gene metadata, DisGeNET/OMIM disease-gene associations,
and BioGRID/KEGG gene-gene interactions from /data.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

DISEASE_METADATA: dict[str, dict[str, str]] = {
    "DIS_BRCA": {
        "description": "Malignant neoplasm of breast tissue involving hereditary DNA-repair and somatic PI3K/TP53 signaling alterations.",
        "primary_pathway": "DNA Damage Response & PI3K/AKT Signaling",
    },
    "DIS_T2DM": {
        "description": "Metabolic disorder characterized by insulin resistance and pancreatic beta-cell secretory dysfunction.",
        "primary_pathway": "Insulin Receptor & K-ATP Beta-Cell Signaling",
    },
    "DIS_ALZ": {
        "description": "Progressive neurodegenerative disorder marked by amyloid-beta processing and hyperphosphorylated tau pathology.",
        "primary_pathway": "Amyloid Precursor Processing & Tau Phosphorylation",
    },
    "DIS_CAD": {
        "description": "Atherosclerotic cardiovascular condition driven by LDL lipoprotein clearance and vascular inflammatory signaling.",
        "primary_pathway": "LDL Cholesterol Clearance & Vascular Inflammation",
    },
    "DIS_PD": {
        "description": "Neurodegenerative movement disorder linked to alpha-synuclein aggregation and mitochondrial quality-control pathways.",
        "primary_pathway": "Mitophagy (PINK1/PRKN) & Synuclein Homeostasis",
    },
}


def load_cleaned_datasets() -> tuple[pd.DataFrame, pd.DataFrame, dict[str, dict[str, Any]]]:
    """Read, clean, deduplicate, and validate the biological datasets using Pandas."""
    assoc_path = DATA_DIR / "disease_gene_associations.csv"
    inter_path = DATA_DIR / "gene_gene_interactions.csv"
    ncbi_path = DATA_DIR / "ncbi_genes.json"

    assoc_df = pd.read_csv(assoc_path, dtype={"gene_id": str, "reference_pmid": str})
    inter_df = pd.read_csv(
        inter_path,
        dtype={"source_gene_id": str, "target_gene_id": str, "reference_pmid": str},
    )

    # Pandas data cleaning: strip whitespace, coerce numeric scores, drop invalid rows, deduplicate
    for col in assoc_df.select_dtypes(include="object").columns:
        assoc_df[col] = assoc_df[col].astype(str).str.strip()
    assoc_df["score"] = pd.to_numeric(assoc_df["score"], errors="coerce").fillna(0.0).clip(0.0, 1.0)
    assoc_df = assoc_df.dropna(subset=["disease_id", "gene_id", "gene_symbol"]).drop_duplicates(
        subset=["disease_id", "gene_id"]
    )

    for col in inter_df.select_dtypes(include="object").columns:
        inter_df[col] = inter_df[col].astype(str).str.strip()
    inter_df["confidence_score"] = (
        pd.to_numeric(inter_df["confidence_score"], errors="coerce").fillna(0.0).clip(0.0, 1.0)
    )
    inter_df = inter_df.dropna(subset=["source_gene_id", "target_gene_id"]).drop_duplicates(
        subset=["source_gene_id", "target_gene_id"]
    )

    with ncbi_path.open("r", encoding="utf-8") as f:
        ncbi_genes: dict[str, dict[str, Any]] = json.load(f)

    return assoc_df, inter_df, ncbi_genes
