(() => {
  const trigger = document.getElementById('print');
  const dialog = document.getElementById('print-options');
  const choices = [...dialog.querySelectorAll('[name="print-mode"]')];
  const faqs = [...document.querySelectorAll('#faq-items details')];
  let snapshot = null;
  const syncSummary = () => {
    const checks = [...document.querySelectorAll('[data-check]')];
    const states = new Map(checks.map(input => [input.dataset.check, input.checked]));
    document.querySelectorAll('[data-print-check]').forEach(item => {
      const checked = states.get(item.dataset.printCheck) === true;
      item.textContent = checked ? '✓' : '□';
      item.setAttribute('aria-label', checked ? '已完成' : '未完成');
    });
    const count = checks.filter(input => input.checked).length;
    document.getElementById('print-progress').textContent = `已核对 ${count} / ${checks.length} 项`;
  };
  trigger.addEventListener('click', () => {
    if (typeof dialog.showModal !== 'function') {
      document.body.dataset.printMode = 'checklist';
      window.print();
      return;
    }
    choices.forEach(input => { input.checked = input.value === 'checklist'; });
    dialog.showModal();
  });
  dialog.addEventListener('close', () => trigger.focus({ preventScroll:true }));
  const cancel = () => dialog.close();
  document.getElementById('cancel-print').addEventListener('click', cancel);
  dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
  document.getElementById('confirm-print').addEventListener('click', () => {
    const selected = choices.find(input => input.checked)?.value;
    document.body.dataset.printMode = selected === 'full' ? 'full' : 'checklist';
    dialog.close();
    window.print();
  });
  window.addEventListener('beforeprint', () => {
    syncSummary();
    if (document.body.dataset.printMode !== 'full' || snapshot !== null) return;
    snapshot = faqs.map(item => ({ item, open:item.open, hidden:item.hidden }));
    faqs.forEach(item => { item.open = true; item.hidden = false; });
  });
  window.addEventListener('afterprint', () => {
    snapshot?.forEach(({ item, open, hidden }) => { item.open = open; item.hidden = hidden; });
    snapshot = null;
    document.body.dataset.printMode = 'checklist';
  });
})();
