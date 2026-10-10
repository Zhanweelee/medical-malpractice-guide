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
  const table = new JSDOM(renderMarkdown('| 城市 | 电话 |\n| --- | --- |\n| 泉州 | 0595-22512120 |')).window.document;
  assert.equal(table.querySelector('tbody td').textContent, '泉州');
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
  assert.equal(content.todo.id, 'todo');
  assert.match(doc.getElementById('todo').textContent, /待完善方向/);
  assert.match(doc.getElementById('todo').textContent, /三甲医院/);
  assert.match(doc.getElementById('todo').textContent, /起诉与维权/);
  assert.equal(doc.querySelectorAll('#todo [data-check]').length, 0);
  assert.ok(doc.querySelector('nav a[href="#todo"]'));
  assert.equal(content.transport.id, 'transport-resources');
  assert.ok(doc.querySelector('nav a[href="#transport-resources"]'));
  const contacts = [...doc.querySelectorAll('.transport-directory tbody tr')];
  const counts = content.transport.body.match(/\*\*(\d+) 个省级地区、(\d+) 条转运资源\*\*/);
  assert.ok(counts);
  assert.equal(contacts.length, Number(counts[2]));
  assert.equal(doc.querySelectorAll('.transport-directory table').length, Number(counts[1]));
  assert.equal(doc.querySelectorAll('.transport-directory h3').length, 32);
  assert.match(doc.querySelector('.transport-directory').textContent, /辽宁省[\s\S]*留空待补充/);
  for (const row of contacts) {
    assert.equal(row.children.length, 6);
    assert.match(row.lastElementChild.textContent, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    assert.ok(row.querySelector('a[href^="https://"]'));
  }
  assert.match(doc.getElementById('transport-resources').textContent, /未实际致电/);
  assert.equal(doc.querySelectorAll('#transport-resources [data-check]').length, 0);
  assert.equal(doc.querySelector('.guide-intro h1').childNodes[1].nodeName, 'BR');
  const topNavigation = doc.querySelector('.site-header nav');
  assert.ok(topNavigation);
  assert.ok(topNavigation.compareDocumentPosition(doc.querySelector('.guide-intro')) & 4);
  assert.equal(topNavigation.querySelectorAll('a').length, content.site.nav.length);
  assert.throws(() => renderPage({ ...content, actions:[{ ...content.actions[0], body:'wrong headers' }] }, {}), /missing action body sections/);
  for (const id of ['global-search','print','action-rescue']) {
    assert.throws(() => renderPage({ ...content, faq:[{ ...content.faq[0], id }] }, {}), /duplicate DOM ids/);
  }
});
