// Comprueba las licencias según la constitución 1.0.2:
// - dependencias directas: MIT o Apache-2.0 (excepción: dotenv, BSD-2-Clause);
// - dependencias transitivas: MIT, MIT-0, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD,
//   CC0-1.0 o BlueOak-1.0.0 (excepciones: lightningcss y sus binarios, y caniuse-lite).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIRECT_ALLOWED = new Set(['MIT', 'Apache-2.0']);
const DIRECT_EXCEPTIONS = new Set(['dotenv']);
const TRANSITIVE_ALLOWED = new Set([
  'MIT',
  'MIT-0',
  'Apache-2.0',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'CC0-1.0',
  'BlueOak-1.0.0',
]);
// Transitivas del stack obligatorio sin sustituto, exceptuadas expresamente por la constitución.
const isTransitiveException = (name) =>
  name === 'lightningcss' || name.startsWith('lightningcss-') || name === 'caniuse-lite';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

function licenseOf(pkg) {
  const { license, licenses } = pkg;
  if (typeof license === 'string') return license;
  if (license?.type) return license.type;
  if (Array.isArray(licenses)) return licenses.map((l) => l.type ?? l).join(' OR ');
  return 'UNKNOWN';
}

// Evalúa expresiones SPDX sencillas: "A OR B" basta con una; "A AND B" exige todas.
function satisfies(expression, allowed) {
  const clean = expression.replace(/[()]/g, '').trim();
  return clean
    .split(/\s+OR\s+/)
    .some((alt) => alt.split(/\s+AND\s+/).every((id) => allowed.has(id.trim())));
}

// Recorre node_modules (incluidos los anidados y los paquetes con scope).
function collectInstalled(dir, found = new Map()) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (entry.startsWith('@')) {
      collectInstalled(full, found);
      continue;
    }
    const manifest = join(full, 'package.json');
    if (!existsSync(manifest)) continue;
    const pkg = readJson(manifest);
    if (pkg.name)
      found.set(`${pkg.name}@${pkg.version}`, { name: pkg.name, license: licenseOf(pkg) });
    collectInstalled(join(full, 'node_modules'), found);
  }
  return found;
}

const workspaces = [
  ROOT,
  ...(readJson(join(ROOT, 'package.json')).workspaces ?? []).map((w) => join(ROOT, w)),
];
const direct = new Map();
for (const dir of workspaces) {
  const pkg = readJson(join(dir, 'package.json'));
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    const manifest = [join(dir, 'node_modules', name), join(ROOT, 'node_modules', name)]
      .map((p) => join(p, 'package.json'))
      .find(existsSync);
    direct.set(name, manifest ? licenseOf(readJson(manifest)) : 'NO INSTALADA');
  }
}

let failed = false;
console.info('Dependencias directas:');
for (const [name, license] of [...direct].sort()) {
  const ok = DIRECT_EXCEPTIONS.has(name) || satisfies(license, DIRECT_ALLOWED);
  if (!ok) failed = true;
  console.info(`  ${ok ? '✔' : '✘'} ${name.padEnd(28)} ${license}`);
}

const installed = new Map();
for (const dir of workspaces) collectInstalled(join(dir, 'node_modules'), installed);
const offenders = [...installed.values()]
  .filter(({ name }) => !direct.has(name) && !name.startsWith('@bookia/'))
  .filter(({ name }) => !isTransitiveException(name))
  .filter(({ license }) => !satisfies(license, TRANSITIVE_ALLOWED));
const unique = [...new Map(offenders.map((o) => [`${o.name}:${o.license}`, o])).values()];

console.info(`\nDependencias transitivas revisadas: ${installed.size}`);
if (unique.length > 0) {
  failed = true;
  console.info('Transitivas con licencia no permitida:');
  for (const { name, license } of unique.sort((a, b) => a.name.localeCompare(b.name))) {
    console.info(`  ✘ ${name.padEnd(36)} ${license}`);
  }
} else {
  console.info('Todas las transitivas tienen licencia permisiva.');
}

process.exitCode = failed ? 1 : 0;
