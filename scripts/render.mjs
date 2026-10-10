import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Marked } from 'marked';
import YAML from 'yaml';
import sanitize from 'sanitize-html';

const markdown = new Marked({ gfm:true, breaks:true });
export const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
export const renderMarkdown = text => sanitize(markdown.parse(text), {
  allowedTags:['p','strong','em','a','ol','ul','li','br','code','blockquote','h3','h4','table','thead','tbody','tr','th','td'],
  allowedAttributes:{ a:['href','target','rel'] },
  allowedSchemes:['https','http','mailto'],
  allowProtocolRelative:false,
  transformTags:{ a:(_, attributes) => ({ tagName:'a', attribs:{ ...attributes, target:'_blank', rel:'noopener noreferrer' } }) }
});
export function parseDocument(source, filename) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: missing YAML frontmatter`);
  const metadata = YAML.parse(match[1]);
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error(`${filename}: invalid metadata`);
  if (typeof metadata.title !== 'string' || !metadata.title.trim()) throw new Error(`${filename}: missing title`);
  if (typeof metadata.id !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(metadata.id)) throw new Error(`${filename}: invalid id`);
  return { ...metadata, body:match[2].trim(), filename };
}
const readDocument = async path => parseDocument(await readFile(path, 'utf8'), path);
const readCollection = async (root, name) => {
  const paths = (await readdir(join(root, name))).filter(file => file.endsWith('.md')).sort();
  const documents = await Promise.all(paths.map(file => readDocument(join(root, name, file))));
  if (documents.some(item => !Number.isInteger(item.order) || item.order < 1)) throw new Error(`${name}: invalid order`);
  return documents.sort((a, b) => a.order - b.order);
};
export async function loadContent(root) {
  const [site, actions, faq, templates, sealing, references, todo, transport] = await Promise.all([
    readDocument(join(root, 'site.md')), readCollection(root, 'actions'), readCollection(root, 'faq'),
    readCollection(root, 'templates'), readCollection(root, 'sealing'), readDocument(join(root, 'references.md')), readDocument(join(root, 'todo.md')), readDocument(join(root, 'transport.md'))
  ]);
  const documents = [...actions, ...faq, ...templates, ...sealing, references, todo, transport];
  if (new Set(documents.map(item => item.id)).size !== documents.length) throw new Error('Duplicate content id');
  for (const item of actions) {
    if (!['checklist','evidence','transfer'].includes(item.section) || typeof item.completion !== 'string' || typeof item.priority !== 'string') throw new Error(`${item.filename}: invalid action metadata`);
    if (typeof item.urgent !== 'boolean') throw new Error(`${item.filename}: urgent must be boolean`);
  }
  const fields = ['pageTitle','brand','eyebrow','intro','ruleTitle','ruleBody','evidencePreparation','footer','sourcesTitle','sourcesNote','templateNote','sealingTitle','repository'];
  if (fields.some(field => typeof site[field] !== 'string')) throw new Error('site.md: required page metadata is missing');
  if (!Array.isArray(site.sections) || !Array.isArray(site.nav)) throw new Error('site.md: invalid navigation');
  if (!/^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/.test(site.repository)) throw new Error('site.md: invalid repository URL');
  for (const section of site.sections) {
    if (!['checklist','evidence','transfer','faq','templates'].includes(section.id) || ['title','index','note'].some(field => typeof section[field] !== 'string')) throw new Error('site.md: invalid section');
  }
  if (site.sections.length !== 5 || new Set(site.sections.map(item => item.id)).size !== 5) throw new Error('site.md: sections must be unique and complete');
  for (const item of site.nav) if (!([...site.sections, todo, transport].some(section => section.id === item.id)) || typeof item.title !== 'string') throw new Error('site.md: invalid navigation item');
  return { site, actions, faq, templates, sealing, references, todo, transport };
}
const sectionHead = section => `<span class="index">${escape(section.index)}</span><h2 id="${section.id}-title">${escape(section.title)}</h2><p class="section-note">${escape(section.note)}</p>`;
const actionTable = actions => `<div class="table-wrap" style="margin-top:16px"><table class="action-table"><colgroup><col class="action"><col class="operation"><col class="proof"></colgroup><thead><tr><th scope="col">核对动作</th><th scope="col">具体怎么做</th><th scope="col">完成判断 / 留下什么</th></tr></thead><tbody>${actions.map(action => {
  const parts = action.body.match(/^## 具体怎么做\s*\n([\s\S]*?)\n## 完成判断\s*\n([\s\S]*)$/);
  if (!parts) throw new Error(`${action.filename}: missing action body sections`);
  return `<tr id="action-${action.id}" data-step="${action.id}"><th scope="row"><label class="check"><input type="checkbox" data-check="${action.id}"><span><span class="step">${String(action.order).padStart(2,'0')}</span>${escape(action.title)}</span></label><span class="priority${action.urgent ? ' urgent' : ''}">${escape(action.priority)}</span></th><td data-label="具体怎么做">${renderMarkdown(parts[1])}</td><td data-label="完成判断 / 留下什么"><span class="completion">${escape(action.completion)}</span>${renderMarkdown(parts[2])}</td></tr>`;
}).join('\n')}</tbody></table></div>`;
const progress = count => `<div class="progress"><div class="progress-copy"><strong id="progress-text" role="status" aria-live="polite">已核对 0 / ${count} 项</strong><p id="save-status">按“完成判断”核实后再勾选。进度仅保存在当前浏览器，不上传。</p><progress id="progress-bar" max="${count}" value="0" aria-label="清单核对进度"></progress></div><button id="reset" type="button">清空勾选</button></div>`;
const searchWidget = `<div class="global-search" id="site-search"><form id="global-form" role="search"><label class="sr-only" for="global-search">搜索清单、答疑、转运资源与申请模板</label><div class="global-field"><input id="global-search" type="search" maxlength="80" placeholder="搜索清单、答疑、转运电话…" title="全站搜索（⌘ / Ctrl + K）" autocomplete="off" aria-describedby="global-status" aria-controls="global-popover" aria-expanded="false"><button id="global-clear" type="button" aria-label="清空搜索" hidden>×</button></div></form><div id="global-popover" class="global-popover" role="region" aria-label="全站搜索结果" hidden><p class="search-status" id="global-status" role="status" aria-live="polite">搜索全站内容，支持多个关键词、常见同义说法及少量错字。</p><ol id="global-results" class="global-results" hidden></ol></div></div>`;
export function renderPage(content, assets) {
  const { site, actions, faq, templates, sealing, references, todo, transport } = content;
  const sections = site.sections.map(section => {
    let body;
    if (['checklist','evidence','transfer'].includes(section.id)) {
      body = (section.id === 'checklist' ? progress(actions.length) : '') + actionTable(actions.filter(action => action.section === section.id));
      if (section.id === 'evidence') body += `<aside class="inline-note">${renderMarkdown(site.evidencePreparation)}</aside>`;
    } else if (section.id === 'faq') {
      body = `<label class="search-label" for="faq-search">搜索答疑</label><input id="faq-search" type="search" placeholder="例如：打印、监控、转院、免责" aria-describedby="search-status"><p class="search-status" id="search-status" role="status" aria-live="polite">共 ${faq.length} 个问题 · 点击展开；打印时会包含全部答案。</p><div id="faq-items">${faq.map(item => `<details id="${item.id}"><summary>${String(item.order).padStart(2,'0')} ${escape(item.title)}</summary><div class="answer">${renderMarkdown(item.body)}</div></details>`).join('\n')}</div><p class="empty" id="faq-empty" hidden>没有匹配的问题。试试更短的词，例如“打印”“监控”或“转院”。</p>`;
    } else {
      body = `${templates.map(item => `<h3>${escape(item.title)}</h3><div class="template" id="${item.id}">${renderMarkdown(item.body)}</div>`).join('\n')}<h3>${escape(site.sealingTitle)}</h3><div class="table-wrap"><table class="small-table"><thead><tr><th scope="col">材料</th><th scope="col">需要明确的字段</th></tr></thead><tbody>${sealing.map(item => `<tr id="${item.id}"><th scope="row">${escape(item.title)}</th><td>${renderMarkdown(item.body)}</td></tr>`).join('\n')}</tbody></table></div>`;
    }
    return `<section id="${section.id}" aria-labelledby="${section.id}-title">${sectionHead(section)}${body}</section>`;
  }).join('\n');
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(site.pageTitle)}</title><style>${assets.style}</style></head><body><a class="skip" href="#checklist">跳到行动清单</a><div class="page"><div class="masthead"><span class="brand">${escape(site.brand)}</span>${searchWidget}<div class="tools"><button class="primary" id="print" type="button">打印 / 存为 PDF</button></div></div><header><p class="eyebrow">${escape(site.eyebrow)}</p><h1>${escape(site.title).replace(/\n/g,'<br>')}</h1><p class="intro">${escape(site.intro)}</p></header><aside class="rule" aria-label="使用原则"><strong>${escape(site.ruleTitle)}</strong><p>${escape(site.ruleBody)}</p></aside><nav aria-label="页面目录">${site.nav.map(item => `<a href="#${item.id}">${escape(item.title)}</a>`).join('')}</nav><main>${sections}<section id="references" aria-labelledby="sources-title"><span class="index">参考依据</span><h2 id="sources-title">${escape(site.sourcesTitle)}</h2><p class="section-note">${escape(site.sourcesNote)}</p><div class="source-list">${renderMarkdown(references.body)}</div></section><section id="${escape(transport.id)}" aria-labelledby="${escape(transport.id)}-title"><span class="index">转运资源</span><h2 id="${escape(transport.id)}-title">${escape(transport.title)}</h2><div class="transport-directory">${renderMarkdown(transport.body)}</div></section><section id="${escape(todo.id)}" aria-labelledby="${escape(todo.id)}-title"><span class="index">待完善内容</span><h2 id="${escape(todo.id)}-title">${escape(todo.title)}</h2><div class="roadmap">${renderMarkdown(todo.body)}</div></section></main><footer>${escape(site.footer)}<p><a href="${escape(site.repository)}" target="_blank" rel="noopener noreferrer">补充经验或纠正内容</a> · 内容许可 CC BY 4.0</p></footer></div><script id="search-engine">${assets.engine}</script><script>${assets.checklist}</script><script>${assets.search}</script></body></html>\n`;
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  if (new Set(ids).size !== ids.length) throw new Error("Generated page contains duplicate DOM ids");
  return html;
}
