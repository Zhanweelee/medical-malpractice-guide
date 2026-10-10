(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const links = [...header.querySelectorAll('nav a')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
  if (!sections.length) return;
  let scheduled = false;
  const activate = id => links.forEach(link => {
    if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  const update = () => {
    scheduled = false;
    const height = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--header-height', `${height}px`);
    const visible = sections.filter(section => section.getBoundingClientRect().top <= height + 40);
    activate((visible.at(-1) || sections[0]).id);
  };
  const queue = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  };
  links.forEach(link => link.addEventListener('click', () => activate(link.hash.slice(1))));
  window.addEventListener('scroll', queue, { passive:true });
  window.addEventListener('resize', queue);
  window.addEventListener('hashchange', () => {
    const id = window.location.hash.slice(1);
    if (sections.some(section => section.id === id)) activate(id);
  });
  update();
  const id = window.location.hash.slice(1);
  if (sections.some(section => section.id === id)) activate(id);
})();
