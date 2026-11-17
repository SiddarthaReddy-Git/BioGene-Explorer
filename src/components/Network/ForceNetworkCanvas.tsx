import { useEffect, useMemo, useRef, useState } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { NetworkEdge, NetworkNode } from '../../types/bio';

interface SimNode extends SimulationNodeDatum {
  id: string;
  raw: NetworkNode;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  source: SimNode | string;
  target: SimNode | string;
  raw: NetworkEdge;
}

interface ForceNetworkCanvasProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  selectedNodeId: string | null;
  searchHighlightId?: string | null;
  onSelectNode: (node: NetworkNode | null) => void;
  height?: number;
}

const CATEGORY_COLORS: Record<string, { fill: string; stroke: string }> = {
  Oncology: { fill: '#EC4899', stroke: '#FFFFFF' },
  'Metabolic & Endocrine': { fill: '#10B981', stroke: '#FFFFFF' },
  Neurodegenerative: { fill: '#6D5DFB', stroke: '#FFFFFF' },
  Cardiovascular: { fill: '#2563EB', stroke: '#FFFFFF' },
};

export function ForceNetworkCanvas({
  nodes,
  edges,
  selectedNodeId,
  searchHighlightId = null,
  onSelectNode,
  height = 580,
}: ForceNetworkCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 960, height });
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimLink[]>([]);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [layoutNonce, setLayoutNonce] = useState(0);

  const dragRef = useRef<{
    type: 'node' | 'pan' | null;
    nodeId?: string;
    startX: number;
    startY: number;
    origTx: number;
    origTy: number;
    moved: boolean;
  }>({ type: null, startX: 0, startY: 0, origTx: 0, origTy: 0, moved: false });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(320, Math.floor(entry.contentRect.width));
        setDimensions({ width: w, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  useEffect(() => {
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    const preparedNodes: SimNode[] = nodes.map((nd, idx) => {
      const angle = (idx / Math.max(1, nodes.length)) * Math.PI * 2;
      const radius = nd.node_type === 'disease' ? 110 : 210;
      return {
        id: nd.id,
        raw: nd,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };
    });

    const nodeSet = new Set(preparedNodes.map((n) => n.id));
    const preparedLinks: SimLink[] = edges
      .filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target))
      .map((e) => ({
        source: e.source,
        target: e.target,
        raw: e,
      }));

    const simulation = forceSimulation<SimNode>(preparedNodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(preparedLinks)
          .id((d) => d.id)
          .distance((d) => (d.raw.edge_type === 'disease_gene' ? 118 : 82))
          .strength((d) => (d.raw.edge_type === 'disease_gene' ? 0.55 : 0.75)),
      )
      .force('charge', forceManyBody<SimNode>().strength(-360))
      .force('center', forceCenter(cx, cy))
      .force(
        'collide',
        forceCollide<SimNode>().radius((d) => (d.raw.node_type === 'disease' ? 32 : 22)),
      )
      .alphaDecay(0.035);

    simRef.current = simulation;
    setSimNodes([...preparedNodes]);
    setSimLinks([...preparedLinks]);

    let rafId = 0;
    simulation.on('tick', () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setSimNodes([...preparedNodes]);
        setSimLinks([...preparedLinks]);
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      simulation.stop();
    };
  }, [nodes, edges, dimensions.width, dimensions.height, layoutNonce]);

  const activeFocusId = hoveredNodeId ?? selectedNodeId ?? searchHighlightId;

  const neighborSet = useMemo(() => {
    const set = new Set<string>();
    if (!activeFocusId) return set;
    set.add(activeFocusId);
    for (const l of simLinks) {
      const sId = typeof l.source === 'string' ? l.source : l.source.id;
      const tId = typeof l.target === 'string' ? l.target : l.target.id;
      if (sId === activeFocusId) set.add(tId);
      if (tId === activeFocusId) set.add(sId);
    }
    return set;
  }, [activeFocusId, simLinks]);

  const hoveredNode = useMemo(
    () => simNodes.find((n) => n.id === hoveredNodeId) ?? null,
    [simNodes, hoveredNodeId],
  );

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setTransform((prev) => {
      const nextK = Math.min(3.2, Math.max(0.35, prev.k * factor));
      const ratio = nextK / prev.k;
      return {
        k: nextK,
        x: mouseX - (mouseX - prev.x) * ratio,
        y: mouseY - (mouseY - prev.y) * ratio,
      };
    });
  };

  const handleBackgroundPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      type: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      origTx: transform.x,
      origTy: transform.y,
      moved: false,
    };
  };

  const handleNodePointerDown = (e: React.PointerEvent<SVGGElement>, node: SimNode) => {
    e.stopPropagation();
    e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
    node.fx = node.x;
    node.fy = node.y;
    simRef.current?.alphaTarget(0.25).restart();
    dragRef.current = {
      type: 'node',
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      origTx: node.x,
      origTy: node.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - svgRect.left, y: e.clientY - svgRect.top });

    const st = dragRef.current;
    if (!st.type) return;

    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (Math.hypot(dx, dy) > 3) st.moved = true;

    if (st.type === 'pan') {
      setTransform((prev) => ({
        ...prev,
        x: st.origTx + dx,
        y: st.origTy + dy,
      }));
    } else if (st.type === 'node' && st.nodeId) {
      const targetNode = simNodes.find((n) => n.id === st.nodeId);
      if (targetNode) {
        targetNode.fx = st.origTx + dx / transform.k;
        targetNode.fy = st.origTy + dy / transform.k;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const st = dragRef.current;
    if (!st.type) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if not captured
    }

    if (st.type === 'node' && st.nodeId) {
      simRef.current?.alphaTarget(0);
      if (!st.moved) {
        const clicked = simNodes.find((n) => n.id === st.nodeId);
        if (clicked) {
          onSelectNode(clicked.raw);
        }
      }
    } else if (st.type === 'pan' && !st.moved) {
      onSelectNode(null);
    }

    dragRef.current = { type: null, startX: 0, startY: 0, origTx: 0, origTy: 0, moved: false };
  };

  const handleNodeDoubleClick = (e: React.MouseEvent<SVGGElement>, node: SimNode) => {
    e.stopPropagation();
    node.fx = null;
    node.fy = null;
    simRef.current?.alpha(0.3).restart();
  };

  const zoomBy = (factor: number) => {
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    setTransform((prev) => {
      const nextK = Math.min(3.2, Math.max(0.35, prev.k * factor));
      const ratio = nextK / prev.k;
      return {
        k: nextK,
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
      };
    });
  };

  const resetView = () => {
    setTransform({ x: 0, y: 0, k: 1 });
  };

  const resetLayout = () => {
    setTransform({ x: 0, y: 0, k: 1 });
    setLayoutNonce((n) => n + 1);
  };

  return (
    <div
      ref={containerRef}
      className="liquid-glass relative w-full overflow-hidden rounded-3xl"
      style={{ height }}
    >
      {/* Subtle coordinate dots */}
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.14) 1px, transparent 0)',
          backgroundSize: '26px 26px',
        }}
      />

      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="block h-full w-full cursor-grab active:cursor-grabbing select-none"
        onWheel={handleWheel}
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {simLinks.map((link, idx) => {
            const s = typeof link.source === 'string' ? null : link.source;
            const t = typeof link.target === 'string' ? null : link.target;
            if (!s || !t) return null;

            const isHighlighted =
              !activeFocusId || s.id === activeFocusId || t.id === activeFocusId;
            const isDG = link.raw.edge_type === 'disease_gene';

            return (
              <line
                key={`${s.id}-${t.id}-${idx}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={isDG ? '#6D5DFB' : '#0D9488'}
                strokeWidth={activeFocusId && isHighlighted ? 2.4 : isDG ? 1.5 : 1.9}
                strokeDasharray={isDG ? '5 4' : undefined}
                strokeOpacity={
                  activeFocusId ? (isHighlighted ? 0.92 : 0.12) : isDG ? 0.52 : 0.72
                }
              />
            );
          })}

          {simNodes.map((node) => {
            const isDisease = node.raw.node_type === 'disease';
            const isSelected = selectedNodeId === node.id || searchHighlightId === node.id;
            const isNeighbor = !activeFocusId || neighborSet.has(node.id);
            const isMultiDiseaseGene = !isDisease && node.raw.associated_diseases.length > 1;
            const radius = isDisease
              ? 18
              : Math.min(17, Math.max(9.5, 8.5 + node.raw.degree * 1.15));

            const catColors =
              (node.raw.category && CATEGORY_COLORS[node.raw.category]) || {
                fill: '#6D5DFB',
                stroke: '#FFFFFF',
              };

            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                className="cursor-pointer"
                style={{ opacity: isNeighbor ? 1 : 0.2, transition: 'opacity 160ms ease' }}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
                onPointerEnter={() => setHoveredNodeId(node.id)}
                onPointerLeave={() => setHoveredNodeId(null)}
                onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
              >
                {isSelected && (
                  <circle
                    r={radius + 7}
                    fill="rgba(109, 93, 251, 0.16)"
                    stroke="#6D5DFB"
                    strokeWidth={2}
                  />
                )}

                {isDisease ? (
                  <polygon
                    points={`0,${-radius} ${radius},0 0,${radius} ${-radius},0`}
                    fill={catColors.fill}
                    stroke={catColors.stroke}
                    strokeWidth={2}
                  />
                ) : (
                  <circle
                    r={radius}
                    fill={isMultiDiseaseGene ? '#F59E0B' : '#2DD4BF'}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                )}

                <text
                  y={radius + 14}
                  textAnchor="middle"
                  className="pointer-events-none select-none fill-slate-900 font-mono text-[10.5px] font-semibold"
                  style={{
                    paintOrder: 'stroke',
                    stroke: 'rgba(255, 255, 255, 0.92)',
                    strokeWidth: 3.4,
                    strokeLinejoin: 'round',
                  }}
                >
                  {node.raw.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Top-Right Liquid Glass Controls */}
      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-white/85 bg-white/75 p-1 shadow-md backdrop-blur-xl">
        <button
          type="button"
          onClick={() => zoomBy(1.2)}
          title="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-white hover:text-violet-600"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(0.83)}
          title="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-white hover:text-violet-600"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          title="Center view"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-white hover:text-violet-600"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={resetLayout}
          title="Re-run force layout"
          className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-white hover:text-violet-600 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Layout
        </button>
      </div>

      {/* Bottom-Left Frosted Legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-full border border-white/85 bg-white/75 px-4 py-2 text-[11px] font-medium text-slate-800 shadow-md backdrop-blur-xl">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rotate-45 border border-white bg-violet-600 shadow-xs" />
          Disease
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-white bg-teal-400 shadow-xs" />
          Gene
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-white bg-amber-500 shadow-xs" />
          Bridge Gene
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-violet-500" />
          Disease–Gene
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-teal-600" />
          Gene–Gene
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 hidden rounded-full border border-white/85 bg-white/75 px-3.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur-xl sm:block">
        Click node to inspect · Drag to pin · Double-click to release
      </div>

      {/* Frosted Liquid Glass Tooltip */}
      {hoveredNode && (
        <div
          className="pointer-events-none absolute z-20 w-64 rounded-2xl border border-white/90 bg-white/88 p-3.5 shadow-xl backdrop-blur-2xl"
          style={{
            left: Math.min(dimensions.width - 270, Math.max(12, tooltipPos.x + 14)),
            top: Math.min(dimensions.height - 140, Math.max(12, tooltipPos.y + 14)),
          }}
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-mono font-semibold text-violet-700">
              {hoveredNode.raw.node_type === 'disease' ? 'Disease' : 'Gene'}
            </span>
            <span className="font-mono text-slate-500">
              {hoveredNode.raw.gene_id ? `NCBI:${hoveredNode.raw.gene_id}` : hoveredNode.raw.id}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-900">{hoveredNode.raw.label}</p>
          {hoveredNode.raw.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
              {hoveredNode.raw.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 border-t border-slate-900/10 pt-2 font-mono text-[11px] tabular-nums text-slate-700">
            <span>Degree: {hoveredNode.raw.degree}</span>
            <span aria-hidden="true">·</span>
            <span>Centrality: {hoveredNode.raw.degree_centrality.toFixed(3)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
