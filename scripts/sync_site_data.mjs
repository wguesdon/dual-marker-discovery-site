// Project the science repo's committed tables into one JSON file the site renders from.
//
// WHY THIS EXISTS. Every number on this site must be bound to a table in
// dual-marker-discovery/results/tables/, exactly as every number in the report is. The results are
// still being revised, and prose with hand-copied figures goes stale silently: the page keeps
// rendering, it is just wrong. So no page may hardcode a figure. They import src/data/site_data.json,
// this script writes it, and a report revision propagates on the next build.
//
// It FAILS LOUDLY. If an expected table or column disappears, this throws rather than emitting a
// null. A site that renders "—" everywhere looks like a styling bug and would ship unnoticed; a build
// that stops does not.
//
// Usage:
//   npm run sync-data                                  # reads ../dual-marker-discovery
//   SCIENCE=/path/to/repo npm run sync-data
//
// The output IS committed, so the site builds anywhere (Netlify included) without the science repo.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '..');
const SCIENCE = process.env.SCIENCE || join(SITE, '..', 'dual-marker-discovery');
const TABLES = join(SCIENCE, 'results', 'tables');
const OUT = join(SITE, 'src', 'data', 'site_data.json');

/** Parse CSV text into row objects, honouring quoted fields that contain commas. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter((r) => r.some((v) => v !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

function table(name) {
  const path = join(TABLES, name);
  if (!existsSync(path)) throw new Error(`missing table: ${path}. Has the science repo renamed it?`);
  const rows = parseCsv(readFileSync(path, 'utf8'));
  if (!rows.length) throw new Error(`empty table: ${path}`);
  return rows;
}

/** Read one column, insisting it exists. A silent undefined here becomes a blank on the live site. */
function col(row, key, where) {
  if (!(key in row)) {
    throw new Error(`column "${key}" not found in ${where}. Columns present: ${Object.keys(row).join(', ')}`);
  }
  return row[key];
}

const num = (row, key, where) => {
  const raw = col(row, key, where);
  if (raw === '' || raw === 'nan') return null;
  const v = Number(raw);
  if (Number.isNaN(v)) throw new Error(`column "${key}" in ${where} is not numeric: ${JSON.stringify(raw)}`);
  return v;
};
const int = (row, key, where) => {
  const v = num(row, key, where);
  return v === null ? null : Math.round(v);
};
const str = (row, key, where) => col(row, key, where);

// --- the tables ---
const summary = table('analysis_summary.csv')[0];
const manifest = table('data_manifest.csv');
const recovery = table('psma_psca_recovery.csv');
const nomination = table('nomination.csv')[0];
const negative = table('negative_control.csv');
const frontier = table('surface_frontier.csv');
const protein = table('protein_evidence.csv');

// --- study scale ---
const study = {
  n_malignant_cells: int(summary, 'n_malignant_cells', 'analysis_summary.csv'),
  n_benign_cells: int(summary, 'n_benign_cells', 'analysis_summary.csv'),
  n_healthy_cells: int(summary, 'n_healthy_cells', 'analysis_summary.csv'),
  n_patients_scored: int(summary, 'n_patients_scored', 'analysis_summary.csv'),
  n_benign_patients: int(summary, 'n_benign_patients', 'analysis_summary.csv'),
  n_healthy_populations: int(summary, 'n_healthy_populations', 'analysis_summary.csv'),
  n_healthy_celltypes: int(summary, 'n_healthy_celltypes', 'analysis_summary.csv'),
  n_healthy_tissues: int(summary, 'n_healthy_tissues', 'analysis_summary.csv'),
  n_panel_genes_scanned: int(summary, 'n_panel_genes_scanned', 'analysis_summary.csv'),
  k_threshold: int(summary, 'k_threshold', 'analysis_summary.csv'),
};

const datasets = manifest.map((r) => ({
  dataset: str(r, 'dataset', 'data_manifest.csv'),
  n_cells: int(r, 'n_cells', 'data_manifest.csv'),
  n_donors: int(r, 'n_donors', 'data_manifest.csv'),
  panel_genes_found: int(r, 'panel_genes_found', 'data_manifest.csv'),
}));

// --- the positive control: each antigen alone, then the AND gate ---
const control = recovery.map((r) => ({
  entity: str(r, 'entity', 'psma_psca_recovery.csv'),
  kind: str(r, 'kind', 'psma_psca_recovery.csv'),
  tumor_median: num(r, 'tumor_median', 'psma_psca_recovery.csv'),
  tumor_q10: num(r, 'tumor_q10', 'psma_psca_recovery.csv'),
  worst_healthy_xprostate: num(r, 'worst_healthy_xprostate', 'psma_psca_recovery.csv'),
  worst_xp_celltype: str(r, 'worst_xp_celltype', 'psma_psca_recovery.csv'),
}));

