import { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, Download, Search } from 'lucide-react';
import { bioClient } from '../api/bioClient';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/Common/States';
import type { DiseaseGeneAssociation, DiseaseSummary, GeneGeneInteraction } from '../types/bio';

interface DatasetExplorerPageProps {
  onOpenGene: (geneId: string) => void;
}

export function DatasetExplorerPage({ onOpenGene }: DatasetExplorerPageProps) {
  const [kind, setKind] = useState<'associations' | 'interactions'>('associations');
  const [diseases, setDiseases] = useState<DiseaseSummary[]>([]);
  const [diseaseId, setDiseaseId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [assocRows, setAssocRows] = useState<DiseaseGeneAssociation[]>([]);
  const [interRows, setInterRows] = useState<GeneGeneInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<string>('score');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    bioClient
      .getDiseases()
      .then((res) => setDiseases(res.diseases))
      .catch(() => {});
  }, []);

  const loadDataset = () => {
    setLoading(true);
    setError(null);
    bioClient
      .getDataset({ kind, diseaseId, q: searchQuery })
      .then((res) => {
        if (res.kind === 'associations') setAssocRows(res.rows);
        else setInterRows(res.rows);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDataset();
  }, [kind, diseaseId, searchQuery]);

  const toggleSort = (col: string) => {
    if (sortKey === col) setSortDesc((v) => !v);
    else {
      setSortKey(col);
      setSortDesc(col === 'score' || col === 'confidence_score');
    }
  };

  const sortedAssoc = useMemo(() => {
    return [...assocRows].sort((a, b) => {
      const va = a[sortKey as keyof DiseaseGeneAssociation] ?? '';
      const vb = b[sortKey as keyof DiseaseGeneAssociation] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDesc ? vb - va : va - vb;
      }
      return sortDesc ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
    });
  }, [assocRows, sortKey, sortDesc]);

  const sortedInter = useMemo(() => {
    return [...interRows].sort((a, b) => {
      const va = a[sortKey as keyof GeneGeneInteraction] ?? '';
      const vb = b[sortKey as keyof GeneGeneInteraction] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDesc ? vb - va : va - vb;
      }
      return sortDesc ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
    });
  }, [interRows, sortKey, sortDesc]);

  const rowCount = kind === 'associations' ? sortedAssoc.length : sortedInter.length;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dataset Explorer</h1>
          <p className="mt-1 text-sm text-slate-600">
            Search, filter, sort, and export the cleaned biological CSV tables separating
            disease–gene associations from gene–gene interactions.
          </p>
        </div>

        <a
          href={bioClient.getCsvExportUrl(kind, diseaseId)}
          download
          className="liquid-btn-teal inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          Export Cleaned CSV
        </a>
      </div>

      {/* Liquid Glass Controls Bar */}
      <div className="liquid-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/85 bg-white/45 p-1">
          <button
            type="button"
            onClick={() => {
              setKind('associations');
              setSortKey('score');
              setSortDesc(true);
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              kind === 'associations'
                ? 'liquid-btn-violet'
                : 'text-slate-700 hover:bg-white/60 hover:text-slate-950'
            }`}
          >
            Disease–Gene Associations
          </button>
          <button
            type="button"
            onClick={() => {
              setKind('interactions');
              setSortKey('confidence_score');
              setSortDesc(true);
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              kind === 'interactions'
                ? 'liquid-btn-teal'
                : 'text-slate-700 hover:bg-white/60 hover:text-slate-950'
            }`}
          >
            Gene–Gene Interactions
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={diseaseId}
            onChange={(e) => setDiseaseId(e.target.value)}
            className="liquid-input rounded-full px-4 py-2 text-xs font-medium text-slate-900"
          >
            <option value="ALL">All Disease Panels</option>
            {diseases.map((d) => (
              <option key={d.disease_id} value={d.disease_id}>
                {d.disease_name}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gene, PMID, source..."
              className="liquid-input w-full rounded-full py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingPanel label="Querying cleaned dataset..." />
      ) : error ? (
        <ErrorPanel message={error} onRetry={loadDataset} />
      ) : rowCount === 0 ? (
        <EmptyPanel
          title="No dataset rows match your filters"
          description="Clear the search keyword or select All Disease Panels to view the full dataset."
          actionLabel="Reset Filters"
          onAction={() => {
            setDiseaseId('ALL');
            setSearchQuery('');
          }}
        />
      ) : (
        <div className="liquid-glass rounded-3xl p-5">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing <strong className="font-mono text-slate-900">{rowCount}</strong> curated
              records
            </span>
            <span>Click any gene symbol to open its NCBI dossier</span>
          </div>

          <div className="overflow-x-auto">
            {kind === 'associations' ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-900/10 text-slate-600">
                    <th className="pb-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort('disease_name')}
                        className="inline-flex items-center gap-1 hover:text-slate-950"
                      >
                        Disease <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="pb-3 font-semibold">DOID</th>
                    <th className="pb-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort('gene_symbol')}
                        className="inline-flex items-center gap-1 hover:text-slate-950"
                      >
                        Gene <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="pb-3 font-semibold">Association Type</th>
                    <th className="pb-3 font-semibold">Evidence Source</th>
                    <th className="pb-3 font-semibold">PMID</th>
                    <th className="pb-3 text-right font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort('score')}
                        className="inline-flex items-center gap-1 hover:text-slate-950"
                      >
                        Score <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/8">
                  {sortedAssoc.map((r) => (
                    <tr
                      key={`${r.disease_id}-${r.gene_id}`}
                      className="transition-colors hover:bg-white/60"
                    >
                      <td className="py-2.5 font-semibold text-slate-900">{r.disease_name}</td>
                      <td className="py-2.5 font-mono text-slate-600">{r.doid}</td>
                      <td className="py-2.5">
                        <button
                          type="button"
                          onClick={() => onOpenGene(r.gene_id)}
                          className="font-mono font-bold text-violet-700 hover:underline"
                        >
                          {r.gene_symbol}
                        </button>
                      </td>
                      <td className="py-2.5 text-slate-800">{r.association_type}</td>
                      <td className="py-2.5 text-slate-600">{r.evidence_source}</td>
                      <td className="py-2.5 font-mono text-slate-600">{r.reference_pmid}</td>
                      <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-teal-700">
                        {r.score.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-900/10 text-slate-600">
                    <th className="pb-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort('source_symbol')}
                        className="inline-flex items-center gap-1 hover:text-slate-950"
                      >
                        Source Gene <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="pb-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort('target_symbol')}
                        className="inline-flex items-center gap-1 hover:text-slate-950"
                      >
                        Target Gene <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="pb-3 font-semibold">Interaction Mechanism</th>
                    <th className="pb-3 font-semibold">Evidence Source</th>
                    <th className="pb-3 font-semibold">PMID</th>
                    <th className="pb-3 text-right font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort('confidence_score')}
                        className="inline-flex items-center gap-1 hover:text-slate-950"
                      >
                        Confidence <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/8">
                  {sortedInter.map((r) => (
                    <tr
                      key={`${r.source_gene_id}-${r.target_gene_id}`}
                      className="transition-colors hover:bg-white/60"
                    >
                      <td className="py-2.5">
                        <button
                          type="button"
                          onClick={() => onOpenGene(r.source_gene_id)}
                          className="font-mono font-bold text-teal-700 hover:underline"
                        >
                          {r.source_symbol}
                        </button>
                      </td>
                      <td className="py-2.5">
                        <button
                          type="button"
                          onClick={() => onOpenGene(r.target_gene_id)}
                          className="font-mono font-bold text-teal-700 hover:underline"
                        >
                          {r.target_symbol}
                        </button>
                      </td>
                      <td className="py-2.5 text-slate-800">{r.interaction_type}</td>
                      <td className="py-2.5 text-slate-600">{r.evidence_source}</td>
                      <td className="py-2.5 font-mono text-slate-600">{r.reference_pmid}</td>
                      <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-violet-700">
                        {r.confidence_score.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
