const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const renderer = () => import('../scripts/render.mjs');
test('Markdown rendering retains formatting and strips active content', async () => {
  const { renderMarkdown } = await renderer();
  const html = renderMarkdown('**重点**\n\n[官方依据](https://example.org)\n\n<script>alert(1)</script><img src=x onerror=alert(1)>\n\n[恶意链接](javascript:alert(1))');
  const doc = new JSDOM(html).window.document;
  assert.equal(doc.querySelector('strong').textContent, '重点');
  assert.equal(doc.querySelector('a[href="https://example.org"]').rel, 'noopener noreferrer');
  assert.equal(doc.querySelector('script,img,a[href^="javascript:"]'), null);
});
test('invalid Markdown metadata fails the build clearly', async () => {
  const { parseDocument, escape } = await renderer();
  assert.throws(() => parseDocument('no frontmatter', 'bad.md'), /missing YAML/);
  assert.throws(() => parseDocument('---\n- array\n---\nx', 'bad.md'), /invalid metadata/);
  assert.throws(() => parseDocument('---\nid: good\n---\nx', 'bad.md'), /missing title/);
  assert.throws(() => parseDocument('---\ntitle: good\nid: "<script>"\n---\nx', 'bad.md'), /invalid id/);
  assert.equal(escape('<a href="x">&\''), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
});
test('all Markdown loads and renders complete semantic content', async () => {
  const { loadContent, renderPage } = await renderer();
  const content = await loadContent(path.join(__dirname, '..', 'content'));
  const html = renderPage(content, { style:'', engine:'', checklist:'', search:'' });
  const doc = new JSDOM(html).window.document;
  const normalize = text => text.replace(/\s+/g, '');
  for (const item of [...content.faq,...content.templates,...content.sealing]) {
    assert.ok(doc.getElementById(item.id), item.id);
    assert.ok(normalize(doc.getElementById(item.id).textContent).length > 20);
  }
  assert.equal(doc.querySelectorAll('.action-table tbody tr').length, content.actions.length);
  assert.equal(doc.querySelector('h1').childNodes[1].nodeName, 'BR');
  assert.throws(() => renderPage({ ...content, actions:[{ ...content.actions[0], body:'wrong headers' }] }, {}), /missing action body sections/);
  for (const id of ['global-search','print','action-rescue']) {
    assert.throws(() => renderPage({ ...content, faq:[{ ...content.faq[0], id }] }, {}), /duplicate DOM ids/);
  }
});
