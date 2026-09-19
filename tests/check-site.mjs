import { existsSync, readFileSync, readdirSync } from 'node:fs';

const pages = readdirSync('.').filter((file) => file.endsWith('.html'));
const missing = [];

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = match[1].split(/[?#]/)[0];
    if (!target || /^(?:https?:|data:|mailto:|#)/.test(target)) continue;
    if (!existsSync(target)) missing.push(`${page}: ${target}`);
  }
}

if (missing.length) {
  console.error(`Missing local assets:\n${missing.join('\n')}`);
  process.exit(1);
}

console.log(`Checked ${pages.length} pages: every local asset exists.`);
