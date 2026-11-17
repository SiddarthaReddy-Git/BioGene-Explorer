import type {
  DiseaseGeneAssociation,
  DiseaseSummary,
  EdgeMode,
  GeneDetailsResponse,
  GeneGeneInteraction,
  GeneRegistryItem,
  NetworkAnalysisResponse,
  NetworkResponse,
} from '../types/bio';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = (await res.json()) as { detail?: string };
      if (err.detail) message = err.detail;
    } catch {
      // ignore json parse failure
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const bioClient = {
  getDiseases: () =>
    fetchJson<{ diseases: DiseaseSummary[]; total_network_nodes: number }>('/api/diseases'),

  getGenes: (q?: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    const qs = params.toString();
    return fetchJson<{ genes: GeneRegistryItem[] }>(`/api/genes${qs ? `?${qs}` : ''}`);
  },

  getGeneDetails: (geneId: string) =>
    fetchJson<GeneDetailsResponse>(`/api/genes/${encodeURIComponent(geneId)}`),

  getLiveNcbiGene: (geneId: string) =>
    fetchJson<{
      gene_id: string;
      symbol: string;
      description: string;
      chromosome: string;
      map_location: string;
      aliases: string;
      mim: string[];
      summary: string;
      source: string;
    }>(`/api/ncbi/gene/${encodeURIComponent(geneId)}`),

  getNetwork: (opts?: { diseaseId?: string; edgeMode?: EdgeMode; minDegree?: number }) => {
    const params = new URLSearchParams();
    if (opts?.diseaseId && opts.diseaseId !== 'ALL') params.set('disease_id', opts.diseaseId);
    if (opts?.edgeMode) params.set('edge_mode', opts.edgeMode);
    if (opts?.minDegree !== undefined && opts.minDegree > 0) {
      params.set('min_degree', String(opts.minDegree));
    }
    const qs = params.toString();
    return fetchJson<NetworkResponse>(`/api/network${qs ? `?${qs}` : ''}`);
  },

  getAnalysis: (opts?: { diseaseId?: string; edgeMode?: EdgeMode; minDegree?: number }) => {
    const params = new URLSearchParams();
    if (opts?.diseaseId && opts.diseaseId !== 'ALL') params.set('disease_id', opts.diseaseId);
    if (opts?.edgeMode) params.set('edge_mode', opts.edgeMode);
    if (opts?.minDegree !== undefined && opts.minDegree > 0) {
      params.set('min_degree', String(opts.minDegree));
    }
    const qs = params.toString();
    return fetchJson<NetworkAnalysisResponse>(`/api/analysis${qs ? `?${qs}` : ''}`);
  },

  getDataset: (opts: { kind: 'associations' | 'interactions'; diseaseId?: string; q?: string }) => {
    const params = new URLSearchParams({ kind: opts.kind });
    if (opts.diseaseId && opts.diseaseId !== 'ALL') params.set('disease_id', opts.diseaseId);
    if (opts.q) params.set('q', opts.q);
    return fetchJson<
      | { kind: 'associations'; rows: DiseaseGeneAssociation[] }
      | { kind: 'interactions'; rows: GeneGeneInteraction[] }
    >(`/api/dataset?${params.toString()}`);
  },

  getCsvExportUrl: (kind: 'associations' | 'interactions', diseaseId?: string) => {
    const params = new URLSearchParams({ kind });
    if (diseaseId && diseaseId !== 'ALL') params.set('disease_id', diseaseId);
    return `/api/export/csv?${params.toString()}`;
  },
};
