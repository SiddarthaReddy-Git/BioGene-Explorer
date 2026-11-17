import { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, Search, Share2 } from 'lucide-react';
import { bioClient } from '../api/bioClient';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/Common/States';
import type { DiseaseSummary } from '../types/bio';

interface DiseaseExplorerPageProps {
  selectedDiseaseId: string;
  onSelectDiseaseId: (diseaseId: string) => void;
  onGenerateNetwork: (diseaseId: string) => void;
  onOpenGene: (geneId: string) => void;
}

const CATEGORY_TEXT: Record<string, string> = {
  Oncology: 'text-pink-700',
  'Metabolic & Endocrine': 'text-emerald-700',
  Neurodegenerative: 'text-violet-700',
  Cardiovascular: 'text-sky-700',
};

export function DiseaseExplorerPage({
  selectedDiseaseId,
  onSelectDiseaseId,
  onGenerateNetwork,
  onOpenGene,
}: DiseaseExplorerPageProps) {
  const [diseases, setDiseases] = useState<DiseaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'gene_symbol'>('score');
  const [sortDesc, setSortDesc] = useState(true);

  const loadDiseases = () => {
    setLoading(true);
    setError(null);
    bioClient
      .getDiseases()
      .then((res) => {
        setDiseases(res.diseases);
        if (
          res.diseases.length > 0 &&
          (!selectedDiseaseId ||
            selectedDiseaseId === 'ALL' ||
            !res.diseases.some((d) => d.disease_id === selectedDiseaseId))
        ) {
          onSelectDiseaseId(res.diseases[0].disease_id);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDiseases();
  }, []);

  const filteredDiseases = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return diseases;
    return diseases.filter(
      (d) =>
        d.disease_name.toLowerCase().includes(needle) ||
        d.disease_category.toLowerCase().includes(needle) ||
        d.doid.toLowerCase().includes(needle) ||
        d.genes.some((g) => g.gene_symbol.toLowerCase().includes(needle)),
    );
  }, [diseases, searchTerm]);

  const activeDisease = useMemo(
    () =>
      diseases.find((d) => d.disease_id === selectedDiseaseId) ??
      filteredDiseases[0] ??
      null,
    [diseases, filteredDiseases, selectedDiseaseId],
  );

  const sortedGenes = useMemo(() => {
    if (!activeDisease) return [];
    return [...activeDisease.genes].sort((a, b) => {
      if (sortBy === 'score') {
        return sortDesc ? b.score - a.score : a.score - b.score;
      }
      return sortDesc
        ? b.gene_symbol.localeCompare(a.gene_symbol)
        : a.gene_symbol.localeCompare(b.gene_symbol);
    });
  }, [activeDisease, sortBy, sortDesc]);

  if (loading) return <LoadingPanel label="Loading curated disease cohorts..." />;
  if (error) return <ErrorPanel message={error} onRetry={loadDiseases} />;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Disease Explorer</h1>
          <p className="mt-1 text-sm text-slate-600">
            Select a disease on the left to inspect its associated genes, or launch an interactive
            network graph with one click.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search disease, DOID, or gene..."
            className="liquid-input w-full rounded-full py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      {filteredDiseases.length === 0 ? (
        <EmptyPanel
          title="No matching diseases found"
          description="Try clearing your search query or searching by gene symbol such as TP53, APOE, or PPARG."
          actionLabel="Clear Search"
          onAction={() => setSearchTerm('')}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 space-y-3 lg:col-span-4">
            {filteredDiseases.map((d) => {
              const isSelected = activeDisease?.disease_id === d.disease_id;
              const catColor = CATEGORY_TEXT[d.disease_category] || 'text-violet-700';
              return (
                <button
                  key={d.disease_id}
                  type="button"
                  onClick={() => onSelectDiseaseId(d.disease_id)}
                  className={`w-full rounded-2xl p-4 text-left transition-all ${
                    isSelected
                      ? 'liquid-glass-aqua ring-2 ring-violet-400/50'
                      : 'liquid-glass-hover'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={`font-semibold ${catColor}`}>{d.disease_category}</span>
                    <span className="font-mono text-slate-500">{d.doid}</span>
                  </div>
                  <div className="mt-1.5 text-base font-bold text-slate-900">{d.disease_name}</div>
                  <div className="mt-2 flex items-center gap-3 font-mono text-xs tabular-nums text-slate-600">
                    <span className="font-semibold text-violet-700">{d.gene_count} genes</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-teal-700">
                      {d.internal_gene_gene_edges} G–G links
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {activeDisease && (
            <div className="liquid-glass min-w-0 space-y-5 rounded-3xl p-6 lg:col-span-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-900/10 pb-5">
                <div className="max-w-xl">
                  <div className="text-xs font-mono text-slate-600">
                    {activeDisease.doid} · UMLS:{activeDisease.umls_cui} ·{' '}
                    <span
                      className={`font-semibold ${
                        CATEGORY_TEXT[activeDisease.disease_category] || 'text-violet-700'
                      }`}
                    >
                      {activeDisease.disease_category}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-xl font-bold text-slate-900">
                    {activeDisease.disease_name}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {activeDisease.description}
                  </p>
                  {activeDisease.primary_pathway && (
                    <div className="mt-2.5 text-xs text-slate-600">
                      Primary Pathway Focus:{' '}
                      <span className="font-semibold text-teal-700">
                        {activeDisease.primary_pathway}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onGenerateNetwork(activeDisease.disease_id)}
                  className="liquid-btn-violet inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Generate Interactive Network
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/10 pb-4 text-xs">
                <div className="text-slate-700">
                  Shared Cross-Disease Genes:{' '}
                  {activeDisease.shared_genes.length > 0 ? (
                    <span className="font-mono font-semibold text-amber-700">
                      {activeDisease.shared_genes.join(', ')}
                    </span>
                  ) : (
                    <span className="text-slate-500">None in current cohort</span>
                  )}
                </div>
                <div className="font-mono tabular-nums text-slate-600">
                  {activeDisease.gene_count} genes · {activeDisease.internal_gene_gene_edges}{' '}
                  gene–gene edges
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-900/10 text-slate-600">
                      <th className="pb-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => {
                            if (sortBy === 'gene_symbol') setSortDesc((v) => !v);
                            else {
                              setSortBy('gene_symbol');
                              setSortDesc(false);
                            }
                          }}
                          className="inline-flex items-center gap-1 hover:text-slate-950"
                        >
                          Gene Symbol
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="pb-3 font-semibold">Entrez ID</th>
                      <th className="pb-3 font-semibold">Association Type</th>
                      <th className="pb-3 font-semibold">Source</th>
                      <th className="pb-3 font-semibold">PMID</th>
                      <th className="pb-3 text-right font-semibold">
                        <button
                          type="button"
                          onClick={() => {
                            if (sortBy === 'score') setSortDesc((v) => !v);
                            else {
                              setSortBy('score');
                              setSortDesc(true);
                            }
                          }}
                          className="inline-flex items-center gap-1 hover:text-slate-950"
                        >
                          Score
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/8">
                    {sortedGenes.map((g) => (
                      <tr
                        key={g.gene_id}
                        onClick={() => onOpenGene(g.gene_id)}
                        className="cursor-pointer transition-colors hover:bg-white/60"
                      >
                        <td className="py-3 font-mono font-bold text-violet-700">
                          {g.gene_symbol}
                        </td>
                        <td className="py-3 font-mono text-slate-600">{g.gene_id}</td>
                        <td className="py-3 text-slate-800">{g.association_type}</td>
                        <td className="py-3 text-slate-600">{g.evidence_source}</td>
                        <td className="py-3 font-mono text-slate-600">{g.reference_pmid}</td>
                        <td className="py-3 text-right font-mono font-semibold tabular-nums text-teal-700">
                          {g.score.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
