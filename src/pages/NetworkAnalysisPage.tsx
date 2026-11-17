import { useEffect, useState } from 'react';
import { ArrowUpDown, ShieldAlert } from 'lucide-react';
import { bioClient } from '../api/bioClient';
import { PlotlyChart } from '../components/Charts/PlotlyChart';
import { ErrorPanel, LoadingPanel } from '../components/Common/States';
import type { DiseaseSummary, EdgeMode, NetworkAnalysisResponse } from '../types/bio';

interface NetworkAnalysisPageProps {
  onOpenGene: (geneId: string) => void;
}

export function NetworkAnalysisPage({ onOpenGene }: NetworkAnalysisPageProps) {
  const [diseases, setDiseases] = useState<DiseaseSummary[]>([]);
  const [diseaseId, setDiseaseId] = useState<string>('ALL');
  const [edgeMode, setEdgeMode] = useState<EdgeMode>('all');
  const [analysis, setAnalysis] = useState<NetworkAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortCol, setSortCol] = useState<
    | 'degree'
    | 'degree_centrality'
    | 'betweenness_centrality'
    | 'closeness_centrality'
    | 'clustering_coefficient'
  >('degree');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    bioClient
      .getDiseases()
      .then((res) => setDiseases(res.diseases))
      .catch(() => {});
  }, []);

  const loadAnalysis = () => {
    setLoading(true);
    setError(null);
    bioClient
      .getAnalysis({ diseaseId, edgeMode })
      .then((res) => setAnalysis(res))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAnalysis();
  }, [diseaseId, edgeMode]);

  if (loading) return <LoadingPanel label="Calculating graph topology metrics..." />;
  if (error || !analysis) {
    return (
      <ErrorPanel message={error || 'Unable to compute network analysis'} onRetry={loadAnalysis} />
    );
  }

  const { summary, degree_distribution, hub_genes, components } = analysis;

  const sortedHubs = [...hub_genes].sort((a, b) =>
    sortDesc ? b[sortCol] - a[sortCol] : a[sortCol] - b[sortCol],
  );

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDesc((v) => !v);
    else {
      setSortCol(col);
      setSortDesc(true);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Network Analysis</h1>
          <p className="mt-1 text-sm text-slate-600">
            Switch between Combined, Gene–Gene, and Disease–Gene subgraphs to see how centrality
            and connected components shift.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={diseaseId}
            onChange={(e) => setDiseaseId(e.target.value)}
            className="liquid-input rounded-full px-4 py-2 text-xs font-medium text-slate-900"
          >
            <option value="ALL">All Diseases</option>
            {diseases.map((d) => (
              <option key={d.disease_id} value={d.disease_id}>
                {d.disease_name}
              </option>
            ))}
          </select>

          <div className="liquid-glass flex flex-wrap items-center gap-1 rounded-full p-1">
            {(
              [
                { id: 'all', label: 'Combined' },
                { id: 'gene_gene', label: 'Gene–Gene Only' },
                { id: 'disease_gene', label: 'Disease–Gene Only' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setEdgeMode(opt.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                  edgeMode === opt.id
                    ? 'liquid-btn-violet'
                    : 'text-slate-700 hover:bg-white/60 hover:text-slate-950'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Topological Summary Row */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="liquid-glass rounded-2xl p-4">
          <div className="text-xs font-medium text-slate-600">Nodes (|V|)</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {summary.total_nodes}
          </div>
        </div>
        <div className="liquid-glass rounded-2xl p-4">
          <div className="text-xs font-medium text-slate-600">Edges (|E|)</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-violet-700">
            {summary.total_edges}
          </div>
        </div>
        <div className="liquid-glass rounded-2xl p-4">
          <div className="text-xs font-medium text-slate-600">Network Density</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-sky-700">
            {summary.network_density.toFixed(4)}
          </div>
        </div>
        <div className="liquid-glass rounded-2xl p-4">
          <div className="text-xs font-medium text-slate-600">Average Degree</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-teal-700">
            {summary.average_degree.toFixed(2)}
          </div>
        </div>
        <div className="liquid-glass rounded-2xl p-4">
          <div className="text-xs font-medium text-slate-600">Components</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-700">
            {summary.connected_components}
          </div>
        </div>
        <div className="liquid-glass rounded-2xl p-4">
          <div className="text-xs font-medium text-slate-600">Largest Component</div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-indigo-700">
            {summary.largest_component_size}
          </div>
        </div>
      </div>

      {/* Plotly Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="liquid-glass min-w-0 rounded-3xl p-5">
          <h2 className="text-base font-bold text-slate-900">
            Degree Centrality vs. Betweenness Centrality
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Identifies bridge genes connecting distinct disease pathways (click point for details)
          </p>
          <div className="mt-3">
            <PlotlyChart
              height={320}
              data={[
                {
                  type: 'scatter',
                  mode: 'markers+text',
                  x: hub_genes.map((g) => g.degree_centrality),
                  y: hub_genes.map((g) => g.betweenness_centrality),
                  text: hub_genes.slice(0, 12).map((g) => g.label),
                  textposition: 'top center',
                  textfont: { family: '"JetBrains Mono", monospace', size: 10, color: '#0f172a' },
                  customdata: hub_genes.map((g) => g.gene_id),
                  marker: {
                    size: hub_genes.map((g) => Math.max(9, g.degree * 2.2)),
                    color: hub_genes.map((g) => g.degree),
                    colorscale: [
                      [0, '#2DD4BF'],
                      [0.5, '#6D5DFB'],
                      [1, '#EC4899'],
                    ],
                    line: { color: '#FFFFFF', width: 1.5 },
                  },
                  hovertemplate: hub_genes.map(
                    (g) =>
                      `<b>${g.label}</b><br>Degree: ${g.degree}<br>Degree Centrality: ${g.degree_centrality.toFixed(4)}<br>Betweenness: ${g.betweenness_centrality.toFixed(4)}<extra></extra>`,
                  ),
                },
              ]}
              layout={{
                margin: { t: 16, r: 20, b: 46, l: 58 },
                xaxis: { title: 'Degree Centrality' },
                yaxis: { title: 'Betweenness Centrality' },
              }}
              onPointClick={(pt) => {
                if (typeof pt.customdata === 'string') {
                  onOpenGene(pt.customdata);
                }
              }}
            />
          </div>
        </div>

        <div className="liquid-glass min-w-0 rounded-3xl p-5">
          <h2 className="text-base font-bold text-slate-900">Subgraph Degree Histogram</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Notice how switching to Gene–Gene Only shifts isolated nodes to k = 0
          </p>
          <div className="mt-3">
            <PlotlyChart
              height={320}
              data={[
                {
                  type: 'bar',
                  x: degree_distribution.map((d) => d.degree),
                  y: degree_distribution.map((d) => d.count),
                  marker: {
                    color: degree_distribution.map((d) => d.degree),
                    colorscale: [
                      [0, '#38BDF8'],
                      [0.5, '#2DD4BF'],
                      [1, '#6D5DFB'],
                    ],
                    line: { color: '#FFFFFF', width: 1 },
                  },
                  hovertemplate: 'Degree k=%{x}: %{y} nodes<extra></extra>',
                },
              ]}
              layout={{
                margin: { t: 16, r: 20, b: 46, l: 50 },
                xaxis: { title: 'Node Degree (k)', dtick: 1 },
                yaxis: { title: 'Frequency' },
              }}
            />
          </div>
        </div>
      </div>

      {/* Connected Components Breakdown */}
      <div className="liquid-glass rounded-3xl p-5">
        <h2 className="text-base font-bold text-slate-900">
          Connected Components ({components.length})
        </h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Disconnected clusters calculated via graph traversal. Click any gene chip to inspect it.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {components.map((comp) => (
            <div key={comp.component_index} className="rounded-2xl bg-white/60 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">Component {comp.component_index}</span>
                <span className="font-mono font-semibold tabular-nums text-violet-700">
                  {comp.size} nodes
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-600">
                {comp.gene_count} genes · {comp.disease_count} diseases
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {comp.members.slice(0, 12).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (m.node_type === 'gene' && m.id.startsWith('GENE_')) {
                        onOpenGene(m.id.replace('GENE_', ''));
                      }
                    }}
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                      m.node_type === 'disease'
                        ? 'bg-violet-600 text-white'
                        : 'bg-white/90 text-slate-800 shadow-xs hover:bg-teal-500 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
                {comp.members.length > 12 && (
                  <span className="px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                    +{comp.members.length - 12} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Centrality Table */}
      <div className="liquid-glass rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/10 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Gene Centrality & Connectivity Matrix
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Click column headers to sort · Click any gene row to inspect its RefSeq dossier
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-amber-800">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Topological hubs are not clinical biomarkers</span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-900/10 text-slate-600">
                <th className="pb-3 font-semibold">Gene</th>
                <th className="pb-3 font-semibold">Associated Diseases</th>
                <th className="pb-3 text-right font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort('degree')}
                    className="inline-flex items-center gap-1 hover:text-slate-950"
                  >
                    Degree <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="pb-3 text-right font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort('degree_centrality')}
                    className="inline-flex items-center gap-1 hover:text-slate-950"
                  >
                    Deg. Centrality <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="pb-3 text-right font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort('betweenness_centrality')}
                    className="inline-flex items-center gap-1 hover:text-slate-950"
                  >
                    Betweenness <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="pb-3 text-right font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort('closeness_centrality')}
                    className="inline-flex items-center gap-1 hover:text-slate-950"
                  >
                    Closeness <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="pb-3 text-right font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort('clustering_coefficient')}
                    className="inline-flex items-center gap-1 hover:text-slate-950"
                  >
                    Clustering <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/8">
              {sortedHubs.map((g) => (
                <tr
                  key={g.id}
                  onClick={() => g.gene_id && onOpenGene(g.gene_id)}
                  className="cursor-pointer transition-colors hover:bg-white/60"
                >
                  <td className="py-2.5 font-mono font-bold text-violet-700">{g.label}</td>
                  <td className="py-2.5 text-slate-700">
                    {g.associated_diseases.join(', ') || '—'}
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                    {g.degree}
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-teal-700">
                    {g.degree_centrality.toFixed(4)}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-indigo-700">
                    {g.betweenness_centrality.toFixed(4)}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-sky-700">
                    {g.closeness_centrality.toFixed(4)}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                    {g.clustering_coefficient.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
