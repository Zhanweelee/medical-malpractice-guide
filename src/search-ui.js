(() => {
  const field = document.getElementById('global-search');
  const results = document.getElementById('global-results');
  const status = document.getElementById('global-status');
  const clear = document.getElementById('global-clear');
  const groups = [
    ['使用说明', '.intro,.rule,.section-note,.inline-note,footer'],
    ['行动清单', '[data-step]'], ['常见答疑', '#faq-items details'],
    ['申请模板', '.template'], ['封存字段', '.small-table tbody tr'],
    ['参考依据', '.source-list li']
  ];
  const documents = groups.flatMap(([category, selector]) => [...document.querySelectorAll(selector)].map((target, index) => {
    const titleElement = target.querySelector('.check') || target.querySelector('summary,th,a')
      || (target.classList.contains('template') ? target.previousElementSibling : null);
    const step = target.querySelector('.step')?.textContent.trim();
    const label = titleElement?.textContent.trim();
    const title = (step ? `${step} ${label.slice(step.length).trim()}` : label)
      || (target.closest('section')?.querySelector('h2')?.textContent.trim() || '使用原则与说明');
    if (!target.id) target.id = target.dataset.step ? `action-${target.dataset.step}` : `search-${groups.findIndex(group => group[0] === category)}-${index + 1}`;
    return { id:target.id, title, text:target.textContent.trim(), category, target };
  }));
  const reset = () => {
    field.value = '';
    results.replaceChildren();
    results.hidden = true;
    clear.hidden = true;
    status.textContent = '搜索全站内容，支持多个关键词、常见同义说法及少量错字。';
  };
  const render = () => {
    const query = field.value.trim();
    if (!MedicalGuideSearch.terms(query).length) { reset(); return; }
    const matches = MedicalGuideSearch.search(documents, query);
    results.replaceChildren();
    results.hidden = matches.length === 0;
    clear.hidden = false;
    status.textContent = matches.length ? `找到 ${matches.length} 条相关内容 · 点击标题查看原文。` : '没有找到相关内容。试试更短的关键词，例如“监控”“转院”或“免责”。';
    matches.forEach(match => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      const link = document.createElement('a');
      const snippet = document.createElement('p');
      label.className = 'result-category';
      label.textContent = match.category;
      link.href = `#${match.id}`;
      link.textContent = match.title;
      snippet.textContent = MedicalGuideSearch.excerpt(match.text, query);
      link.addEventListener('click', () => {
        if (match.target.matches('details')) {
          const faqField = document.getElementById('faq-search');
          faqField.value = '';
          faqField.dispatchEvent(new Event('input', { bubbles:true }));
          match.target.open = true;
        }
        match.target.tabIndex = -1;
        match.target.focus({ preventScroll:true });
      });
      item.append(label, link, snippet);
      results.append(item);
    });
  };
  let timer;
  field.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 120);
  });
  document.getElementById('global-form').addEventListener('submit', event => {
    event.preventDefault();
    window.clearTimeout(timer);
    render();
    results.querySelector('a')?.click();
  });
  field.addEventListener('keydown', event => {
    if (event.key === 'Escape') { window.clearTimeout(timer); reset(); }
  });
  clear.addEventListener('click', () => { window.clearTimeout(timer); reset(); field.focus(); });
  document.getElementById('open-search').addEventListener('click', () => {
    document.getElementById('site-search').scrollIntoView({ behavior:'auto', block:'start' });
    field.focus({ preventScroll:true });
  });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      document.getElementById('open-search').click();
    }
  });
  const openHash = () => {
    const target = documents.find(item => `#${item.id}` === window.location.hash)?.target;
    if (target?.matches('details')) { target.hidden = false; target.open = true; }
  };
  window.addEventListener('hashchange', openHash);
  openHash();
})();
