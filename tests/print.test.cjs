const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const setup = async () => {
  const { renderPrintLayout } = await import('../scripts/print-layout.mjs');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const actions = Array.from({ length:11 }, (_, index) => ({ id:`step-${index}`, order:index + 1, title:`动作 ${index + 1}`, completion:`完成判断 ${index + 1}` }));
  const dom = new JSDOM(`<body><button id="print">打印</button>${renderPrintLayout(actions, escape)}${actions.map(action => `<input type="checkbox" data-check="${action.id}">`).join('')}<input id="faq-search" value="监控"><div id="faq-items"><details id="faq-one" open><summary>问题1</summary></details><details id="faq-two" hidden><summary>问题2</summary></details></div></body>`, { runScripts:'outside-only' });
  const { window } = dom;
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  let calls = 0;
  window.print = () => { calls++; };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src/print-ui.js'), 'utf8'), dom.getInternalVMContext(), { filename:path.join(__dirname, '..', 'src/print-ui.js') });
  return { dom, doc:window.document, window, printCalls:() => calls };
};

test('print summary contains all Markdown actions and escapes unsafe text without duplicate checks', async () => {
  const { renderPrintLayout } = await import('../scripts/print-layout.mjs');
  const { escape } = await import('../scripts/render.mjs');
  const dom = new JSDOM(renderPrintLayout([{ id:'safe', order:1, title:'<img src=x onerror=alert(1)>', completion:'<script>danger()</script>' }], escape));
  assert.equal(dom.window.document.querySelector('img,script,[data-check]'), null);
  assert.equal(dom.window.document.querySelector('[data-print-check]').textContent, '□');
  assert.match(dom.window.document.querySelector('#print-summary').textContent, /<script>danger/);
  dom.window.close();
  const fixture = await setup();
  assert.equal(fixture.doc.querySelectorAll('#print-summary tbody tr').length, 11);
  assert.equal(fixture.doc.querySelectorAll('[data-check]').length, 11);
  fixture.dom.window.close();
});

test('print button opens accessible options, cancellation and Escape return focus', async () => {
  const { dom, doc, window, printCalls } = await setup();
  const button = doc.getElementById('print');
  const dialog = doc.getElementById('print-options');
  button.click();
  assert.equal(dialog.open, true);
  assert.equal(doc.querySelector('input[name="print-mode"]:checked').value, 'checklist');
  doc.getElementById('cancel-print').click();
  assert.equal(dialog.open, false);
  assert.equal(doc.activeElement, button);
  button.click();
  dialog.dispatchEvent(new window.Event('cancel', { cancelable:true }));
  assert.equal(dialog.open, false);
  assert.equal(doc.activeElement, button);
  assert.equal(printCalls(), 0);
  dom.window.close();
});

test('default browser printing mirrors progress and preserves FAQ filter and expansion', async () => {
  const { dom, doc, window } = await setup();
  doc.querySelector('[data-check]').checked = true;
  window.dispatchEvent(new window.Event('beforeprint'));
  assert.equal(doc.querySelector('[data-print-check]').textContent, '✓');
  assert.match(doc.getElementById('print-progress').textContent, /1 \/ 11/);
  assert.equal(doc.getElementById('faq-one').open, true);
  assert.equal(doc.getElementById('faq-two').open, false);
  assert.equal(doc.getElementById('faq-two').hidden, true);
  window.dispatchEvent(new window.Event('afterprint'));
  assert.equal(doc.getElementById('faq-search').value, '监控');
  assert.equal(doc.getElementById('faq-two').hidden, true);
  dom.window.close();
});

test('full print reveals FAQ temporarily, tolerates repeated beforeprint and restores original state', async () => {
  const { dom, doc, window, printCalls } = await setup();
  doc.getElementById('print').click();
  doc.querySelector('input[value="full"]').checked = true;
  doc.getElementById('confirm-print').click();
  assert.equal(printCalls(), 1);
  assert.equal(doc.body.dataset.printMode, 'full');
  assert.equal(doc.getElementById('print-options').open, false);
  window.dispatchEvent(new window.Event('beforeprint'));
  window.dispatchEvent(new window.Event('beforeprint'));
  assert.equal(doc.getElementById('faq-two').open, true);
  assert.equal(doc.getElementById('faq-two').hidden, false);
  window.dispatchEvent(new window.Event('afterprint'));
  assert.equal(doc.getElementById('faq-one').open, true);
  assert.equal(doc.getElementById('faq-two').open, false);
  assert.equal(doc.getElementById('faq-two').hidden, true);
  assert.equal(doc.getElementById('faq-search').value, '监控');
  assert.equal(doc.body.dataset.printMode, 'checklist');
  doc.getElementById('print').click();
  assert.equal(doc.querySelector('input[name="print-mode"]:checked').value, 'checklist');
  doc.getElementById('confirm-print').click();
  assert.equal(printCalls(), 2);
  assert.equal(doc.body.dataset.printMode, 'checklist');
  dom.window.close();
});

test('unsupported native dialog falls back to printing the one-page checklist', async () => {
  const { dom, doc, window, printCalls } = await setup();
  const dialog = doc.getElementById('print-options');
  dialog.showModal = undefined;
  doc.body.dataset.printMode = 'full';
  doc.getElementById('print').click();
  assert.equal(printCalls(), 1);
  assert.equal(doc.body.dataset.printMode, 'checklist');
  assert.equal(dialog.open, false);
  window.dispatchEvent(new window.Event('beforeprint'));
  assert.equal(doc.getElementById('faq-two').hidden, true);
  assert.equal(doc.getElementById('faq-two').open, false);
  dom.window.close();
});

test('absent or unexpected print selection always uses checklist mode', async () => {
  const { dom, doc, printCalls } = await setup();
  doc.getElementById('print').click();
  doc.querySelector('input:checked').checked = false;
  doc.getElementById('confirm-print').click();
  assert.equal(doc.body.dataset.printMode, 'checklist');
  doc.getElementById('print').click();
  doc.querySelector('input[name="print-mode"]:checked').value = 'invalid';
  doc.getElementById('confirm-print').click();
  assert.equal(doc.body.dataset.printMode, 'checklist');
  assert.equal(printCalls(), 2);
  dom.window.close();
});
