// Trazabilidad CA → test (plan T-36, architecture §6, spec 6.10).
// Compara los CA de la spec con los que citan los tests y falla si:
//   a) un CA de la spec no tiene test y no está marcado como manual,
//   b) un test cita un CA que no existe en la spec,
//   c) un CA marcado como manual sí tiene test (habría que desmarcarlo).
// Uso: `npm run check:ca` (comprobación) o `npm run check:ca -- --matrix` (tabla markdown).
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SPEC = join(ROOT, 'ai-workspace', '01-specs', 'spec.md');
const TEST_ROOTS = ['backend', 'frontend'];
const TEST_FILE = /\.test\.tsx?$/;

// CA sin test automático, verificados a mano (ai-workspace/06-trazabilidad.md).
const MANUAL = new Set(['CA-91']);

type Coverage = Map<string, string[]>;

/** IDs de las filas `| CA-XX |` de las tablas de la spec (sección 6). */
function readSpecIds(): string[] {
  const ids = [...readFileSync(SPEC, 'utf8').matchAll(/^\| (CA-\d+) \|/gm)].map((m) => m[1]!);
  return [...new Set(ids)].sort((a, b) => caNumber(a) - caNumber(b));
}

function caNumber(id: string): number {
  return Number(id.slice('CA-'.length));
}

function listTestFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === 'dist') return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listTestFiles(path);
    return TEST_FILE.test(entry.name) ? [path] : [];
  });
}

/** Quita comentarios de bloque y de línea, para no contar CA que solo se mencionan en ellos. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

/** CA → archivos de test (rutas relativas a la raíz) que lo citan en el código. */
function readTestCoverage(): Coverage {
  const coverage: Coverage = new Map();
  const files = TEST_ROOTS.flatMap((dir) => listTestFiles(join(ROOT, dir))).sort();
  for (const file of files) {
    const code = stripComments(readFileSync(file, 'utf8'));
    const rel = relative(ROOT, file).split(sep).join('/');
    for (const id of new Set([...code.matchAll(/\bCA-\d+\b/g)].map((m) => m[0]))) {
      coverage.set(id, [...(coverage.get(id) ?? []), rel]);
    }
  }
  return coverage;
}

function findProblems(specIds: string[], coverage: Coverage): string[] {
  const spec = new Set(specIds);
  const problems: string[] = [];
  for (const id of specIds) {
    if (!coverage.has(id) && !MANUAL.has(id)) problems.push(`${id}: sin test ni marca de manual`);
  }
  for (const [id, files] of coverage) {
    if (!spec.has(id)) problems.push(`${id}: no existe en la spec (${files.join(', ')})`);
  }
  for (const id of MANUAL) {
    if (!spec.has(id)) problems.push(`${id}: marcado como manual pero no existe en la spec`);
    if (coverage.has(id)) problems.push(`${id}: marcado como manual pero tiene test`);
  }
  return problems;
}

function printMatrix(specIds: string[], coverage: Coverage): void {
  console.log('| CA | Tests |\n|---|---|');
  for (const id of specIds) {
    const files = coverage.get(id);
    const cell = files ? files.map((f) => `\`${f}\``).join('<br>') : '**Manual**';
    console.log(`| ${id} | ${cell} |`);
  }
}

const specIds = readSpecIds();
const coverage = readTestCoverage();

if (process.argv.includes('--matrix')) {
  printMatrix(specIds, coverage);
} else {
  const problems = findProblems(specIds, coverage);
  if (problems.length > 0) {
    console.error(`check-ca: ${problems.length} problema(s)\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  const automated = specIds.filter((id) => coverage.has(id)).length;
  console.log(
    `check-ca: ${specIds.length} CA en la spec; ${automated} con test y ${specIds.length - automated} manual(es) (${[...MANUAL].join(', ')}).`,
  );
}
