const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const script = fs.readFileSync(path.join(__dirname, '..', 'src/navigation.js'), 'utf8');

test('navigation follows anchors and scrolling and measures the sticky header', () => {
  const dom = new JSDOM('<div class="site-header"><nav><a href="#one">一</a><a href="#two">二</a><a href="#missing">缺失</a></nav></div><section id="one"></section><section id="two"></section>', { url:'https://example.org/#two', runScripts:'outside-only' });
  const { window } = dom;
  const doc = window.document;
  let secondTop = 500;
  doc.querySelector('.site-header').getBoundingClientRect = () => ({ height:120 });
  doc.getElementById('one').getBoundingClientRect = () => ({ top:80 });
  doc.getElementById('two').getBoundingClientRect = () => ({ top:secondTop });
  const frames = [];
  window.requestAnimationFrame = callback => frames.push(callback);
  vm.runInContext(script, dom.getInternalVMContext(), { filename:path.join(__dirname, '..', 'src/navigation.js') });
  assert.equal(doc.documentElement.style.getPropertyValue('--header-height'), '120px');
  assert.equal(doc.querySelector('[aria-current]').hash, '#two');
  doc.querySelector('a[href="#one"]').click();
  assert.equal(doc.querySelector('[aria-current]').hash, '#one');
  secondTop = 140;
  window.dispatchEvent(new window.Event('scroll'));
  window.dispatchEvent(new window.Event('scroll'));
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.equal(doc.querySelector('[aria-current]').hash, '#two');
  secondTop = 500;
  window.dispatchEvent(new window.Event('resize'));
  frames.shift()();
  assert.equal(doc.querySelector('[aria-current]').hash, '#one');
  window.history.replaceState(null, '', '#two');
  window.dispatchEvent(new window.HashChangeEvent('hashchange'));
  assert.equal(doc.querySelector('[aria-current]').hash, '#two');
  window.history.replaceState(null, '', '#missing');
  window.dispatchEvent(new window.HashChangeEvent('hashchange'));
  assert.equal(doc.querySelector('[aria-current]').hash, '#two');
  dom.window.close();
});

test('navigation tolerates pages without a header or valid destinations', () => {
  for (const html of ['', '<div class="site-header"><nav><a href="#missing">缺失</a></nav></div>']) {
    const dom = new JSDOM(html, { runScripts:'outside-only' });
    assert.doesNotThrow(() => vm.runInContext(script, dom.getInternalVMContext(), { filename:path.join(__dirname, '..', 'src/navigation.js') }));
    dom.window.close();
  }
});
