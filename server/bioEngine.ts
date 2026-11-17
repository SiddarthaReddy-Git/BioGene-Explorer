import fs from 'node:fs';
import path from 'node:path';

export interface NcbiGeneRecord {
  gene_id: string;
  symbol: string;
  description: string;
  chromosome: string;
  map_location: string;
  aliases: string;
  mim: string[];
  summary: string;
}

export interface DiseaseGeneAssociation {
  disease_id: string;
  disease_name: string;
  disease_category: string;
  doid: string;
  umls_cui: string;
  gene_id: string;
  gene_symbol: string;
  association_type: string;
  evidence_source: string;
  score: number;
  reference_pmid: string;
}

export interface GeneGeneInteraction {
  source_gene_id: string;
  source_symbol: string;
  target_gene_id: string;
  target_symbol: string;
  interaction_type: string;
  evidence_source: string;
  confidence_score: number;
  reference_pmid: string;
}

export type EdgeMode = 'all' | 'disease_gene' | 'gene_gene';

interface GraphNodeInternal {
  id: string;
  gene_id: string | null;
  label: string;
  node_type: 'gene' | 'disease';
  category: string;
  description: string;
  chromosome: string;
  map_location: string;
}

interface GraphEdgeInternal {
  source: string;
  target: string;
  edge_type: 'disease_gene' | 'gene_gene';
  relation: string;
  evidence_source: string;
  score: number;
  reference_pmid: string;
}

const DISEASE_METADATA: Record<string, { description: string; primary_pathway: string }> = {
  DIS_BRCA: {
    description:
      'Malignant neoplasm of breast tissue involving hereditary DNA-repair and somatic PI3K/TP53 signaling alterations.',
    primary_pathway: 'DNA Damage Response & PI3K/AKT Signaling',
  },
  DIS_T2DM: {
    description:
      'Metabolic disorder characterized by insulin resistance and pancreatic beta-cell secretory dysfunction.',
    primary_pathway: 'Insulin Receptor & K-ATP Beta-Cell Signaling',
  },
  DIS_ALZ: {
    description:
      'Progressive neurodegenerative disorder marked by amyloid-beta processing and hyperphosphorylated tau pathology.',
    primary_pathway: 'Amyloid Precursor Processing & Tau Phosphorylation',
  },
  DIS_CAD: {
    description:
      'Atherosclerotic cardiovascular condition driven by LDL lipoprotein clearance and vascular inflammatory signaling.',
    primary_pathway: 'LDL Cholesterol Clearance & Vascular Inflammation',
  },
  DIS_PD: {
    description:
      'Neurodegenerative movement disorder linked to alpha-synuclein aggregation and mitochondrial quality-control pathways.',
    primary_pathway: 'Mitophagy (PINK1/PRKN) & Synuclein Homeostasis',
  },
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function readCsvObjects(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n').trim();
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length !== headers.length) continue;
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cols[j];
    }
    rows.push(obj);
  }
  return rows;
}

function clampScore(val: string): number {
  const parsed = Number.parseFloat(val);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
}

export class BioGraphEngine {
  public readonly associations: DiseaseGeneAssociation[];
  public readonly interactions: GeneGeneInteraction[];
  public readonly ncbiGenes: Record<string, NcbiGeneRecord>;

