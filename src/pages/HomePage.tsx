import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  Database,
  Dna,
  GitFork,
  Microscope,
  Network,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { bioClient } from '../api/bioClient';
import type { NetworkAnalysisResponse, PageId } from '../types/bio';

interface HomePageProps {
  onNavigate: (page: PageId) => void;
  onExploreDisease: (diseaseId: string) => void;
}

const DISEASE_ACCENTS: Record<string, string> = {
  DIS_BRCA: 'bg-pink-500/15 text-pink-800 border-pink-400/40 hover:bg-pink-500/25',
  DIS_T2DM: 'bg-emerald-500/15 text-emerald-800 border-emerald-400/40 hover:bg-emerald-500/25',
  DIS_ALZ: 'bg-violet-500/15 text-violet-800 border-violet-400/40 hover:bg-violet-500/25',
  DIS_CAD: 'bg-sky-500/15 text-sky-800 border-sky-400/40 hover:bg-sky-500/25',
  DIS_PD: 'bg-amber-500/15 text-amber-800 border-amber-400/40 hover:bg-amber-500/25',
};

export function HomePage({ onNavigate, onExploreDisease }: HomePageProps) {
  const [analysis, setAnalysis] = useState<NetworkAnalysisResponse | null>(null);

  useEffect(() => {
    let active = true;
    bioClient
      .getAnalysis({ edgeMode: 'all' })
      .then((res) => {
        if (active) setAnalysis(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const summary = analysis?.summary;

  return (
    <div className="space-y-8 pb-8">
      {/* Liquid Glass Hero */}
      <section className="liquid-glass relative overflow-hidden rounded-3xl px-6 py-10 sm:px-10 sm:py-12">
        <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7"
          >
            <div className="text-xs font-semibold tracking-wide text-violet-700">
              Computational Biology · Disease–Gene Network Analysis
            </div>
            <h1 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-slate-900 text-balance sm:text-4xl lg:text-[42px] lg:leading-[1.14]">
              Bioinformatics-Based Disease Gene Network Visualization
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-700">
              Explore how human genes connect across major diseases using verified NCBI, OMIM,
              DisGeNET, and BioGRID/KEGG records. Drag nodes, inspect gene dossiers, and calculate
              graph topology metrics in just a few clicks.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => onNavigate('network')}
                className="liquid-btn-violet inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold whitespace-nowrap shrink-0"
              >
                Explore Interactive Network
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('diseases')}
                className="liquid-btn-teal inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold whitespace-nowrap shrink-0"
              >
                Browse Diseases
              </button>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/75 px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-white whitespace-nowrap shrink-0"
              >
                Live Dashboard
              </button>
            </div>
          </motion.div>

          {/* Iridescent Aqua-Lavender Snapshot Panel */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="liquid-glass-aqua rounded-3xl p-6 lg:col-span-5"
          >
            <div className="flex items-center justify-between border-b border-slate-900/10 pb-3">
              <span className="text-xs font-bold text-slate-900">Live Dataset Overview</span>
              <span className="font-mono text-[11px] font-semibold text-teal-800">
                NCBI · DisGeNET · KEGG
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3.5">
              <div className="rounded-2xl bg-white/65 p-3.5">
                <div className="text-xs font-medium text-slate-600">Curated Genes</div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-violet-700">
                  {summary ? summary.total_genes : '—'}
                </div>
              </div>
              <div className="rounded-2xl bg-white/65 p-3.5">
                <div className="text-xs font-medium text-slate-600">Disease Panels</div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-teal-700">
                  {summary ? summary.total_diseases : '—'}
                </div>
              </div>
              <div className="rounded-2xl bg-white/65 p-3.5">
                <div className="text-xs font-medium text-slate-600">Disease–Gene Links</div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums text-indigo-700">
                  {summary ? summary.disease_gene_edges : '—'}
                </div>
              </div>
              <div className="rounded-2xl bg-white/65 p-3.5">
                <div className="text-xs font-medium text-slate-600">Gene–Gene Links</div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-700">
                  {summary ? summary.gene_gene_edges : '—'}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-900/10 pt-3.5">
              <div className="text-xs font-semibold text-slate-800">
                Jump directly into a disease network:
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {analysis?.disease_breakdown.map((d) => (
                  <button
                    key={d.disease_id}
                    type="button"
                    onClick={() => onExploreDisease(d.disease_id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                      DISEASE_ACCENTS[d.disease_id] ||
                      'border-white/80 bg-white/75 text-slate-800 hover:bg-white'
                    }`}
                  >
                    <Plus className="h-3 w-3" />
                    {d.disease_name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Easy 4-Way Quick Start Guide */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigate('diseases')}
          className="liquid-glass-hover rounded-2xl p-5 text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500 text-white shadow-md shadow-pink-500/25">
            <Microscope className="h-5 w-5" />
          </div>
          <h2 className="mt-3.5 text-base font-bold text-slate-900">1. Pick a Disease</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Browse Breast Cancer, Diabetes, Alzheimer&apos;s, Heart Disease, or Parkinson&apos;s and
            view their genes.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('network')}
          className="liquid-glass-hover rounded-2xl p-5 text-left"
        >
          <div className="liquid-btn-teal flex h-10 w-10 items-center justify-center rounded-full">
            <Network className="h-5 w-5" />
          </div>
          <h2 className="mt-3.5 text-base font-bold text-slate-900">2. Explore the Graph</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Drag nodes, filter interactions, and click any gene to inspect its neighborhood.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('gene-details')}
          className="liquid-glass-hover rounded-2xl p-5 text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow-md shadow-sky-500/25">
            <Dna className="h-5 w-5" />
          </div>
          <h2 className="mt-3.5 text-base font-bold text-slate-900">3. Inspect Any Gene</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Read official NCBI RefSeq summaries, verify live data, and explore gene partners.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('analysis')}
          className="liquid-glass-hover rounded-2xl p-5 text-left"
        >
          <div className="liquid-btn-violet flex h-10 w-10 items-center justify-center rounded-full">
            <Activity className="h-5 w-5" />
          </div>
          <h2 className="mt-3.5 text-base font-bold text-slate-900">4. Analyze Topology</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Compare degree centrality, connected components, and hub genes across layers.
          </p>
        </button>
      </section>

      {/* Pipeline & Ethics Strip */}
      <section className="grid gap-5 lg:grid-cols-12">
        <div className="liquid-glass rounded-3xl p-6 lg:col-span-7">
          <div className="flex items-center gap-2 text-violet-700">
            <Database className="h-4 w-4" />
            <h2 className="text-base font-bold text-slate-900">How the Data Is Structured</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/60 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-violet-700">
                <GitFork className="h-3.5 w-3.5" />
                Disease–Gene Associations
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                Bipartite links between curated diseases and susceptibility or driver genes sourced
                from DisGeNET, OMIM, and ClinVar literature.
              </p>
            </div>
            <div className="rounded-2xl bg-white/60 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-700">
                <Network className="h-3.5 w-3.5" />
                Gene–Gene Interactions
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                Documented physical protein complexes and signaling pathways from BioGRID, KEGG, and
                Reactome—kept separate from disease links.
              </p>
            </div>
          </div>
        </div>

        <div className="liquid-glass-aurora rounded-3xl p-6 lg:col-span-5">
          <div className="flex items-center gap-2 text-amber-800">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <h2 className="text-sm font-bold text-slate-900">Educational & Ethical Scope</h2>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-700">
            BioGene Explorer uses non-identifying public biological datasets for bioinformatics
            learning and computational graph exploration. It is not a medical diagnosis or disease
            prediction system, and highly connected hub genes should not be treated as clinical
            biomarkers.
          </p>
        </div>
      </section>
    </div>
  );
}
