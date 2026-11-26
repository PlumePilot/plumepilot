import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('docs/inside-plumepilot');
const readers = [
  { locale: 'it', name: 'Inside-PlumePilot.html', appendix: ['glossario', 'fonti'], state: 'inside-plumepilot-state' },
  { locale: 'en', name: 'Inside-PlumePilot-en.html', appendix: ['glossary', 'sources'], state: 'inside-plumepilot-state-en' },
];

function validateReader({ locale, name, appendix, state }) {
  const filename = path.join(root, name);
  const html = fs.readFileSync(filename, 'utf8');
  assert.match(html, new RegExp('<html lang="' + locale + '">'), name + ': language');
  assert.match(html, new RegExp('storage\\.set\\(\\x27' + state + '\\x27'), name + ': independent reading position');
  const sections = [...html.matchAll(/<section class="chapter" id="chapter-([^"]+)"/g)].map(m => m[1]);
  assert.equal(sections.length, 20, name + ': 18 chapters and two appendices');
  assert.deepEqual(sections.slice(0, 18), Array.from({ length: 18 }, (_, i) => String(i).padStart(2, '0')));
  assert.deepEqual(sections.slice(18), appendix);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  for (const match of html.matchAll(/\bhref="#([^"]+)"/g)) {
    assert(ids.has(match[1]), name + ': unresolved fragment #' + match[1]);
  }
  assert.doesNotMatch(html, /(?:<script\b[^>]*\bsrc=|<link\b[^>]*\bhref=|<img\b[^>]*\bsrc=["']https?:)/i,
    name + ': reader loads external assets');
  assert.doesNotMatch(html, /\bhref="(?:index\.md|[0-9]{2}-[^"]+\.md)"/,
    name + ': Markdown navigation must become local fragments');
  for (const control of ['id="bookSearch"', 'id="themeSelect"', 'id="sectionToc"', 'id="prevBtn"', 'id="nextBtn"']) {
    assert(html.includes(control), name + ': missing ' + control);
  }
  const expectedSearch = locale === 'en' ? 'Search the book' : 'Cerca nel libro';
  assert(html.includes(expectedSearch), name + ': search must be localized');
  console.log('OK', name, sections.length, 'sections;', ids.size, 'IDs');
}

for (const reader of readers) validateReader(reader);
console.log('Offline reader structure checks passed.');
