import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { bioClient } from '../api/bioClient';
import { PlotlyChart } from '../components/Charts/PlotlyChart';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/Common/States';
import { ForceNetworkCanvas } from '../components/Network/ForceNetworkCanvas';
import { GeneSidePanel } from '../components/Network/GeneSidePanel';
import type { DiseaseSummary, EdgeMode, NetworkNode, NetworkResponse } from '../types/bio';

interface NetworkVisualizationPageProps {
  initialDiseaseId?: string;
  onOpenGene: (geneId: string) => void;
}

export function NetworkVisualizationPage({
  initialDiseaseId = 'ALL',
  onOpenGene,
}: NetworkVisualizationPageProps) {
  const [diseases, setDiseases] = useState<DiseaseSummary[]>([]);
  const [diseaseId, setDiseaseId] = useState<string>(initialDiseaseId || 'ALL');
  const [edgeMode, setEdgeMode] = useState<EdgeMode>('all');
  const [minDegree, setMinDegree] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'force' | 'plotly'>('force');

  const [network, setNetwork] = useState<NetworkResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDiseaseId(initialDiseaseId || 'ALL');
  }, [initialDiseaseId]);

  useEffect(() => {
    bioClient
      .getDiseases()
      .then((res) => setDiseases(res.diseases))
      .catch(() => {});
  }, []);

  const loadNetwork = () => {
    setLoading(true);
    setError(null);
    bioClient
      .getNetwork({ diseaseId, edgeMode, minDegree })
      .then((res) => {
        setNetwork(res);
        setSelectedNode((prev) =>
          prev ? res.nodes.find((n) => n.id === prev.id) ?? null : null,
        );
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNetwork();
  }, [diseaseId, edgeMode, minDegree]);

  const searchHighlightId = useMemo(() => {
    if (!network || !searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();
    const match = network.nodes.find(
      (n) => n.label.toLowerCase().includes(q) || (n.gene_id && n.gene_id === q),
    );
    return match?.id ?? null;
  }, [network, searchQuery]);

  const applyPreset = (preset: { d: string; e: EdgeMode; k: number }) => {
    setDiseaseId(preset.d);
    setEdgeMode(preset.e);
    setMinDegree(preset.k);
    setSearchQuery('');
  };

  const plotlyTraces = useMemo(() => {
    if (!network || network.nodes.length === 0) return [];
    const nCount = network.nodes.length;
    const posMap = new Map<string, { x: number; y: number }>();
    const diseaseNodes = network.nodes.filter((n) => n.node_type === 'disease');
    const geneNodes = network.nodes.filter((n) => n.node_type === 'gene');

    diseaseNodes.forEach((nd, i) => {
      const a = (i / Math.max(1, diseaseNodes.length)) * Math.PI * 2;
      const r = diseaseNodes.length === 1 ? 0 : 0.42;
      posMap.set(nd.id, { x: Math.cos(a) * r, y: Math.sin(a) * r });
    });

    geneNodes.forEach((nd, i) => {
      const a = (i / Math.max(1, geneNodes.length)) * Math.PI * 2;
      const r = 0.85 + (i % 3) * 0.14;
      posMap.set(nd.id, { x: Math.cos(a) * r, y: Math.sin(a) * r });
    });

    const dgX: (number | null)[] = [];
    const dgY: (number | null)[] = [];
    const ggX: (number | null)[] = [];
    const ggY: (number | null)[] = [];

    for (const e of network.edges) {
      const p1 = posMap.get(e.source);
      const p2 = posMap.get(e.target);
      if (!p1 || !p2) continue;
      if (e.edge_type === 'disease_gene') {
        dgX.push(p1.x, p2.x, null);
        dgY.push(p1.y, p2.y, null);
      } else {
        ggX.push(p1.x, p2.x, null);
        ggY.push(p1.y, p2.y, null);
      }
    }

    const traces: Record<string, unknown>[] = [];
    if (dgX.length > 0) {
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'Disease–Gene Assoc.',
        x: dgX,
        y: dgY,
        line: { color: 'rgba(109,93,251,0.48)', width: 1.4, dash: 'dot' },
        hoverinfo: 'none',
      });
    }
    if (ggX.length > 0) {
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'Gene–Gene Interaction',
        x: ggX,
        y: ggY,
        line: { color: 'rgba(13,148,136,0.62)', width: 1.7 },
        hoverinfo: 'none',
      });
    }

    if (geneNodes.length > 0) {
      traces.push({
        type: 'scatter',
        mode: 'markers+text',
        name: `Genes (${geneNodes.length})`,
        x: geneNodes.map((n) => posMap.get(n.id)!.x),
        y: geneNodes.map((n) => posMap.get(n.id)!.y),
        text: geneNodes.map((n) => n.label),
        textposition: 'top center',
        textfont: { family: '"JetBrains Mono", monospace', size: 10, color: '#0f172a' },
        customdata: geneNodes.map((n) => n.id),
        marker: {
          size: geneNodes.map((n) => Math.min(22, 10 + n.degree * 1.4)),
          color: geneNodes.map((n) =>
            n.associated_diseases.length > 1 ? '#F59E0B' : '#2DD4BF',
          ),
          line: { color: '#FFFFFF', width: 1.5 },
        },
        hovertemplate: geneNodes.map(
          (n) =>
            `<b>${n.label}</b> (NCBI:${n.gene_id})<br>Degree: ${n.degree}<br>Centrality: ${n.degree_centrality.toFixed(4)}<extra></extra>`,
        ),
      });
    }

    if (diseaseNodes.length > 0 && nCount > 0) {
      traces.push({
        type: 'scatter',
        mode: 'markers+text',
        name: `Diseases (${diseaseNodes.length})`,
        x: diseaseNodes.map((n) => posMap.get(n.id)!.x),
        y: diseaseNodes.map((n) => posMap.get(n.id)!.y),
        text: diseaseNodes.map((n) => n.label),
        textposition: 'bottom center',
        textfont: { family: '"Plus Jakarta Sans", sans-serif', size: 11, color: '#4c1d95' },
        customdata: diseaseNodes.map((n) => n.id),
        marker: {
          symbol: 'diamond',
          size: 18,
          color: '#6D5DFB',
          line: { color: '#FFFFFF', width: 1.5 },
        },
        hovertemplate: diseaseNodes.map(
          (n) => `<b>${n.label}</b><br>Degree: ${n.degree}<extra></extra>`,
        ),
      });
    }

    return traces;
  }, [network]);

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Network Visualization
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Use a quick preset below or customize filters. Click any node to open its details panel.
          </p>
        </div>

        {/* Liquid Glass Segmented View Toggle */}
        <div className="liquid-glass flex items-center gap-1 rounded-full p-1">
          <button
            type="button"
            onClick={() => setViewMode('force')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              viewMode === 'force'
                ? 'liquid-btn-violet'
                : 'text-slate-700 hover:bg-white/60 hover:text-slate-950'
            }`}
          >
            Draggable Force Graph
          </button>
          <button
            type="button"
            onClick={() => setViewMode('plotly')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              viewMode === 'plotly'
                ? 'liquid-btn-teal'
                : 'text-slate-700 hover:bg-white/60 hover:text-slate-950'
            }`}
          >
            Plotly Topology Plot
          </button>
        </div>
      </div>

      {/* One-Click Quick Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">Quick Views:</span>
        <button
          type="button"
          onClick={() => applyPreset({ d: 'ALL', e: 'all', k: 0 })}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
            diseaseId === 'ALL' && edgeMode === 'all' && minDegree === 0
              ? 'liquid-btn-violet'
              : 'border-white/85 bg-white/65 text-slate-700 hover:bg-white'
          }`}
        >
          Full Multi-Disease Network
        </button>
        <button
          type="button"
          onClick={() => applyPreset({ d: 'ALL', e: 'gene_gene', k: 1 })}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
            diseaseId === 'ALL' && edgeMode === 'gene_gene'
              ? 'liquid-btn-teal'
              : 'border-white/85 bg-white/65 text-slate-700 hover:bg-white'
          }`}
        >
          Gene–Gene Pathways Only
        </button>
        <button
          type="button"
          onClick={() => applyPreset({ d: 'ALL', e: 'all', k: 4 })}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
            minDegree >= 4
              ? 'liquid-btn-violet'
              : 'border-white/85 bg-white/65 text-slate-700 hover:bg-white'
          }`}
        >
          Hub Nodes Only (k ≥ 4)
        </button>
        <button
          type="button"
          onClick={() => applyPreset({ d: 'DIS_BRCA', e: 'all', k: 0 })}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
            diseaseId === 'DIS_BRCA'
              ? 'liquid-btn-violet'
              : 'border-white/85 bg-white/65 text-slate-700 hover:bg-white'
          }`}
        >
          Breast Carcinoma
        </button>
        <button
          type="button"
          onClick={() => applyPreset({ d: 'DIS_ALZ', e: 'all', k: 0 })}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
            diseaseId === 'DIS_ALZ'
              ? 'liquid-btn-violet'
              : 'border-white/85 bg-white/65 text-slate-700 hover:bg-white'
          }`}
        >
          Alzheimer&apos;s Disease
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="liquid-glass grid gap-3 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700">Disease Cohort</label>
          <select
            value={diseaseId}
            onChange={(e) => setDiseaseId(e.target.value)}
            className="liquid-input mt-1.5 w-full rounded-full px-3.5 py-2 text-xs text-slate-900"
          >
            <option value="ALL">All Documented Diseases</option>
            {diseases.map((d) => (
              <option key={d.disease_id} value={d.disease_id}>
                {d.disease_name} ({d.gene_count} genes)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700">
            Relationship Layer
          </label>
          <select
            value={edgeMode}
            onChange={(e) => setEdgeMode(e.target.value as EdgeMode)}
            className="liquid-input mt-1.5 w-full rounded-full px-3.5 py-2 text-xs text-slate-900"
          >
            <option value="all">All Edges (Disease–Gene + Gene–Gene)</option>
            <option value="disease_gene">Disease–Gene Associations Only</option>
            <option value="gene_gene">Gene–Gene Interactions Only</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span>Minimum Node Degree</span>
            <span className="font-mono tabular-nums text-violet-700">k ≥ {minDegree}</span>
          </div>
          <input
            type="range"
            min={0}
            max={6}
            step={1}
            value={minDegree}
            onChange={(e) => setMinDegree(Number(e.target.value))}
            className="mt-3 w-full accent-violet-600"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700">
            Focus Gene / Node
          </label>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Highlight e.g. TP53, APOE..."
              className="liquid-input w-full rounded-full py-2 pl-9 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Live Subgraph Status Strip */}
      {network && (
        <div className="liquid-glass flex flex-wrap items-center gap-x-5 gap-y-2 rounded-full px-5 py-2 text-xs text-slate-700">
          <span className="font-mono tabular-nums">
            Nodes: <strong className="text-slate-900">{network.summary.total_nodes}</strong>
          </span>
          <span className="font-mono tabular-nums">
            Edges: <strong className="text-violet-700">{network.summary.total_edges}</strong>
          </span>
          <span className="font-mono tabular-nums">
            Components:{' '}
            <strong className="text-indigo-700">{network.summary.connected_components}</strong>
          </span>
          <span className="font-mono tabular-nums">
            Density:{' '}
            <strong className="text-teal-700">{network.summary.network_density.toFixed(4)}</strong>
          </span>
        </div>
      )}

      {loading ? (
        <LoadingPanel label="Constructing biological network graph..." />
      ) : error ? (
        <ErrorPanel message={error} onRetry={loadNetwork} />
      ) : !network || network.nodes.length === 0 ? (
        <EmptyPanel
          title="No nodes match the current degree threshold"
          description="Lower the minimum degree filter or click a quick preset to restore network nodes."
          actionLabel="Reset Network Filters"
          onAction={() => applyPreset({ d: 'ALL', e: 'all', k: 0 })}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className={`min-w-0 ${selectedNode ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            {viewMode === 'force' ? (
              <ForceNetworkCanvas
                nodes={network.nodes}
                edges={network.edges}
                selectedNodeId={selectedNode?.id ?? null}
                searchHighlightId={searchHighlightId}
                onSelectNode={setSelectedNode}
                height={580}
              />
            ) : (
              <div className="liquid-glass rounded-3xl p-4">
                <PlotlyChart
                  height={548}
                  data={plotlyTraces}
                  layout={{
                    margin: { t: 28, r: 20, b: 20, l: 20 },
                    hovermode: 'closest',
                    legend: { orientation: 'h', y: 1.04, x: 0 },
                    xaxis: { visible: false, range: [-1.25, 1.25] },
                    yaxis: { visible: false, range: [-1.25, 1.25], scaleanchor: 'x' },
                  }}
                  onPointClick={(pt) => {
                    if (typeof pt.customdata === 'string') {
                      const found = network.nodes.find((n) => n.id === pt.customdata);
                      if (found) setSelectedNode(found);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {selectedNode && (
            <div className="min-w-0 lg:col-span-4">
              <GeneSidePanel
                selectedNode={selectedNode}
                onClose={() => setSelectedNode(null)}
                onOpenGeneDetails={onOpenGene}
                onFilterByDisease={(dId) => {
                  setDiseaseId(dId);
                  setSelectedNode(null);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
