import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, Search } from 'lucide-react';
import { bioClient } from '../api/bioClient';
import { PlotlyChart } from '../components/Charts/PlotlyChart';
import { ErrorPanel, LoadingPanel } from '../components/Common/States';
import type { GeneDetailsResponse, GeneRegistryItem } from '../types/bio';

interface GeneDetailsPageProps {
  selectedGeneId: string;
  onSelectGeneId: (geneId: string) => void;
  onExploreDiseaseNetwork: (diseaseId: string) => void;
}

export function GeneDetailsPage({
  selectedGeneId,
  onSelectGeneId,
  onExploreDiseaseNetwork,
}: GeneDetailsPageProps) {
  const [registry, setRegistry] = useState<GeneRegistryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [details, setDetails] = useState<GeneDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ncbiSyncStatus, setNcbiSyncStatus] = useState<string | null>(null);
  const [syncingNcbi, setSyncingNcbi] = useState(false);

  useEffect(() => {
    bioClient
      .getGenes()
      .then((res) => {
        setRegistry(res.genes);
        if (!selectedGeneId && res.genes.length > 0) {
          onSelectGeneId(res.genes[0].gene_id);
        }
      })
      .catch(() => {});
  }, []);

  const loadDetails = () => {
    if (!selectedGeneId) return;
    setLoading(true);
    setError(null);
    setNcbiSyncStatus(null);
    bioClient
      .getGeneDetails(selectedGeneId)
      .then((res) => setDetails(res))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDetails();
  }, [selectedGeneId]);

  const filteredRegistry = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return registry;
    return registry.filter(
      (g) =>
        g.symbol.toLowerCase().includes(q) ||
        g.gene_id.includes(q) ||
        g.description.toLowerCase().includes(q),
    );
  }, [registry, searchTerm]);

  const handleVerifyLiveNcbi = async () => {
    if (!selectedGeneId) return;
    setSyncingNcbi(true);
    setNcbiSyncStatus(null);
    try {
      const live = await bioClient.getLiveNcbiGene(selectedGeneId);
      setDetails((prev) =>
        prev
          ? {
              ...prev,
              gene: {
                ...prev.gene,
                description: live.description || prev.gene.description,
                chromosome: live.chromosome || prev.gene.chromosome,
                map_location: live.map_location || prev.gene.map_location,
                summary: live.summary || prev.gene.summary,
              },
            }
          : prev,
      );
      setNcbiSyncStatus(`Verified live against ${live.source} (Entrez ID ${live.gene_id})`);
    } catch (err) {
      setNcbiSyncStatus(
        err instanceof Error ? `NCBI lookup unavailable: ${err.message}` : 'NCBI lookup failed',
      );
    } finally {
      setSyncingNcbi(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gene Details</h1>
          <p className="mt-1 text-sm text-slate-600">
            Select any gene from the left list to inspect its NCBI RefSeq dossier, disease links,
            and interaction partners.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter gene symbol or Entrez ID..."
            className="liquid-input w-full rounded-full py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="liquid-glass min-w-0 max-h-[680px] space-y-1.5 overflow-y-auto rounded-3xl p-3 lg:col-span-3">
          <div className="px-2 pb-2 text-xs font-semibold text-slate-600">
            Curated Genes ({filteredRegistry.length})
          </div>
          {filteredRegistry.map((g) => {
            const isSelected = g.gene_id === selectedGeneId;
            return (
              <button
                key={g.gene_id}
                type="button"
                onClick={() => onSelectGeneId(g.gene_id)}
                className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left text-xs transition-all ${
                  isSelected
                    ? 'bg-white/90 text-violet-900 shadow-sm ring-1 ring-violet-400/50'
                    : 'text-slate-700 hover:bg-white/60'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-mono font-bold">{g.symbol}</div>
                  <div className="truncate text-[11px] text-slate-500">{g.description}</div>
                </div>
                <span className="shrink-0 font-mono font-semibold tabular-nums text-[11px] text-teal-700">
                  k={g.degree}
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-w-0 lg:col-span-9">
          {loading ? (
            <LoadingPanel label="Fetching gene dossier..." />
          ) : error || !details ? (
            <ErrorPanel message={error || 'Gene not found'} onRetry={loadDetails} />
          ) : (
            <div className="space-y-6">
              <div className="liquid-glass rounded-3xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-900/10 pb-5">
                  <div>
                    <div className="font-mono text-xs font-semibold text-violet-700">
                      NCBI Gene ID: {details.gene.gene_id} · Chr {details.gene.chromosome} (
                      {details.gene.map_location})
                      {details.gene.mim?.[0] ? ` · OMIM:${details.gene.mim[0]}` : ''}
                    </div>
                    <h2 className="mt-1.5 text-2xl font-bold text-slate-900">
                      {details.gene.symbol}{' '}
                      <span className="text-base font-normal text-slate-600">
                        — {details.gene.description}
                      </span>
                    </h2>
                    {details.gene.aliases && (
                      <div className="mt-2 text-xs text-slate-600">
                        Aliases:{' '}
                        <span className="font-mono text-slate-800">{details.gene.aliases}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyLiveNcbi}
                    disabled={syncingNcbi}
                    className="liquid-btn-teal inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncingNcbi ? 'animate-spin' : ''}`} />
                    {syncingNcbi ? 'Querying NCBI...' : 'Verify Live via NCBI'}
                  </button>
                </div>

                {ncbiSyncStatus && (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-400/45 bg-emerald-100/70 px-4 py-2.5 text-xs font-medium text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{ncbiSyncStatus}</span>
                  </div>
                )}

                <div className="mt-5">
                  <h3 className="text-xs font-bold tracking-wide text-slate-600">
                    RefSeq Biological Summary
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {details.gene.summary}
                  </p>
                </div>

                {details.metrics && (
                  <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-900/10 pt-5 sm:grid-cols-5">
                    <div className="rounded-2xl bg-white/60 p-3">
                      <div className="text-[11px] font-medium text-slate-600">Node Degree</div>
                      <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900">
                        {details.metrics.degree}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/60 p-3">
                      <div className="text-[11px] font-medium text-slate-600">Deg. Centrality</div>
                      <div className="mt-1 font-mono text-xl font-bold tabular-nums text-violet-700">
                        {details.metrics.degree_centrality.toFixed(4)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/60 p-3">
                      <div className="text-[11px] font-medium text-slate-600">Betweenness</div>
                      <div className="mt-1 font-mono text-xl font-bold tabular-nums text-indigo-700">
                        {details.metrics.betweenness_centrality.toFixed(4)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/60 p-3">
                      <div className="text-[11px] font-medium text-slate-600">Closeness</div>
                      <div className="mt-1 font-mono text-xl font-bold tabular-nums text-sky-700">
                        {details.metrics.closeness_centrality.toFixed(4)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/60 p-3">
                      <div className="text-[11px] font-medium text-slate-600">Clustering</div>
                      <div className="mt-1 font-mono text-xl font-bold tabular-nums text-teal-700">
                        {details.metrics.clustering_coefficient.toFixed(4)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="liquid-glass min-w-0 rounded-3xl p-5">
                  <h3 className="text-base font-bold text-slate-900">
                    Associated Diseases ({details.associations.length})
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Click a disease name to view its interactive network
                  </p>
                  <div className="mt-4 space-y-2.5">
                    {details.associations.map((assoc) => (
                      <div
                        key={assoc.disease_id}
                        className="flex items-start justify-between gap-3 rounded-2xl bg-white/65 p-3.5 shadow-xs"
                      >
                        <div>
                          <button
                            type="button"
                            onClick={() => onExploreDiseaseNetwork(assoc.disease_id)}
                            className="text-left text-sm font-bold text-violet-700 hover:underline"
                          >
                            {assoc.disease_name}
                          </button>
                          <div className="mt-0.5 text-xs text-slate-700">
                            {assoc.association_type}
                          </div>
                          <div className="mt-1 font-mono text-[11px] text-slate-500">
                            {assoc.evidence_source} · PMID:{assoc.reference_pmid}
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold tabular-nums text-teal-700">
                          {assoc.score.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="liquid-glass min-w-0 rounded-3xl p-5">
                  <h3 className="text-base font-bold text-slate-900">
                    Documented Gene–Gene Partners ({details.interactions.length})
                  </h3>
                  {details.interactions.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-600">
                      This gene has no direct gene–gene edges within the curated 40-gene panel; it
                      connects to the network via its disease association.
                    </p>
                  ) : (
                    <>
                      <div className="mt-3">
                        <PlotlyChart
                          height={210}
                          data={[
                            {
                              type: 'bar',
                              x: details.interactions.map((i) => i.partner_symbol),
                              y: details.interactions.map((i) => i.confidence_score),
                              customdata: details.interactions.map((i) => i.partner_gene_id),
                              marker: {
                                color: details.interactions.map((i) => i.confidence_score),
                                colorscale: [
                                  [0, '#2DD4BF'],
                                  [1, '#6D5DFB'],
                                ],
                              },
                              hovertemplate: '<b>%{x}</b><br>Confidence: %{y:.2f}<extra></extra>',
                            },
                          ]}
                          layout={{
                            margin: { t: 10, r: 12, b: 36, l: 42 },
                            yaxis: { title: 'Score', range: [0, 1.05] },
                          }}
                          onPointClick={(pt) => {
                            if (typeof pt.customdata === 'string') {
                              onSelectGeneId(pt.customdata);
                            }
                          }}
                        />
                      </div>

                      <div className="mt-3 space-y-2">
                        {details.interactions.map((partner) => (
                          <button
                            key={partner.partner_gene_id}
                            type="button"
                            onClick={() => onSelectGeneId(partner.partner_gene_id)}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/65 px-3.5 py-2.5 text-left text-xs shadow-xs transition-colors hover:bg-white"
                          >
                            <div>
                              <span className="font-mono font-bold text-teal-700">
                                {partner.partner_symbol}
                              </span>
                              <span className="ml-2 text-slate-700">{partner.interaction_type}</span>
                            </div>
                            <span className="font-mono text-[11px] text-slate-500">
                              PMID:{partner.reference_pmid}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
