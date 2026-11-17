import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { bioClient } from '../api/bioClient';
import { PlotlyChart } from '../components/Charts/PlotlyChart';
import { ErrorPanel, LoadingPanel } from '../components/Common/States';
import type { NetworkAnalysisResponse, PageId } from '../types/bio';

interface DashboardPageProps {
  onOpenGene: (geneId: string) => void;
  onNavigate: (page: PageId) => void;
}

export function DashboardPage({ onOpenGene, onNavigate }: DashboardPageProps) {
  const [data, setData] = useState<NetworkAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    bioClient
      .getAnalysis({ edgeMode: 'all' })
      .then((res) => setData(res))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingPanel label="Computing live network statistics..." />;
  if (error || !data) return <ErrorPanel message={error || 'No analysis data'} onRetry={loadData} />;

  const { summary, hub_genes, degree_distribution, disease_breakdown } = data;
  const top10Hubs = hub_genes.slice(0, 10).reverse();

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Live Network Overview
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time statistics computed from the biological dataset. Click any metric card or
            chart bar to explore deeper.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('analysis')}
          className="liquid-btn-violet inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap"
        >
          Full Topological Analysis
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Clickable Liquid Glass KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => onNavigate('gene-details')}
          className="liquid-glass-hover rounded-2xl p-4 text-left"
        >
          <div className="text-xs font-semibold text-teal-700">Total Genes</div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {summary.total_genes}
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            Across {summary.total_diseases} diseases →
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('network')}
          className="liquid-glass-hover rounded-2xl p-4 text-left"
        >
          <div className="text-xs font-semibold text-violet-700">Total Connections</div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-violet-700">
            {summary.total_edges}
          </div>
          <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-600">
            {summary.disease_gene_edges} D–G · {summary.gene_gene_edges} G–G
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('analysis')}
          className="liquid-glass-hover rounded-2xl p-4 text-left"
        >
          <div className="text-xs font-semibold text-indigo-700">Connected Components</div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-indigo-700">
            {summary.connected_components}
          </div>
          <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-600">
            Largest cluster: {summary.largest_component_size} nodes
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('analysis')}
          className="liquid-glass-hover rounded-2xl p-4 text-left"
        >
          <div className="text-xs font-semibold text-sky-700">Network Density</div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-sky-700">
            {summary.network_density.toFixed(4)}
          </div>
          <div className="mt-1 text-[11px] text-slate-600">Ratio of realized edges</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('diseases')}
          className="liquid-glass-hover rounded-2xl p-4 text-left"
        >
          <div className="text-xs font-semibold text-amber-700">Mean Node Degree</div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-amber-700">
            {summary.average_degree.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            Avg links across {summary.total_nodes} nodes
          </div>
        </button>
      </div>

      {/* Plotly Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="liquid-glass min-w-0 rounded-3xl p-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Top 10 Connected Genes (Degree Centrality)
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Click any bar to inspect that gene&apos;s NCBI profile
            </p>
          </div>
          <div className="mt-3">
            <PlotlyChart
              height={320}
              data={[
                {
                  type: 'bar',
                  orientation: 'h',
                  x: top10Hubs.map((g) => g.degree_centrality),
                  y: top10Hubs.map((g) => g.label),
                  customdata: top10Hubs.map((g) => g.gene_id),
                  text: top10Hubs.map((g) => `deg ${g.degree}`),
                  textposition: 'auto',
                  marker: {
                    color: top10Hubs.map((g) => g.degree),
                    colorscale: [
                      [0, '#38BDF8'],
                      [0.5, '#2DD4BF'],
                      [1, '#6D5DFB'],
                    ],
                    line: { color: '#FFFFFF', width: 1 },
                  },
                  hovertemplate:
                    '<b>%{y}</b><br>Degree Centrality: %{x:.4f}<br>%{text}<extra></extra>',
                },
              ]}
              layout={{
                margin: { t: 12, r: 20, b: 42, l: 78 },
                xaxis: { title: 'Degree Centrality' },
                yaxis: { title: '' },
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
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Degree Distribution Across Network
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Number of nodes grouped by total connections (k)
            </p>
          </div>
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
                      [0, '#6D5DFB'],
                      [0.5, '#A855F7'],
                      [1, '#EC4899'],
                    ],
                    line: { color: '#FFFFFF', width: 1 },
                  },
                  hovertemplate: 'Degree %{x}: %{y} nodes<extra></extra>',
                },
              ]}
              layout={{
                margin: { t: 12, r: 20, b: 46, l: 52 },
                xaxis: { title: 'Node Degree (k)', dtick: 1 },
                yaxis: { title: 'Node Count' },
              }}
            />
          </div>
        </div>
      </div>

      {/* Disease Breakdown Plotly Chart + Hub Table */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="liquid-glass min-w-0 rounded-3xl p-5 lg:col-span-6">
          <h2 className="text-base font-bold text-slate-900">
            Edge Composition by Disease Panel
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Disease–Gene Associations vs. Internal Gene–Gene Interactions
          </p>
          <div className="mt-3">
            <PlotlyChart
              height={310}
              data={[
                {
                  type: 'bar',
                  name: 'Disease–Gene Assoc.',
                  x: disease_breakdown.map((d) => d.disease_name),
                  y: disease_breakdown.map((d) => d.disease_gene_edges),
                  marker: { color: '#6D5DFB' },
                },
                {
                  type: 'bar',
                  name: 'Gene–Gene Interactions',
                  x: disease_breakdown.map((d) => d.disease_name),
                  y: disease_breakdown.map((d) => d.gene_gene_edges),
                  marker: { color: '#2DD4BF' },
                },
              ]}
              layout={{
                barmode: 'group',
                margin: { t: 16, r: 16, b: 78, l: 46 },
                legend: { orientation: 'h', y: 1.12, x: 0 },
                xaxis: { tickangle: -18 },
                yaxis: { title: 'Edge Count' },
              }}
            />
          </div>
        </div>

        <div className="liquid-glass min-w-0 rounded-3xl p-5 lg:col-span-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Highly Connected Hub Genes</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Click any row to inspect the gene — computational hubs are not clinical biomarkers
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-900/10 text-slate-600">
                  <th className="pb-2.5 font-semibold">Gene</th>
                  <th className="pb-2.5 font-semibold">Chr</th>
                  <th className="pb-2.5 text-right font-semibold">Degree</th>
                  <th className="pb-2.5 text-right font-semibold">Centrality</th>
                  <th className="pb-2.5 text-right font-semibold">Betweenness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/8">
                {hub_genes.slice(0, 8).map((gene) => (
                  <tr
                    key={gene.id}
                    onClick={() => gene.gene_id && onOpenGene(gene.gene_id)}
                    className="cursor-pointer transition-colors hover:bg-white/60"
                  >
                    <td className="py-2.5 font-mono font-bold text-violet-700">{gene.label}</td>
                    <td className="py-2.5 font-mono text-slate-700">{gene.chromosome || '—'}</td>
                    <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                      {gene.degree}
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-teal-700">
                      {gene.degree_centrality.toFixed(4)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-indigo-700">
                      {gene.betweenness_centrality.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
