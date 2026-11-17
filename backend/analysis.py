"""
NetworkX Graph Construction & Quantitative Topological Analysis Module.
Clearly separates disease-gene associations from gene-gene interactions.
"""

from __future__ import annotations

from typing import Any

import networkx as nx
import pandas as pd

from .data_loader import DISEASE_METADATA


def build_graph(
    assoc_df: pd.DataFrame,
    inter_df: pd.DataFrame,
    ncbi_genes: dict[str, dict[str, Any]],
    disease_id: str | None = None,
    edge_mode: str = "all",
    min_degree: int = 0,
) -> tuple[nx.Graph, pd.DataFrame, pd.DataFrame]:
    """Construct an undirected NetworkX graph based on disease filter and edge mode."""
    filtered_assoc = assoc_df.copy()
    if disease_id and disease_id != "ALL":
        filtered_assoc = filtered_assoc[filtered_assoc["disease_id"] == disease_id]

    active_gene_ids = set(filtered_assoc["gene_id"].unique())
    filtered_inter = inter_df[
        inter_df["source_gene_id"].isin(active_gene_ids)
        & inter_df["target_gene_id"].isin(active_gene_ids)
    ].copy()

    G = nx.Graph()

    # Add disease nodes if disease-gene edges are active
    if edge_mode in ("all", "disease_gene"):
        for _, row in filtered_assoc[["disease_id", "disease_name", "disease_category", "doid", "umls_cui"]].drop_duplicates().iterrows():
            d_id = row["disease_id"]
            G.add_node(
                d_id,
                id=d_id,
                label=row["disease_name"],
                node_type="disease",
                category=row["disease_category"],
                doid=row["doid"],
                umls_cui=row["umls_cui"],
            )

    # Add gene nodes
    for g_id in sorted(active_gene_ids):
        meta = ncbi_genes.get(g_id, {})
        symbol = meta.get("symbol") or filtered_assoc.loc[filtered_assoc["gene_id"] == g_id, "gene_symbol"].iloc[0]
        G.add_node(
            f"GENE_{g_id}",
            id=f"GENE_{g_id}",
            gene_id=g_id,
            label=symbol,
            node_type="gene",
            description=meta.get("description", ""),
            chromosome=meta.get("chromosome", ""),
            map_location=meta.get("map_location", ""),
        )

    # Add disease-gene edges
    if edge_mode in ("all", "disease_gene"):
        for _, row in filtered_assoc.iterrows():
            G.add_edge(
                row["disease_id"],
                f"GENE_{row['gene_id']}",
                edge_type="disease_gene",
                relation=row["association_type"],
                evidence_source=row["evidence_source"],
                score=float(row["score"]),
                reference_pmid=row["reference_pmid"],
            )

    # Add gene-gene edges
    if edge_mode in ("all", "gene_gene"):
        for _, row in filtered_inter.iterrows():
            G.add_edge(
                f"GENE_{row['source_gene_id']}",
                f"GENE_{row['target_gene_id']}",
                edge_type="gene_gene",
                relation=row["interaction_type"],
                evidence_source=row["evidence_source"],
                score=float(row["confidence_score"]),
                reference_pmid=row["reference_pmid"],
            )

    # Apply minimum degree filter if requested
    if min_degree > 0:
        keep_nodes = [n for n, deg in G.degree() if deg >= min_degree]
        G = G.subgraph(keep_nodes).copy()

    return G, filtered_assoc, filtered_inter