  constructor(dataDir: string) {
    const assocRaw = readCsvObjects(path.join(dataDir, 'disease_gene_associations.csv'));
    const interRaw = readCsvObjects(path.join(dataDir, 'gene_gene_interactions.csv'));
    const ncbiRaw = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'ncbi_genes.json'), 'utf-8'),
    ) as Record<string, NcbiGeneRecord>;

    const seenAssoc = new Set<string>();
    this.associations = [];
    for (const r of assocRaw) {
      if (!r.disease_id || !r.gene_id || !r.gene_symbol) continue;
      const key = `${r.disease_id}::${r.gene_id}`;
      if (seenAssoc.has(key)) continue;
      seenAssoc.add(key);
      this.associations.push({
        disease_id: r.disease_id,
        disease_name: r.disease_name,
        disease_category: r.disease_category,
        doid: r.doid,
        umls_cui: r.umls_cui,
        gene_id: r.gene_id,
        gene_symbol: r.gene_symbol,
        association_type: r.association_type,
        evidence_source: r.evidence_source,
        score: clampScore(r.score),
        reference_pmid: r.reference_pmid,
      });
    }

    const seenInter = new Set<string>();
    this.interactions = [];
    for (const r of interRaw) {
      if (!r.source_gene_id || !r.target_gene_id || r.source_gene_id === r.target_gene_id) continue;
      const a = r.source_gene_id < r.target_gene_id ? r.source_gene_id : r.target_gene_id;
      const b = r.source_gene_id < r.target_gene_id ? r.target_gene_id : r.source_gene_id;
      const key = `${a}::${b}`;
      if (seenInter.has(key)) continue;
      seenInter.add(key);
      this.interactions.push({
        source_gene_id: r.source_gene_id,
        source_symbol: r.source_symbol,
        target_gene_id: r.target_gene_id,
        target_symbol: r.target_symbol,
        interaction_type: r.interaction_type,
        evidence_source: r.evidence_source,
        confidence_score: clampScore(r.confidence_score),
        reference_pmid: r.reference_pmid,
      });
    }

    this.ncbiGenes = ncbiRaw;
  }

  private buildSubgraph(diseaseId?: string, edgeMode: EdgeMode = 'all', minDegree = 0) {
    const filteredAssoc =
      diseaseId && diseaseId !== 'ALL'
        ? this.associations.filter((a) => a.disease_id === diseaseId)
        : this.associations;

    const activeGeneIds = new Set(filteredAssoc.map((a) => a.gene_id));
    const filteredInter = this.interactions.filter(
      (e) => activeGeneIds.has(e.source_gene_id) && activeGeneIds.has(e.target_gene_id),
    );

    const nodesMap = new Map<string, GraphNodeInternal>();
    const edges: GraphEdgeInternal[] = [];
    const edgeKeys = new Set<string>();

    if (edgeMode === 'all' || edgeMode === 'disease_gene') {
      for (const a of filteredAssoc) {
        if (!nodesMap.has(a.disease_id)) {
          const meta = DISEASE_METADATA[a.disease_id];
          nodesMap.set(a.disease_id, {
            id: a.disease_id,
            gene_id: null,
            label: a.disease_name,
            node_type: 'disease',
            category: a.disease_category,
            description: meta?.description ?? '',
            chromosome: '',
            map_location: '',
          });
        }
      }
    }

    for (const gId of Array.from(activeGeneIds).sort()) {
      const meta = this.ncbiGenes[gId];
      const fallbackSym = filteredAssoc.find((a) => a.gene_id === gId)?.gene_symbol ?? gId;
      nodesMap.set(`GENE_${gId}`, {
        id: `GENE_${gId}`,
        gene_id: gId,
        label: meta?.symbol ?? fallbackSym,
        node_type: 'gene',
        category: 'Gene',
        description: meta?.description ?? '',
        chromosome: meta?.chromosome ?? '',
        map_location: meta?.map_location ?? '',
      });
    }

    const addUndirectedEdge = (edge: GraphEdgeInternal) => {
      if (!nodesMap.has(edge.source) || !nodesMap.has(edge.target)) return;
      const u = edge.source < edge.target ? edge.source : edge.target;
      const v = edge.source < edge.target ? edge.target : edge.source;
      const key = `${u}::${v}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push(edge);
    };

    if (edgeMode === 'all' || edgeMode === 'disease_gene') {
      for (const a of filteredAssoc) {
        addUndirectedEdge({
          source: a.disease_id,
          target: `GENE_${a.gene_id}`,
          edge_type: 'disease_gene',
          relation: a.association_type,
          evidence_source: a.evidence_source,
          score: a.score,
          reference_pmid: a.reference_pmid,
        });
      }
    }

    if (edgeMode === 'all' || edgeMode === 'gene_gene') {
      for (const e of filteredInter) {
        addUndirectedEdge({
          source: `GENE_${e.source_gene_id}`,
          target: `GENE_${e.target_gene_id}`,
          edge_type: 'gene_gene',
          relation: e.interaction_type,
          evidence_source: e.evidence_source,
          score: e.confidence_score,
          reference_pmid: e.reference_pmid,
        });
      }
    }

    // Build adjacency list and filter by minDegree if needed
    const buildAdjacency = (nodeIds: string[], edgeList: GraphEdgeInternal[]) => {
      const adj = new Map<string, Set<string>>();
      for (const id of nodeIds) adj.set(id, new Set());
      for (const e of edgeList) {
        adj.get(e.source)?.add(e.target);
        adj.get(e.target)?.add(e.source);
      }
      return adj;
    };

    let finalNodes = Array.from(nodesMap.values());
    let finalEdges = edges;

    if (minDegree > 0) {
      const adj = buildAdjacency(
        finalNodes.map((n) => n.id),
        finalEdges,
      );
      const keep = new Set(finalNodes.filter((n) => (adj.get(n.id)?.size ?? 0) >= minDegree).map((n) => n.id));
      finalNodes = finalNodes.filter((n) => keep.has(n.id));
      finalEdges = finalEdges.filter((e) => keep.has(e.source) && keep.has(e.target));
    }

    const adj = buildAdjacency(
      finalNodes.map((n) => n.id),
      finalEdges,
    );

    return { nodes: finalNodes, edges: finalEdges, adj, filteredAssoc, filteredInter };
  }

  public analyze(diseaseId?: string, edgeMode: EdgeMode = 'all', minDegree = 0) {
    const { nodes, edges, adj } = this.buildSubgraph(diseaseId, edgeMode, minDegree);
    const n = nodes.length;
    const m = edges.length;
    const nodeIds = nodes.map((x) => x.id);

    // 1. Degree & Degree Centrality
    const degreeMap = new Map<string, number>();
    const degCentMap = new Map<string, number>();
    for (const id of nodeIds) {
      const deg = adj.get(id)?.size ?? 0;
      degreeMap.set(id, deg);
      degCentMap.set(id, n > 1 ? deg / (n - 1) : 0);
    }

    // 2. Betweenness Centrality (Brandes algorithm for unweighted undirected graph)
    const betweenness = new Map<string, number>();
    for (const id of nodeIds) betweenness.set(id, 0);

    for (const s of nodeIds) {
      const stack: string[] = [];
      const pred = new Map<string, string[]>();
      const sigma = new Map<string, number>();
      const dist = new Map<string, number>();
      for (const v of nodeIds) {
        pred.set(v, []);
        sigma.set(v, 0);
        dist.set(v, -1);
      }
      sigma.set(s, 1);
      dist.set(s, 0);
      const queue: string[] = [s];

      while (queue.length > 0) {
        const v = queue.shift()!;
        stack.push(v);
        const dv = dist.get(v)!;
        for (const w of adj.get(v) ?? []) {
          if (dist.get(w)! < 0) {
            queue.push(w);
            dist.set(w, dv + 1);
          }
          if (dist.get(w) === dv + 1) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            pred.get(w)!.push(v);
          }
        }
      }

      const delta = new Map<string, number>();
      for (const v of nodeIds) delta.set(v, 0);

      while (stack.length > 0) {
        const w = stack.pop()!;
        const coeff = (1 + delta.get(w)!) / (sigma.get(w) || 1);
        for (const v of pred.get(w)!) {
          delta.set(v, delta.get(v)! + sigma.get(v)! * coeff);
        }
        if (w !== s) {
          betweenness.set(w, betweenness.get(w)! + delta.get(w)!);
        }
      }
    }

    // Normalize undirected betweenness (matches NetworkX normalized=True)
    const normFactor = n > 2 ? 1 / ((n - 1) * (n - 2)) : 0;
    for (const id of nodeIds) {
      // Brandes sums both directions in undirected graph, so dividing by 2 * ((n-1)*(n-2)/2) = (n-1)*(n-2)
      betweenness.set(id, n > 2 ? betweenness.get(id)! * normFactor : 0);
    }

    // 3. Connected Components (BFS) & Closeness Centrality (Wasserman-Faust for disconnected graphs, matches NetworkX)
    const visited = new Set<string>();
    const rawComponents: string[][] = [];
    for (const start of nodeIds) {
      if (visited.has(start)) continue;
      const comp: string[] = [];
      const q: string[] = [start];
      visited.add(start);
      while (q.length > 0) {
        const curr = q.shift()!;
        comp.push(curr);
        for (const nb of adj.get(curr) ?? []) {
          if (!visited.has(nb)) {
            visited.add(nb);
            q.push(nb);
          }
        }
      }
      rawComponents.push(comp);
    }
    rawComponents.sort((a, b) => b.length - a.length);

    const closenessMap = new Map<string, number>();
    for (const s of nodeIds) {
      const dist = new Map<string, number>();
      dist.set(s, 0);
      const q: string[] = [s];
      let totalDist = 0;
      let reachable = 0;
      while (q.length > 0) {
        const v = q.shift()!;
        const dv = dist.get(v)!;
        for (const w of adj.get(v) ?? []) {
          if (!dist.has(w)) {
            dist.set(w, dv + 1);
            totalDist += dv + 1;
            reachable++;
            q.push(w);
          }
        }
      }
      if (totalDist > 0 && n > 1) {
        const wf = (reachable / (n - 1)) * (reachable / totalDist);
        closenessMap.set(s, wf);
      } else {
        closenessMap.set(s, 0);
      }
    }

    // 4. Local Clustering Coefficient
    const clusteringMap = new Map<string, number>();
    for (const v of nodeIds) {
      const neighbors = Array.from(adj.get(v) ?? []);
      const k = neighbors.length;
      if (k < 2) {
        clusteringMap.set(v, 0);
        continue;
      }
      let triangles = 0;
      for (let i = 0; i < k; i++) {
        const ni = neighbors[i];
        const niSet = adj.get(ni)!;
        for (let j = i + 1; j < k; j++) {
          if (niSet.has(neighbors[j])) triangles++;
        }
      }
      clusteringMap.set(v, (2 * triangles) / (k * (k - 1)));
    }

    const nodeLookup = new Map(nodes.map((node) => [node.id, node]));

    const components = rawComponents.map((comp, idx) => {
      const members = comp
        .map((id) => {
          const nd = nodeLookup.get(id)!;
          return {
            id,
            label: nd.label,
            node_type: nd.node_type,
            degree: degreeMap.get(id) ?? 0,
          };
        })
        .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label));

      return {
        component_index: idx + 1,
        size: comp.length,
        gene_count: members.filter((x) => x.node_type === 'gene').length,
        disease_count: members.filter((x) => x.node_type === 'disease').length,
        members,
      };
    });

    const allNodeMetrics = nodes
      .map((node) => {
        const assocDiseases = node.gene_id
          ? this.associations.filter((a) => a.gene_id === node.gene_id).map((a) => a.disease_name)
          : [];
        return {
          id: node.id,
          gene_id: node.gene_id,
          label: node.label,
          node_type: node.node_type,
          description: node.description,
          chromosome: node.chromosome,
          degree: degreeMap.get(node.id) ?? 0,
          degree_centrality: Number((degCentMap.get(node.id) ?? 0).toFixed(4)),
          betweenness_centrality: Number((betweenness.get(node.id) ?? 0).toFixed(4)),
          closeness_centrality: Number((closenessMap.get(node.id) ?? 0).toFixed(4)),
          clustering_coefficient: Number((clusteringMap.get(node.id) ?? 0).toFixed(4)),
          associated_diseases: assocDiseases,
        };
      })
      .sort(
        (a, b) =>
          b.degree - a.degree ||
          b.betweenness_centrality - a.betweenness_centrality ||
          a.label.localeCompare(b.label),
      );

    const hubGenes = allNodeMetrics.filter((x) => x.node_type === 'gene');

    const distCounts = new Map<number, number>();
    for (const deg of degreeMap.values()) {
      distCounts.set(deg, (distCounts.get(deg) ?? 0) + 1);
    }
    const degreeDistribution = Array.from(distCounts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([degree, count]) => ({ degree, count }));

    const diseaseGeneEdges = edges.filter((e) => e.edge_type === 'disease_gene').length;
    const geneGeneEdges = edges.filter((e) => e.edge_type === 'gene_gene').length;

    const diseaseIds = Array.from(new Set(this.associations.map((a) => a.disease_id)));
    const diseaseBreakdown = diseaseIds.map((dId) => {
      const rows = this.associations.filter((a) => a.disease_id === dId);
      const gSet = new Set(rows.map((r) => r.gene_id));
      const ggCount = this.interactions.filter(
        (e) => gSet.has(e.source_gene_id) && gSet.has(e.target_gene_id),
      ).length;
      return {
        disease_id: dId,
        disease_name: rows[0].disease_name,
        disease_gene_edges: rows.length,
        gene_gene_edges: ggCount,
        description: DISEASE_METADATA[dId]?.description ?? '',
      };
    });

    const density = n > 1 ? Number(((2 * m) / (n * (n - 1))).toFixed(4)) : 0;
    const avgDegree = n > 0 ? Number(((2 * m) / n).toFixed(3)) : 0;

    return {
      summary: {
        total_nodes: n,
        total_genes: nodes.filter((x) => x.node_type === 'gene').length,
        total_diseases: nodes.filter((x) => x.node_type === 'disease').length,
        total_edges: m,
        disease_gene_edges: diseaseGeneEdges,
        gene_gene_edges: geneGeneEdges,
        connected_components: components.length,
        largest_component_size: components[0]?.size ?? 0,
        network_density: density,
        average_degree: avgDegree,
      },
      degree_distribution: degreeDistribution,
      hub_genes: hubGenes,
      all_node_metrics: allNodeMetrics,
      components,
      disease_breakdown: diseaseBreakdown,
    };
  }

  public getNetworkPayload(diseaseId?: string, edgeMode: EdgeMode = 'all', minDegree = 0) {
    const { nodes, edges } = this.buildSubgraph(diseaseId, edgeMode, minDegree);
    const analysis = this.analyze(diseaseId, edgeMode, minDegree);
    const metricMap = new Map(analysis.all_node_metrics.map((m) => [m.id, m]));

    return {
      nodes: nodes.map((nd) => {
        const m = metricMap.get(nd.id);
        return {
          ...nd,
          degree: m?.degree ?? 0,
          degree_centrality: m?.degree_centrality ?? 0,
          betweenness_centrality: m?.betweenness_centrality ?? 0,
          clustering_coefficient: m?.clustering_coefficient ?? 0,
          associated_diseases: m?.associated_diseases ?? [],
        };
      }),
      edges,
      summary: analysis.summary,
    };
  }

  public listDiseases() {
    const full = this.analyze(undefined, 'all', 0);
    const diseaseIds = Array.from(new Set(this.associations.map((a) => a.disease_id)));
    const diseases = diseaseIds.map((dId) => {
      const rows = this.associations.filter((a) => a.disease_id === dId);
      const gSet = new Set(rows.map((r) => r.gene_id));
      const internalGG = this.interactions.filter(
        (e) => gSet.has(e.source_gene_id) && gSet.has(e.target_gene_id),
      ).length;
      const otherGenes = new Set(
        this.associations.filter((a) => a.disease_id !== dId).map((a) => a.gene_id),
      );
      const sharedGenes = Array.from(gSet)
        .filter((g) => otherGenes.has(g))
        .map((g) => this.ncbiGenes[g]?.symbol ?? g)
        .sort();

      return {
        disease_id: dId,
        disease_name: rows[0].disease_name,
        disease_category: rows[0].disease_category,
        doid: rows[0].doid,
        umls_cui: rows[0].umls_cui,
        description: DISEASE_METADATA[dId]?.description ?? '',
        primary_pathway: DISEASE_METADATA[dId]?.primary_pathway ?? '',
        gene_count: rows.length,
        internal_gene_gene_edges: internalGG,
        shared_genes: sharedGenes,
        genes: rows.map((r) => ({
          gene_id: r.gene_id,
          gene_symbol: r.gene_symbol,
          association_type: r.association_type,
          evidence_source: r.evidence_source,
          score: r.score,
          reference_pmid: r.reference_pmid,
        })),
      };
    });

    return {
      diseases,
      total_network_nodes: full.summary.total_nodes,
    };
  }

  public listGenes(q?: string) {
    const full = this.analyze(undefined, 'all', 0);
    const metricMap = new Map(
      full.hub_genes.filter((m) => m.gene_id).map((m) => [m.gene_id as string, m]),
    );

    const needle = q?.trim().toLowerCase() ?? '';
    const genes = Object.values(this.ncbiGenes)
      .map((info) => {
        const assocRows = this.associations.filter((a) => a.gene_id === info.gene_id);
        const m = metricMap.get(info.gene_id);
        return {
          ...info,
          associated_diseases: assocRows.map((a) => a.disease_name),
          disease_ids: assocRows.map((a) => a.disease_id),
          degree: m?.degree ?? 0,
          degree_centrality: m?.degree_centrality ?? 0,
          betweenness_centrality: m?.betweenness_centrality ?? 0,
          closeness_centrality: m?.closeness_centrality ?? 0,
          clustering_coefficient: m?.clustering_coefficient ?? 0,
        };
      })
      .filter((item) => {
        if (!needle) return true;
        const hay = `${item.symbol} ${item.gene_id} ${item.description} ${item.associated_diseases.join(' ')}`.toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => b.degree - a.degree || a.symbol.localeCompare(b.symbol));

    return { genes };
  }

  public getGeneDetails(geneId: string) {
    const gene = this.ncbiGenes[geneId];
    if (!gene) return null;

    const full = this.analyze(undefined, 'all', 0);
    const metrics = full.hub_genes.find((m) => m.gene_id === geneId) ?? null;
    const associations = this.associations.filter((a) => a.gene_id === geneId);
    const interactions = this.interactions
      .filter((e) => e.source_gene_id === geneId || e.target_gene_id === geneId)
      .map((e) => {
        const isSource = e.source_gene_id === geneId;
        const partnerId = isSource ? e.target_gene_id : e.source_gene_id;
        const partnerSymbol = isSource ? e.target_symbol : e.source_symbol;
        return {
          partner_gene_id: partnerId,
          partner_symbol: partnerSymbol,
          partner_description: this.ncbiGenes[partnerId]?.description ?? '',
          interaction_type: e.interaction_type,
          evidence_source: e.evidence_source,
          confidence_score: e.confidence_score,
          reference_pmid: e.reference_pmid,
        };
      });

    return { gene, metrics, associations, interactions };
  }

  public getDataset(kind: 'associations' | 'interactions', diseaseId?: string, q?: string) {
    const needle = q?.trim().toLowerCase() ?? '';
    if (kind === 'associations') {
      let rows = this.associations;
      if (diseaseId && diseaseId !== 'ALL') {
        rows = rows.filter((r) => r.disease_id === diseaseId);
      }
      if (needle) {
        rows = rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(needle));
      }
      return { kind, rows };
    }

    let rows = this.interactions;
    if (diseaseId && diseaseId !== 'ALL') {
      const gSet = new Set(
        this.associations.filter((a) => a.disease_id === diseaseId).map((a) => a.gene_id),
      );
      rows = rows.filter((r) => gSet.has(r.source_gene_id) && gSet.has(r.target_gene_id));
    }
    if (needle) {
      rows = rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(needle));
    }
    return { kind, rows };
  }

  public exportCsv(kind: 'associations' | 'interactions', diseaseId?: string): string {
    const { rows } = this.getDataset(kind, diseaseId);
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escapeCell = (val: unknown) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const lines = [headers.join(',')];
    for (const row of rows as unknown as Record<string, unknown>[]) {
      lines.push(headers.map((h) => escapeCell(row[h])).join(','));
    }
    return lines.join('\n');
  }
}
