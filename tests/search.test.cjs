const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const source = html.match(/<script id="search-engine">([\s\S]*?)<\/script>/);
assert.ok(source, 'Global search engine exists');
const context = vm.createContext({});
vm.runInContext(source[1], context, { filename:path.join(__dirname, '..', 'src', 'search-engine.js') });
const engine = vm.runInContext('MedicalGuideSearch', context);
const docs = [
  { id: 'record', title: '立即打印病历与报告', text: '复制当前病历，核对页数并封存。' },
  { id: 'transfer', title: '提交书面转院申请', text: '向医务部提交申请，主动联系接收医院，落实救护车。' },
  { id: 'waiver', title: '核对说明书', text: '转运所有风险由家属承担，要求删除概括免责条款。' },
  { id: 'faq', title: '两个不同品牌的 U 盘', text: '监控视频完整备份，逐盘核对播放。' },
  { id: 'law', title: '参考依据', text: '《民法典》第五百零六条。' }
];
const ids = query => Array.from(engine.search(docs, query), result => result.id);

test('matches across content categories and ranks exact titles first', () => {
  assert.equal(ids('病历')[0], 'record');
  assert.equal(ids('民法典')[0], 'law');
  assert.equal(ids('监控')[0], 'faq');
});
test('accepts multiple terms and requires each term', () => {
  assert.deepEqual(ids('转运 免责'), ['waiver']);
  assert.deepEqual(ids('病历 救护车'), []);
});
test('normalizes case, full width and punctuation', () => {
  assert.deepEqual(ids('ｕ盘'), ['faq']);
  assert.deepEqual(ids(' U 盘 '), ['faq']);
});
test('matches common alternative wording', () => {
  assert.deepEqual(ids('医务处'), ['transfer']);
  assert.deepEqual(ids('接受医院'), ['transfer']);
  assert.deepEqual(ids('转诊'), ['transfer']);
});
test('tolerates one character error and missing character', () => {
  assert.deepEqual(ids('救护撤'), ['transfer']);
  assert.deepEqual(ids('医务步'), ['transfer']);
  assert.deepEqual(ids('接医院'), ['transfer']);
});
test('finds nearby non-contiguous phrases without matching distant characters', () => {
  assert.deepEqual(ids('病历封存'), ['record']);
  assert.deepEqual(ids('火星移民'), []);
});
test('handles empty, oversized and unsafe-looking input as plain text', () => {
  assert.deepEqual(ids('  '), []);
  assert.deepEqual(ids('<img src=x onerror=alert(1)>'), []);
  assert.deepEqual(ids('不存在'.repeat(100)), []);
});
test('does not mutate documents; excerpt contains the matched context', () => {
  const before = JSON.stringify(docs);
  engine.search(docs, '免责');
  assert.equal(JSON.stringify(docs), before);
  assert.match(engine.excerpt('开头'.repeat(100) + '概括免责条款' + '结尾'.repeat(100), '免责'), /概括免责条款/);
});
test('highlights all exact, synonym and typo matches while preserving original text', () => {
  const value = '向医务部提交转院申请，转院原因和救护车安排需留存。';
  const parts = engine.highlight(value, '医务处 转院 救护撤');
  assert.equal(Array.from(parts, part=>part.text).join(''), value);
  assert.deepEqual(Array.from(parts.filter(part=>part.match), part=>part.text), ['医务部','转院','转院','救护车']);
  assert.equal(engine.highlight('正常文本', '')[0].match, false);
  assert.equal(engine.highlight('<img src=x>', 'img').map(part=>part.text).join(''), '<img src=x>');
});

test('highlight handles supplementary Unicode characters', () => {
  const value = '𠮷医生病历';
  const parts = engine.highlight(value, '病历');
  assert.equal(Array.from(parts, part=>part.text).join(''), value);
  assert.deepEqual(Array.from(parts.filter(part=>part.match), part=>part.text), ['病历']);
});
