export type PageId =
  | 'home'
  | 'dashboard'
  | 'diseases'
  | 'network'
  | 'gene-details'
  | 'analysis'
  | 'dataset'
  | 'about';

export type EdgeMode = 'all' | 'disease_gene' | 'gene_gene';

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

export interface DiseaseSummary {
  disease_id: string;
  disease_name: string;
  disease_category: string;
  doid: string;
  umls_cui: string;
  description: string;
  primary_pathway: string;
  gene_count: number;
  internal_gene_gene_edges: number;
  shared_genes: string[];
  genes: {
    gene_id: string;
    gene_symbol: string;
    association_type: string;
    evidence_source: string;
    score: number;
    reference_pmid: string;
  }[];
}

export interface GeneRegistryItem {
  gene_id: string;
  symbol: string;
  description: string;
  chromosome: string;
  map_location: string;
  aliases: string;
  mim: string[];
  summary: string;
  associated_diseases: string[];
  disease_ids: string[];
  degree: number;
  degree_centrality: number;
  betweenness_centrality: number;
  closeness_centrality: number;
  clustering_coefficient: number;
}

export interface NodeMetric {
  id: string;
  gene_id: string | null;
  label: string;
  node_type: 'gene' | 'disease';
  description: string;
  chromosome: string;
  degree: number;
  degree_centrality: number;
  betweenness_centrality: number;
  closeness_centrality: number;
  clustering_coefficient: number;
  associated_diseases: string[];
}

export interface NetworkNode extends NodeMetric {
  category?: string;
  map_location?: string;
}

export interface NetworkEdge {
  source: string;
  target: string;
  edge_type: 'disease_gene' | 'gene_gene';
  relation: string;
  evidence_source: string;
  score: number;
  reference_pmid: string;
}

export interface GraphSummary {
  total_nodes: number;
  total_genes: number;
  total_diseases: number;
  total_edges: number;
  disease_gene_edges: number;
  gene_gene_edges: number;
  connected_components: number;
  largest_component_size: number;
  network_density: number;
  average_degree: number;
}

export interface ConnectedComponentInfo {
  component_index: number;
  size: number;
  gene_count: number;
  disease_count: number;
  members: {
    id: string;
    label: string;
    node_type: 'gene' | 'disease';
    degree: number;
  }[];
}

export interface DiseaseBreakdownItem {
  disease_id: string;
  disease_name: string;
  disease_gene_edges: number;
  gene_gene_edges: number;
  description: string;
}

export interface NetworkAnalysisResponse {
  summary: GraphSummary;
  degree_distribution: { degree: number; count: number }[];
  hub_genes: NodeMetric[];
  all_node_metrics: NodeMetric[];
  components: ConnectedComponentInfo[];
  disease_breakdown: DiseaseBreakdownItem[];
}

export interface NetworkResponse {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  summary: GraphSummary;
}

export interface GeneDetailsResponse {
  gene: {
    gene_id: string;
    symbol: string;
    description: string;
    chromosome: string;
    map_location: string;
    aliases: string;
    mim: string[];
    summary: string;
  };
  metrics: NodeMetric | null;
  associations: DiseaseGeneAssociation[];
  interactions: {
    partner_gene_id: string;
    partner_symbol: string;
    partner_description: string;
    interaction_type: string;
    evidence_source: string;
    confidence_score: number;
    reference_pmid: string;
  }[];
}
