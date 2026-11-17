"""
BioGene Explorer FastAPI Backend.
Implements endpoints for diseases, genes, network generation, NetworkX analysis,
dataset querying, and CSV export.
"""

from __future__ import annotations

import io
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .analysis import analyze_graph, build_graph
from .data_loader import DISEASE_METADATA, load_cleaned_datasets

app = FastAPI(
    title="BioGene Explorer API",
    description="Bioinformatics-Based Disease Gene Network Visualization Backend (FastAPI + Pandas + NetworkX)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ASSOC_DF, INTER_DF, NCBI_GENES = load_cleaned_datasets()


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "engine": "python-fastapi-networkx",
        "genes_loaded": len(NCBI_GENES),
        "disease_gene_rows": int(ASSOC_DF.shape[0]),
        "gene_gene_rows": int(INTER_DF.shape[0]),
    }


@app.get("/api/diseases")
def list_diseases() -> dict[str, Any]:
    G_full, _, _ = build_graph(ASSOC_DF, INTER_DF, NCBI_GENES, disease_id=None, edge_mode="all")
    diseases = []
    for d_id, group in ASSOC_DF.groupby("disease_id"):
        gene_ids = set(group["gene_id"])
        internal_gg = INTER_DF[
            INTER_DF["source_gene_id"].isin(gene_ids) & INTER_DF["target_gene_id"].isin(gene_ids)
        ]
        # Shared genes also appearing in other diseases
        other_genes = set(ASSOC_DF[ASSOC_DF["disease_id"] != d_id]["gene_id"])
        shared = sorted(
            [NCBI_GENES[g]["symbol"] for g in (gene_ids & other_genes) if g in NCBI_GENES]
        )
        meta = DISEASE_METADATA.get(d_id, {})
        diseases.append(
            {
                "disease_id": d_id,
                "disease_name": group["disease_name"].iloc[0],
                "disease_category": group["disease_category"].iloc[0],
                "doid": group["doid"].iloc[0],
                "umls_cui": group["umls_cui"].iloc[0],
                "description": meta.get("description", ""),
                "primary_pathway": meta.get("primary_pathway", ""),
                "gene_count": int(group.shape[0]),
                "internal_gene_gene_edges": int(internal_gg.shape[0]),
                "shared_genes": shared,
                "genes": group[
                    ["gene_id", "gene_symbol", "association_type", "evidence_source", "score", "reference_pmid"]
                ].to_dict(orient="records"),
            }
        )
    return {"diseases": diseases, "total_network_nodes": G_full.number_of_nodes()}


@app.get("/api/genes")
def list_genes(q: str | None = None) -> dict[str, Any]:
    G_full, _, _ = build_graph(ASSOC_DF, INTER_DF, NCBI_GENES, disease_id=None, edge_mode="all")
    analysis = analyze_graph(G_full, ASSOC_DF, INTER_DF, NCBI_GENES)
    metric_map = {m["gene_id"]: m for m in analysis["hub_genes"] if m["gene_id"]}

    genes = []
    for g_id, info in NCBI_GENES.items():
        assoc_rows = ASSOC_DF[ASSOC_DF["gene_id"] == g_id]
        m = metric_map.get(g_id, {})
        item = {
            **info,
            "associated_diseases": assoc_rows["disease_name"].tolist(),
            "disease_ids": assoc_rows["disease_id"].tolist(),
            "degree": m.get("degree", 0),
            "degree_centrality": m.get("degree_centrality", 0.0),
            "betweenness_centrality": m.get("betweenness_centrality", 0.0),
            "closeness_centrality": m.get("closeness_centrality", 0.0),
            "clustering_coefficient": m.get("clustering_coefficient", 0.0),
        }
        if q:
            needle = q.lower().strip()
            hay = f"{item['symbol']} {item['gene_id']} {item['description']} {' '.join(item['associated_diseases'])}".lower()
            if needle not in hay:
                continue
        genes.append(item)

    genes.sort(key=lambda x: (-x["degree"], x["symbol"]))
    return {"genes": genes}


@app.get("/api/genes/{gene_id}")
def get_gene_details(gene_id: str) -> dict[str, Any]:
    if gene_id not in NCBI_GENES:
        raise HTTPException(status_code=404, detail=f"Gene {gene_id} not found in curated registry")

    G_full, _, _ = build_graph(ASSOC_DF, INTER_DF, NCBI_GENES, disease_id=None, edge_mode="all")
    analysis = analyze_graph(G_full, ASSOC_DF, INTER_DF, NCBI_GENES)
    metric = next((m for m in analysis["hub_genes"] if m["gene_id"] == gene_id), None)

    assoc_rows = ASSOC_DF[ASSOC_DF["gene_id"] == gene_id].to_dict(orient="records")
    partners = []
    for _, row in INTER_DF[
        (INTER_DF["source_gene_id"] == gene_id) | (INTER_DF["target_gene_id"] == gene_id)
    ].iterrows():
        other_id = row["target_gene_id"] if row["source_gene_id"] == gene_id else row["source_gene_id"]
        other_sym = row["target_symbol"] if row["source_gene_id"] == gene_id else row["source_symbol"]
        partners.append(
            {
                "partner_gene_id": other_id,
                "partner_symbol": other_sym,
                "partner_description": NCBI_GENES.get(other_id, {}).get("description", ""),
                "interaction_type": row["interaction_type"],
                "evidence_source": row["evidence_source"],
                "confidence_score": float(row["confidence_score"]),
                "reference_pmid": row["reference_pmid"],
            }
        )

    return {
        "gene": NCBI_GENES[gene_id],
        "metrics": metric,
        "associations": assoc_rows,
        "interactions": partners,
    }