def analyze_graph(
    G: nx.Graph,
    assoc_df: pd.DataFrame,
    inter_df: pd.DataFrame,
    ncbi_genes: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Compute exact NetworkX topological statistics."""
    n_nodes = G.number_of_nodes()
    n_edges = G.number_of_edges()

    deg_dict = dict(G.degree())
    deg_cent = nx.degree_centrality(G) if n_nodes > 1 else {n: 0.0 for n in G.nodes()}
    betw_cent = nx.betweenness_centrality(G, normalized=True) if n_nodes > 2 else {n: 0.0 for n in G.nodes()}
    close_cent = nx.closeness_centrality(G) if n_nodes > 1 else {n: 0.0 for n in G.nodes()}
    clust = nx.clustering(G) if n_nodes > 0 else {}

    components = sorted(nx.connected_components(G), key=len, reverse=True)
    comp_list = []
    for idx, comp in enumerate(components, start=1):
        members = sorted(
            [
                {
                    "id": n,
                    "label": G.nodes[n].get("label", n),
                    "node_type": G.nodes[n].get("node_type", "gene"),
                    "degree": deg_dict[n],
                }
                for n in comp
            ],
            key=lambda x: (-x["degree"], x["label"]),
        )
        comp_list.append(
            {
                "component_index": idx,
                "size": len(comp),
                "gene_count": sum(1 for m in members if m["node_type"] == "gene"),
                "disease_count": sum(1 for m in members if m["node_type"] == "disease"),
                "members": members,
            }
        )

    gene_nodes = [n for n, attr in G.nodes(data=True) if attr.get("node_type") == "gene"]
    disease_nodes = [n for n, attr in G.nodes(data=True) if attr.get("node_type") == "disease"]

    disease_gene_edges = sum(1 for _, _, d in G.edges(data=True) if d.get("edge_type") == "disease_gene")
    gene_gene_edges = sum(1 for _, _, d in G.edges(data=True) if d.get("edge_type") == "gene_gene")

    node_metrics = []
    for n, attr in G.nodes(data=True):
        g_id = attr.get("gene_id")
        assoc_diseases = (
            assoc_df.loc[assoc_df["gene_id"] == g_id, "disease_name"].tolist() if g_id else []
        )
        node_metrics.append(
            {
                "id": n,
                "gene_id": g_id,
                "label": attr.get("label", n),
                "node_type": attr.get("node_type", "gene"),
                "description": attr.get("description", ""),
                "chromosome": attr.get("chromosome", ""),
                "degree": deg_dict[n],
                "degree_centrality": round(float(deg_cent[n]), 4),
                "betweenness_centrality": round(float(betw_cent[n]), 4),
                "closeness_centrality": round(float(close_cent[n]), 4),
                "clustering_coefficient": round(float(clust.get(n, 0.0)), 4),
                "associated_diseases": assoc_diseases,
            }
        )

    node_metrics.sort(key=lambda x: (-x["degree"], -x["betweenness_centrality"], x["label"]))
    gene_hubs = [m for m in node_metrics if m["node_type"] == "gene"]

    # Degree distribution across all nodes in active graph
    dist_map: dict[int, int] = {}
    for d in deg_dict.values():
        dist_map[d] = dist_map.get(d, 0) + 1
    degree_distribution = [{"degree": k, "count": dist_map[k]} for k in sorted(dist_map.keys())]

    avg_degree = round((2 * n_edges / n_nodes), 3) if n_nodes > 0 else 0.0
    density = round(float(nx.density(G)), 4) if n_nodes > 1 else 0.0

    # Per-disease edge composition
    disease_breakdown = []
    for d_id, group in assoc_df.groupby("disease_id"):
        g_ids = set(group["gene_id"])
        gg_count = int(
            inter_df[
                inter_df["source_gene_id"].isin(g_ids) & inter_df["target_gene_id"].isin(g_ids)
            ].shape[0]
        )
        disease_breakdown.append(
            {
                "disease_id": d_id,
                "disease_name": group["disease_name"].iloc[0],
                "disease_gene_edges": int(group.shape[0]),
                "gene_gene_edges": gg_count,
                "description": DISEASE_METADATA.get(d_id, {}).get("description", ""),
            }
        )

    return {
        "summary": {
            "total_nodes": n_nodes,
            "total_genes": len(gene_nodes),
            "total_diseases": len(disease_nodes),
            "total_edges": n_edges,
            "disease_gene_edges": disease_gene_edges,
            "gene_gene_edges": gene_gene_edges,
            "connected_components": len(components),
            "largest_component_size": len(components[0]) if components else 0,
            "network_density": density,
            "average_degree": avg_degree,
        },
        "degree_distribution": degree_distribution,
        "hub_genes": gene_hubs,
        "all_node_metrics": node_metrics,
        "components": comp_list,
        "disease_breakdown": disease_breakdown,
    }