// --- the negative control: is the AND gate's gain better than a random surface pair? ---
const negSummary = negative.find((r) => r.row === 'summary');
if (!negSummary) throw new Error('negative_control.csv has no row where row=summary');
const negative_control = {
  frac_random_pairs_worse: num(negSummary, 'frac_random_pairs_worse_than_psma_psca', 'negative_control.csv'),
  n_random_pairs: int(negSummary, 'n_random_pairs', 'negative_control.csv'),
  and_gate_xprostate_reduction: num(negSummary, 'and_gate_xprostate_reduction', 'negative_control.csv'),
};

// --- the nominated pair ---
const nominated = {
  pair: str(nomination, 'nominated_pair', 'nomination.csv'),
  gate: str(nomination, 'gate', 'nomination.csv'),
  tumor_median: num(nomination, 'tumor_median', 'nomination.csv'),
  tumor_q10: num(nomination, 'tumor_q10', 'nomination.csv'),
  benign_prostate_median: num(nomination, 'benign_prostate_median', 'nomination.csv'),
  malignant_vs_benign: num(nomination, 'malignant_vs_benign', 'nomination.csv'),
  worst_healthy_xprostate: num(nomination, 'worst_healthy_xprostate', 'nomination.csv'),
  worst_xp_celltype: str(nomination, 'worst_xp_celltype', 'nomination.csv'),
  single_a_worst_xp: num(nomination, 'single_a_worst_xp', 'nomination.csv'),
  single_b_worst_xp: num(nomination, 'single_b_worst_xp', 'nomination.csv'),
  coverage_fold_vs_psma_psca: num(nomination, 'coverage_fold_vs_psma_psca', 'nomination.csv'),
  on_surface_frontier: str(nomination, 'on_surface_frontier', 'nomination.csv') === 'True',
};

// --- the surface-accessible frontier. SCOPE MATTERS: these are the pairs where BOTH markers have
// surface evidence, ranked within that set. A pair that leads here does NOT lead across all pairs,
// and the site must never say otherwise. ---
const surface_frontier = frontier
  .filter((r) => str(r, 'on_frontier', 'surface_frontier.csv') === 'True')
  .map((r) => ({
    marker_a: str(r, 'marker_a', 'surface_frontier.csv'),
    marker_b: str(r, 'marker_b', 'surface_frontier.csv'),
    gate: str(r, 'gate', 'surface_frontier.csv'),
    tumor_median: num(r, 'tumor_median', 'surface_frontier.csv'),
    tumor_q10: num(r, 'tumor_q10', 'surface_frontier.csv'),
    worst_healthy_xprostate: num(r, 'worst_healthy_xprostate', 'surface_frontier.csv'),
    worst_xp_tissue: str(r, 'worst_xp_tissue', 'surface_frontier.csv'),
    worst_xp_celltype: str(r, 'worst_xp_celltype', 'surface_frontier.csv'),
    malignant_vs_benign: num(r, 'malignant_vs_benign', 'surface_frontier.csv'),
  }))
  .sort((a, b) => b.tumor_median - a.tumor_median);

// --- protein-level evidence for the markers the site names ---
const named = new Set(
  [...surface_frontier.flatMap((p) => [p.marker_a, p.marker_b]), 'FOLH1', 'PSCA', 'STEAP1']
);
const evidence = protein
  .filter((r) => named.has(str(r, 'gene', 'protein_evidence.csv')))
  .map((r) => ({
    gene: str(r, 'gene', 'protein_evidence.csv'),
    compartment: str(r, 'compartment_curated', 'protein_evidence.csv'),
    plasma_membrane: str(r, 'hpa_plasma_membrane', 'protein_evidence.csv') === 'True',
    hpa_max_tissue: str(r, 'hpa_max_tissue', 'protein_evidence.csv'),
    hpa_max_ntpm: num(r, 'hpa_max_ntpm', 'protein_evidence.csv'),
    hpa_prostate_ntpm: num(r, 'hpa_prostate_ntpm', 'protein_evidence.csv'),
  }));

const out = {
  // Provenance, so a reader can tell how stale the page is without asking anyone.
  generated_from: 'dual-marker-discovery/results/tables',
  study,
  datasets,
  control,
  negative_control,
  nominated,
  surface_frontier,
  evidence,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

console.log(`wrote ${OUT}`);
console.log(`  ${study.n_patients_scored} patients, ${study.n_panel_genes_scanned} panel genes`);
console.log(`  nominated: ${nominated.pair} (${nominated.gate})`);
console.log(`  surface frontier: ${surface_frontier.length} pairs`);
console.log(`  protein evidence: ${evidence.length} markers`);
