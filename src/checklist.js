(() => {
      const key = 'medical-incident-guide-checklist-v1';
      const checks = [...document.querySelectorAll('[data-check]')];
      const ids = checks.map(input => input.dataset.check);
      const faqs = [...document.querySelectorAll('#faq-items details')];
      const saveStatus = document.getElementById('save-status');
      let state = {};
      let canSave = true;
      let printSnapshot = [];
      const showStorageError = () => {
        canSave = false;
        saveStatus.textContent = '当前浏览器无法保存进度，或旧进度无法读取。勾选仍可使用，关闭后可能丢失；可打印留存。';
      };
      try {
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('invalid stored checklist');
        state = Object.fromEntries(ids.map(id => [id, stored[id] === true]));
      } catch { showStorageError(); }
      const render = () => {
        checks.forEach(input => {
          input.checked = state[input.dataset.check] === true;
          input.closest('tr').classList.toggle('done', input.checked);
        });
        const count = ids.filter(id => state[id] === true).length;
        document.getElementById('progress-text').textContent = `已核对 ${count} / ${ids.length} 项`;
        const bar = document.getElementById('progress-bar');
        bar.max = ids.length;
        bar.value = count;
      };
      const persist = () => {
        if (!canSave) return;
        try { localStorage.setItem(key, JSON.stringify(state)); }
        catch { showStorageError(); }
      };
      checks.forEach(input => input.addEventListener('change', () => {
        state = { ...state, [input.dataset.check]: input.checked };
        persist();
        render();
      }));
      document.getElementById('reset').addEventListener('click', () => {
        if (!ids.some(id => state[id])) return;
        if (window.confirm('清空这份清单的所有勾选，开始重新核对？')) {
          state = {};
          persist();
          render();
        }
      });
      document.getElementById('faq-search').addEventListener('input', event => {
        const query = event.target.value.trim().toLocaleLowerCase();
        const terms = query.split(/\s+/).filter(Boolean);
        let visible = 0;
        faqs.forEach(item => {
          const match = terms.every(term => item.textContent.toLocaleLowerCase().includes(term));
          item.hidden = !match;
          if (match) visible++;
        });
        document.getElementById('search-status').textContent = query ? `找到 ${visible} / ${faqs.length} 个问题 · 点击展开查看答案。` : `共 ${faqs.length} 个问题 · 点击展开；打印时会包含全部答案。`;
        document.getElementById('faq-empty').hidden = visible !== 0;
      });
      window.addEventListener('beforeprint', () => {
        printSnapshot = faqs.map(item => ({ item, open:item.open, hidden:item.hidden }));
        faqs.forEach(item => { item.open = true; item.hidden = false; });
      });
      window.addEventListener('afterprint', () => {
        printSnapshot.forEach(({ item, open, hidden }) => { item.open = open; item.hidden = hidden; });
        printSnapshot = [];
      });
      document.getElementById('print').addEventListener('click', () => window.print());
      render();
    })();