@app.get("/api/network")
def get_network(
    disease_id: str | None = Query(default=None),
    edge_mode: str = Query(default="all", pattern="^(all|disease_gene|gene_gene)$"),
    min_degree: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    G, f_assoc, f_inter = build_graph(
        ASSOC_DF, INTER_DF, NCBI_GENES, disease_id=disease_id, edge_mode=edge_mode, min_degree=min_degree
    )
    analysis = analyze_graph(G, f_assoc, f_inter, NCBI_GENES)
    metric_map = {m["id"]: m for m in analysis["all_node_metrics"]}

    nodes = []
    for n, attr in G.nodes(data=True):
        m = metric_map.get(n, {})
        nodes.append(
            {
                "id": n,
                "gene_id": attr.get("gene_id"),
                "label": attr.get("label", n),
                "node_type": attr.get("node_type", "gene"),
                "category": attr.get("category"),
                "description": attr.get("description", ""),
                "chromosome": attr.get("chromosome", ""),
                "map_location": attr.get("map_location", ""),
                "degree": m.get("degree", 0),
                "degree_centrality": m.get("degree_centrality", 0.0),
                "betweenness_centrality": m.get("betweenness_centrality", 0.0),
                "clustering_coefficient": m.get("clustering_coefficient", 0.0),
                "associated_diseases": m.get("associated_diseases", []),
            }
        )

    edges = []
    for u, v, d in G.edges(data=True):
        edges.append(
            {
                "source": u,
                "target": v,
                "edge_type": d.get("edge_type"),
                "relation": d.get("relation"),
                "evidence_source": d.get("evidence_source"),
                "score": d.get("score"),
                "reference_pmid": d.get("reference_pmid"),
            }
        )

    return {"nodes": nodes, "edges": edges, "summary": analysis["summary"]}


@app.get("/api/analysis")
def get_analysis(
    disease_id: str | None = Query(default=None),
    edge_mode: str = Query(default="all", pattern="^(all|disease_gene|gene_gene)$"),
    min_degree: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    G, f_assoc, f_inter = build_graph(
        ASSOC_DF, INTER_DF, NCBI_GENES, disease_id=disease_id, edge_mode=edge_mode, min_degree=min_degree
    )
    return analyze_graph(G, f_assoc, f_inter, NCBI_GENES)


@app.get("/api/dataset")
def get_dataset(
    kind: str = Query(default="associations", pattern="^(associations|interactions)$"),
    disease_id: str | None = None,
    q: str | None = None,
) -> dict[str, Any]:
    if kind == "associations":
        df = ASSOC_DF.copy()
        if disease_id and disease_id != "ALL":
            df = df[df["disease_id"] == disease_id]
        if q:
            needle = q.lower().strip()
            mask = df.apply(lambda r: needle in " ".join(r.astype(str)).lower(), axis=1)
            df = df[mask]
        return {"kind": "associations", "rows": df.to_dict(orient="records")}

    df = INTER_DF.copy()
    if disease_id and disease_id != "ALL":
        g_ids = set(ASSOC_DF[ASSOC_DF["disease_id"] == disease_id]["gene_id"])
        df = df[df["source_gene_id"].isin(g_ids) & df["target_gene_id"].isin(g_ids)]
    if q:
        needle = q.lower().strip()
        mask = df.apply(lambda r: needle in " ".join(r.astype(str)).lower(), axis=1)
        df = df[mask]
    return {"kind": "interactions", "rows": df.to_dict(orient="records")}


@app.get("/api/export/csv")
def export_csv(
    kind: str = Query(default="associations", pattern="^(associations|interactions)$"),
    disease_id: str | None = None,
) -> StreamingResponse:
    df = ASSOC_DF.copy() if kind == "associations" else INTER_DF.copy()
    if disease_id and disease_id != "ALL":
        if kind == "associations":
            df = df[df["disease_id"] == disease_id]
        else:
            g_ids = set(ASSOC_DF[ASSOC_DF["disease_id"] == disease_id]["gene_id"])
            df = df[df["source_gene_id"].isin(g_ids) & df["target_gene_id"].isin(g_ids)]

    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    filename = f"biogene_{kind}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/ncbi/gene/{gene_id}")
async def fetch_live_ncbi_gene(gene_id: str) -> dict[str, Any]:
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id={gene_id}&retmode=json"
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        payload = resp.json()
    record = payload.get("result", {}).get(gene_id)
    if not record:
        raise HTTPException(status_code=404, detail="Gene not found at NCBI E-utilities")
    return {
        "gene_id": gene_id,
        "symbol": record.get("name"),
        "description": record.get("description"),
        "chromosome": record.get("chromosome"),
        "map_location": record.get("maplocation"),
        "aliases": record.get("otheraliases"),
        "mim": record.get("mim", []),
        "summary": record.get("summary"),
        "source": "NCBI E-utilities Live",
    }
