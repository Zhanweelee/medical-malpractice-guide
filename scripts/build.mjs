import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, renderPage } from './render.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const content = await loadContent(join(root, 'content'));
const [style, engine, checklist, search] = await Promise.all(
  ['style.css','search-engine.js','checklist.js','search-ui.js'].map(name => readFile(join(root, 'src', name), 'utf8'))
);
const page = renderPage(content, { style, engine, checklist, search });
await mkdir(join(root, 'dist'), { recursive:true });
await writeFile(join(root, 'dist', 'index.html'), page);
await writeFile(join(root, 'dist', '.nojekyll'), '');
await writeFile(join(root, 'index.html'), page);
console.log(`Built ${content.actions.length} checklist items, ${content.faq.length} answers and ${content.templates.length} templates from Markdown.`);
