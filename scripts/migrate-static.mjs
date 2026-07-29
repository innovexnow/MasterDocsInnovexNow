import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { URL } from 'node:url';

const root = new URL('../', import.meta.url);
const pages = [
  { source: 'legacy-original/index.html', name: 'home' },
  { source: 'legacy-original/system-hub.html', name: 'system-hub' },
];

const extract = (html, pattern, label, source) => {
  const match = html.match(pattern);
  if (!match) throw new Error(`Unable to extract ${label} from ${source}`);
  return match[1].trim();
};

await mkdir(new URL('../src/legacy/', import.meta.url), { recursive: true });
await mkdir(new URL('../public/legacy/', import.meta.url), { recursive: true });

for (const page of pages) {
  const sourceUrl = new URL(`../${page.source}`, import.meta.url);
  const html = await readFile(sourceUrl, 'utf8');
  const css = extract(html, /<style>([\s\S]*?)<\/style>/i, 'styles', page.source);
  const body = extract(html, /<body[^>]*>([\s\S]*?)<\/body>/i, 'body', page.source)
    .replace(/<script>([\s\S]*?)<\/script>/i, '')
    .replaceAll('RestroMind System Hub', 'RestroDocs')
    .replaceAll('System Hub', 'RestroDocs')
    .replaceAll('Restro Docs', 'RestroDocs')
    .trim();
  const script = extract(html, /<script>([\s\S]*?)<\/script>/i, 'script', page.source);

  await writeFile(new URL(`../src/legacy/${page.name}.html`, import.meta.url), `${body}\n`);
  await writeFile(new URL(`../src/legacy/${page.name}.css`, import.meta.url), `${css}\n`);
  await writeFile(
    new URL(`../public/legacy/${page.name}.js`, import.meta.url),
    `${script}\n`,
  );
}

globalThis.console.log(
  `Extracted ${pages.length} static pages from ${join(root.pathname, '')}`,
);
