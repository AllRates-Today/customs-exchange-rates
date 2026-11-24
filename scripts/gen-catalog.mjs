// Builds src/catalog.json from the site's customs-countries.js, so the package
// lists exactly the clearance countries /api/v1/customs serves.
// Run: node scripts/gen-catalog.mjs   (needs ../astro-blog-starter-template)
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const site = resolve(root, '../astro-blog-starter-template/src/data');
const { customsByCountry } = await import(pathToFileURL(resolve(site, 'customs-countries.js')).href);
const { sourcePath } = await import(pathToFileURL(resolve(site, 'central-banks.js')).href);

const countries = [...customsByCountry.entries()]
  .map(([cc, b]) => ({
    country: cc.toUpperCase(),
    countryName: cc === 'li' ? 'Liechtenstein' : cc === 'mc' ? 'Monaco' : b.country,
    authority: b.code,
    name: b.name,
    currency: b.homeCcy,
    cadence: b.cadenceLabel,
    page: 'https://allratestoday.com' + sourcePath(b.code),
  }))
  .sort((a, b) => a.countryName.localeCompare(b.countryName));
writeFileSync(resolve(root, 'src/catalog.json'), JSON.stringify({ countries }, null, 0) + '\n');

// README coverage table between the markers
const readmePath = resolve(root, 'README.md');
const readme = readFileSync(readmePath, 'utf8');
const table = ['| Country | Code | Customs authority | Currency | Cadence |', '|---|---|---|---|---|',
  ...countries.map((c) => `| ${c.countryName} | \`${c.country}\` | [${c.name}](${c.page}) | ${c.currency} | ${c.cadence} |`)].join('\n');
const authorities = new Set(countries.map((c) => c.authority)).size;
const out = readme
  .replace(/<!-- coverage:start -->[\s\S]*<!-- coverage:end -->/, `<!-- coverage:start -->\n${table}\n<!-- coverage:end -->`)
  .replace(/\b\d+ customs authorities\b/g, `${authorities} customs authorities`)
  .replace(/\b\d+ clearance countries\b/g, `${countries.length} clearance countries`);
writeFileSync(readmePath, out);
const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.description = pkg.description.replace(/\b\d+ customs authorities\b/, `${authorities} customs authorities`);
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`catalog: ${countries.length} countries, ${authorities} authorities`);
