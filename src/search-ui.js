(() => {
  const field = document.getElementById('global-search');
  const results = document.getElementById('global-results');
  const status = document.getElementById('global-status');
  const clear = document.getElementById('global-clear');
  const container = document.getElementById('site-search');
  const popover = document.getElementById('global-popover');
  let timer;
  let composing = false;
  const groups = [
    ['使用说明', '.intro,.rule,.section-note,.inline-note,footer,.transport-directory > p'],
    ['行动清单', '[data-step]'], ['常见答疑', '#faq-items details'],
    ['申请模板', '.template'], ['封存字段', '.small-table tbody tr'],
    ['参考依据', '.source-list li'], ['转运资源', '.transport-directory tbody tr'], ['待完善内容', '#todo li']
  ];
  const provinceHeading = target => {
    let previous = target.closest('table')?.previousElementSibling;
    while (previous && previous.tagName !== 'H3') previous = previous.previousElementSibling;
    return previous?.textContent || '';
  };
  const documents = groups.flatMap(([category, selector]) => [...document.querySelectorAll(selector)].map((target, index) => {
    const titleElement = (category === '转运资源' ? target.querySelector('td:nth-child(2) strong') : category === '待完善内容' ? target.querySelector('strong') : null) || target.querySelector('.check') || target.querySelector('summary,th,a')
      || (target.classList.contains('template') ? target.previousElementSibling : null);
    const step = target.querySelector('.step')?.textContent.trim();
    const label = titleElement?.textContent.trim();
    const title = (step ? `${step} ${label.slice(step.length).trim()}` : label)
      || (target.closest('section')?.querySelector('h2')?.textContent.trim() || '使用原则与说明');
    if (!target.id) target.id = target.dataset.step ? `action-${target.dataset.step}` : `search-${groups.findIndex(group => group[0] === category)}-${index + 1}`;
    const text = category === '转运资源'
      ? `${provinceHeading(target)} ${target.textContent.trim()}`
      : target.textContent.trim();
    return { id:target.id, title, text, category, target };
  }));
  const close = () => {
    window.clearTimeout(timer);
    popover.hidden = true;
    field.setAttribute('aria-expanded','false');
  };
  const reset = () => {
    field.value = '';
    results.replaceChildren();
    results.hidden = true;
    clear.hidden = true;
    status.textContent = '搜索全站内容，支持多个关键词、常见同义说法及少量错字。';
    close();
  };
  const render = () => {
    const query = field.value.trim();
    if (!MedicalGuideSearch.terms(query).length) { reset(); return; }
    const matches = MedicalGuideSearch.search(documents, query);
    results.replaceChildren();
    results.hidden = matches.length === 0;
    clear.hidden = false;
    popover.hidden = false;
    field.setAttribute('aria-expanded','true');
    results.scrollTop = 0;
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
      MedicalGuideSearch.highlight(MedicalGuideSearch.excerpt(match.text, query), query).forEach(part => {
        const node = part.match ? document.createElement('mark') : document.createTextNode(part.text);
        if (part.match) node.textContent = part.text;
        snippet.append(node);
      });
      link.addEventListener('click', () => {
        close();
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
  const queue = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 120);
  };
  field.addEventListener('input', event => {
    if (!composing && !event.isComposing) queue();
  });
  field.addEventListener('compositionstart', () => { composing = true; close(); });
  field.addEventListener('compositionend', () => { composing = false; queue(); });
  field.addEventListener('focus', () => { if (!composing) render(); });
  document.getElementById('global-form').addEventListener('submit', event => {
    event.preventDefault();
    if (composing) return;
    window.clearTimeout(timer);
    render();
    results.querySelector('a')?.click();
  });
  field.addEventListener('keydown', event => {
    if (event.isComposing || composing) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      window.clearTimeout(timer);
      render();
      results.querySelector('a')?.focus();
    }
  });
  clear.addEventListener('click', () => { window.clearTimeout(timer); reset(); field.focus(); });
  container.addEventListener('keydown', event => {
    if (event.isComposing || composing) return;
    if (event.key === 'Escape' && event.target !== field) { event.preventDefault(); field.focus(); close(); }
    const links = [...results.querySelectorAll('a')];
    const index = links.indexOf(event.target);
    if (index < 0 || !['ArrowDown','ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    (event.key === 'ArrowUp' ? (links[index - 1] || field) : (links[index + 1] || links[index])).focus();
  });
  document.addEventListener('click', event => { if (!container.contains(event.target)) close(); });
  container.addEventListener('focusout', event => { if (!container.contains(event.relatedTarget)) close(); });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      field.focus({ preventScroll:true });
    }
  });
  const openHash = () => {
    const target = documents.find(item => `#${item.id}` === window.location.hash)?.target;
    if (target?.matches('details')) { target.hidden = false; target.open = true; }
  };
  window.addEventListener('hashchange', openHash);
  openHash();
})();
