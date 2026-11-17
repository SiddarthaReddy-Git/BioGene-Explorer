import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { BioGraphEngine, type EdgeMode } from './bioEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveDataDir(): string {
  const candidates = [
    path.join(process.cwd(), 'data'),
    path.resolve(__dirname, '../data'),
    path.resolve(__dirname, '../../data'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'ncbi_genes.json'))) {
      return dir;
    }
  }
  return candidates[0];
}

const PYTHON_API_URL = process.env.PYTHON_API_URL?.replace(/\/$/, '') || '';
const engine = new BioGraphEngine(resolveDataDir());

async function proxyToPythonIfConfigured(
  req: express.Request,
  res: express.Response,
): Promise<boolean> {
  if (!PYTHON_API_URL) return false;
  try {
    const targetUrl = `${PYTHON_API_URL}${req.originalUrl}`;
    const upstream = await fetch(targetUrl);
    const contentType = upstream.headers.get('content-type') || 'application/json';
    res.status(upstream.status).setHeader('content-type', contentType);
    const disp = upstream.headers.get('content-disposition');
    if (disp) res.setHeader('content-disposition', disp);
    const body = await upstream.text();
    res.send(body);
    return true;
  } catch {
    return false;
  }
}

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json());

  app.get('/api/health', async (req, res) => {
    if (await proxyToPythonIfConfigured(req, res)) return;
    res.json({
      status: 'ok',
      engine: 'node-express-biograph',
      genes_loaded: Object.keys(engine.ncbiGenes).length,
      disease_gene_rows: engine.associations.length,
      gene_gene_rows: engine.interactions.length,
    });
  });

  app.get('/api/diseases', async (req, res) => {
    if (await proxyToPythonIfConfigured(req, res)) return;
    res.json(engine.listDiseases());
  });

  app.get('/api/genes', async (req, res) => {
    if (await proxyToPythonIfConfigured(req, res)) return;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    res.json(engine.listGenes(q));
  });

  app.get('/api/genes/:geneId', async (req, res) => {
    if (await proxyToPythonIfConfigured(req, res)) return;
    const payload = engine.getGeneDetails(req.params.geneId);
    if (!payload) {
      res.status(404).json({ detail: `Gene ${req.params.geneId} not found in curated registry` });
      return;
    }
    res.json(payload);
  });

  app.get('/api/network', async (req, res) => {
    if (await proxyToPythonIfConfigured(req, res)) return;
    const diseaseId = typeof req.query.disease_id === 'string' ? req.query.disease_id : undefined;
    const rawMode = typeof req.query.edge_mode === 'string' ? req.query.edge_mode : 'all';
    const edgeMode: EdgeMode =
      rawMode === 'disease_gene' || rawMode === 'gene_gene' ? rawMode : 'all';
    const minDegree = Math.max(0, Number.parseInt(String(req.query.min_degree ?? '0'), 10) || 0);
    res.json(engine.getNetworkPayload(diseaseId, edgeMode, minDegree));
  });

  app.get('/api/analysis', async (req, res) => {
    if (await proxyToPythonIfConfigured(req, res)) return;
    const diseaseId = typeof req.query.disease_id === 'string' ? req.query.disease_id : undefined;
    const rawMode = typeof req.query.edge_mode === 'string' ? req.query.edge_mode : 'all';
    const edgeMode: EdgeMode =
      rawMode === 'disease_gene' || rawMode === 'gene_gene' ? rawMode : 'all';
    const minDegree = Math.max(0, Number.parseInt(String(req.query.min_degree ?? '0'), 10) || 0);
    res.json(engine.analyze(diseaseId, edgeMode, minDegree));
  });

  app.get('/api/dataset', async (req, res) => {
    if (await proxyToPythonIfConfigured(req, res)) return;
    const kind = req.query.kind === 'interactions' ? 'interactions' : 'associations';
    const diseaseId = typeof req.query.disease_id === 'string' ? req.query.disease_id : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    res.json(engine.getDataset(kind, diseaseId, q));
  });

  app.get('/api/export/csv', async (req, res) => {
    if (await proxyToPythonIfConfigured(req, res)) return;
    const kind = req.query.kind === 'interactions' ? 'interactions' : 'associations';
    const diseaseId = typeof req.query.disease_id === 'string' ? req.query.disease_id : undefined;
    const csv = engine.exportCsv(kind, diseaseId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="biogene_${kind}.csv"`);
    res.send(csv);
  });

  app.get('/api/ncbi/gene/:geneId', async (req, res) => {
    if (await proxyToPythonIfConfigured(req, res)) return;
    const { geneId } = req.params;
    try {
      const resp = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id=${encodeURIComponent(geneId)}&retmode=json`,
      );
      if (!resp.ok) {
        res.status(resp.status).json({ detail: 'NCBI E-utilities returned an error' });
        return;
      }
      const json = (await resp.json()) as { result?: Record<string, Record<string, unknown>> };
      const record = json.result?.[geneId];
      if (!record) {
        res.status(404).json({ detail: 'Gene not found at NCBI E-utilities' });
        return;
      }
      res.json({
        gene_id: geneId,
        symbol: record.name,
        description: record.description,
        chromosome: record.chromosome,
        map_location: record.maplocation,
        aliases: record.otheraliases,
        mim: record.mim ?? [],
        summary: record.summary,
        source: 'NCBI E-utilities Live',
      });
    } catch {
      const local = engine.ncbiGenes[geneId];
      if (local) {
        res.json({ ...local, source: 'Curated NCBI Snapshot (Offline Fallback)' });
      } else {
        res.status(502).json({ detail: 'Unable to reach NCBI E-utilities' });
      }
    }
  });

  return app;
}
