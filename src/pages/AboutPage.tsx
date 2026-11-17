import { BookOpen, Code2, FileText, ShieldAlert } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Methodology & Project Scope
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Aligned with the experiential learning proposal: Bioinformatics-Based Disease Gene Network
          Visualization.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="liquid-glass min-w-0 rounded-3xl p-6">
          <div className="flex items-center gap-2 text-violet-700">
            <BookOpen className="h-4 w-4" />
            <h2 className="text-base font-bold text-slate-900">Rationale & Objectives</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            Complex human diseases involve coordinated interactions across multiple genes and
            signaling pathways rather than isolated single-gene effects. This system transforms
            curated disease–gene association records and documented gene–gene interactions into a
            computational network for visual exploration and quantitative graph analysis.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-xs leading-relaxed text-slate-700">
            <li>Collect and standardize publicly documented disease–gene association datasets.</li>
            <li>Clean, deduplicate, and validate tabular records via Python & Pandas workflows.</li>
            <li>Represent diseases, genes, and verified relationships as distinct nodes and edges.</li>
            <li>Calculate degree, centrality, density, and connected components with NetworkX.</li>
            <li>Identify highly connected nodes for further study without clinical biomarker claims.</li>
          </ul>
        </section>

        <section className="liquid-glass-aqua min-w-0 rounded-3xl p-6">
          <div className="flex items-center gap-2 text-teal-800">
            <FileText className="h-4 w-4" />
            <h2 className="text-base font-bold text-slate-900">
              Methodology & Data Provenance
            </h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-800">
            Five well-characterized diseases (Breast Carcinoma, Type 2 Diabetes Mellitus,
            Alzheimer&apos;s Disease, Coronary Artery Disease, and Parkinson&apos;s Disease) and 40
            associated human genes are curated from public bioinformatics registries with live NCBI
            E-utilities verification.
          </p>
          <div className="mt-4 space-y-2.5 text-xs text-slate-700">
            <div>
              <strong className="text-violet-800">1. NCBI Gene (RefSeq / Entrez):</strong> Official
              HGNC symbols, Entrez Gene IDs, cytogenetic bands, OMIM links, and summaries.
            </div>
            <div>
              <strong className="text-indigo-800">2. DisGeNET & OMIM Literature:</strong> Curated
              disease–gene associations with DOID/UMLS identifiers and supporting PubMed IDs.
            </div>
            <div>
              <strong className="text-teal-800">3. BioGRID, KEGG & Reactome:</strong> Documented
              physical protein complexes and signaling pathways kept strictly separate from
              disease–gene edges.
            </div>
          </div>
        </section>
      </div>

      <section className="liquid-glass-aurora rounded-3xl p-6">
        <div className="flex items-center gap-2 text-amber-800">
          <ShieldAlert className="h-4 w-4" />
          <h2 className="text-base font-bold text-slate-900">
            Ethical Considerations & Source Limitations
          </h2>
        </div>
        <div className="mt-3 grid gap-4 text-xs leading-relaxed text-slate-700 md:grid-cols-3">
          <div className="rounded-2xl bg-white/60 p-4">
            <div className="font-bold text-slate-900">Non-Identifying Public Data</div>
            <p className="mt-1 text-slate-700">
              No personal medical records or patient-level clinical data are collected or processed.
              All identifiers map exclusively to public gene and disease ontologies.
            </p>
          </div>
          <div className="rounded-2xl bg-white/60 p-4">
            <div className="font-bold text-slate-900">Not a Diagnostic System</div>
            <p className="mt-1 text-slate-700">
              Outputs represent computational and educational exploration. High node degree or
              centrality must not be interpreted as causal proof or as a clinical biomarker.
            </p>
          </div>
          <div className="rounded-2xl bg-white/60 p-4">
            <div className="font-bold text-slate-900">Literature & Panel Coverage Bias</div>
            <p className="mt-1 text-slate-700">
              Well-studied genes (such as TP53, APOE, and AKT1) accumulate denser citations in
              public databases, which directly influences topological centrality scores.
            </p>
          </div>
        </div>
      </section>

      <section className="liquid-glass rounded-3xl p-6">
        <div className="flex items-center gap-2 text-violet-700">
          <Code2 className="h-4 w-4" />
          <h2 className="text-base font-bold text-slate-900">
            Architecture & Local Execution Commands
          </h2>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          The repository includes both the interactive React/TypeScript/Plotly web client and the
          Python FastAPI + Pandas + NetworkX backend module (`backend/main.py`).
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-white/85 bg-white/65 p-4">
            <div className="text-xs font-bold text-slate-900">
              1. Python FastAPI + Pandas + NetworkX Backend
            </div>
            <pre className="mt-2 max-w-full overflow-x-auto font-mono text-[11px] leading-relaxed text-violet-800">
{`python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000`}
            </pre>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/85 bg-white/65 p-4">
            <div className="text-xs font-bold text-slate-900">
              2. Frontend + Proxy Server (Port 3000)
            </div>
            <pre className="mt-2 max-w-full overflow-x-auto font-mono text-[11px] leading-relaxed text-teal-800">
{`npm install
PYTHON_API_URL=http://127.0.0.1:8000 npm run dev
# Or standalone Node/TypeScript biological engine:
npm run dev`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
