import { useEffect, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { bioClient } from '../../api/bioClient';
import type { GeneDetailsResponse, NetworkNode } from '../../types/bio';

interface GeneSidePanelProps {
  selectedNode: NetworkNode | null;
  onClose: () => void;
  onOpenGeneDetails: (geneId: string) => void;
  onFilterByDisease: (diseaseId: string) => void;
}

export function GeneSidePanel({
  selectedNode,
  onClose,
  onOpenGeneDetails,
  onFilterByDisease,
}: GeneSidePanelProps) {
  const [details, setDetails] = useState<GeneDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedNode || selectedNode.node_type !== 'gene' || !selectedNode.gene_id) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    bioClient
      .getGeneDetails(selectedNode.gene_id)
      .then((res) => {
        if (!cancelled) setDetails(res);
      })
      .catch(() => {
        if (!cancelled) setDetails(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedNode]);

  if (!selectedNode) return null;

  return (
    <aside className="liquid-glass-aurora flex h-full flex-col rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3 border-b border-slate-900/10 pb-4">
        <div>
          <div className="text-xs font-mono font-semibold text-violet-700">
            {selectedNode.node_type === 'disease'
              ? `Disease Node · ${selectedNode.id}`
              : `NCBI Gene ID · ${selectedNode.gene_id}`}
          </div>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{selectedNode.label}</h3>
          {selectedNode.description && (
            <p className="mt-0.5 text-xs text-slate-700">{selectedNode.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close node inspector"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/85 bg-white/75 text-slate-700 shadow-sm transition-colors hover:bg-white hover:text-slate-950"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Live local network topology metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-b border-slate-900/10 pb-4">
        <div className="rounded-2xl bg-white/55 p-3">
          <div className="text-[11px] font-medium text-slate-600">Degree</div>
          <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-slate-900">
            {selectedNode.degree}
          </div>
        </div>
        <div className="rounded-2xl bg-white/55 p-3">
          <div className="text-[11px] font-medium text-slate-600">Degree Centrality</div>
          <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-violet-700">
            {selectedNode.degree_centrality.toFixed(4)}
          </div>
        </div>
        <div className="rounded-2xl bg-white/55 p-3">
          <div className="text-[11px] font-medium text-slate-600">Betweenness</div>
          <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-indigo-700">
            {selectedNode.betweenness_centrality.toFixed(4)}
          </div>
        </div>
        <div className="rounded-2xl bg-white/55 p-3">
          <div className="text-[11px] font-medium text-slate-600">Clustering</div>
          <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-teal-700">
            {selectedNode.clustering_coefficient.toFixed(4)}
          </div>
        </div>
      </div>

      {selectedNode.node_type === 'disease' ? (
        <div className="mt-4 flex flex-1 flex-col justify-between gap-4">
          <div className="text-xs leading-relaxed text-slate-700">
            <p className="font-semibold text-slate-900">
              Category: {selectedNode.category || 'Disease'}
            </p>
            <p className="mt-2">
              Focus the graph on this disease to inspect its associated genes and internal gene–gene
              pathways.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onFilterByDisease(selectedNode.id)}
            className="liquid-btn-violet inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold whitespace-nowrap"
          >
            Focus on This Disease
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
          {loading ? (
            <p className="text-xs text-slate-700">Loading curated gene profile...</p>
          ) : details ? (
            <>
              <div className="text-xs text-slate-700">
                <div className="font-semibold text-slate-800">Genomic Context</div>
                <div className="mt-1 font-mono text-slate-900">
                  Chr {details.gene.chromosome} · {details.gene.map_location}
                  {details.gene.mim?.[0] ? ` · OMIM:${details.gene.mim[0]}` : ''}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Associated Diseases ({details.associations.length})
                </div>
                <ul className="mt-1.5 space-y-1.5">
                  {details.associations.map((assoc) => (
                    <li
                      key={`${assoc.disease_id}-${assoc.gene_id}`}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white/65 px-3 py-2 text-xs shadow-xs"
                    >
                      <span className="font-medium text-slate-900">{assoc.disease_name}</span>
                      <span className="font-mono font-semibold tabular-nums text-violet-700">
                        {assoc.score.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Documented Gene Partners ({details.interactions.length})
                </div>
                {details.interactions.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-600">
                    No direct gene–gene interactions recorded in this panel.
                  </p>
                ) : (
                  <ul className="mt-1.5 space-y-1.5">
                    {details.interactions.slice(0, 6).map((partner) => (
                      <li
                        key={partner.partner_gene_id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-white/65 px-3 py-2 text-xs shadow-xs"
                      >
                        <button
                          type="button"
                          onClick={() => onOpenGeneDetails(partner.partner_gene_id)}
                          className="font-mono font-semibold text-teal-700 hover:underline"
                        >
                          {partner.partner_symbol}
                        </button>
                        <span className="truncate text-[11px] text-slate-600">
                          {partner.evidence_source}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-800">RefSeq Summary</div>
                <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-slate-700">
                  {details.gene.summary}
                </p>
              </div>
            </>
          ) : null}

          {selectedNode.gene_id && (
            <button
              type="button"
              onClick={() => onOpenGeneDetails(selectedNode.gene_id!)}
              className="liquid-btn-teal mt-auto inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold whitespace-nowrap"
            >
              Open Full Gene Details
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
